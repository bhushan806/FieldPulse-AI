"""
backend/app/models/issue.py
Pydantic models for the `issues` MongoDB collection.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models._helpers import PyObjectId


class IssueSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IssueStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"


class IssueInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    project_id: str
    activity_id: Optional[str] = None
    created_by: str
    assigned_to: Optional[str] = None
    title: str
    description: str
    severity: IssueSeverity = IssueSeverity.medium
    status: IssueStatus = IssueStatus.open
    evidence_capture_ids: List[str] = []
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class IssuePublic(BaseModel):
    id: str
    project_id: str
    activity_id: Optional[str] = None
    created_by: str
    assigned_to: Optional[str] = None
    title: str
    description: str
    severity: IssueSeverity
    status: IssueStatus
    evidence_capture_ids: List[str]
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
