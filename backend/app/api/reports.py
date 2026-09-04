"""
backend/app/api/reports.py
Report export endpoint.

GET /api/reports/{project_id}   — download project report as JSON
"""
from datetime import datetime
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import require_pm_or_above
from app.db.mongo import (
    get_activities_collection,
    get_captures_collection,
    get_notifications_collection,
    get_projects_collection,
)
from app.models.activity import ScheduleActivityPublic
from app.models.capture import CapturePublic
from app.models.notification import NotificationPublic
from app.models.user import UserInDB

router = APIRouter(prefix="/api/reports", tags=["reports"])


class ReportExport(BaseModel):
    project_id: str
    project_name: str
    generated_at: str
    overall_percent_complete: float
    activities: List[ScheduleActivityPublic]
    recent_captures: List[CapturePublic]
    alerts: List[NotificationPublic]


@router.get("/{project_id}", response_model=ReportExport)
async def export_report(
    project_id: str,
    current_user: UserInDB = Depends(require_pm_or_above),
):
    proj_col = get_projects_collection()
    act_col = get_activities_collection()
    cap_col = get_captures_collection()
    notif_col = get_notifications_collection()

    try:
        proj_doc = await proj_col.find_one({"_id": ObjectId(project_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID.")
    if not proj_doc:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Activities
    act_docs = await act_col.find({"project_id": project_id}).to_list(length=None)
    activities = []
    for d in act_docs:
        d["id"] = str(d.pop("_id"))
        activities.append(ScheduleActivityPublic(**d))

    n = len(activities) or 1
    overall_pct = round(sum(a.percent_complete for a in activities) / n, 2)

    # Recent 20 captures
    cap_docs = await cap_col.find({"project_id": project_id}).sort("created_at", -1).limit(20).to_list(length=20)
    recent_captures = []
    for d in cap_docs:
        d["id"] = str(d.pop("_id"))
        recent_captures.append(CapturePublic(**d))

    # Notifications
    notif_docs = await notif_col.find({"project_id": project_id}).sort("created_at", -1).limit(50).to_list(length=50)
    alerts = []
    for d in notif_docs:
        d["id"] = str(d.pop("_id"))
        alerts.append(NotificationPublic(**d))

    return ReportExport(
        project_id=project_id,
        project_name=proj_doc.get("name", ""),
        generated_at=datetime.utcnow().isoformat(),
        overall_percent_complete=overall_pct,
        activities=activities,
        recent_captures=recent_captures,
        alerts=alerts,
    )
