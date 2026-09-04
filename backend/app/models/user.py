"""
backend/app/models/user.py
Pydantic models for the `users` MongoDB collection.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from app.models._helpers import PyObjectId


class UserRole(str, Enum):
    site_engineer = "site_engineer"
    project_manager = "project_manager"
    hq_admin = "hq_admin"
    auditor = "auditor"
    platform_admin = "platform_admin"  # Super-role: bypasses all role guards


class UserInDB(BaseModel):
    """Exact shape stored in MongoDB — includes password_hash."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    password_hash: Optional[str] = None
    role: UserRole
    project_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class UserPublic(BaseModel):
    """Safe shape returned to API consumers — no password_hash."""
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    role: UserRole
    project_ids: List[str] = []
    created_at: datetime


class UserCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None   # plain-text; hashed before storage
    role: UserRole = UserRole.site_engineer
    project_ids: List[str] = []
