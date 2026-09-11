"""
backend/app/services/root_cause_engine.py
Evidence-grounded root cause analysis engine for AI Site Time Machine.
Strictly evidence-backed: correlates field issues, voice transcripts, and progress stalls
without fabricating historical facts.
"""
from typing import Any, Dict, List, Optional
from app.models.activity import ScheduleActivityInDB
from app.models.activity_event import ActivityEventPublic, EventType


CAUSE_CATEGORIES = {
    "EQUIPMENT": "Equipment Unavailability / Breakdown",
    "MATERIAL": "Material Shortage / Delivery Delay",
    "WEATHER": "Adverse Weather Delay",
    "SAFETY": "Safety Hazard / Stand-Down",
    "LABOUR": "Crew / Manpower Shortage",
    "PLANNING": "Schedule Baseline Scope Deviation",
    "SITE_CONSTRAINT": "Site Access / Environmental Obstacle",
    "UNKNOWN": "Unrecorded Field Delay",
    "INSUFFICIENT_EVIDENCE": "Insufficient Field Evidence",
    "ON_TRACK": "Activity On Track",
}

KEYWORD_MAP = {
    "EQUIPMENT": [
        "excavator", "crane", "rig", "breakdown", "generator", "repair", "unavailable",
        "mechanical", "fault", "engine", "hydraulics", "truck", "dozer", "equipment"
    ],
    "MATERIAL": [
        "cement", "concrete", "steel", "pipe", "pipeline", "rebar", "delivery",
        "shortage", "supplier", "stock", "delayed shipment", "materials"
    ],
    "WEATHER": [
        "rain", "monsoon", "flood", "storm", "waterlogging", "heavy rain",
        "mud", "cyclone", "high winds", "weather"
    ],
    "SAFETY": [
        "incident", "injury", "near miss", "safety hazard", "permit revoked",
        "stand-down", "ppe", "gas leak", "halt", "inspection failed"
    ],
    "LABOUR": [
        "strike", "crew", "worker", "manpower", "absent", "shift canceled",
        "labor shortage", "engineers unavailable"
    ],
}


def analyze_root_cause(
    activity: ScheduleActivityInDB,
    events: List[ActivityEventPublic],
    delay_metrics: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Executes deterministic evidence correlation to identify the primary delay driver.
    Every conclusion cites specific supporting event IDs and verbatim quotes/notes.
    """
    # 1. If activity is on track or completed
    if not delay_metrics.get("is_delayed", False) and delay_metrics.get("delay_days", 0) <= 0:
        return {
            "primary_cause": CAUSE_CATEGORIES["ON_TRACK"],
            "cause_code": "ON_TRACK",
            "confidence": 1.0,
            "explanation": (
                f"Activity {activity.activity_code} is tracking according to schedule. "
                f"Current progress is {activity.percent_complete}% against planned {delay_metrics.get('planned_percent', 0)}%."
            ),
            "supporting_event_ids": [],
            "contributing_factors": [],
        }

    # 2. Score candidate causes from real database events
    scores: Dict[str, float] = {k: 0.0 for k in KEYWORD_MAP.keys()}
    evidence_events: Dict[str, List[ActivityEventPublic]] = {k: [] for k in KEYWORD_MAP.keys()}

    for ev in events:
        ev_type = ev.event_type.value if hasattr(ev.event_type, "value") else str(ev.event_type)
        desc = (ev.description or "").lower()
        meta = ev.metadata or {}
        meta_str = str(meta).lower()
        full_text = f"{desc} {meta_str}"

        # Direct issue events
        if ev_type == EventType.EQUIPMENT_ISSUE.value or "equipment" in ev_type.lower():
            scores["EQUIPMENT"] += 3.0
            evidence_events["EQUIPMENT"].append(ev)
        elif ev_type == EventType.MATERIAL_ISSUE.value or "material" in ev_type.lower():
            scores["MATERIAL"] += 3.0
            evidence_events["MATERIAL"].append(ev)
        elif ev_type == EventType.WEATHER_DELAY.value or "weather" in ev_type.lower():
            scores["WEATHER"] += 3.0
            evidence_events["WEATHER"].append(ev)
        elif ev_type == EventType.SAFETY_ISSUE.value or "safety" in ev_type.lower():
            scores["SAFETY"] += 3.0
            evidence_events["SAFETY"].append(ev)

        # Keyword matching in transcripts, notes, and descriptions
        for category, keywords in KEYWORD_MAP.items():
            matched_kw = [kw for kw in keywords if kw in full_text]
            if matched_kw:
                weight = 2.0 if ev_type in (EventType.VOICE_UPDATE.value, EventType.WORKER_UPDATE.value) else 1.0
                scores[category] += weight * len(matched_kw)
                if ev not in evidence_events[category]:
                    evidence_events[category].append(ev)

    # 3. Detect progress stagnation periods
    stagnation_detected = False
    sorted_events = sorted(events, key=lambda e: e.timestamp)
    for i in range(1, len(sorted_events)):
        prev = sorted_events[i - 1]
        curr = sorted_events[i]
        if prev.progress_after is not None and curr.progress_after is not None:
            # If progress stayed identical or barely moved (<2%) across 24h+
            time_diff = (curr.timestamp - prev.timestamp).total_seconds()
            if time_diff >= 86400 and (curr.progress_after - prev.progress_after) <= 1.0:
                stagnation_detected = True
                break

    # 4. Determine winning cause
    best_category = max(scores, key=lambda k: scores[k])
    best_score = scores[best_category]

    if best_score > 0 and evidence_events[best_category]:
        primary_cause_title = CAUSE_CATEGORIES[best_category]
        supporting_evs = evidence_events[best_category]
        supporting_ids = [e.id for e in supporting_evs]

        # Calculate confidence score
        base_conf = 0.85
        if stagnation_detected:
            base_conf += 0.06
        if any(e.confidence and e.confidence > 0.85 for e in supporting_evs):
            base_conf += 0.04
        confidence = min(0.98, round(base_conf, 2))

        # Build grounded explanation
        first_ev = supporting_evs[0]
        first_date = first_ev.timestamp.strftime("%b %d, %Y")
        summary_points = []
        for e in supporting_evs[:3]:
            dt = e.timestamp.strftime("%b %d")
            detail = e.description or e.source_type
            summary_points.append(f"{dt}: {detail}")

        narrative = (
            f"The primary driver of the {delay_metrics.get('delay_days', 0)}-day delay is "
            f"{primary_cause_title.lower()}. "
            f"Field evidence first documented this on {first_date} ({first_ev.description or first_ev.source_type}). "
        )
        if stagnation_detected:
            narrative += "Subsequent timeline captures verified reduced progress burn rate during this period. "

        contributing = []
        for cat, score in scores.items():
            if cat != best_category and score > 0:
                contributing.append({
                    "cause": CAUSE_CATEGORIES[cat],
                    "evidence_count": len(evidence_events[cat]),
                })

        return {
            "primary_cause": primary_cause_title,
            "cause_code": best_category,
            "confidence": confidence,
            "explanation": narrative.strip(),
            "supporting_event_ids": supporting_ids,
            "contributing_factors": contributing,
        }

    # If delayed but no specific issue was recorded
    if delay_metrics.get("is_delayed", False):
        return {
            "primary_cause": CAUSE_CATEGORIES["INSUFFICIENT_EVIDENCE"],
            "cause_code": "INSUFFICIENT_EVIDENCE",
            "confidence": 0.50,
            "explanation": (
                f"Activity {activity.activity_code} is currently {delay_metrics.get('delay_days', 0)} days behind "
                f"the schedule baseline ({activity.percent_complete}% actual vs {delay_metrics.get('planned_percent', 0)}% planned). "
                f"However, no explicit equipment, material, weather, or safety failure events have been filed in the evidence log. "
                f"Additional field verification is recommended."
            ),
            "supporting_event_ids": [],
            "contributing_factors": [],
        }

    return {
        "primary_cause": CAUSE_CATEGORIES["UNKNOWN"],
        "cause_code": "UNKNOWN",
        "confidence": 0.40,
        "explanation": "Insufficient telemetry to isolate delay cause.",
        "supporting_event_ids": [],
        "contributing_factors": [],
    }
