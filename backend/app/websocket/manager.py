"""
backend/app/websocket/manager.py
Lightweight WebSocket connection manager for real-time event broadcasting.
Rooms are keyed by project_id.
"""
import asyncio
import json
from collections import defaultdict
from typing import Dict, Set

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        # project_id -> set of active WebSocket connections
        self._rooms: Dict[str, Set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, project_id: str) -> None:
        await websocket.accept()
        self._rooms[project_id].add(websocket)
        print(f"[WS] Client joined project room: {project_id}")

    def disconnect(self, websocket: WebSocket, project_id: str) -> None:
        self._rooms[project_id].discard(websocket)
        if not self._rooms[project_id]:
            del self._rooms[project_id]
        print(f"[WS] Client left project room: {project_id}")

    async def broadcast_to_project(
        self,
        project_id: str,
        event: str,
        data: dict,
    ) -> None:
        """Send a JSON message to all clients in a project room."""
        message = json.dumps({"event": event, "data": data})
        dead: Set[WebSocket] = set()

        for ws in list(self._rooms.get(project_id, [])):
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)

        # Clean up disconnected sockets
        for ws in dead:
            self._rooms[project_id].discard(ws)

    async def broadcast_global(self, event: str, data: dict) -> None:
        """Broadcast to every connected client across all rooms."""
        tasks = [
            self.broadcast_to_project(pid, event, data)
            for pid in list(self._rooms.keys())
        ]
        await asyncio.gather(*tasks, return_exceptions=True)


# Singleton instance imported everywhere
ws_manager = WebSocketManager()
