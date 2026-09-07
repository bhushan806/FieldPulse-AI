"""
backend/app/main.py
FastAPI application factory — registers all routers, lifespan hooks,
CORS, and the WebSocket endpoint.
"""
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.db.mongo import connect_db, disconnect_db
from app.websocket.manager import ws_manager
from app.core.security import decode_token

# --- Routers ---
from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.captures import router as captures_router
from app.api.schedule import router as schedule_router
from app.api.review_queue import router as review_queue_router
from app.api.dashboard import router as dashboard_router
from app.api.alerts import router as alerts_router
from app.api.reports import router as reports_router
from app.api.documents import router as documents_router
from app.api.issues import router as issues_router
from app.api.ai import router as ai_router


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="FieldPulse AI",
    version="1.0.0",
    description="Intelligent data-capture and schedule-linking layer for infrastructure project management.",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend (and any deployed domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   # Explicit origin required when allow_credentials=True
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads for media fallback
os.makedirs(os.path.join(os.getcwd(), "uploads"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ---------------------------------------------------------------------------
# Register API routers
# ---------------------------------------------------------------------------

app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(captures_router)
app.include_router(schedule_router)
app.include_router(review_queue_router)
app.include_router(dashboard_router)
app.include_router(alerts_router)
app.include_router(reports_router)
app.include_router(documents_router)
app.include_router(issues_router)
app.include_router(ai_router)


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/{project_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    project_id: str,
    token: Optional[str] = Query(None),
):
    """
    Real-time WebSocket channel for a project room.
    Client connects at: ws://<backend>/ws/<project_id>?token=<access_jwt>

    Events emitted by server:
      - new_review_item   : { capture_id, project_id }
      - activity_updated  : { activity_id, project_id, percent_complete }
      - new_alert         : { notification_id, project_id, type }
    """
    # Validate JWT before accepting
    if not token or decode_token(token) is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    await ws_manager.connect(websocket, project_id)
    try:
        while True:
            # Keep connection alive; we don't expect client messages
            data = await websocket.receive_text()
            # Could handle client ping here if needed
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, project_id)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "FieldPulse AI Backend"}

@app.get("/", tags=["system"])
async def root():
    return {"message": "FieldPulse AI Backend is running. Please access the frontend at http://localhost:3000"}
