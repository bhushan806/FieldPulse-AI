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

from app.core.deps import get_current_user, require_hq_admin, require_pm_or_above, require_project_access, user_can_access_project
from app.db.mongo import get_projects_collection, get_users_collection, get_activities_collection, get_database
from app.models.project import ProjectInDB, ProjectPublic, RosterEntry, RosterStatus
from app.models.user import UserInDB, UserRole
from app.models.invitation import InvitationInDB, InvitationStatus
from app.services.email import send_invitation_email
from app.services.audit import write_audit_log
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


class ProjectListResponse(BaseModel):
    items: List[ProjectPublic]
    total: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=ProjectPublic)
async def create_project(body: ProjectCreateBody, current_user: UserInDB = Depends(require_hq_admin)):
    """Create a new project (HQ only)."""
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="Project name is required.")
    if body.end_date <= body.start_date:
        raise HTTPException(status_code=422, detail="End date must be after start date.")
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
        "created_by_user_id": str(current_user.id),
        "created_at": datetime.utcnow()
    }
    
    await projects_col.insert_one(doc)
    # Keep the creator linked as well as recording ownership. This makes the
    # relationship queryable even if the user later changes role.
    await get_users_collection().update_one(
        {"_id": current_user.id}, {"$addToSet": {"project_ids": str(doc["_id"])}}
    )
    await write_audit_log(
        action="project_created",
        actor_user_id=str(current_user.id),
        target_id=str(doc["_id"]),
        project_id=str(doc["_id"]),
        after_state={"name": doc["name"], "start_date": doc["start_date"], "end_date": doc["end_date"]},
    )
    doc_out = dict(doc)
    doc_out["id"] = str(doc_out.pop("_id"))
    return ProjectPublic(**doc_out)


@router.get("", response_model=ProjectListResponse)
async def list_projects(current_user: UserInDB = Depends(get_current_user)):
    """Return only projects the caller is permitted to see."""
    projects_col = get_projects_collection()
    query = {} if current_user.role.value in ("hq_admin", "auditor", "platform_admin") else {
        "_id": {"$in": [ObjectId(pid) for pid in current_user.project_ids if ObjectId.is_valid(pid)]}
    }
    docs = await projects_col.find(query).sort("created_at", -1).to_list(length=None)
    items = []
    for doc in docs:
        public = dict(doc)
        public["id"] = str(public.pop("_id"))
        items.append(ProjectPublic(**public))
    return ProjectListResponse(items=items, total=len(items))


@router.get("/{project_id}", response_model=ProjectPublic)
async def get_project(project_id: str, current_user: UserInDB = Depends(get_current_user)):
    """Retrieve a single project by ID."""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID.")
    require_project_access(current_user, project_id)
    projects_col = get_projects_collection()
    doc = await projects_col.find_one({"_id": ObjectId(project_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found.")
    public = dict(doc)
    public["id"] = str(public.pop("_id"))
    return ProjectPublic(**public)


@router.post("/{project_id}/schedule/bulk")
async def bulk_create_schedule(project_id: str, body: ScheduleBulkCreateBody, current_user: UserInDB = Depends(require_hq_admin)):
    """Bulk create schedule activities (HQ only)."""
    activities_col = get_activities_collection()
    projects_col = get_projects_collection()
    
    proj = await projects_col.find_one({"_id": ObjectId(project_id)})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    require_project_access(current_user, project_id)
        
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
        await write_audit_log(
            action="schedule_bulk_created",
            actor_user_id=str(current_user.id),
            target_id=project_id,
            project_id=project_id,
            after_state={"activity_count": len(docs)},
        )
        
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
    require_project_access(current_user, project_id)

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
    await write_audit_log(
        action="project_manager_invited",
        actor_user_id=str(current_user.id),
        target_id=user_id_str,
        project_id=project_id,
        after_state={"email": email, "role": UserRole.project_manager.value},
    )
    
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
    from app.api.auth import normalize_phone, get_phone_variants
    projects_col = get_projects_collection()
    
    proj = await projects_col.find_one({"_id": ObjectId(project_id)})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    require_project_access(current_user, project_id)
        
    norm_phone = normalize_phone(body.phone.strip())
    variants = get_phone_variants(body.phone.strip())
    
    # Check if already in roster
    roster = proj.get("engineers", [])
    if any(e.get("phone") in variants for e in roster):
        raise HTTPException(status_code=400, detail="Engineer already in roster")
        
    new_entry = {
        "phone": norm_phone,
        "name": body.name,
        "status": RosterStatus.invited.value,
        "added_at": datetime.utcnow()
    }
    
    await projects_col.update_one(
        {"_id": ObjectId(project_id)},
        {"$push": {"engineers": new_entry}}
    )
    await write_audit_log(
        action="engineer_roster_added",
        actor_user_id=str(current_user.id),
        target_id=norm_phone,
        project_id=project_id,
        after_state={"name": body.name, "phone": norm_phone},
    )
    
    return {"message": "Engineer added to roster", "entry": new_entry}


@router.get("/{project_id}/roster")
async def get_project_roster(project_id: str, current_user: UserInDB = Depends(require_pm_or_above)):
    """Get the enriched list of engineers and team members for this project."""
    projects_col = get_projects_collection()
    users_col = get_users_collection()
    from app.db.mongo import get_captures_collection
    captures_col = get_captures_collection()
    from app.api.auth import get_phone_variants

    proj = await projects_col.find_one({"_id": ObjectId(project_id)})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    require_project_access(current_user, project_id)

    raw_engineers = proj.get("engineers", [])
    enriched_engineers = []

    for eng in raw_engineers:
        phone = eng.get("phone", "")
        variants = get_phone_variants(phone) if phone else []
        u = await users_col.find_one({"phone": {"$in": variants}}) if variants else None

        captures_count = 0
        last_active = None

        if u:
            uid_str = str(u["_id"])
            captures_count = await captures_col.count_documents({
                "project_id": project_id,
                "user_id": uid_str,
            })
            latest_cap = await captures_col.find_one(
                {"project_id": project_id, "user_id": uid_str},
                sort=[("created_at", -1)],
            )
            if latest_cap and "created_at" in latest_cap:
                last_active = latest_cap["created_at"].isoformat()

        if not last_active and eng.get("added_at"):
            last_active = eng["added_at"].isoformat() if isinstance(eng["added_at"], datetime) else str(eng["added_at"])

        enriched_engineers.append({
            "name": eng.get("name") or (u.get("name") if u else "Site Engineer"),
            "phone": phone,
            "email": u.get("email") if u else None,
            "role": "Site Engineer",
            "status": "Active" if u else (eng.get("status") or "Invited"),
            "captures": captures_count,
            "last_active": last_active,
            "user_id": str(u["_id"]) if u else None,
        })

    return {"engineers": enriched_engineers}



@router.delete("/{project_id}/roster/{phone}")
async def remove_engineer_from_roster(project_id: str, phone: str, current_user: UserInDB = Depends(require_pm_or_above)):
    """Remove an engineer from the project roster and revoke their access to this project."""
    from app.api.auth import normalize_phone, get_phone_variants
    projects_col = get_projects_collection()
    users_col = get_users_collection()
    
    variants = get_phone_variants(phone.strip())
    
    proj = await projects_col.find_one({"_id": ObjectId(project_id)})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    require_project_access(current_user, project_id)
    stored_phone = next((entry.get("phone") for entry in proj.get("engineers", []) if entry.get("phone") in variants), None)
    if not stored_phone:
        raise HTTPException(status_code=404, detail="Engineer not found in roster")
    res = await projects_col.update_one(
        {"_id": ObjectId(project_id)},
        {"$pull": {"engineers": {"phone": stored_phone}}}
    )
    
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="Engineer not found in roster")
        
    # Also remove project_id from user's document if they have logged in before
    await users_col.update_one(
        {"phone": stored_phone},
        {"$pull": {"project_ids": project_id}}
    )
    await write_audit_log(
        action="engineer_roster_removed",
        actor_user_id=str(current_user.id),
        target_id=stored_phone,
        project_id=project_id,
    )
    
    return {"message": "Engineer removed from roster"}
