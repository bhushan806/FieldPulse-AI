"""
backend/app/models/notification.py
Pydantic models for the `notifications` MongoDB collection.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models._helpers import PyObjectId


class AlertType(str, Enum):
    delay = "delay"
    critical_path = "critical_path"
    warning = "warning"
    info = "info"
    critical = "critical"


class NotificationInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    project_id: str
    activity_id: Optional[str] = None
    type: AlertType = AlertType.delay
    title: Optional[str] = None
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read_by: List[str] = []             # list of user_id strings

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class NotificationPublic(BaseModel):
    id: str
    project_id: str
    project_name: Optional[str] = None
    activity_id: Optional[str] = None
    type: AlertType
    title: Optional[str] = None
    message: str
    created_at: datetime
    read_by: List[str] = []

