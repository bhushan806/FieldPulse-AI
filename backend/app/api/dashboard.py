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
from app.core.deps import get_current_user, require_hq_or_auditor, require_pm_or_above
from app.db.mongo import get_activities_collection, get_projects_collection
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
    docs = await col.find({"project_id": project_id}).to_list(length=None)
    return [ScheduleActivityInDB(**d) for d in docs]


# ---------------------------------------------------------------------------
# GET /api/dashboard/portfolio
# ---------------------------------------------------------------------------

@router.get("/portfolio", response_model=PortfolioDashboard)
async def portfolio_dashboard(
    current_user: UserInDB = Depends(require_hq_or_auditor),
):
    """Portfolio-wide view for HQ Admin and Auditor."""
    proj_col = get_projects_collection()
    all_projects = await proj_col.find({}).to_list(length=None)

    summaries: List[ProjectSummary] = []
    on_track = at_risk = delayed_count = 0
    total_pct = 0.0

    for proj in all_projects:
        pid = str(proj["_id"])
        activities = await _get_activities(pid)

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
        summaries.append(ProjectSummary(
            id=pid,
            name=proj.get("name", "Unknown"),
            status=proj_status,
            percent_complete=pct,
            location=proj.get("location"),
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
