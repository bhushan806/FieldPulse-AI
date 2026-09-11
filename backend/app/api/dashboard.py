"""
backend/app/api/dashboard.py
Dashboard data endpoints.

GET /api/dashboard/{project_id}  — PM project dashboard (metrics + S-curve)
GET /api/dashboard/portfolio      — HQ / Auditor portfolio overview
"""
from typing import List, Optional, Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.ai_engine.forecasting import (
    build_s_curve,
    compute_project_status,
    detect_delayed_activities,
)
from app.core.deps import get_current_user, require_hq_or_auditor, require_pm_or_above, require_project_access
from app.db.mongo import get_activities_collection, get_projects_collection, get_captures_collection, get_users_collection
from app.models.activity import ScheduleActivityInDB
from app.models.user import UserInDB, UserRole

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class SCurvePoint(BaseModel):
    date: str
    planned_percent: float
    actual_percent: float


class DashboardMetrics(BaseModel):
    project_id: str
    project_name: str
    overall_percent_complete: float
    status: str
    total_activities: int
    completed_activities: int
    delayed_activities: int
    s_curve: List[SCurvePoint]


class ProjectSummary(BaseModel):
    id: str
    name: str
    status: str
    percent_complete: float
    location: Optional[Any] = None
    pm_name: Optional[str] = None
    last_activity_at: Optional[Any] = None


class PortfolioDashboard(BaseModel):
    total_projects: int
    on_track: int
    at_risk: int
    delayed: int
    overall_percent_complete: float
    projects: List[ProjectSummary]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_activities(project_id: str) -> List[ScheduleActivityInDB]:
    col = get_activities_collection()
    docs = await col.find({"project_id": project_id}).to_list(length=500)
    return [ScheduleActivityInDB(**d) for d in docs]


# ---------------------------------------------------------------------------
# GET /api/dashboard/portfolio
# ---------------------------------------------------------------------------

@router.get("/portfolio", response_model=PortfolioDashboard)
async def portfolio_dashboard(
    current_user: UserInDB = Depends(require_hq_or_auditor),
):
    """Portfolio-wide view for HQ Admin and Auditor (batch optimized)."""
    proj_col = get_projects_collection()
    act_col = get_activities_collection()
    user_col = get_users_collection()
    cap_col = get_captures_collection()

    all_projects = await proj_col.find({}).to_list(length=None)
    if not all_projects:
        return PortfolioDashboard(
            total_projects=0,
            on_track=0,
            at_risk=0,
            delayed=0,
            overall_percent_complete=0.0,
            projects=[],
        )

    all_project_ids = [str(p["_id"]) for p in all_projects]

    # 1. Batch fetch all activities across projects in one query
    act_docs = await act_col.find({"project_id": {"$in": all_project_ids}}).to_list(length=None)
    activities_by_pid: dict[str, list[ScheduleActivityInDB]] = {}
    for d in act_docs:
        pid = d.get("project_id")
        if pid:
            if pid not in activities_by_pid:
                activities_by_pid[pid] = []
            activities_by_pid[pid].append(ScheduleActivityInDB(**d))

    # 2. Batch fetch all PM user names in one query
    pm_oids = [
        ObjectId(p["pm_user_id"])
        for p in all_projects
        if p.get("pm_user_id") and ObjectId.is_valid(p["pm_user_id"])
    ]
    pms_map: dict[str, str] = {}
    if pm_oids:
        pm_cursor = user_col.find({"_id": {"$in": pm_oids}}, {"name": 1})
        pm_list = await pm_cursor.to_list(length=len(pm_oids))
        pms_map = {str(u["_id"]): u.get("name") for u in pm_list if u.get("name")}

    # 3. Batch aggregate latest capture created_at per project
    last_capture_pipeline = [
        {"$match": {"project_id": {"$in": all_project_ids}}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$project_id", "last_activity_at": {"$first": "$created_at"}}},
    ]
    last_captures = await cap_col.aggregate(last_capture_pipeline).to_list(length=None)
    last_capture_map = {c["_id"]: c.get("last_activity_at") for c in last_captures}

    summaries: List[ProjectSummary] = []
    on_track = at_risk = delayed_count = 0
    total_pct = 0.0

    for proj in all_projects:
        pid = str(proj["_id"])
        activities = activities_by_pid.get(pid, [])

        if activities:
            pct = round(sum(a.percent_complete for a in activities) / len(activities), 2)
        else:
            pct = 0.0

        proj_status = compute_project_status(activities)

        if proj_status == "on_track":
            on_track += 1
        elif proj_status == "at_risk":
            at_risk += 1
        else:
            delayed_count += 1

        total_pct += pct
        pm_uid = str(proj.get("pm_user_id", ""))
        pm_name = pms_map.get(pm_uid)

        summaries.append(ProjectSummary(
            id=pid,
            name=proj.get("name", "Unknown"),
            status=proj_status,
            percent_complete=pct,
            location=proj.get("location"),
            pm_name=pm_name,
            last_activity_at=last_capture_map.get(pid),
        ))

    n = len(all_projects) or 1
    return PortfolioDashboard(
        total_projects=len(all_projects),
        on_track=on_track,
        at_risk=at_risk,
        delayed=delayed_count,
        overall_percent_complete=round(total_pct / n, 2),
        projects=summaries,
    )


# ---------------------------------------------------------------------------
# GET /api/dashboard/{project_id}
# ---------------------------------------------------------------------------

@router.get("/{project_id}", response_model=DashboardMetrics)
async def project_dashboard(
    project_id: str,
    current_user: UserInDB = Depends(require_pm_or_above),
):
    """Project-level dashboard for PM, HQ, Auditor."""
    proj_col = get_projects_collection()
    try:
        proj_doc = await proj_col.find_one({"_id": ObjectId(project_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID.")
    if not proj_doc:
        raise HTTPException(status_code=404, detail="Project not found.")
    require_project_access(current_user, project_id)

    activities = await _get_activities(project_id)
    n = len(activities) or 1

    overall_pct = round(sum(a.percent_complete for a in activities) / n, 2)
    completed = sum(1 for a in activities if a.percent_complete >= 100)
    delayed = detect_delayed_activities(activities)
    proj_status = compute_project_status(activities)
    raw_curve = build_s_curve(activities)
    curve = [SCurvePoint(**p) for p in raw_curve]

    return DashboardMetrics(
        project_id=project_id,
        project_name=proj_doc.get("name", ""),
        overall_percent_complete=overall_pct,
        status=proj_status,
        total_activities=len(activities),
        completed_activities=completed,
        delayed_activities=len(delayed),
        s_curve=curve,
    )
