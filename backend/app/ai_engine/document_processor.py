"""
backend/app/ai_engine/document_processor.py
Handles processing of uploaded project documents (e.g. schedules in PDF) to extract activities.
"""
import asyncio
import io
import json
import traceback
from typing import List, Dict, Optional

import PyPDF2
from huggingface_hub import AsyncInferenceClient

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
        if filename.lower().endswith(".pdf"):
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
        
        # 3. Save extracted data
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
        
        # 4. (Optional) Auto-create schedule activities from the extraction
        # We assume the document belongs to a project, let's get project_id
        doc = await docs_col.find_one({"_id": ObjectId(doc_id)})
        if doc and activities:
            project_id = doc["project_id"]
            new_activity_docs = []
            for act in activities:
                new_activity_docs.append({
                    "_id": ObjectId(),
                    "project_id": project_id,
                    "activity_code": act.get("activity_code", "GEN-" + str(ObjectId())[:4]),
                    "activity_name": act.get("activity_name", "Unknown Activity"),
                    "location": None,
                    "planned_start": None, # In a full version, we'd parse dates
                    "planned_end": None,
                    "percent_complete": 0.0,
                    "status": "planned",
                    "keywords": act.get("keywords", [])
                })
            
            if new_activity_docs:
                await activities_col.insert_many(new_activity_docs)
                
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


async def _extract_activities_from_text(text: str) -> List[Dict]:
    """
    Calls HuggingFace Inference API to extract schedule activities from text.
    """
    api_key = settings.HF_INFERENCE_API_KEY
    if not api_key or api_key == "mock":
        print("[DocumentProcessor] Using mock extraction")
        return [
            {"activity_code": "SITE-01", "activity_name": "Site Setup & Clearance", "keywords": ["site", "clearance"]},
            {"activity_code": "FND-01", "activity_name": "Foundation Excavation", "keywords": ["excavation", "digging"]},
            {"activity_code": "FND-02", "activity_name": "Concrete Pour - Foundation", "keywords": ["concrete", "foundation"]}
        ]
        
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
        # Using a reliable instruction model (Mixtral or similar, depends on what HF endpoint is active, we use default text-generation)
        # Note: In production you might want to specify a precise model string like "mistralai/Mixtral-8x7B-Instruct-v0.1"
        response = await client.text_generation(
            prompt,
            model="mistralai/Mixtral-8x7B-Instruct-v0.1",
            max_new_tokens=1000,
            temperature=0.1,
            return_full_text=False
        )
        
        content = response.strip()
        # Clean up possible markdown code blocks
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        activities = json.loads(content.strip())
        if isinstance(activities, list):
            return activities
        return []
        
    except Exception as e:
        print(f"[DocumentProcessor] HF API Error: {e}")
        # Fallback to simple regex/split based mock if AI fails to parse JSON
        return [{"activity_code": "ERR-01", "activity_name": "Failed to parse automatically - Manual review required", "keywords": []}]

