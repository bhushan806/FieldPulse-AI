"""
backend/app/models/audit_log.py
Pydantic models for the `audit_logs` MongoDB collection.
"""
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models._helpers import PyObjectId


class AuditLogInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    action: str                         # e.g. "capture_approved", "capture_rejected"
    actor_user_id: str
    target_id: str                      # capture_id or activity_id being acted on
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class AuditLogPublic(BaseModel):
    id: str
    action: str
    actor_user_id: str
    target_id: str
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    timestamp: datetime
