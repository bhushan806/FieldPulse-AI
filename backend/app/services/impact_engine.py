"""
backend/app/services/impact_engine.py
Downstream impact analysis engine for AI Site Time Machine.
Traverses the real project schedule dependency graph to compute ripple delay effects
and milestone risks.
"""
from datetime import timedelta
from typing import Any, Dict, List, Set
from app.models.activity import ScheduleActivityInDB


def compute_downstream_impact(
    target_activity: ScheduleActivityInDB,
    all_project_activities: List[ScheduleActivityInDB],
    delay_days: int,
) -> Dict[str, Any]:
    """
    Evaluates real schedule dependencies to quantify ripple delay effects on successors
    and overall project milestones.
    """
    if delay_days <= 0:
        return {
            "activity_delay_days": 0,
            "affected_activities": [],
            "affected_milestones": [],
            "has_downstream_impact": False,
        }

    target_id_str = str(target_activity.id)
    target_code = target_activity.activity_code.strip().upper()

    # Index activities by ID and code
    by_id: Dict[str, ScheduleActivityInDB] = {str(a.id): a for a in all_project_activities}
    by_code: Dict[str, ScheduleActivityInDB] = {a.activity_code.strip().upper(): a for a in all_project_activities}

    # Map predecessors -> list of direct successors
    successors_map: Dict[str, List[ScheduleActivityInDB]] = {str(a.id): [] for a in all_project_activities}
    for act in all_project_activities:
        deps = act.dependencies or []
        for dep in deps:
            dep_clean = dep.strip().upper()
            matched_pred = by_code.get(dep_clean) or by_id.get(dep)
            if matched_pred:
                successors_map[str(matched_pred.id)].append(act)

    # Breadth-first traversal along successor paths
    affected_activities: List[Dict[str, Any]] = []
    affected_milestones_map: Dict[str, Dict[str, Any]] = {}
    visited: Set[str] = set()

    queue = [(target_id_str, delay_days, target_activity.planned_end)]

    while queue:
        current_pred_id, current_delay, current_finish = queue.pop(0)

        for succ in successors_map.get(current_pred_id, []):
            succ_id_str = str(succ.id)
            if succ_id_str in visited:
                continue
            visited.add(succ_id_str)

            # Calculate float/slack
            slack = 0
            if succ.planned_start and current_finish:
                slack = max(0, (succ.planned_start.date() - current_finish.date()).days)

            impact_days = max(1, current_delay - slack)
            new_forecast_start = (succ.planned_start + timedelta(days=impact_days)) if succ.planned_start else None

            affected_activities.append({
                "activity_id": succ_id_str,
                "activity_code": succ.activity_code,
                "activity_name": succ.activity_name,
                "estimated_impact_days": impact_days,
                "slack_days": slack,
                "critical_path": bool(succ.critical_path),
                "planned_start": succ.planned_start.isoformat() if succ.planned_start else None,
                "new_forecast_start": new_forecast_start.isoformat() if new_forecast_start else None,
            })

            # Check if successor is a milestone or designated milestone
            if succ.milestone:
                m_name = succ.milestone
                m_risk = "CRITICAL" if succ.critical_path else ("HIGH" if impact_days >= 3 else "MEDIUM")
                affected_milestones_map[m_name] = {
                    "milestone_id": m_name,
                    "milestone_name": m_name,
                    "risk": m_risk,
                    "estimated_delay_days": impact_days,
                }

            # Enqueue further successors
            queue.append((succ_id_str, impact_days, succ.planned_end))

    # Also check if target activity directly designated a milestone
    if target_activity.milestone and target_activity.milestone not in affected_milestones_map:
        m_name = target_activity.milestone
        affected_milestones_map[m_name] = {
            "milestone_id": m_name,
            "milestone_name": m_name,
            "risk": "CRITICAL" if target_activity.critical_path else "HIGH",
            "estimated_delay_days": delay_days,
        }

    affected_milestones = list(affected_milestones_map.values())

    return {
        "activity_delay_days": delay_days,
        "affected_activities": affected_activities,
        "affected_milestones": affected_milestones,
        "has_downstream_impact": len(affected_activities) > 0 or len(affected_milestones) > 0,
    }
