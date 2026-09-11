"""Append-only audit logging for evidence and schedule decisions."""
from datetime import datetime
from typing import Any, Optional

from bson import ObjectId

from app.db.mongo import get_audit_logs_collection


async def write_audit_log(
    *,
    action: str,
    actor_user_id: str,
    target_id: str,
    project_id: str,
    before_state: Optional[dict[str, Any]] = None,
    after_state: Optional[dict[str, Any]] = None,
) -> dict:
    """Persist one immutable account of a meaningful workflow action."""
    document = {
        "_id": ObjectId(),
        "action": action,
        "actor_user_id": actor_user_id,
        "target_id": target_id,
        "project_id": project_id,
        "before_state": before_state,
        "after_state": after_state,
        "timestamp": datetime.utcnow(),
    }
    await get_audit_logs_collection().insert_one(document)
    return document
