"""
backend/app/api/documents.py
Endpoints for managing project documents and triggering AI extraction.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, BackgroundTasks
from pydantic import BaseModel

from app.core.deps import get_current_user, require_hq_admin, require_pm_or_above, require_project_access
from app.db.mongo import get_database, get_projects_collection
from app.models.document import ProjectDocumentInDB, ProjectDocumentPublic, DocumentStatus
from app.models.user import UserInDB, UserRole
from app.services.media_storage import upload_media
from app.websocket.manager import ws_manager
from app.ai_engine.document_processor import process_document_background
from app.services.audit import write_audit_log

router = APIRouter(prefix="/api/documents", tags=["documents"])


class DocumentListResponse(BaseModel):
    items: List[ProjectDocumentPublic]
    total: int


@router.post("/", response_model=ProjectDocumentPublic, status_code=status.HTTP_201_CREATED)
async def upload_project_document(
    background_tasks: BackgroundTasks,
    project_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(require_hq_admin),
):
    """Upload a project document (PDF, Excel, etc.) for AI extraction. (HQ Admin only)"""
    db = get_database()
    docs_col = db["documents"]
    if not ObjectId.is_valid(project_id) or not await get_projects_collection().find_one({"_id": ObjectId(project_id)}):
        raise HTTPException(status_code=404, detail="Project not found.")
    require_project_access(current_user, project_id)
    
    raw_bytes = await file.read()
    size_bytes = len(raw_bytes)

    # Enforce 50 MB size limit
    MAX_DOC_BYTES = 50 * 1024 * 1024
    if size_bytes > MAX_DOC_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is 50 MB (received {size_bytes // (1024*1024)} MB).",
        )

    # MIME type allowlist for documents
    ALLOWED_DOC_MIMES = (
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/csv",
        "text/plain",
        "image/",
    )
    content_type = file.content_type or ""
    if not any(content_type.startswith(m) or content_type == m for m in ALLOWED_DOC_MIMES):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{content_type}'. Allowed: PDF, Excel, Word, CSV, images.",
        )
    
    # Store securely via our media storage service
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    unique_name = f"documents/{project_id}/{uuid.uuid4().hex}.{ext}"
    
    try:
        # Assuming upload_media handles raw resources if specified
        media_url = await upload_media(raw_bytes, unique_name, resource_type="raw")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")
        
    doc_id = ObjectId()
    doc = {
        "_id": doc_id,
        "project_id": project_id,
        "uploaded_by_user_id": str(current_user.id),
        "filename": file.filename,
        "mime_type": file.content_type or "application/octet-stream",
        "size_bytes": size_bytes,
        "storage_url": media_url,
        "status": DocumentStatus.uploaded.value,
        "extracted_text": None,
        "structured_data": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await docs_col.insert_one(doc)
    await write_audit_log(
        action="project_document_uploaded",
        actor_user_id=str(current_user.id),
        target_id=str(doc_id),
        project_id=project_id,
        after_state={"filename": file.filename, "size_bytes": size_bytes},
    )
    
    # Trigger background task for AI document extraction
    background_tasks.add_task(process_document_background, str(doc_id), raw_bytes, file.filename)
    
    doc["id"] = str(doc.pop("_id"))
    return ProjectDocumentPublic(**doc)


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    project_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: UserInDB = Depends(require_pm_or_above),
):
    """List documents for a project."""
    db = get_database()
    docs_col = db["documents"]
    require_project_access(current_user, project_id)
    
    query = {"project_id": project_id}
    
    total = await docs_col.count_documents(query)
    cursor = docs_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    db_docs = await cursor.to_list(length=limit)
    
    items = []
    for d in db_docs:
        d["id"] = str(d.pop("_id"))
        items.append(ProjectDocumentPublic(**d))
        
    return DocumentListResponse(items=items, total=total)


@router.get("/{document_id}", response_model=ProjectDocumentPublic)
async def get_document(
    document_id: str,
    current_user: UserInDB = Depends(require_pm_or_above),
):
    """Retrieve a single document by ID with strict IDOR access control."""
    if not ObjectId.is_valid(document_id):
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    db = get_database()
    doc = await db["documents"].find_one({"_id": ObjectId(document_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    require_project_access(current_user, doc["project_id"])
    doc["id"] = str(doc.pop("_id"))
    return ProjectDocumentPublic(**doc)


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: str,
    current_user: UserInDB = Depends(require_hq_admin),
):
    """Delete a project document (HQ Admin only, with strict tenant check)."""
    if not ObjectId.is_valid(document_id):
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    db = get_database()
    doc = await db["documents"].find_one({"_id": ObjectId(document_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    require_project_access(current_user, doc["project_id"])
    await db["documents"].delete_one({"_id": ObjectId(document_id)})

    await write_audit_log(
        action="project_document_deleted",
        actor_user_id=str(current_user.id),
        target_id=document_id,
        project_id=doc["project_id"],
        before_state={"filename": doc.get("filename"), "size_bytes": doc.get("size_bytes")},
    )

    return {"detail": "Document deleted successfully."}
