"""
backend/app/api/documents.py
Endpoints for managing project documents and triggering AI extraction.
"""
import uuid
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, BackgroundTasks
from pydantic import BaseModel

from app.core.deps import get_current_user, require_hq_admin, require_pm_or_above
from app.db.mongo import get_database
from app.models.document import ProjectDocumentInDB, ProjectDocumentPublic, DocumentStatus
from app.models.user import UserInDB, UserRole
from app.services.media_storage import upload_media
from app.websocket.manager import ws_manager
from app.ai_engine.document_processor import process_document_background

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
    
    raw_bytes = await file.read()
    size_bytes = len(raw_bytes)
    
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
        "created_at": datetime.utcnow()
    }
    
    await docs_col.insert_one(doc)
    
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
    
    query = {"project_id": project_id}
    
    total = await docs_col.count_documents(query)
    cursor = docs_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    db_docs = await cursor.to_list(length=limit)
    
    items = []
    for d in db_docs:
        d["id"] = str(d.pop("_id"))
        items.append(ProjectDocumentPublic(**d))
        
    return DocumentListResponse(items=items, total=total)
