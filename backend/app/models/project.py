"""
backend/app/models/project.py
Pydantic models for the `projects` MongoDB collection.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models._helpers import PyObjectId, GeoPoint


class RosterStatus(str, Enum):
    invited = "invited"
    active = "active"


class RosterEntry(BaseModel):
    phone: str
    name: str
    status: RosterStatus = RosterStatus.invited
    added_at: datetime = Field(default_factory=datetime.utcnow)



class ProjectStatus(str, Enum):
    on_track = "on_track"
    at_risk = "at_risk"
    delayed = "delayed"


class ProjectInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    location: Optional[GeoPoint] = None
    status: ProjectStatus = ProjectStatus.on_track
    start_date: datetime
    end_date: datetime
    engineers: list[RosterEntry] = []
    pm_user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ProjectPublic(BaseModel):
    id: str
    name: str
    location: Optional[GeoPoint] = None
    status: ProjectStatus
    start_date: datetime
    end_date: datetime
    engineers: list[RosterEntry] = []
    pm_user_id: Optional[str] = None
    created_at: datetime
