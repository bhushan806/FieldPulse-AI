"""
backend/app/models/document.py
Pydantic models for the `documents` MongoDB collection.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models._helpers import PyObjectId


class DocumentStatus(str, Enum):
    uploaded = "uploaded"
    processing = "processing"
    analyzed = "analyzed"
    failed = "failed"


class ProjectDocumentInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    project_id: str
    uploaded_by_user_id: str
    filename: str
    mime_type: str
    size_bytes: int
    storage_url: str
    status: DocumentStatus = DocumentStatus.uploaded
    extracted_text: Optional[str] = None
    structured_data: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ProjectDocumentPublic(BaseModel):
    id: str
    project_id: str
    uploaded_by_user_id: str
    filename: str
    mime_type: str
    size_bytes: int
    storage_url: str
    status: DocumentStatus
    created_at: datetime
