"""
backend/app/ai_engine/nlp.py
Entity extraction via Mistral-7B-Instruct (HuggingFace Inference API).
Falls back to local regex if HF key is missing (dev/test mode).
"""
import json
import re
from typing import Dict, Optional

import httpx

from app.core.config import settings
from app.models.capture import ExtractedEntities


# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are an information extraction assistant for oil & gas infrastructure projects.
Extract structured entities from the field engineer's text.
Return ONLY valid JSON with these keys:
  "activity"  : the work activity described (string)
  "location"  : the location/area mentioned (string)
  "quantity"  : any measurement/quantity mentioned (string)
  "status"    : the reported status or progress (string)
If a field cannot be determined leave it as an empty string "".
"""


# ---------------------------------------------------------------------------
# HuggingFace Inference API call
# ---------------------------------------------------------------------------

async def _hf_extract(text: str) -> Optional[Dict[str, str]]:
    if not settings.HF_INFERENCE_API_KEY:
        return None

    url = f"https://api-inference.huggingface.co/models/{settings.HF_MISTRAL_MODEL}"
    headers = {"Authorization": f"Bearer {settings.HF_INFERENCE_API_KEY}"}
    payload = {
        "inputs": f"<s>[INST] {SYSTEM_PROMPT}\n\nText: {text} [/INST]",
        "parameters": {
            "max_new_tokens": 256,
            "temperature": 0.1,
            "return_full_text": False,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            generated = resp.json()[0]["generated_text"]

        # Find JSON block in response
        match = re.search(r"\{.*?\}", generated, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as exc:
        print(f"[NLP] HuggingFace extraction error: {exc}")

    return None


# ---------------------------------------------------------------------------
# Regex fallback
# ---------------------------------------------------------------------------

def _regex_extract(text: str) -> Dict[str, str]:
    """
    Very simple keyword-based extraction for dev/test mode.
    Looks for patterns like "pipeline laying", "50%", "km 12", etc.
    """
    activities = [
        "pipeline laying", "welding", "excavation", "concrete pouring",
        "road construction", "equipment installation", "inspection",
        "testing", "electrical work", "painting",
    ]
    activity = ""
    for act in activities:
        if act in text.lower():
            activity = act
            break

    quantity_match = re.search(r"\b(\d+\.?\d*\s*(%|km|m|ft|kg|ton|unit|meter)s?)\b", text, re.I)
    quantity = quantity_match.group(1) if quantity_match else ""

    status_keywords = ["completed", "in progress", "started", "finished", "ongoing", "done", "pending"]
    status = ""
    for kw in status_keywords:
        if kw in text.lower():
            status = kw
            break

    return {"activity": activity, "location": "", "quantity": quantity, "status": status}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def extract_entities(text: str) -> ExtractedEntities:
    """
    Extract structured entities from free-form text.
    Tries HuggingFace Mistral first, falls back to regex.
    """
    if not text or not text.strip():
        return ExtractedEntities()

    result = await _hf_extract(text)
    if result is None:
        result = _regex_extract(text)

    return ExtractedEntities(
        activity=result.get("activity", ""),
        location=result.get("location", ""),
        quantity=result.get("quantity", ""),
        status=result.get("status", ""),
    )
