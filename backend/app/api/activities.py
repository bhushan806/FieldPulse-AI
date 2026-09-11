"""
backend/app/api/activities.py
Activity endpoints for AI Site Time Machine.
Provides:
  - GET  /api/activities/{activity_id}
  - GET  /api/activities/{activity_id}/timeline
  - GET  /api/activities/{activity_id}/timeline/root-cause
  - GET  /api/activities/{activity_id}/timeline/impact
  - POST /api/activities/{activity_id}/timeline/ask
  - GET  /api/activities/{activity_id}/evidence/{evidence_id}
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.deps import get_current_user, require_project_access
from app.db.mongo import (
    get_activities_collection,
    get_captures_collection,
    get_database,
    get_users_collection,
)
from app.models.activity import ScheduleActivityInDB, ScheduleActivityPublic
from app.models.activity_event import ActivityEventPublic
from app.models.user import UserInDB
from app.services.activity_event_service import activity_event_service
from app.services.delay_engine import compute_activity_delay
from app.services.root_cause_engine import analyze_root_cause
from app.services.impact_engine import compute_downstream_impact

router = APIRouter(prefix="/api/activities", tags=["activities"])


# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class ActivitySummary(BaseModel):
    id: str
    project_id: str
    activity_code: str
    activity_name: str
    planned_progress: float
    actual_progress: float
    planned_start: Optional[str] = None
    planned_finish: Optional[str] = None
    forecast_finish: Optional[str] = None
    delay_days: int
    schedule_variance: float
    risk: str
    status: str
    dependencies: List[str] = []
    milestone: Optional[str] = None
    critical_path: bool = False
    planned_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None


class RootCauseSummary(BaseModel):
    primary_cause: str
    cause_code: str
    confidence: float
    explanation: str
    supporting_event_ids: List[str] = []
    contributing_factors: List[Dict[str, Any]] = []


class DownstreamImpactSummary(BaseModel):
    activity_delay_days: int
    affected_activities: List[Dict[str, Any]] = []
    affected_milestones: List[Dict[str, Any]] = []
    has_downstream_impact: bool


class PaginationMeta(BaseModel):
    total: int
    skip: int
    limit: int
    has_more: bool


class ActivityTimelineResponse(BaseModel):
    activity: ActivitySummary
    timeline: List[ActivityEventPublic]
    root_cause: RootCauseSummary
    downstream_impact: DownstreamImpactSummary
    pagination: PaginationMeta


class AskQuestionRequest(BaseModel):
    question: str


class AskQuestionResponse(BaseModel):
    answer: str
    supporting_event_ids: List[str] = []
    confidence: float


class EvidenceDetailsResponse(BaseModel):
    id: str
    project_id: str
    activity_id: Optional[str] = None
    media_type: str
    media_url: str
    gps: Optional[Dict[str, Any]] = None
    qr_code_value: Optional[str] = None
    transcribed_text: Optional[str] = None
    extracted_entities: Optional[Dict[str, Any]] = None
    cv_classification: Optional[Dict[str, Any]] = None
    uploader_name: Optional[str] = None
    uploader_role: Optional[str] = None
    created_at: str
    status: str
    processing_notes: List[str] = []


# ---------------------------------------------------------------------------
# Helper: Fetch and Authorize Activity
# ---------------------------------------------------------------------------

async def _get_authorized_activity(activity_id: str, current_user: UserInDB) -> ScheduleActivityInDB:
    if not ObjectId.is_valid(activity_id):
        raise HTTPException(status_code=400, detail="Invalid activity ID format.")

    col = get_activities_collection()
    doc = await col.find_one({"_id": ObjectId(activity_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Activity not found.")

    require_project_access(current_user, doc["project_id"])
    return ScheduleActivityInDB(**doc)


# ---------------------------------------------------------------------------
# GET /api/activities/{activity_id}
# ---------------------------------------------------------------------------

@router.get("/{activity_id}", response_model=ScheduleActivityPublic)
async def get_activity_details(
    activity_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    activity = await _get_authorized_activity(activity_id, current_user)
    pub = activity.dict(by_alias=False)
    pub["id"] = str(activity.id)
    return ScheduleActivityPublic(**pub)


# ---------------------------------------------------------------------------
# GET /api/activities/{activity_id}/timeline
# ---------------------------------------------------------------------------

@router.get("/{activity_id}/timeline", response_model=ActivityTimelineResponse)
async def get_activity_timeline_view(
    activity_id: str,
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    event_type: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Reconstructs the authentic timeline of an activity from real evidence.
    Computes delay, evidence-grounded root cause, and downstream impact.
    """
    activity = await _get_authorized_activity(activity_id, current_user)

    # 1. Fetch latest baseline snapshot if available
    latest_bl = await activity_event_service.get_latest_baseline(activity_id)
    baseline_override = None
    if latest_bl:
        baseline_override = {
            "planned_start": latest_bl.planned_start,
            "planned_end": latest_bl.planned_end,
        }

    # 2. Compute delay metrics
    delay_metrics = compute_activity_delay(activity, baseline_override=baseline_override)

    # 3. Retrieve timeline events
    events, total = await activity_event_service.get_activity_timeline(
        activity_id=activity_id,
        from_date=from_date,
        to_date=to_date,
        event_type=event_type,
        source_type=source_type,
        skip=skip,
        limit=limit,
    )

    # 4. Analyze root cause using all events available
    all_events, _ = await activity_event_service.get_activity_timeline(
        activity_id=activity_id,
        limit=500,
    )
    rc_result = analyze_root_cause(activity, all_events, delay_metrics)

    # 5. Compute downstream impact using all activities in the project
    act_col = get_activities_collection()
    proj_act_docs = await act_col.find({"project_id": activity.project_id}).to_list(length=None)
    all_project_activities = [ScheduleActivityInDB(**d) for d in proj_act_docs]

    impact_result = compute_downstream_impact(
        target_activity=activity,
        all_project_activities=all_project_activities,
        delay_days=delay_metrics.get("delay_days", 0),
    )

    act_summary = ActivitySummary(
        id=str(activity.id),
        project_id=activity.project_id,
        activity_code=activity.activity_code,
        activity_name=activity.activity_name,
        planned_progress=delay_metrics.get("planned_percent", 0.0),
        actual_progress=delay_metrics.get("actual_percent", 0.0),
        planned_start=delay_metrics.get("planned_start"),
        planned_finish=delay_metrics.get("planned_finish"),
        forecast_finish=delay_metrics.get("forecast_finish"),
        delay_days=delay_metrics.get("delay_days", 0),
        schedule_variance=delay_metrics.get("schedule_variance", 0.0),
        risk=delay_metrics.get("risk_level", "LOW"),
        status=activity.status.value,
        dependencies=activity.dependencies,
        milestone=activity.milestone,
        critical_path=bool(activity.critical_path),
        planned_quantity=activity.planned_quantity,
        quantity_unit=activity.quantity_unit,
    )

    return ActivityTimelineResponse(
        activity=act_summary,
        timeline=events,
        root_cause=RootCauseSummary(**rc_result),
        downstream_impact=DownstreamImpactSummary(**impact_result),
        pagination=PaginationMeta(
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + len(events)) < total,
        ),
    )


# ---------------------------------------------------------------------------
# GET /api/activities/{activity_id}/timeline/root-cause
# ---------------------------------------------------------------------------

@router.get("/{activity_id}/timeline/root-cause", response_model=RootCauseSummary)
async def get_activity_root_cause(
    activity_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    activity = await _get_authorized_activity(activity_id, current_user)
    latest_bl = await activity_event_service.get_latest_baseline(activity_id)
    baseline_override = {
        "planned_start": latest_bl.planned_start,
        "planned_end": latest_bl.planned_end,
    } if latest_bl else None

    delay_metrics = compute_activity_delay(activity, baseline_override=baseline_override)
    all_events, _ = await activity_event_service.get_activity_timeline(activity_id=activity_id, limit=500)
    rc_result = analyze_root_cause(activity, all_events, delay_metrics)
    return RootCauseSummary(**rc_result)


# ---------------------------------------------------------------------------
# GET /api/activities/{activity_id}/timeline/impact
# ---------------------------------------------------------------------------

@router.get("/{activity_id}/timeline/impact", response_model=DownstreamImpactSummary)
async def get_activity_downstream_impact(
    activity_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    activity = await _get_authorized_activity(activity_id, current_user)
    delay_metrics = compute_activity_delay(activity)

    act_col = get_activities_collection()
    proj_act_docs = await act_col.find({"project_id": activity.project_id}).to_list(length=None)
    all_project_activities = [ScheduleActivityInDB(**d) for d in proj_act_docs]

    impact_result = compute_downstream_impact(
        target_activity=activity,
        all_project_activities=all_project_activities,
        delay_days=delay_metrics.get("delay_days", 0),
    )
    return DownstreamImpactSummary(**impact_result)


# ---------------------------------------------------------------------------
# POST /api/activities/{activity_id}/timeline/ask
# ---------------------------------------------------------------------------

@router.post("/{activity_id}/timeline/ask", response_model=AskQuestionResponse)
async def ask_time_machine(
    activity_id: str,
    body: AskQuestionRequest,
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Evidence-grounded Q&A against the activity's real timeline.
    Strictly answers from factual timeline records without hallucination.
    """
    activity = await _get_authorized_activity(activity_id, current_user)
    q = body.question.strip().lower()

    delay_metrics = compute_activity_delay(activity)
    events, _ = await activity_event_service.get_activity_timeline(activity_id=activity_id, limit=200)
    root_cause = analyze_root_cause(activity, events, delay_metrics)

    # Formulate answer strictly from structured evidence
    supporting_ids = root_cause.get("supporting_event_ids", [])

    if any(k in q for k in ["why", "delay", "behind", "cause", "reason", "slow", "problem"]):
        if delay_metrics.get("delay_days", 0) > 0:
            answer = (
                f"{activity.activity_name} ({activity.activity_code}) is currently "
                f"{delay_metrics.get('delay_days')} days behind baseline schedule. "
                f"The primary verified cause is {root_cause['primary_cause']}. "
                f"{root_cause['explanation']}"
            )
            return AskQuestionResponse(
                answer=answer,
                supporting_event_ids=supporting_ids,
                confidence=root_cause.get("confidence", 0.90),
            )
        else:
            return AskQuestionResponse(
                answer=(
                    f"{activity.activity_name} ({activity.activity_code}) is currently on track at "
                    f"{activity.percent_complete}% completion. No active delay has been recorded."
                ),
                supporting_event_ids=[],
                confidence=0.95,
            )

    if any(k in q for k in ["impact", "affect", "downstream", "successor", "milestone"]):
        act_col = get_activities_collection()
        proj_act_docs = await act_col.find({"project_id": activity.project_id}).to_list(length=None)
        all_project_activities = [ScheduleActivityInDB(**d) for d in proj_act_docs]
        impact = compute_downstream_impact(activity, all_project_activities, delay_metrics.get("delay_days", 0))

        if impact["affected_activities"]:
            aff_list = ", ".join(f"{a['activity_code']} (+{a['estimated_impact_days']}d)" for a in impact["affected_activities"][:3])
            m_list = ", ".join(f"{m['milestone_name']} ({m['risk']} RISK)" for m in impact["affected_milestones"])
            answer = (
                f"The delay of {delay_metrics.get('delay_days')} days is projected to affect downstream activities: {aff_list}. "
            )
            if m_list:
                answer += f"Affected milestones: {m_list}."
            return AskQuestionResponse(answer=answer, supporting_event_ids=supporting_ids, confidence=0.88)
        else:
            return AskQuestionResponse(
                answer=f"No downstream successors or milestones are currently impacted by {activity.activity_code}.",
                supporting_event_ids=[],
                confidence=0.90,
            )

    if any(k in q for k in ["progress", "completion", "percent", "status"]):
        last_progress_ev = next((e for e in reversed(events) if e.progress_after is not None), None)
        answer = (
            f"{activity.activity_name} is currently at {activity.percent_complete}% progress (Status: {activity.status.value}). "
            f"Planned progress for this date is {delay_metrics.get('planned_percent')}%. "
        )
        if last_progress_ev:
            answer += f"Latest progress verification was recorded on {last_progress_ev.timestamp.strftime('%b %d, %Y')}."
            supporting_ids = [last_progress_ev.id]
        return AskQuestionResponse(answer=answer, supporting_event_ids=supporting_ids, confidence=0.95)

    # General / Evidence timeline summary
    if events:
        first_ev = events[0]
        last_ev = events[-1]
        answer = (
            f"Activity {activity.activity_code} has {len(events)} recorded timeline events spanning from "
            f"{first_ev.timestamp.strftime('%b %d, %Y')} to {last_ev.timestamp.strftime('%b %d, %Y')}. "
            f"Latest event: {last_ev.description or last_ev.event_type.value}."
        )
        return AskQuestionResponse(
            answer=answer,
            supporting_event_ids=[last_ev.id],
            confidence=0.90,
        )

    return AskQuestionResponse(
        answer="The available evidence is insufficient to determine a reliable answer for this query.",
        supporting_event_ids=[],
        confidence=0.50,
    )


# ---------------------------------------------------------------------------
# GET /api/activities/{activity_id}/evidence/{evidence_id}
# ---------------------------------------------------------------------------

@router.get("/{activity_id}/evidence/{evidence_id}", response_model=EvidenceDetailsResponse)
async def get_activity_evidence(
    activity_id: str,
    evidence_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Secure evidence retrieval endpoint with project access validation.
    Prevents IDOR and cross-project evidence leakage.
    """
    activity = await _get_authorized_activity(activity_id, current_user)

    if not ObjectId.is_valid(evidence_id):
        raise HTTPException(status_code=400, detail="Invalid evidence ID format.")

    cap_col = get_captures_collection()
    cap = await cap_col.find_one({"_id": ObjectId(evidence_id)})

    if not cap:
        # Check if evidence is an issue
        db = get_database()
        issue = await db["issues"].find_one({"_id": ObjectId(evidence_id)})
        if issue and issue.get("project_id") == activity.project_id:
            return EvidenceDetailsResponse(
                id=str(issue["_id"]),
                project_id=issue["project_id"],
                activity_id=issue.get("activity_id"),
                media_type="issue",
                media_url="",
                created_at=issue["created_at"].isoformat(),
                status=issue.get("status", "open"),
                processing_notes=[f"Severity: {issue.get('severity')}", f"Title: {issue.get('title')}"],
            )
        raise HTTPException(status_code=404, detail="Evidence not found.")

    # Validate project isolation
    if cap.get("project_id") != activity.project_id:
        raise HTTPException(status_code=403, detail="Evidence does not belong to this activity's project.")

    uploader_name = None
    uploader_role = None
    if cap.get("user_id") and ObjectId.is_valid(cap["user_id"]):
        u_doc = await get_users_collection().find_one({"_id": ObjectId(cap["user_id"])})
        if u_doc:
            uploader_name = u_doc.get("name")
            uploader_role = u_doc.get("role")

    return EvidenceDetailsResponse(
        id=str(cap["_id"]),
        project_id=cap["project_id"],
        activity_id=cap.get("matched_activity_id"),
        media_type=cap.get("media_type", "photo"),
        media_url=cap.get("media_url", ""),
        gps=cap.get("gps"),
        qr_code_value=cap.get("qr_code_value"),
        transcribed_text=cap.get("transcribed_text"),
        extracted_entities=cap.get("extracted_entities"),
        cv_classification=cap.get("cv_classification"),
        uploader_name=uploader_name,
        uploader_role=uploader_role,
        created_at=cap["created_at"].isoformat() if cap.get("created_at") else datetime.utcnow().isoformat(),
        status=cap.get("status", "approved"),
        processing_notes=cap.get("processing_notes", []),
    )
