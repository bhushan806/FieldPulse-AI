"""Queryable, append-only audit evidence for permitted projects."""
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.deps import get_current_user, require_project_access
from app.db.mongo import get_audit_logs_collection
from app.models.user import UserInDB, UserRole

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])


class AuditLogItem(BaseModel):
    id: str
    action: str
    actor_user_id: str
    target_id: str
    project_id: str
    before_state: Optional[dict[str, Any]] = None
    after_state: Optional[dict[str, Any]] = None
    timestamp: datetime


class AuditLogListResponse(BaseModel):
    items: list[AuditLogItem]
    total: int


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    project_id: Optional[str] = None,
    limit: int = 100,
    current_user: UserInDB = Depends(get_current_user),
):
    if project_id:
        require_project_access(current_user, project_id)
        query: dict = {"project_id": project_id}
    elif current_user.role in (UserRole.hq_admin, UserRole.auditor, UserRole.platform_admin):
        query = {}
    else:
        query = {"project_id": {"$in": current_user.project_ids}}

    col = get_audit_logs_collection()
    total = await col.count_documents(query)
    documents = await col.find(query).sort("timestamp", -1).limit(min(limit, 250)).to_list(length=min(limit, 250))
    return AuditLogListResponse(
        total=total,
        items=[AuditLogItem(id=str(doc.pop("_id")), **doc) for doc in documents],
    )
