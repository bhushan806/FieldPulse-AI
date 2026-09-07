"""
backend/app/api/projects.py
Endpoints for managing projects, schedule activities, and engineer rosters.
"""
import os
from datetime import datetime, timedelta
from typing import List, Optional
from bson import ObjectId

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.deps import get_current_user, require_hq_admin, require_pm_or_above
from app.db.mongo import get_projects_collection, get_users_collection, get_activities_collection, get_database
from app.models.project import ProjectInDB, ProjectPublic, RosterEntry, RosterStatus
from app.models.user import UserInDB, UserRole
from app.models.invitation import InvitationInDB, InvitationStatus
from app.services.email import send_invitation_email
import uuid

router = APIRouter(prefix="/api/projects", tags=["projects"])

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ProjectCreateBody(BaseModel):
    name: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    start_date: datetime
    end_date: datetime


class ScheduleBulkCreateBody(BaseModel):
    activities: List[dict]  # List of activity data


class ManagerInviteBody(BaseModel):
    email: EmailStr
    name: str


class EngineerAddBody(BaseModel):
    phone: str
    name: str

class InviteTokenResponse(BaseModel):
    invite_token: str
    message: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=ProjectPublic)
async def create_project(body: ProjectCreateBody, current_user: UserInDB = Depends(require_hq_admin)):
    """Create a new project (HQ only)."""
    projects_col = get_projects_collection()
    
    loc = None
    if body.location_lng is not None and body.location_lat is not None:
        loc = {"type": "Point", "coordinates": [body.location_lng, body.location_lat]}

    doc = {
        "_id": ObjectId(),
        "name": body.name,
        "location": loc,
        "status": "on_track",
        "start_date": body.start_date,
        "end_date": body.end_date,
        "engineers": [],
        "pm_user_id": None,
        "created_at": datetime.utcnow()
    }
    
    await projects_col.insert_one(doc)
    doc_out = dict(doc)
    doc_out["id"] = str(doc_out.pop("_id"))
    return ProjectPublic(**doc_out)


@router.post("/{project_id}/schedule/bulk")
async def bulk_create_schedule(project_id: str, body: ScheduleBulkCreateBody, current_user: UserInDB = Depends(require_hq_admin)):
    """Bulk create schedule activities (HQ only)."""
    activities_col = get_activities_collection()
    projects_col = get_projects_collection()
    
    proj = await projects_col.find_one({"_id": ObjectId(project_id)})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    docs = []
    for item in body.activities:
        loc = None
        if item.get("location_lng") is not None and item.get("location_lat") is not None:
            loc = {"type": "Point", "coordinates": [item["location_lng"], item["location_lat"]]}
            
        docs.append({
            "_id": ObjectId(),
            "project_id": project_id,
            "activity_code": item.get("activity_code", ""),
            "activity_name": item.get("activity_name", ""),
            "location": loc,
            "planned_start": item.get("planned_start"),
            "planned_end": item.get("planned_end"),
            "percent_complete": 0,
            "status": "not_started",
            "keywords": item.get("keywords", [])
        })
        
    if docs:
        await activities_col.insert_many(docs)
        
    return {"message": f"Successfully created {len(docs)} activities"}


@router.post("/{project_id}/managers", response_model=InviteTokenResponse)
async def add_project_manager(project_id: str, body: ManagerInviteBody, current_user: UserInDB = Depends(require_hq_admin)):
    """Add a PM to a project. Creates the user and sends an invitation (HQ only)."""
    users_col = get_users_collection()
    projects_col = get_projects_collection()
    db = get_database()
    invites_col = db["invitations"]
    
    proj = await projects_col.find_one({"_id": ObjectId(project_id)})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    email = body.email.strip().lower()
    existing = await users_col.find_one({"email": email})
    
    user_id_str = None
    
    if existing:
        # Just link the project if not already linked
        user_id_str = str(existing["_id"])
        if project_id not in existing.get("project_ids", []):
            await users_col.update_one(
                {"_id": existing["_id"]},
                {"$addToSet": {"project_ids": project_id}}
            )
    else:
        # Create invited user without password
        oid = ObjectId()
        user_id_str = str(oid)
        doc = {
            "_id": oid,
            "name": body.name,
            "email": email,
            "phone": None,
            "password_hash": None,  # Indicates "invited"
            "role": UserRole.project_manager.value,
            "project_ids": [project_id],
            "created_at": datetime.utcnow()
        }
        await users_col.insert_one(doc)
        
    # Update project pm_user_id if not set
    if not proj.get("pm_user_id"):
        await projects_col.update_one({"_id": ObjectId(project_id)}, {"$set": {"pm_user_id": user_id_str}})
        
    # Create formal invitation
    token = str(uuid.uuid4())
    expires = datetime.utcnow() + timedelta(days=7)
    invite_doc = {
        "_id": ObjectId(),
        "email": email,
        "project_id": project_id,
        "role": UserRole.project_manager.value,
        "invited_by_user_id": str(current_user.id),
        "token": token,
        "status": InvitationStatus.pending.value,
        "expires_at": expires,
        "created_at": datetime.utcnow(),
        "accepted_at": None
    }
    await invites_col.insert_one(invite_doc)
    
    # Send email
    FRONTEND_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
    invite_link = f"{FRONTEND_URL}/set-password?token={token}"
    await send_invitation_email(email, invite_link, proj.get("name", "Project"), "Project Manager")
        
    return InviteTokenResponse(
        invite_token=token, 
        message=f"PM added and invitation sent to {email}."
    )


@router.post("/{project_id}/engineers")
async def add_engineer_to_roster(project_id: str, body: EngineerAddBody, current_user: UserInDB = Depends(require_pm_or_above)):
    """Add a site engineer phone number to the project roster."""
    projects_col = get_projects_collection()
    
    proj = await projects_col.find_one({"_id": ObjectId(project_id)})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    phone = body.phone.strip()
    
    # Check if already in roster
    roster = proj.get("engineers", [])
    if any(e.get("phone") == phone for e in roster):
        raise HTTPException(status_code=400, detail="Engineer already in roster")
        
    new_entry = {
        "phone": phone,
        "name": body.name,
        "status": RosterStatus.invited.value,
        "added_at": datetime.utcnow()
    }
    
    await projects_col.update_one(
        {"_id": ObjectId(project_id)},
        {"$push": {"engineers": new_entry}}
    )
    
    return {"message": "Engineer added to roster", "entry": new_entry}


@router.get("/{project_id}/roster")
async def get_project_roster(project_id: str, current_user: UserInDB = Depends(require_pm_or_above)):
    """Get the list of engineers for this project."""
    projects_col = get_projects_collection()
    proj = await projects_col.find_one({"_id": ObjectId(project_id)})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    return {"engineers": proj.get("engineers", [])}


@router.delete("/{project_id}/roster/{phone}")
async def remove_engineer_from_roster(project_id: str, phone: str, current_user: UserInDB = Depends(require_pm_or_above)):
    """Remove an engineer from the project roster and revoke their access to this project."""
    projects_col = get_projects_collection()
    users_col = get_users_collection()
    
    phone = phone.strip()
    
    res = await projects_col.update_one(
        {"_id": ObjectId(project_id)},
        {"$pull": {"engineers": {"phone": phone}}}
    )
    
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="Engineer not found in roster")
        
    # Also remove project_id from user's document if they have logged in before
    await users_col.update_one(
        {"phone": phone},
        {"$pull": {"project_ids": project_id}}
    )
    
    return {"message": "Engineer removed from roster"}
