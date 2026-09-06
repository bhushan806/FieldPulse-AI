"""
backend/app/api/issues.py
Endpoints for managing field issues.
"""
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.deps import get_current_user, require_pm_or_above
from app.db.mongo import get_database, get_projects_collection
from app.models.issue import IssueInDB, IssuePublic, IssueSeverity, IssueStatus
from app.models.user import UserInDB, UserRole
from app.websocket.manager import ws_manager

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
    
    # Optional: Validate project_id and activity_id exist
    
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
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "resolved_at": None
    }
    
    await issues_col.insert_one(doc)
    
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
    except:
        raise HTTPException(status_code=400, detail="Invalid issue ID")
        
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    updates = {"updated_at": datetime.utcnow()}
    if body.status is not None:
        updates["status"] = body.status.value
        if body.status == IssueStatus.resolved:
            updates["resolved_at"] = datetime.utcnow()
    if body.severity is not None:
        updates["severity"] = body.severity.value
    if body.assigned_to is not None:
        updates["assigned_to"] = body.assigned_to
        
    await issues_col.update_one({"_id": ObjectId(issue_id)}, {"$set": updates})
    
    # Broadcast update
    await ws_manager.broadcast_to_project(
        project_id=issue["project_id"],
        event="issue_updated",
        data={"issue_id": issue_id, "status": updates.get("status", issue["status"])}
    )
    
    updated_doc = await issues_col.find_one({"_id": ObjectId(issue_id)})
    updated_doc["id"] = str(updated_doc.pop("_id"))
    return IssuePublic(**updated_doc)
