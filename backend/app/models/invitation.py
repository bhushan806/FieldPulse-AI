"""
backend/app/models/invitation.py
Pydantic models for the `invitations` MongoDB collection.
"""
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from app.models._helpers import PyObjectId
from app.models.user import UserRole


class InvitationStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    expired = "expired"
    revoked = "revoked"


class InvitationInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr
    project_id: str
    role: UserRole
    invited_by_user_id: str
    token: str
    status: InvitationStatus = InvitationStatus.pending
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class InvitationPublic(BaseModel):
    id: str
    email: EmailStr
    project_id: str
    role: UserRole
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime
