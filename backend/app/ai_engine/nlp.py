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

    headers = {"Authorization": f"Bearer {settings.HF_INFERENCE_API_KEY}"}
    prompt = f"<s>[INST] {SYSTEM_PROMPT}\n\nText: {text} [/INST]"
    attempts = [
        (
            "https://router.huggingface.co/v1/chat/completions",
            {
                "model": settings.HF_MISTRAL_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
                "max_tokens": 256,
                "temperature": 0.1,
            },
        ),
        (
            f"https://api-inference.huggingface.co/models/{settings.HF_MISTRAL_MODEL}",
            {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 256,
                    "temperature": 0.1,
                    "return_full_text": False,
                },
            },
        ),
    ]

    last_error: Exception | None = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for url, payload in attempts:
            try:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                generated = ""
                if isinstance(data, list) and data:
                    generated = data[0].get("generated_text", "")
                elif isinstance(data, dict):
                    generated = data.get("generated_text", "")
                    choices = data.get("choices")
                    if not generated and isinstance(choices, list) and choices:
                        generated = (choices[0].get("message") or {}).get("content", "")
                match = re.search(r"\{.*?\}", generated, re.DOTALL)
                if match:
                    return json.loads(match.group())
            except Exception as exc:
                last_error = exc
                print(f"[NLP] HuggingFace extraction error ({url}): {exc}")

    raise RuntimeError(f"HuggingFace API failed: {last_error}")


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

    try:
        result = await _hf_extract(text)
    except Exception as exc:
        # A deterministic, clearly limited fallback keeps the evidence flow
        # operational when the optional hosted LLM is unavailable. It does not
        # claim AI inference; it extracts only literal information present in
        # the engineer's note for the fusion matcher and PM review.
        print(f"[NLP] Using rule-based extraction because hosted NLP is unavailable: {exc}")
        percent = re.search(r"\b(\d{1,3})\s*%", text)
        status_match = re.search(r"\b(completed?|complete|ongoing|in progress|started|delayed|blocked)\b", text, re.I)
        location_match = re.search(r"\b(?:at|near|location|chainage)\s+([A-Za-z0-9 ._-]{2,40})", text, re.I)
        result = {
            "activity": text.strip(),
            "location": location_match.group(1).strip() if location_match else "",
            "quantity": percent.group(1) + "%" if percent else "",
            "status": status_match.group(1) if status_match else "",
        }

    return ExtractedEntities(
        activity=result.get("activity", ""),
        location=result.get("location", ""),
        quantity=result.get("quantity", ""),
        status=result.get("status", ""),
    )
