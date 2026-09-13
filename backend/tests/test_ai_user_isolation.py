"""
backend/tests/test_ai_user_isolation.py
Unit tests verifying user-isolated AI conversation threads:
- AIThread schemas and model initialization
- Isolated thread listing: User A only sees User A's threads
- Cross-user thread access prevention: User B cannot access User A's thread
- AI chat message turn persistence into user-isolated threads
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from bson import ObjectId
from fastapi.testclient import TestClient
from datetime import datetime

from app.models.user import UserInDB, UserRole
from app.api.ai import AIThreadCreate, AIThreadOut, AIMessageSchema, ChatRequest, ChatResponse
from app.core.deps import get_current_user
from app.main import app


def test_ai_thread_models():
    """Verify thread schemas properly instantiate and validate fields."""
    msg = AIMessageSchema(
        id="msg-1",
        role="user",
        content="Is the pipeline on track?",
    )
    assert msg.role == "user"
    assert msg.content == "Is the pipeline on track?"

    thread = AIThreadCreate(
        title="Site Inspection",
        project_id="proj_1",
        messages=[msg],
    )
    assert thread.title == "Site Inspection"
    assert len(thread.messages) == 1

    out = AIThreadOut(
        id="thread_abc",
        user_id="user_1",
        project_id="proj_1",
        title="Site Inspection",
        pinned=True,
        messages=[msg],
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    assert out.id == "thread_abc"
    assert out.user_id == "user_1"
    assert out.pinned is True


def test_list_threads_isolated_by_user():
    """Verify GET /api/ai/threads returns only threads for current_user."""
    user_a = UserInDB(
        _id=ObjectId("6a9e74b6a904aae5f4c68e4a"),
        name="Engineer Rajesh",
        role=UserRole.site_engineer,
    )
    
    # Mock MongoDB find cursor
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=[
        {
            "_id": ObjectId("6a9e74b6a904aae5f4c68e01"),
            "user_id": str(user_a.id),
            "title": "Rajesh Excavation Thread",
            "pinned": False,
            "messages": [],
            "created_at": "2026-09-11T12:00:00Z",
            "updated_at": "2026-09-11T12:00:00Z",
        }
    ])

    mock_col = MagicMock()
    mock_col.find.return_value = mock_cursor

    app.dependency_overrides[get_current_user] = lambda: user_a

    with patch("app.api.ai.get_ai_threads_collection", return_value=mock_col):
        client = TestClient(app)
        resp = client.get("/api/ai/threads")
        assert resp.status_code == 200
        threads = resp.json()
        assert len(threads) == 1
        assert threads[0]["title"] == "Rajesh Excavation Thread"
        assert threads[0]["user_id"] == str(user_a.id)

        # Verify query was filtered strictly by user_id
        mock_col.find.assert_called_once()
        query_arg = mock_col.find.call_args[0][0]
        assert query_arg["user_id"] == str(user_a.id)

    app.dependency_overrides.clear()


def test_user_cannot_access_other_users_thread():
    """Verify GET /api/ai/threads/{id} returns 404 if thread belongs to another user."""
    user_b = UserInDB(
        _id=ObjectId("6a9e74b6a904aae5f4c68e4b"),
        name="PM Vikram",
        role=UserRole.project_manager,
    )

    mock_col = MagicMock()
    # Simulate DB returning None because user_id does not match
    mock_col.find_one = AsyncMock(return_value=None)

    app.dependency_overrides[get_current_user] = lambda: user_b

    with patch("app.api.ai.get_ai_threads_collection", return_value=mock_col):
        client = TestClient(app)
        resp = client.get("/api/ai/threads/6a9e74b6a904aae5f4c68e01")
        assert resp.status_code == 404
        assert "not found or access denied" in resp.json()["detail"]

    app.dependency_overrides.clear()


def test_user_cannot_delete_other_users_thread():
    """Verify DELETE /api/ai/threads/{id} returns 404 when attempting to delete another user's thread."""
    user_b = UserInDB(
        _id=ObjectId("6a9e74b6a904aae5f4c68e4b"),
        name="PM Vikram",
        role=UserRole.project_manager,
    )

    mock_col = MagicMock()
    # Simulate DB deleting 0 records because user_id does not match
    mock_delete_result = MagicMock()
    mock_delete_result.deleted_count = 0
    mock_col.delete_one = AsyncMock(return_value=mock_delete_result)

    app.dependency_overrides[get_current_user] = lambda: user_b

    with patch("app.api.ai.get_ai_threads_collection", return_value=mock_col):
        client = TestClient(app)
        resp = client.delete("/api/ai/threads/6a9e74b6a904aae5f4c68e01")
        assert resp.status_code == 404
        assert "not found or access denied" in resp.json()["detail"]

    app.dependency_overrides.clear()


def test_chat_saves_to_user_thread():
    """Verify POST /api/ai/chat persists user messages into the authenticated user's thread."""
    user_a = UserInDB(
        _id=ObjectId("6a9e74b6a904aae5f4c68e4a"),
        name="Engineer Rajesh",
        role=UserRole.site_engineer,
    )

    mock_col = MagicMock()
    mock_col.find_one = AsyncMock(return_value=None)
    mock_insert_result = MagicMock()
    mock_insert_result.inserted_id = ObjectId("6a9e74b6a904aae5f4c68e99")
    mock_col.insert_one = AsyncMock(return_value=mock_insert_result)

    app.dependency_overrides[get_current_user] = lambda: user_a

    with patch("app.api.ai.get_ai_threads_collection", return_value=mock_col), \
         patch("app.api.ai._get_project_context", AsyncMock(return_value=("Project: Pipeline Alpha", []))):
        client = TestClient(app)
        resp = client.post(
            "/api/ai/chat",
            json={"message": "Checking excavation depth today", "project_id": "proj_1"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data
        assert data["thread_id"] == "6a9e74b6a904aae5f4c68e99"

        # Verify insert_one was called with the user's ID
        mock_col.insert_one.assert_called_once()
        inserted_doc = mock_col.insert_one.call_args[0][0]
        assert inserted_doc["user_id"] == str(user_a.id)
        assert len(inserted_doc["messages"]) == 2
        assert inserted_doc["messages"][0]["role"] == "user"
        assert inserted_doc["messages"][0]["content"] == "Checking excavation depth today"
        assert inserted_doc["messages"][1]["role"] == "assistant"

    app.dependency_overrides.clear()
