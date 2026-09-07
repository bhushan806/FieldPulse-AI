"""
backend/app/models/activity.py
Pydantic models for the `schedule_activities` MongoDB collection.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models._helpers import PyObjectId, GeoPoint


class ActivityStatus(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"
    delayed = "delayed"


class ScheduleActivityInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    project_id: str
    activity_code: str
    activity_name: str
    location: Optional[GeoPoint] = None
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    percent_complete: float = Field(default=0.0, ge=0, le=100)
    status: ActivityStatus = ActivityStatus.not_started
    keywords: List[str] = []

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ScheduleActivityPublic(BaseModel):
    id: str
    project_id: str
    activity_code: str
    activity_name: str
    location: Optional[GeoPoint] = None
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    percent_complete: float
    status: ActivityStatus
    keywords: List[str]
