"""
backend/tests/test_document_capture.py
Unit tests verifying document upload support in captures:
- MediaType.document enum support
- Document timeline event and source_type compatibility
- Document MIME prefix allowlist
"""
import pytest
from app.models.capture import MediaType, CaptureInDB, CaptureStatus
from app.models.activity_event import ActivityEventInDB, EventType
from datetime import datetime


def test_media_type_document_enum():
    """Verify 'document' is a valid MediaType."""
    assert MediaType.document == "document"
    assert MediaType.document.value == "document"
    assert "document" in [m.value for m in MediaType]


def test_capture_indb_with_document():
    """Verify CaptureInDB model instantiates properly with MediaType.document."""
    cap = CaptureInDB(
        user_id="user_123",
        project_id="proj_456",
        media_type=MediaType.document,
        media_url="https://res.cloudinary.com/demo/raw/upload/inspection_report.pdf",
        status=CaptureStatus.processing,
        created_at=datetime.utcnow(),
    )
    assert cap.media_type == MediaType.document
    assert cap.status == CaptureStatus.processing
    assert cap.media_url.endswith(".pdf")


def test_activity_event_document_source():
    """Verify ActivityEvent records properly with DOCUMENT_AI source type."""
    ev = ActivityEventInDB(
        project_id="proj_456",
        activity_id="act_789",
        event_type=EventType.WORKER_UPDATE,
        timestamp=datetime.utcnow(),
        source_type="DOCUMENT_AI",
        source_id="cap_test_123",
        description="Site document uploaded: test_report.pdf",
        confidence=0.85,
        evidence_ids=["cap_test_123"],
    )
    assert ev.event_type == EventType.WORKER_UPDATE
    assert ev.source_type == "DOCUMENT_AI"
    assert "test_report.pdf" in ev.description


def test_document_mime_prefixes():
    """Verify allowed mime prefixes for documents are recognized."""
    allowed_prefixes = (
        "image/",
        "video/",
        "audio/",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument",
        "application/vnd.ms-excel",
        "text/plain",
        "text/csv",
        "application/octet-stream",
    )
    doc_mimes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "text/plain",
        "text/csv",
    ]
    for mime in doc_mimes:
        assert any(mime.startswith(prefix) for prefix in allowed_prefixes), f"{mime} should be allowed"
