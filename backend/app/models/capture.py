"""
backend/app/models/capture.py
Pydantic models for the `captures` MongoDB collection.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models._helpers import PyObjectId, GeoPoint


class MediaType(str, Enum):
    photo = "photo"
    video = "video"
    voice = "voice"
    qr = "qr"


class CaptureStatus(str, Enum):
    processing = "processing"
    auto_approved = "auto_approved"
    pending_review = "pending_review"
    approved = "approved"
    rejected = "rejected"


class CvClassification(BaseModel):
    label: str = ""
    confidence: float = 0.0


class ExtractedEntities(BaseModel):
    activity: str = ""
    location: str = ""
    quantity: str = ""
    status: str = ""


class CaptureInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    project_id: str
    media_type: MediaType
    media_url: str = ""
    gps: Optional[GeoPoint] = None
    qr_code_value: Optional[str] = None
    transcribed_text: Optional[str] = None
    extracted_entities: Optional[ExtractedEntities] = None
    cv_classification: Optional[CvClassification] = None
    matched_activity_id: Optional[str] = None
    confidence_score: float = 0.0
    status: CaptureStatus = CaptureStatus.processing
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CapturePublic(BaseModel):
    id: str
    user_id: str
    project_id: str
    media_type: MediaType
    media_url: str
    gps: Optional[GeoPoint] = None
    qr_code_value: Optional[str] = None
    transcribed_text: Optional[str] = None
    extracted_entities: Optional[ExtractedEntities] = None
    cv_classification: Optional[CvClassification] = None
    matched_activity_id: Optional[str] = None
    confidence_score: float
    status: CaptureStatus
    rejection_reason: Optional[str] = None
    created_at: datetime
