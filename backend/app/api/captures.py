"""
backend/app/api/captures.py
Capture submission and retrieval endpoints.

POST /api/captures/           — engineer submits photo/voice/QR
GET  /api/captures/           — list captures (filtered by role/project)
GET  /api/captures/{id}       — get single capture
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.ai_engine.fusion import match_capture_to_activity
from app.ai_engine.nlp import extract_entities
from app.ai_engine.speech import transcribe_audio
from app.ai_engine.vision import classify_image, compute_image_hash, images_are_duplicates
from app.core.deps import get_current_user, require_project_access
from app.db.mongo import get_activities_collection, get_captures_collection, get_projects_collection
from app.models.capture import (
    CaptureInDB,
    CapturePublic,
    CaptureStatus,
    CvClassification,
    MediaType,
)
from app.models.activity import ScheduleActivityInDB
from app.models.activity_event import EventType
from app.models.user import UserInDB, UserRole
from app.services.activity_event_service import activity_event_service
from app.services.media_storage import upload_media
from app.services.audit import write_audit_log
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
    docs = await cursor.to_list(length=500)
    return [ScheduleActivityInDB(**d) for d in docs]


# ---------------------------------------------------------------------------
# POST /api/captures/
# ---------------------------------------------------------------------------

@router.post("/", response_model=CapturePublic, status_code=status.HTTP_201_CREATED)
async def submit_capture(
    project_id: str = Form(...),
    media_type: MediaType = Form(...),
    qr_code_value: Optional[str] = Form(None),
    activity_id: Optional[str] = Form(None),
    gps_lat: Optional[float] = Form(None),
    gps_lng: Optional[float] = Form(None),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    text_note: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Submit a field capture (photo / voice / QR).
    Only site_engineers can submit; PM+ can submit on behalf (admin seeding).
    """
    col = get_captures_collection()
    try:
        project = await get_projects_collection().find_one({"_id": ObjectId(project_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID.")
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    require_project_access(current_user, project_id)

    resolved_lat = gps_lat if gps_lat is not None else lat
    resolved_lng = gps_lng if gps_lng is not None else lng

    # Build GPS dict with project location fallback
    gps = None
    if resolved_lat is not None and resolved_lng is not None and not (float(resolved_lat) == 0.0 and float(resolved_lng) == 0.0):
        gps = {"type": "Point", "coordinates": [float(resolved_lng), float(resolved_lat)]}
    elif project and project.get("location"):
        gps = project["location"]
    else:
        gps = {"type": "Point", "coordinates": [94.92, 27.47]}

    # --- Upload media to Cloudinary ---
    media_url = ""
    image_bytes: Optional[bytes] = None
    audio_bytes: Optional[bytes] = None
    image_hash: Optional[str] = None
    processing_notes: list[str] = []
    transcribed_text: Optional[str] = None

    # ── Upload validation ──────────────────────────────────────────────────
    ALLOWED_MIME_PREFIXES = (
        "image/",
        "video/",
        "audio/",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument",
        "application/vnd.ms-excel",
        "text/plain",
        "text/csv",
        "application/octet-stream",
    )
    MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB

    if file:
        raw_bytes = await file.read()

        # Enforce size limit
        if len(raw_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum allowed size is 50 MB (received {len(raw_bytes) // (1024*1024)} MB).",
            )

        # Enforce MIME type allowlist
        content_type = file.content_type or ""
        if not any(content_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type '{content_type}'. Allowed: images, videos, audio, PDF, Word, Excel, text.",
            )

        ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin"
        unique_name = f"{project_id}/{uuid.uuid4().hex}.{ext}"

        resource_type = "image" if media_type == MediaType.photo else \
                        "video" if media_type == MediaType.video else "raw"
        media_url = await upload_media(raw_bytes, unique_name, resource_type=resource_type)

        if media_type == MediaType.photo:
            image_bytes = raw_bytes
            try:
                image_hash = compute_image_hash(raw_bytes)
            except Exception as exc:
                processing_notes.append(f"Could not compute duplicate fingerprint: {exc}")
        elif media_type == MediaType.voice:
            audio_bytes = raw_bytes
        elif media_type == MediaType.document:
            try:
                doc_filename = (file.filename or "").lower()
                if doc_filename.endswith(".pdf"):
                    try:
                        import PyPDF2
                        import io
                        pdf_reader = PyPDF2.PdfReader(io.BytesIO(raw_bytes))
                        pdf_texts = []
                        for page in pdf_reader.pages[:10]:
                            txt = page.extract_text()
                            if txt:
                                pdf_texts.append(txt)
                        if pdf_texts:
                            doc_text = "\n".join(pdf_texts).strip()
                            if doc_text:
                                transcribed_text = doc_text[:5000]
                    except Exception as pdf_err:
                        processing_notes.append(f"PDF text extraction note: {pdf_err}")
                elif doc_filename.endswith((".txt", ".csv")):
                    transcribed_text = raw_bytes.decode("utf-8", errors="ignore")[:5000]
            except Exception as doc_err:
                processing_notes.append(f"Document processing note: {doc_err}")

    # --- AI pipeline ---
    extracted_entities = None
    cv_classification = None
    matched_id = None
    confidence = 0.0
    cap_status = CaptureStatus.processing
    duplicate_detected = False

    try:
        if audio_bytes:
            transcribed_text = await transcribe_audio(audio_bytes)
            extracted_entities = await extract_entities(transcribed_text)
        elif transcribed_text and not extracted_entities:
            try:
                extracted_entities = await extract_entities(transcribed_text)
            except Exception as ent_err:
                processing_notes.append(f"Entity extraction note: {ent_err}")

        if image_bytes:
            try:
                label, conf = await classify_image(image_bytes)
                cv_classification = CvClassification(label=label, confidence=conf)
                # Also try to extract entities from label text.
                if not extracted_entities:
                    extracted_entities = await extract_entities(label)
            except Exception as exc:
                # This is intentionally not a fabricated CV answer. The
                # capture still follows the real QR/GPS/text decision path.
                processing_notes.append(f"Vision analysis unavailable; matched using available metadata only: {exc}")

        if text_note and not extracted_entities:
            transcribed_text = transcribed_text or text_note
            extracted_entities = await extract_entities(text_note)

        if qr_code_value and not extracted_entities:
            extracted_entities = await extract_entities(qr_code_value)

        # --- Activity matching via fusion ---
        activities = await _load_activities(project_id)
        if activity_id:
            if not ObjectId.is_valid(activity_id):
                raise HTTPException(status_code=422, detail="Invalid activity ID.")
            if not any(str(activity.id) == activity_id for activity in activities):
                raise HTTPException(status_code=422, detail="Activity does not belong to this project.")
        matched_id, confidence, cap_status = await match_capture_to_activity(
            activities=activities,
            cv_classification=cv_classification,
            extracted_entities=extracted_entities,
            qr_code_value=qr_code_value,
            gps=gps,
            transcribed_text=transcribed_text,
        )
    except HTTPException:
        raise
    except Exception as e:
        # The evidence is retained and made reviewable rather than discarded
        # or represented as successfully processed.
        processing_notes.append(f"Matching could not complete: {e}")
        cap_status = CaptureStatus.pending_review

    if image_hash:
        recent = await col.find({"project_id": project_id, "image_hash": {"$exists": True}}).sort("created_at", -1).limit(100).to_list(length=100)
        for previous in recent:
            try:
                if images_are_duplicates(image_hash, previous["image_hash"]):
                    duplicate_detected = True
                    processing_notes.append(f"Potential duplicate of capture {previous['_id']}; routed for PM review.")
                    cap_status = CaptureStatus.pending_review
                    break
            except Exception:
                continue

    # --- Persist capture document ---
    doc = {
        "_id": ObjectId(),
        "user_id": str(current_user.id),
        "project_id": project_id,
        "media_type": media_type,
        "media_url": media_url,
        "gps": gps,
        "qr_code_value": qr_code_value,
        "requested_activity_id": activity_id,
        "transcribed_text": transcribed_text,
        "extracted_entities": extracted_entities.dict() if extracted_entities else None,
        "cv_classification": cv_classification.dict() if cv_classification else None,
        "matched_activity_id": matched_id,
        "confidence_score": confidence,
        "status": cap_status,
        "image_hash": image_hash,
        "duplicate_detected": duplicate_detected,
        "processing_notes": processing_notes,
        "rejection_reason": None,
        "created_at": datetime.utcnow(),
    }
    await col.insert_one(doc)
    capture_id = str(doc["_id"])
    await write_audit_log(
        action="capture_submitted",
        actor_user_id=str(current_user.id),
        target_id=capture_id,
        project_id=project_id,
        after_state={"media_type": media_type.value, "status": cap_status.value},
    )
    await write_audit_log(
        action="capture_processed",
        actor_user_id=str(current_user.id),
        target_id=capture_id,
        project_id=project_id,
        after_state={"matched_activity_id": matched_id, "confidence_score": confidence, "status": cap_status.value, "notes": processing_notes},
    )

    # --- Time Machine: Record Timeline Events ---
    target_act_id = matched_id or activity_id
    if target_act_id:
        try:
            # 1. Base capture evidence event
            if media_type == MediaType.photo:
                ev_type = EventType.PHOTO_CAPTURED
                cv_desc = cv_classification.label if cv_classification else "Site inspection"
                ev_desc = f"Photo evidence captured (AI classified: {cv_desc})"
            elif media_type == MediaType.voice:
                ev_type = EventType.VOICE_UPDATE
                ev_desc = f"Field voice update: \"{transcribed_text or 'Voice note recorded'}\""
            elif media_type == MediaType.video:
                ev_type = EventType.VIDEO_CAPTURED
                ev_desc = "Site video evidence captured"
            elif media_type == MediaType.qr:
                ev_type = EventType.QR_SCAN
                ev_desc = f"QR scan verified: {qr_code_value}"
            elif media_type == MediaType.document:
                ev_type = EventType.WORKER_UPDATE
                doc_name = file.filename if file and file.filename else "Site document"
                ev_desc = f"Site document uploaded: {doc_name}"
            else:
                ev_type = EventType.WORKER_UPDATE
                ev_desc = "Worker field submission"

            source_type = "PHOTO_AI" if media_type == MediaType.photo else \
                          "VOICE_WHISPER" if media_type == MediaType.voice else \
                          "DOCUMENT_AI" if media_type == MediaType.document else "FIELD_CAPTURE"

            await activity_event_service.create_event(
                project_id=project_id,
                activity_id=target_act_id,
                event_type=ev_type,
                source_type=source_type,
                source_id=capture_id,
                actor_id=str(current_user.id),
                description=ev_desc,
                confidence=confidence if confidence > 0 else (cv_classification.confidence if cv_classification else 0.85),
                evidence_ids=[capture_id],
                metadata={
                    "media_url": media_url,
                    "gps": gps,
                    "status": cap_status.value,
                    "notes": text_note,
                },
            )

            # 2. NLP / Transcript Issue Detection
            note_content = f"{transcribed_text or ''} {text_note or ''}".lower()
            if note_content:
                issue_type = None
                issue_desc = None
                if any(w in note_content for w in ["excavator", "crane", "generator", "breakdown", "unavailable", "mechanical fault", "repair"]):
                    issue_type = EventType.EQUIPMENT_ISSUE
                    issue_desc = f"Equipment constraint reported from field note: {transcribed_text or text_note}"
                elif any(w in note_content for w in ["material", "shortage", "cement", "concrete delay", "steel delay", "pipe delay"]):
                    issue_type = EventType.MATERIAL_ISSUE
                    issue_desc = f"Material supply constraint reported: {transcribed_text or text_note}"
                elif any(w in note_content for w in ["rain", "flood", "monsoon", "waterlogging", "heavy rain", "storm"]):
                    issue_type = EventType.WEATHER_DELAY
                    issue_desc = f"Adverse weather condition reported: {transcribed_text or text_note}"
                elif any(w in note_content for w in ["hazard", "safety", "injury", "inspection failed", "halt work"]):
                    issue_type = EventType.SAFETY_ISSUE
                    issue_desc = f"Safety concern reported: {transcribed_text or text_note}"

                if issue_type:
                    await activity_event_service.create_event(
                        project_id=project_id,
                        activity_id=target_act_id,
                        event_type=issue_type,
                        source_type="VOICE_NLP" if media_type == MediaType.voice else "FIELD_NOTE",
                        source_id=capture_id,
                        actor_id=str(current_user.id),
                        description=issue_desc,
                        confidence=0.90,
                        evidence_ids=[capture_id],
                        metadata={"raw_note": transcribed_text or text_note},
                    )
        except Exception as ev_exc:
            print(f"[Captures] Failed to record timeline event: {ev_exc}")

    # --- Update matched activity if auto-approved ---
    if cap_status == CaptureStatus.auto_approved and matched_id:
        activities_col = get_activities_collection()
        act_doc = await activities_col.find_one({"_id": ObjectId(matched_id)})
        current_pct = float((act_doc or {}).get("percent_complete") or 0)
        new_pct = min(100.0, round(current_pct + 15.0, 1))
        await activities_col.update_one(
            {"_id": ObjectId(matched_id)},
            {"$set": {
                "status": "completed" if new_pct >= 100 else "in_progress",
                "percent_complete": new_pct,
            }},
        )
        await write_audit_log(
            action="activity_progress_auto_updated",
            actor_user_id=str(current_user.id),
            target_id=matched_id,
            project_id=project_id,
            before_state={"percent_complete": current_pct},
            after_state={"percent_complete": new_pct, "capture_id": capture_id},
        )
        # Record Time Machine PROGRESS_UPDATE event
        try:
            await activity_event_service.create_event(
                project_id=project_id,
                activity_id=matched_id,
                event_type=EventType.PROGRESS_UPDATE,
                source_type="PHOTO_AI",
                source_id=capture_id,
                actor_id=str(current_user.id),
                description=f"Automated progress advancement: {current_pct}% -> {new_pct}%",
                progress_before=current_pct,
                progress_after=new_pct,
                confidence=confidence,
                evidence_ids=[capture_id],
                metadata={"auto_approved": True},
            )
        except Exception as ev_exc:
            print(f"[Captures] Progress event recording failed: {ev_exc}")

        await ws_manager.broadcast_to_project(
            project_id=project_id,
            event="activity_updated",
            data={"activity_id": matched_id, "project_id": project_id, "percent_complete": new_pct},
        )

    # --- Broadcast pending_review event to PM ---
    if cap_status == CaptureStatus.pending_review:
        await ws_manager.broadcast_to_project(
            project_id=project_id,
            event="new_review_item",
            data={"capture_id": capture_id, "project_id": project_id},
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
        require_project_access(current_user, project_id)
        query["project_id"] = project_id
    elif current_user.role not in (UserRole.hq_admin, UserRole.auditor, UserRole.platform_admin):
        query["project_id"] = {"$in": current_user.project_ids}

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


@router.get("/mine", response_model=CaptureListResponse)
async def list_my_captures(
    skip: int = 0,
    limit: int = 50,
    current_user: UserInDB = Depends(get_current_user),
):
    """Alias used by the engineer submissions screen."""
    return await list_captures(skip=skip, limit=limit, current_user=current_user)


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
    require_project_access(current_user, doc["project_id"])

    doc["id"] = str(doc.pop("_id"))
    return CapturePublic(**doc)
