from datetime import datetime, timezone
from typing import Any

from supabase import Client


def update_user_topic_stats(
    supabase: Client,
    *,
    session_row: dict[str, Any],
    problem: dict[str, Any],
    diagnosis: dict[str, Any],
) -> None:
    clerk_user_id = session_row["clerk_user_id"]
    topic_tags = problem.get("topic_tags") or []

    if not isinstance(topic_tags, list):
        return

    for topic_tag in topic_tags:
        if not isinstance(topic_tag, str) or not topic_tag.strip():
            continue

        _upsert_topic_stat(
            supabase,
            clerk_user_id=clerk_user_id,
            topic_tag=topic_tag,
            pattern_understanding=diagnosis["pattern_understanding"],
            classifications=_extract_classifications(session_row),
        )


def _upsert_topic_stat(
    supabase: Client,
    *,
    clerk_user_id: str,
    topic_tag: str,
    pattern_understanding: str,
    classifications: set[str],
) -> None:
    existing_result = (
        supabase.table("user_topic_stats")
        .select("*")
        .eq("clerk_user_id", clerk_user_id)
        .eq("topic_tag", topic_tag)
        .limit(1)
        .execute()
    )
    rows = existing_result.data or []
    existing = rows[0] if rows else {}

    total_sessions = _to_int(existing.get("total_sessions")) + 1
    none_count = _to_int(existing.get("none_understanding_count"))
    partial_count = _to_int(existing.get("partial_understanding_count"))
    solid_count = _to_int(existing.get("solid_understanding_count"))

    if pattern_understanding == "none":
        none_count += 1
    elif pattern_understanding == "partial":
        partial_count += 1
    elif pattern_understanding == "solid":
        solid_count += 1

    weakness_score = (
        ((none_count * 0) + (partial_count * 50) + (solid_count * 100)) / total_sessions
        if total_sessions > 0
        else 0
    )

    record = {
        "clerk_user_id": clerk_user_id,
        "topic_tag": topic_tag,
        "total_sessions": total_sessions,
        "self_solved_count": _increment_if(
            existing,
            "self_solved_count",
            "SELF_SOLVED" in classifications,
        ),
        "editorial_assisted_count": _increment_if(
            existing,
            "editorial_assisted_count",
            "EDITORIAL_ASSISTED" in classifications,
        ),
        "solution_assisted_count": _increment_if(
            existing,
            "solution_assisted_count",
            "SOLUTION_ASSISTED" in classifications,
        ),
        "debug_heavy_count": _increment_if(
            existing,
            "debug_heavy_count",
            "DEBUG_HEAVY" in classifications,
        ),
        "none_understanding_count": none_count,
        "partial_understanding_count": partial_count,
        "solid_understanding_count": solid_count,
        "weakness_score": round(weakness_score, 2),
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }

    supabase.table("user_topic_stats").upsert(
        record,
        on_conflict="clerk_user_id,topic_tag",
    ).execute()


def _extract_classifications(session_row: dict[str, Any]) -> set[str]:
    analysis = session_row.get("analysis_data")
    analysis = analysis if isinstance(analysis, dict) else {}
    raw = analysis.get("classifications", [])

    if not isinstance(raw, list):
        return set()

    return {str(item) for item in raw}


def _increment_if(existing: dict[str, Any], field: str, should_increment: bool) -> int:
    value = _to_int(existing.get(field))
    return value + 1 if should_increment else value


def _to_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0
