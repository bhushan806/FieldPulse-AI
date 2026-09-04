"""
backend/app/ai_engine/vision.py
CLIP-based image classification + imagehash duplicate detection.
Uses open_clip (HuggingFace compatible) for zero-shot classification.
"""
import io
from typing import List, Optional, Tuple

import imagehash
import torch
from PIL import Image

# Lazy-loaded globals — models are loaded once at first use to avoid slowing startup
_model = None
_preprocess = None
_tokenizer = None

CANDIDATE_LABELS: List[str] = [
    "pipeline laying", "welding", "excavation", "concrete pouring",
    "road construction", "equipment installation", "site inspection",
    "soil testing", "electrical work", "scaffolding", "painting",
    "quality check", "safety meeting", "material delivery",
]


def _load_models():
    global _model, _preprocess, _tokenizer
    if _model is None:
        import open_clip
        _model, _, _preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained="openai"
        )
        _tokenizer = open_clip.get_tokenizer("ViT-B-32")
        _model.eval()
        print("[Vision] CLIP model loaded.")


async def classify_image(
    image_bytes: bytes,
    labels: Optional[List[str]] = None,
) -> Tuple[str, float]:
    """
    Classify an image using CLIP zero-shot classification.
    Returns (best_label, confidence_score 0-1).
    """
    _load_models()
    candidates = labels or CANDIDATE_LABELS

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image_input = _preprocess(image).unsqueeze(0)

    with torch.no_grad():
        text_tokens = _tokenizer(candidates)
        image_features = _model.encode_image(image_input)
        text_features = _model.encode_text(text_tokens)

        image_features /= image_features.norm(dim=-1, keepdim=True)
        text_features /= text_features.norm(dim=-1, keepdim=True)

        logits = (100.0 * image_features @ text_features.T).softmax(dim=-1)
        probs = logits[0].tolist()

    best_idx = probs.index(max(probs))
    return candidates[best_idx], round(probs[best_idx], 4)


def compute_image_hash(image_bytes: bytes) -> str:
    """Compute a perceptual hash (pHash) for duplicate detection."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return str(imagehash.phash(image))


def images_are_duplicates(hash1: str, hash2: str, threshold: int = 8) -> bool:
    """Return True if two pHash strings differ by <= threshold bits."""
    h1 = imagehash.hex_to_hash(hash1)
    h2 = imagehash.hex_to_hash(hash2)
    return (h1 - h2) <= threshold
