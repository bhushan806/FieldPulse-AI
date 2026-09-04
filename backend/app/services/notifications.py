"""
backend/app/services/notifications.py
Creates alert/notification documents and emits real-time WebSocket events.
"""
from datetime import datetime
from typing import Optional

from bson import ObjectId

from app.db.mongo import get_notifications_collection
from app.models.notification import AlertType


async def create_notification(
    project_id: str,
    activity_id: str,
    alert_type: AlertType,
    message: str,
) -> dict:
    """
    Persist a notification document and broadcast via WebSocket.
    Returns the inserted document as a dict.
    """
    col = get_notifications_collection()
    doc = {
        "_id": ObjectId(),
        "project_id": project_id,
        "activity_id": activity_id,
        "type": alert_type,
        "message": message,
        "created_at": datetime.utcnow(),
        "read_by": [],
    }
    await col.insert_one(doc)

    # Broadcast to connected WebSocket clients
    try:
        from app.websocket.manager import ws_manager
        await ws_manager.broadcast_to_project(
            project_id=project_id,
            event="new_alert",
            data={
                "notification_id": str(doc["_id"]),
                "project_id": project_id,
                "type": alert_type,
            },
        )
    except Exception as exc:
        print(f"[WS] Broadcast error (non-fatal): {exc}")

    return doc
