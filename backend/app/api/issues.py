"""
backend/app/api/issues.py
Endpoints for managing field issues.
"""
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.deps import get_current_user, require_pm_or_above, require_project_access
from app.db.mongo import get_database, get_projects_collection, get_activities_collection
from app.models.activity_event import EventType
from app.models.issue import IssueInDB, IssuePublic, IssueSeverity, IssueStatus
from app.models.user import UserInDB, UserRole
from app.services.activity_event_service import activity_event_service
from app.websocket.manager import ws_manager
from app.services.audit import write_audit_log

router = APIRouter(prefix="/api/issues", tags=["issues"])


class IssueCreateBody(BaseModel):
    project_id: str
    activity_id: Optional[str] = None
    title: str
    description: str
    severity: IssueSeverity = IssueSeverity.medium
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None
    evidence_capture_ids: List[str] = []


class IssueUpdateBody(BaseModel):
    status: Optional[IssueStatus] = None
    severity: Optional[IssueSeverity] = None
    assigned_to: Optional[str] = None
    evidence_capture_ids: Optional[List[str]] = None


class IssueListResponse(BaseModel):
    items: List[IssuePublic]
    total: int


@router.post("/", response_model=IssuePublic, status_code=status.HTTP_201_CREATED)
async def create_issue(
    body: IssueCreateBody,
    current_user: UserInDB = Depends(get_current_user),
):
    """Create a new field issue. Engineers can report issues."""
    db = get_database()
    issues_col = db["issues"]
    require_project_access(current_user, body.project_id)
    if not ObjectId.is_valid(body.project_id) or not await get_projects_collection().find_one({"_id": ObjectId(body.project_id)}):
        raise HTTPException(status_code=404, detail="Project not found.")
    if body.activity_id:
        if not ObjectId.is_valid(body.activity_id):
            raise HTTPException(status_code=422, detail="Invalid activity ID.")
        activity = await get_activities_collection().find_one({"_id": ObjectId(body.activity_id)})
        if not activity or activity.get("project_id") != body.project_id:
            raise HTTPException(status_code=422, detail="Activity must belong to the project.")
    
    doc = {
        "_id": ObjectId(),
        "project_id": body.project_id,
        "activity_id": body.activity_id,
        "created_by": str(current_user.id),
        "assigned_to": body.assigned_to,
        "title": body.title,
        "description": body.description,
        "severity": body.severity.value,
        "status": IssueStatus.open.value,
        "evidence_capture_ids": body.evidence_capture_ids,
        "due_date": body.due_date,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "resolved_at": None
    }
    
    await issues_col.insert_one(doc)
    await write_audit_log(
        action="issue_created",
        actor_user_id=str(current_user.id),
        target_id=str(doc["_id"]),
        project_id=body.project_id,
        after_state={"title": body.title, "status": IssueStatus.open.value},
    )

    # Time Machine: Emit issue timeline event if activity linked
    if body.activity_id:
        try:
            full_text = f"{body.title} {body.description}".lower()
            if any(k in full_text for k in ["equipment", "excavator", "crane", "generator", "breakdown", "machine", "fault"]):
                ev_type = EventType.EQUIPMENT_ISSUE
            elif any(k in full_text for k in ["material", "cement", "concrete", "steel", "pipe", "shortage", "rebar"]):
                ev_type = EventType.MATERIAL_ISSUE
            elif any(k in full_text for k in ["weather", "rain", "monsoon", "flood", "storm", "cyclone"]):
                ev_type = EventType.WEATHER_DELAY
            elif any(k in full_text for k in ["safety", "hazard", "injury", "ppe", "violation", "halt"]):
                ev_type = EventType.SAFETY_ISSUE
            else:
                ev_type = EventType.CORRECTIVE_ACTION_CREATED

            await activity_event_service.create_event(
                project_id=body.project_id,
                activity_id=body.activity_id,
                event_type=ev_type,
                source_type="FIELD_ISSUE",
                source_id=str(doc["_id"]),
                actor_id=str(current_user.id),
                description=f"Field Issue [{body.severity.value.upper()}]: {body.title}",
                evidence_ids=body.evidence_capture_ids,
                metadata={"severity": body.severity.value, "description": body.description},
            )
        except Exception as ev_exc:
            print(f"[Issues] Failed to record timeline event: {ev_exc}")

    # Broadcast to PMs in the project
    await ws_manager.broadcast_to_project(
        project_id=body.project_id,
        event="issue_created",
        data={"issue_id": str(doc["_id"]), "title": body.title, "severity": body.severity.value}
    )
    
    doc["id"] = str(doc.pop("_id"))
    return IssuePublic(**doc)


@router.get("/", response_model=IssueListResponse)
async def list_issues(
    project_id: str,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: UserInDB = Depends(get_current_user),
):
    """List issues for a project."""
    db = get_database()
    issues_col = db["issues"]
    require_project_access(current_user, project_id)
    
    query = {"project_id": project_id}
    if status_filter:
        query["status"] = status_filter
        
    total = await issues_col.count_documents(query)
    cursor = issues_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    db_docs = await cursor.to_list(length=limit)
    
    items = []
    for d in db_docs:
        d["id"] = str(d.pop("_id"))
        items.append(IssuePublic(**d))
        
    return IssueListResponse(items=items, total=total)


@router.patch("/{issue_id}", response_model=IssuePublic)
async def update_issue(
    issue_id: str,
    body: IssueUpdateBody,
    current_user: UserInDB = Depends(require_pm_or_above),
):
    """Update issue status/assignment (PM+ only)."""
    db = get_database()
    issues_col = db["issues"]
    
    try:
        issue = await issues_col.find_one({"_id": ObjectId(issue_id)})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid issue ID: {e}")
        
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    require_project_access(current_user, issue["project_id"])
        
    updates = {"updated_at": datetime.now(timezone.utc)}
    if body.status is not None:
        updates["status"] = body.status.value
        if body.status == IssueStatus.resolved:
            updates["resolved_at"] = datetime.utcnow()
    if body.severity is not None:
        updates["severity"] = body.severity.value
    if body.assigned_to is not None:
        updates["assigned_to"] = body.assigned_to
    if body.evidence_capture_ids is not None:
        updates["evidence_capture_ids"] = body.evidence_capture_ids
        
    await issues_col.update_one({"_id": ObjectId(issue_id)}, {"$set": updates})
    await write_audit_log(
        action="issue_updated",
        actor_user_id=str(current_user.id),
        target_id=issue_id,
        project_id=issue["project_id"],
        before_state={key: issue.get(key) for key in updates if key != "updated_at"},
        after_state={key: value for key, value in updates.items() if key != "updated_at"},
    )

    # Time Machine: Emit resolved event if issue is resolved
    if body.status == IssueStatus.resolved and issue.get("activity_id"):
        try:
            await activity_event_service.create_event(
                project_id=issue["project_id"],
                activity_id=issue["activity_id"],
                event_type=EventType.CORRECTIVE_ACTION_RESOLVED,
                source_type="FIELD_ISSUE",
                source_id=issue_id,
                actor_id=str(current_user.id),
                description=f"Issue resolved: {issue.get('title')}",
                metadata={"resolved_at": updates.get("resolved_at")},
            )
        except Exception as ev_exc:
            print(f"[Issues] Failed to record resolution event: {ev_exc}")

    # Broadcast update
    await ws_manager.broadcast_to_project(
        project_id=issue["project_id"],
        event="issue_updated",
        data={"issue_id": issue_id, "status": updates.get("status", issue["status"])}
    )
    
    updated_doc = await issues_col.find_one({"_id": ObjectId(issue_id)})
    updated_doc["id"] = str(updated_doc.pop("_id"))
    return IssuePublic(**updated_doc)
