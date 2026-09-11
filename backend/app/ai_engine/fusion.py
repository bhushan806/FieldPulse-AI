"""
backend/app/ai_engine/fusion.py
Multi-signal activity matching engine.

Combines:
  1. CLIP image classification (vision score)
  2. Whisper transcription + Mistral entity extraction (NLP score)
  3. QR code value exact match
  4. GPS proximity (if coordinates available)
  5. rapidfuzz fuzzy text matching against activity keywords

Returns the best-matched activity_id, confidence score, and the
auto_approved / pending_review decision based on thresholds.
"""
from typing import List, Optional, Tuple

from rapidfuzz import fuzz, process

from app.models.activity import ScheduleActivityInDB
from app.models.capture import CaptureStatus, CvClassification, ExtractedEntities

# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------

AUTO_APPROVE_THRESHOLD = 0.80   # confidence >= 80% → auto_approved
REVIEW_THRESHOLD = 0.40         # confidence >= 40% → PM review
RECAPTURE_THRESHOLD = 0.20      # weak/no evidence → request recapture
FUZZY_MATCH_WEIGHT = 0.40
VISION_WEIGHT = 0.35
NLP_WEIGHT = 0.25
GPS_BONUS = 0.10                # added if GPS is within ~500 m of activity location


# ---------------------------------------------------------------------------
# GPS distance helper (Haversine, returns km)
# ---------------------------------------------------------------------------

import math


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Core matching logic
# ---------------------------------------------------------------------------

def _fuzzy_score(query: str, activity: ScheduleActivityInDB) -> float:
    """
    Compute fuzzy similarity between the query text and the activity's
    name + keywords.  Returns a 0-1 score.
    """
    if not query:
        return 0.0

    targets = [activity.activity_name.lower()] + [kw.lower() for kw in activity.keywords]
    best = max(
        fuzz.token_set_ratio(query.lower(), t) for t in targets
    )
    return best / 100.0


def _vision_score(cv: Optional[CvClassification], activity: ScheduleActivityInDB) -> float:
    """Map CLIP label to activity — exact/partial match against keywords."""
    if not cv or not cv.label:
        return 0.0
    label = cv.label.lower()
    targets = [activity.activity_name.lower()] + [kw.lower() for kw in activity.keywords]
    if any(label in t or t in label for t in targets):
        return cv.confidence
    # Partial overlap
    if any(fuzz.partial_ratio(label, t) > 70 for t in targets):
        return cv.confidence * 0.6
    return 0.0


def _gps_bonus(
    capture_gps: Optional[dict],
    activity: ScheduleActivityInDB,
) -> float:
    """Return GPS_BONUS if capture location is within 0.5 km of activity."""
    if not capture_gps or not activity.location:
        return 0.0
    try:
        cap_lon, cap_lat = capture_gps["coordinates"]
        act_lon, act_lat = activity.location.coordinates
        dist = _haversine_km(cap_lat, cap_lon, act_lat, act_lon)
        return GPS_BONUS if dist <= 0.5 else 0.0
    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def match_capture_to_activity(
    activities: List[ScheduleActivityInDB],
    cv_classification: Optional[CvClassification],
    extracted_entities: Optional[ExtractedEntities],
    qr_code_value: Optional[str],
    gps: Optional[dict],
    transcribed_text: Optional[str],
) -> Tuple[Optional[str], float, CaptureStatus]:
    """
    Match a capture to the best-fit activity in the provided list.

    Returns:
        (matched_activity_id | None, confidence_score, capture_status)
    """
    if not activities:
        return None, 0.0, CaptureStatus.pending_review

    # 1. QR code exact match overrides everything
    if qr_code_value:
        for act in activities:
            if act.activity_code.upper() == qr_code_value.strip().upper():
                return str(act.id), 1.0, CaptureStatus.auto_approved

    # 2. Build query text from entities + raw transcription
    nlp_query_parts = []
    if extracted_entities:
        nlp_query_parts += [
            extracted_entities.activity,
            extracted_entities.location,
            extracted_entities.status,
        ]
    if transcribed_text:
        nlp_query_parts.append(transcribed_text)
    nlp_query = " ".join(p for p in nlp_query_parts if p).strip()

    best_id: Optional[str] = None
    best_score: float = 0.0

    for act in activities:
        fuzzy = _fuzzy_score(nlp_query, act)
        vision = _vision_score(cv_classification, act)
        gps_b = _gps_bonus(gps, act)

        # Weighted combination
        score = (
            FUZZY_MATCH_WEIGHT * fuzzy
            + VISION_WEIGHT * vision
            + NLP_WEIGHT * (1.0 if extracted_entities and extracted_entities.activity else 0.0)
            + gps_b
        )
        score = min(score, 1.0)

        if score > best_score:
            best_score = score
            best_id = str(act.id)

    # 3. Decide capture status
    if best_score >= AUTO_APPROVE_THRESHOLD:
        capture_status = CaptureStatus.auto_approved
    elif best_score >= REVIEW_THRESHOLD:
        capture_status = CaptureStatus.pending_review
    else:
        capture_status = CaptureStatus.rejected

    return best_id, round(best_score, 4), capture_status
