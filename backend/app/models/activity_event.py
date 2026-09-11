"""
backend/app/models/activity_event.py
Pydantic models for the `activity_events` and `schedule_baselines` MongoDB collections.
Forms the core event-sourcing layer for AI Site Time Machine.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models._helpers import PyObjectId


class EventType(str, Enum):
    ACTIVITY_CREATED = "ACTIVITY_CREATED"
    SCHEDULE_UPDATED = "SCHEDULE_UPDATED"
    PROGRESS_UPDATE = "PROGRESS_UPDATE"
    PHOTO_CAPTURED = "PHOTO_CAPTURED"
    VIDEO_CAPTURED = "VIDEO_CAPTURED"
    VOICE_UPDATE = "VOICE_UPDATE"
    QR_SCAN = "QR_SCAN"
    WORKER_UPDATE = "WORKER_UPDATE"
    EQUIPMENT_ISSUE = "EQUIPMENT_ISSUE"
    MATERIAL_ISSUE = "MATERIAL_ISSUE"
    SAFETY_ISSUE = "SAFETY_ISSUE"
    WEATHER_DELAY = "WEATHER_DELAY"
    AI_DELAY_DETECTED = "AI_DELAY_DETECTED"
    PM_APPROVED = "PM_APPROVED"
    PM_REJECTED = "PM_REJECTED"
    CORRECTIVE_ACTION_CREATED = "CORRECTIVE_ACTION_CREATED"
    CORRECTIVE_ACTION_RESOLVED = "CORRECTIVE_ACTION_RESOLVED"
    FORECAST_UPDATED = "FORECAST_UPDATED"
    MILESTONE_RISK_CHANGED = "MILESTONE_RISK_CHANGED"


class ActivityEventInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    project_id: str
    activity_id: str
    event_type: EventType
    timestamp: datetime
    source_type: str                     # e.g. PHOTO_AI, VOICE_WHISPER, QR_SCAN, PM_REVIEW, ISSUE, SCHEDULE, AI_ENGINE
    source_id: Optional[str] = None      # e.g. capture_id, issue_id, schedule_id
    actor_id: Optional[str] = None       # user_id who triggered or submitted
    description: Optional[str] = None
    progress_before: Optional[float] = None
    progress_after: Optional[float] = None
    confidence: Optional[float] = None
    evidence_ids: List[str] = []
    metadata: Dict[str, Any] = {}
    integrity_hash: Optional[str] = None
    idempotency_key: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ActivityEventPublic(BaseModel):
    id: str
    project_id: str
    activity_id: str
    event_type: EventType
    timestamp: datetime
    source_type: str
    source_id: Optional[str] = None
    actor_id: Optional[str] = None
    description: Optional[str] = None
    progress_before: Optional[float] = None
    progress_after: Optional[float] = None
    confidence: Optional[float] = None
    evidence_ids: List[str] = []
    metadata: Dict[str, Any] = {}
    integrity_hash: Optional[str] = None
    created_at: datetime


class ScheduleBaselineInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    project_id: str
    activity_id: str
    version: int = 1
    planned_start: datetime
    planned_end: datetime
    planned_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    baseline_duration_days: int
    dependencies: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ScheduleBaselinePublic(BaseModel):
    id: str
    project_id: str
    activity_id: str
    version: int
    planned_start: datetime
    planned_end: datetime
    planned_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    baseline_duration_days: int
    dependencies: List[str] = []
    created_at: datetime
    created_by: Optional[str] = None
    notes: Optional[str] = None
