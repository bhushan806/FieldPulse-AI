"""
backend/app/ai_engine/document_processor.py
Handles processing of uploaded project documents (e.g. schedules in PDF) to extract activities.
"""
import asyncio
import io
import json
import traceback
from typing import List, Dict, Optional

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    from huggingface_hub import AsyncInferenceClient
except ImportError:
    AsyncInferenceClient = None

from app.core.config import settings
from app.db.mongo import get_database
from app.models.document import DocumentStatus
from bson import ObjectId


async def process_document_background(doc_id: str, raw_bytes: bytes, filename: str):
    """
    Background task to process a document, extract text, and use HF to find activities.
    """
    db = get_database()
    docs_col = db["documents"]
    activities_col = db["schedule_activities"]
    
    try:
        # Update status to processing
        await docs_col.update_one({"_id": ObjectId(doc_id)}, {"$set": {"status": DocumentStatus.processing.value}})
        
        extracted_text = ""
        
        # 1. Extract Text
        if filename.lower().endswith(".pdf") and PyPDF2 is not None:
            pdf_file = io.BytesIO(raw_bytes)
            reader = PyPDF2.PdfReader(pdf_file)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
        else:
            # Fallback for plain text or unknown
            extracted_text = raw_bytes.decode("utf-8", errors="ignore")
            
        if not extracted_text.strip():
            raise Exception("No text could be extracted from the document.")
            
        # 2. Process with LLM to find activities
        activities = await _extract_activities_from_text(extracted_text)
        
        # 3. Save extracted data (held for PM / HQ review before live insertion)
        await docs_col.update_one(
            {"_id": ObjectId(doc_id)}, 
            {
                "$set": {
                    "status": DocumentStatus.analyzed.value,
                    "extracted_text": extracted_text[:10000],  # Store up to 10k chars for preview
                    "structured_data": {"activities": activities}
                }
            }
        )
        
        # 4. Broadcast document_processed event to project room via WebSocket
        doc = await docs_col.find_one({"_id": ObjectId(doc_id)})
        if doc:
            project_id = doc.get("project_id")
            if project_id:
                from app.websocket.manager import ws_manager
                await ws_manager.broadcast_to_project(
                    project_id=project_id,
                    event="document_processed",
                    data={
                        "document_id": doc_id,
                        "filename": filename,
                        "activities_count": len(activities),
                        "status": "analyzed"
                    }
                )
                
    except Exception as e:
        print(f"[DocumentProcessor] Error processing document {doc_id}: {e}")
        traceback.print_exc()
        await docs_col.update_one(
            {"_id": ObjectId(doc_id)}, 
            {
                "$set": {
                    "status": DocumentStatus.failed.value,
                    "structured_data": {"error": str(e)}
                }
            }
        )


def _heuristic_extract_activities(text: str) -> List[Dict]:
    """
    Scans document text using pattern matching to extract actual activities,
    WBS codes, task titles, and keywords from the uploaded document.
    """
    import re
    activities = []
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    
    keywords_vocab = [
        "excavation", "clearing", "foundation", "footing", "concrete", "pour", "curing",
        "reinforcement", "rebar", "steel", "framing", "plumbing", "electrical", "piping",
        "conduit", "trenching", "backfill", "masonry", "roofing", "cladding", "welding",
        "inspection", "testing", "drainage", "grading", "paving", "painting", "finishing",
        "commissioning", "installation", "scaffolding", "demolition", "site setup"
    ]
    
    seen_names = set()
    idx = 1
    
    # Pattern: Numbered or coded lines e.g. "1. Site clearing", "1.2 Foundation excavation", "ACT-01 Pipeline welding"
    line_pattern = re.compile(r"^(?:(?:\d+[\.\)]|\b[A-Z]{2,5}[-_]\d{1,4}\b|[A-Z]\d+[\.\)])\s*)+([A-Za-z0-9\s,\-\/]{4,80})", re.IGNORECASE)
    
    for line in lines:
        match = line_pattern.match(line)
        candidate_name = ""
        code = None
        if match:
            candidate_name = match.group(1).strip()
            code_match = re.match(r"^([A-Z]{2,5}[-_]\d{1,4}|\d+(?:\.\d+)*)", line)
            if code_match:
                code = code_match.group(1).upper()
        else:
            line_lower = line.lower()
            if any(kw in line_lower for kw in keywords_vocab) and len(line) < 90 and not line.endswith(":"):
                candidate_name = line.strip()

        if candidate_name and len(candidate_name) >= 5 and candidate_name.lower() not in seen_names:
            seen_names.add(candidate_name.lower())
            if not code:
                code = f"ACT-{idx:02d}"
            
            kws = [kw for kw in keywords_vocab if kw in candidate_name.lower() or kw in line.lower()]
            if not kws:
                kws = [word.lower() for word in candidate_name.split() if len(word) > 4][:3]
                
            activities.append({
                "activity_code": code,
                "activity_name": candidate_name,
                "keywords": kws,
                "source": "heuristic_extractor"
            })
            idx += 1
            if len(activities) >= 30:
                break
                
    if not activities:
        for line in lines[:10]:
            if 5 <= len(line) <= 80:
                activities.append({
                    "activity_code": f"GEN-{idx:02d}",
                    "activity_name": line,
                    "keywords": ["general", "construction"],
                    "source": "heuristic_fallback"
                })
                idx += 1
                if len(activities) >= 5:
                    break

    return activities


async def _extract_activities_from_text(text: str) -> List[Dict]:
    """
    Extracts schedule activities from text using HuggingFace Inference API if available,
    or falls back to honest rule-based heuristic extraction.
    """
    api_key = settings.HF_INFERENCE_API_KEY
    if not api_key or api_key == "mock":
        print("[DocumentProcessor] Using heuristic document extraction")
        return _heuristic_extract_activities(text)
        
    client = AsyncInferenceClient(token=api_key)
    
    prompt = f"""
    You are an expert construction scheduler.
    Extract the list of main construction activities from the following project document text.
    Return ONLY a valid JSON array of objects. Do not include markdown formatting or explanation.
    Each object must have:
    - "activity_code" (string, generate a short one if not present)
    - "activity_name" (string)
    - "keywords" (list of strings related to the activity)
    
    Document Text:
    {text[:5000]}
    
    JSON Output:
    """
    
    try:
        response = await client.text_generation(
            prompt,
            model="mistralai/Mixtral-8x7B-Instruct-v0.1",
            max_new_tokens=1000,
            temperature=0.1,
            return_full_text=False
        )
        
        content = response.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        activities = json.loads(content.strip())
        if isinstance(activities, list) and activities:
            for act in activities:
                act["source"] = "llm_inference"
            return activities
        return _heuristic_extract_activities(text)
        
    except Exception as e:
        print(f"[DocumentProcessor] HF API Error: {e}. Falling back to heuristic extractor.")
        return _heuristic_extract_activities(text)

