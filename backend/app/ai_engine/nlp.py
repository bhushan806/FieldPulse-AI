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

async def _hf_extract(text: str) -> Dict[str, str]:
    if not settings.HF_INFERENCE_API_KEY:
        raise ValueError("HF_INFERENCE_API_KEY is not configured. Cannot process NLP extraction.")

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
        raise ValueError("No JSON block found in HuggingFace response.")
    except Exception as exc:
        print(f"[NLP] HuggingFace extraction error: {exc}")
        raise RuntimeError(f"HuggingFace API failed: {exc}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def extract_entities(text: str) -> ExtractedEntities:
    """
    Extract structured entities from free-form text.
    Raises exception on failure instead of faking it.
    """
    if not text or not text.strip():
        return ExtractedEntities()

    result = await _hf_extract(text)

    return ExtractedEntities(
        activity=result.get("activity", ""),
        location=result.get("location", ""),
        quantity=result.get("quantity", ""),
        status=result.get("status", ""),
    )
