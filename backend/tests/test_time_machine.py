"""
test_time_machine.py - Comprehensive test suite for AI Site Time Machine.

Covers:
1. Activity Event Model & Pydantic Validation
2. Idempotency Key Generation & Integrity Hash Chaining
3. Deterministic Delay Engine
4. Root Cause Correlation Engine
5. Downstream Impact Schedule Graph Traversal
6. Tamper-Evident SHA-256 Verification
7. Activities Router Registration
"""

import sys
import os
import unittest
from datetime import datetime, timezone, timedelta
import hashlib
import json
from bson import ObjectId

# Ensure backend root is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.models.activity import ScheduleActivityInDB, ActivityStatus
from app.models.activity_event import (
    EventType,
    ActivityEventInDB,
    ActivityEventPublic,
    ScheduleBaselineInDB,
)
from app.services.activity_event_service import (
    compute_idempotency_key,
    compute_integrity_hash,
)
from app.services.delay_engine import compute_activity_delay
from app.services.root_cause_engine import analyze_root_cause
from app.services.impact_engine import compute_downstream_impact
from app.api.activities import router as activities_router


class TestTimeMachineModels(unittest.TestCase):
    """Test Activity Event data models and validation."""

    def test_event_type_enumeration(self):
        """Ensure all required event types exist and are strings."""
        expected_types = [
            "PHOTO_CAPTURED",
            "VOICE_UPDATE",
            "VIDEO_CAPTURED",
            "QR_SCAN",
            "PROGRESS_UPDATE",
            "PM_APPROVED",
            "PM_REJECTED",
            "EQUIPMENT_ISSUE",
            "MATERIAL_ISSUE",
            "WEATHER_DELAY",
            "SAFETY_ISSUE",
            "CORRECTIVE_ACTION_RESOLVED",
            "ACTIVITY_CREATED",
            "SCHEDULE_UPDATED",
            "AI_DELAY_DETECTED",
        ]
        for t in expected_types:
            self.assertIn(t, EventType.__members__)
            self.assertEqual(EventType[t].value, t)

    def test_activity_event_indb_creation(self):
        """Ensure ActivityEventInDB model validates and defaults correctly."""
        now = datetime.now(timezone.utc)
        event = ActivityEventInDB(
            project_id="proj_001",
            activity_id="act_001",
            event_type=EventType.PHOTO_CAPTURED,
            timestamp=now,
            source_type="capture",
            source_id="cap_001",
            actor_id="user_001",
            description="Foundation footing photo inspection",
            progress_before=10.0,
            progress_after=15.0,
            confidence=0.95,
            evidence_ids=["cap_001"],
            metadata={"location": "Grid B-4"},
            integrity_hash="abc123hash",
            previous_hash="prev000hash",
            idempotency_key="key_001",
        )
        self.assertEqual(event.project_id, "proj_001")
        self.assertEqual(event.event_type, EventType.PHOTO_CAPTURED)
        self.assertEqual(event.progress_after, 15.0)
        self.assertEqual(event.integrity_hash, "abc123hash")

    def test_schedule_baseline_indb_creation(self):
        """Ensure baseline snapshot model validates properly."""
        now = datetime.now(timezone.utc)
        baseline = ScheduleBaselineInDB(
            project_id="proj_001",
            activity_id="act_001",
            version=1,
            planned_start=now,
            planned_end=now + timedelta(days=10),
            baseline_duration_days=10,
            planned_progress=0.0,
            created_by="pm_001",
        )
        self.assertEqual(baseline.version, 1)
        self.assertEqual(baseline.baseline_duration_days, 10)


class TestIntegrityAndIdempotency(unittest.TestCase):
    """Test cryptographic SHA-256 hash chaining and idempotency keys."""

    def test_idempotency_key_deterministic(self):
        """Same input parameters must yield the identical idempotency key."""
        ts = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
        key1 = compute_idempotency_key("act_001", "PHOTO_CAPTURED", "source_123", ts)
        key2 = compute_idempotency_key("act_001", "PHOTO_CAPTURED", "source_123", ts)
        self.assertEqual(key1, key2)

        # Different action or source must yield different key
        key3 = compute_idempotency_key("act_001", "VOICE_UPDATE", "source_123", ts)
        self.assertNotEqual(key1, key3)

    def test_event_hash_chaining(self):
        """Verify SHA-256 hash calculation and chaining with previous_hash."""
        payload1 = {
            "activity_id": "a1",
            "event_type": "ACTIVITY_CREATED",
            "project_id": "p1",
            "source_id": "src1",
            "timestamp": "2026-09-10T12:00:00Z",
        }
        
        # Genesis event
        hash1 = compute_integrity_hash("genesis", payload1)
        self.assertEqual(len(hash1), 64)  # SHA-256 hex digest length

        # Successor event chained to hash1
        payload2 = {
            "activity_id": "a1",
            "event_type": "PHOTO_CAPTURED",
            "project_id": "p1",
            "source_id": "src2",
            "timestamp": "2026-09-10T14:00:00Z",
        }
        hash2 = compute_integrity_hash(hash1, payload2)
        self.assertEqual(len(hash2), 64)
        self.assertNotEqual(hash1, hash2)

    def test_tamper_detection(self):
        """Modifying any event parameter must invalidate the computed SHA-256 hash."""
        canonical_payload = {
            "activity_id": "a1",
            "event_type": "PROGRESS_UPDATE",
            "source_id": "rev_001",
            "timestamp": "2026-09-10T12:00:00Z",
        }
        canonical_hash = compute_integrity_hash("prev_hash", canonical_payload)

        # Tampered source_id
        tampered_payload = {
            "activity_id": "a1",
            "event_type": "PROGRESS_UPDATE",
            "source_id": "rev_002_TAMPERED",
            "timestamp": "2026-09-10T12:00:00Z",
        }
        tampered_hash = compute_integrity_hash("prev_hash", tampered_payload)
        self.assertNotEqual(canonical_hash, tampered_hash)


class TestDeterministicDelayEngine(unittest.TestCase):
    """Test delay engine calculation comparing baseline, actual progress, and current date."""

    def test_activity_on_schedule(self):
        """When actual progress matches or exceeds linear planned progress, delay should be 0."""
        ref = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
        start = ref - timedelta(days=5)
        end = ref + timedelta(days=5)  # 10 days total, 5 elapsed = 50% planned
        
        act = ScheduleActivityInDB(
            project_id="p1",
            activity_code="ACT-001",
            activity_name="Excavation",
            planned_start=start,
            planned_end=end,
            percent_complete=60.0,  # 60% > 50%
            status=ActivityStatus.in_progress,
        )

        metrics = compute_activity_delay(act, reference_date=ref)
        self.assertEqual(metrics["delay_days"], 0)
        self.assertLessEqual(metrics["schedule_variance"], 0)  # Planned (50%) <= Actual (60%)
        self.assertEqual(metrics["risk_level"], "LOW")
        self.assertFalse(metrics["is_delayed"])

    def test_activity_significantly_delayed(self):
        """When actual progress lags planned progress significantly, delay_days and risk should elevate."""
        ref = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
        start = ref - timedelta(days=8)
        end = ref + timedelta(days=2)  # 10 days total, 80% elapsed planned
        
        act = ScheduleActivityInDB(
            project_id="p1",
            activity_code="ACT-002",
            activity_name="Rebar Installation",
            planned_start=start,
            planned_end=end,
            percent_complete=20.0,  # 20% vs 80% planned -> significant lag
            status=ActivityStatus.delayed,
            critical_path=True,
        )

        metrics = compute_activity_delay(act, reference_date=ref)
        self.assertGreater(metrics["delay_days"], 0)
        self.assertGreater(metrics["schedule_variance"], 0)  # Planned (80%) > Actual (20%) -> 60% variance gap
        self.assertIn(metrics["risk_level"], ["HIGH", "CRITICAL"])
        self.assertTrue(metrics["is_delayed"])

    def test_activity_completed_on_time(self):
        """Completed activities should evaluate without delay penalties."""
        ref = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
        start = ref - timedelta(days=10)
        end = ref - timedelta(days=2)
        
        act = ScheduleActivityInDB(
            project_id="p1",
            activity_code="ACT-003",
            activity_name="Clearing",
            planned_start=start,
            planned_end=end,
            percent_complete=100.0,
            status=ActivityStatus.completed,
        )

        metrics = compute_activity_delay(act, reference_date=ref)
        self.assertEqual(metrics["delay_days"], 0)
        self.assertEqual(metrics["risk_level"], "LOW")
        self.assertFalse(metrics["is_delayed"])


class TestRootCauseEngine(unittest.TestCase):
    """Test factual root cause correlation linking issues and events to delays."""

    def test_equipment_issue_root_cause(self):
        """Correlating delay when equipment issues are logged for the activity."""
        now = datetime.now(timezone.utc)
        act = ScheduleActivityInDB(
            id=PyObjectId("507f1f77bcf86cd799439011"),
            project_id="p1",
            activity_code="ACT-101",
            activity_name="Excavation Pit A",
            percent_complete=30.0,
            planned_start=now - timedelta(days=10),
            planned_end=now + timedelta(days=2),
        )

        event = ActivityEventPublic(
            id="evt_001",
            project_id="p1",
            activity_id=str(act.id),
            event_type=EventType.EQUIPMENT_ISSUE,
            timestamp=now - timedelta(days=4),
            source_type="issue",
            source_id="iss_001",
            description="Hydraulic pump failure on CAT excavator 320D",
            metadata={"equipment_id": "EXC-320", "severity": "HIGH"},
            created_at=now,
        )

        delay_metrics = {
            "is_delayed": True,
            "delay_days": 5,
            "schedule_variance": -35.0,
        }

        analysis = analyze_root_cause(
            activity=act,
            events=[event],
            delay_metrics=delay_metrics,
        )

        self.assertIn("EQUIPMENT", analysis["cause_code"])
        self.assertGreater(analysis["confidence"], 0.6)
        self.assertIn("evt_001", analysis["supporting_event_ids"])

    def test_no_delay_root_cause(self):
        """When delay_days is 0, root cause must reflect on-schedule status without false positives."""
        now = datetime.now(timezone.utc)
        act = ScheduleActivityInDB(
            id=PyObjectId("507f1f77bcf86cd799439012"),
            project_id="p1",
            activity_code="ACT-102",
            activity_name="Rebar Tying",
            percent_complete=90.0,
            planned_start=now - timedelta(days=5),
            planned_end=now + timedelta(days=5),
        )

        delay_metrics = {
            "is_delayed": False,
            "delay_days": 0,
            "schedule_variance": 5.0,
        }

        analysis = analyze_root_cause(
            activity=act,
            events=[],
            delay_metrics=delay_metrics,
        )

        self.assertEqual(analysis["cause_code"], "ON_TRACK")
        self.assertEqual(analysis["confidence"], 1.0)


class TestDownstreamImpactEngine(unittest.TestCase):
    """Test schedule graph dependency traversal and buffer slack evaluation."""

    def test_direct_dependency_slip_propagation(self):
        """When an activity is delayed by 5 days and successor has 1 day of slack, successor slips by 4 days."""
        now = datetime.now(timezone.utc)
        target_id = PyObjectId("507f1f77bcf86cd799439021")
        succ1_id = PyObjectId("507f1f77bcf86cd799439022")
        succ2_id = PyObjectId("507f1f77bcf86cd799439023")

        target_activity = ScheduleActivityInDB(
            id=target_id,
            project_id="p1",
            activity_code="ACT-101",
            activity_name="Slab Foundation",
            planned_start=now - timedelta(days=5),
            planned_end=now + timedelta(days=2),
            dependencies=[],
        )

        succ1 = ScheduleActivityInDB(
            id=succ1_id,
            project_id="p1",
            activity_code="ACT-102",
            activity_name="Column Pouring",
            planned_start=now + timedelta(days=3),  # 1 day slack after target planned_end (day +2)
            planned_end=now + timedelta(days=8),
            dependencies=["ACT-101"],
            critical_path=True,
        )

        succ2 = ScheduleActivityInDB(
            id=succ2_id,
            project_id="p1",
            activity_code="ACT-103",
            activity_name="Roof Decking",
            planned_start=now + timedelta(days=8),  # 0 day slack after succ1
            planned_end=now + timedelta(days=15),
            dependencies=["ACT-102"],
            milestone="Roof Completion Milestone",
            critical_path=True,
        )

        all_project_activities = [target_activity, succ1, succ2]

        impact = compute_downstream_impact(
            target_activity=target_activity,
            all_project_activities=all_project_activities,
            delay_days=5,
        )

        self.assertTrue(impact["has_downstream_impact"])
        self.assertGreater(len(impact["affected_activities"]), 0)

        # Check that ACT-102 slipped by 4 days (5 delay - 1 slack)
        succ1_impact = next((a for a in impact["affected_activities"] if a["activity_code"] == "ACT-102"), None)
        self.assertIsNotNone(succ1_impact)
        self.assertEqual(succ1_impact["estimated_impact_days"], 4)
        self.assertEqual(succ1_impact["slack_days"], 1)

        # Check milestone at risk
        self.assertGreater(len(impact["affected_milestones"]), 0)
        self.assertEqual(impact["affected_milestones"][0]["milestone_name"], "Roof Completion Milestone")

    def test_zero_delay_yields_no_impact(self):
        """If delay is 0, downstream impact should report false."""
        now = datetime.now(timezone.utc)
        act = ScheduleActivityInDB(
            project_id="p1",
            activity_code="ACT-101",
            activity_name="Formwork",
            planned_start=now,
            planned_end=now + timedelta(days=5),
        )

        impact = compute_downstream_impact(
            target_activity=act,
            all_project_activities=[act],
            delay_days=0,
        )

        self.assertFalse(impact["has_downstream_impact"])
        self.assertEqual(len(impact["affected_activities"]), 0)


class TestActivitiesRouterRegistration(unittest.TestCase):
    """Test that activities API router contains all Time Machine endpoints."""

    def test_router_routes_exist(self):
        route_paths = [r.path for r in activities_router.routes]
        self.assertIn("/api/activities/{activity_id}", route_paths)
        self.assertIn("/api/activities/{activity_id}/timeline", route_paths)
        self.assertIn("/api/activities/{activity_id}/timeline/root-cause", route_paths)
        self.assertIn("/api/activities/{activity_id}/timeline/impact", route_paths)
        self.assertIn("/api/activities/{activity_id}/timeline/ask", route_paths)
        self.assertIn("/api/activities/{activity_id}/evidence/{evidence_id}", route_paths)


# Helper for PyObjectId in tests
def PyObjectId(v):
    return ObjectId(v)


if __name__ == "__main__":
    unittest.main()
