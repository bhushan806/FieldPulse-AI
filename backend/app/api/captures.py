"""
backend/app/api/captures.py
Capture submission and retrieval endpoints.

POST /api/captures/           — engineer submits photo/voice/QR
GET  /api/captures/           — list captures (filtered by role/project)
GET  /api/captures/{id}       — get single capture
"""
import uuid
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.ai_engine.fusion import match_capture_to_activity
from app.ai_engine.nlp import extract_entities
from app.ai_engine.speech import transcribe_audio
from app.ai_engine.vision import classify_image, compute_image_hash
from app.core.deps import get_current_user, require_pm_or_above
from app.db.mongo import get_activities_collection, get_captures_collection
from app.models.capture import (
    CaptureInDB,
    CapturePublic,
    CaptureStatus,
    CvClassification,
    MediaType,
)
from app.models.activity import ScheduleActivityInDB
from app.models.user import UserInDB, UserRole
from app.services.media_storage import upload_media
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/captures", tags=["captures"])


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class CaptureListResponse(BaseModel):
    items: List[CapturePublic]
    total: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _doc_to_public(doc: dict) -> CapturePublic:
    doc["id"] = str(doc.pop("_id"))
    return CapturePublic(**doc)


async def _load_activities(project_id: str) -> List[ScheduleActivityInDB]:
    col = get_activities_collection()
    cursor = col.find({"project_id": project_id})
    docs = await cursor.to_list(length=None)
    return [ScheduleActivityInDB(**d) for d in docs]


# ---------------------------------------------------------------------------
# POST /api/captures/
# ---------------------------------------------------------------------------

@router.post("/", response_model=CapturePublic, status_code=status.HTTP_201_CREATED)
async def submit_capture(
    project_id: str = Form(...),
    media_type: MediaType = Form(...),
    qr_code_value: Optional[str] = Form(None),
    gps_lat: Optional[float] = Form(None),
    gps_lng: Optional[float] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Submit a field capture (photo / voice / QR).
    Only site_engineers can submit; PM+ can submit on behalf (admin seeding).
    """
    col = get_captures_collection()

    # Build GPS dict
    gps = None
    if gps_lat is not None and gps_lng is not None:
        gps = {"type": "Point", "coordinates": [gps_lng, gps_lat]}

    # --- Upload media to Cloudinary ---
    media_url = ""
    image_bytes: Optional[bytes] = None
    audio_bytes: Optional[bytes] = None

    if file:
        raw_bytes = await file.read()
        ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
        unique_name = f"{project_id}/{uuid.uuid4().hex}.{ext}"

        resource_type = "image" if media_type == MediaType.photo else \
                        "video" if media_type == MediaType.video else "raw"
        media_url = await upload_media(raw_bytes, unique_name, resource_type=resource_type)

        if media_type == MediaType.photo:
            image_bytes = raw_bytes
        elif media_type == MediaType.voice:
            audio_bytes = raw_bytes

    # --- AI pipeline ---
    transcribed_text: Optional[str] = None
    extracted_entities = None
    cv_classification = None
    matched_id = None
    confidence = 0.0
    cap_status = CaptureStatus.processing

    try:
        if audio_bytes:
            transcribed_text = await transcribe_audio(audio_bytes)
            extracted_entities = await extract_entities(transcribed_text)

        if image_bytes:
            label, conf = await classify_image(image_bytes)
            cv_classification = CvClassification(label=label, confidence=conf)
            # Also try to extract entities from label text
            if not extracted_entities:
                extracted_entities = await extract_entities(label)

        if qr_code_value and not extracted_entities:
            extracted_entities = await extract_entities(qr_code_value)

        # --- Activity matching via fusion ---
        activities = await _load_activities(project_id)
        matched_id, confidence, cap_status = await match_capture_to_activity(
            activities=activities,
            cv_classification=cv_classification,
            extracted_entities=extracted_entities,
            qr_code_value=qr_code_value,
            gps=gps,
            transcribed_text=transcribed_text,
        )
    except Exception as e:
        print(f"[Captures] AI processing failed: {e}")
        cap_status = CaptureStatus.processing_failed

    # --- Persist capture document ---
    doc = {
        "_id": ObjectId(),
        "user_id": str(current_user.id),
        "project_id": project_id,
        "media_type": media_type,
        "media_url": media_url,
        "gps": gps,
        "qr_code_value": qr_code_value,
        "transcribed_text": transcribed_text,
        "extracted_entities": extracted_entities.dict() if extracted_entities else None,
        "cv_classification": cv_classification.dict() if cv_classification else None,
        "matched_activity_id": matched_id,
        "confidence_score": confidence,
        "status": cap_status,
        "rejection_reason": None,
        "created_at": datetime.utcnow(),
    }
    await col.insert_one(doc)

    # --- Update matched activity to in_progress if auto-approved ---
    if cap_status == CaptureStatus.auto_approved and matched_id:
        activities_col = get_activities_collection()
        await activities_col.update_one(
            {"_id": ObjectId(matched_id)},
            {"$set": {"status": "in_progress"}},
        )
        # Broadcast activity update
        await ws_manager.broadcast_to_project(
            project_id=project_id,
            event="activity_updated",
            data={"activity_id": matched_id, "project_id": project_id, "percent_complete": None},
        )

    # --- Broadcast pending_review event to PM ---
    if cap_status == CaptureStatus.pending_review:
        await ws_manager.broadcast_to_project(
            project_id=project_id,
            event="new_review_item",
            data={"capture_id": str(doc["_id"]), "project_id": project_id},
        )

    return _doc_to_public(doc)


# ---------------------------------------------------------------------------
# GET /api/captures/
# ---------------------------------------------------------------------------

@router.get("/", response_model=CaptureListResponse)
async def list_captures(
    project_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: UserInDB = Depends(get_current_user),
):
    col = get_captures_collection()
    query: dict = {}

    if current_user.role == UserRole.site_engineer:
        query["user_id"] = str(current_user.id)
    elif project_id:
        query["project_id"] = project_id

    if status_filter:
        query["status"] = status_filter

    total = await col.count_documents(query)
    cursor = col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    items = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        items.append(CapturePublic(**d))

    return CaptureListResponse(items=items, total=total)


# ---------------------------------------------------------------------------
# GET /api/captures/{capture_id}
# ---------------------------------------------------------------------------

@router.get("/{capture_id}", response_model=CapturePublic)
async def get_capture(
    capture_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    col = get_captures_collection()
    try:
        doc = await col.find_one({"_id": ObjectId(capture_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid capture ID.")

    if not doc:
        raise HTTPException(status_code=404, detail="Capture not found.")

    # Engineers can only see their own
    if current_user.role == UserRole.site_engineer and doc["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")

    doc["id"] = str(doc.pop("_id"))
    return CapturePublic(**doc)
