"""Shared Supabase write helpers."""

from datetime import datetime, timezone
from typing import Any

from supabase import Client


def upsert_problem(
    supabase: Client,
    slug: str | None,
    title: str | None,
    difficulty: str | None,
) -> str | None:
    if not slug or not title:
        return None

    now = datetime.now(timezone.utc).isoformat()

    supabase.table("problems").upsert(
        {
            "slug": slug,
            "title": title,
            "difficulty": difficulty,
            "updated_at": now,
        },
        on_conflict="slug",
    ).execute()

    result = supabase.table("problems").select("id").eq("slug", slug).limit(1).execute()
    rows = result.data or []

    if not rows:
        return None

    return rows[0].get("id")


def extract_session_scalar_fields(
    session_data: dict[str, Any],
    analysis: dict[str, Any] | None,
) -> dict[str, Any]:
    metrics = session_data.get("metrics")
    metrics = metrics if isinstance(metrics, dict) else {}
    summary = analysis.get("summary") if isinstance(analysis, dict) else None
    summary = summary if isinstance(summary, dict) else {}

    total_runs = summary.get("totalRuns", metrics.get("totalRuns", 0))
    total_submissions = summary.get("totalSubmissions", metrics.get("totalSubmissions", 0))

    analysis_status = "complete" if analysis else "pending"

    return {
        "is_returning_session": bool(session_data.get("isReturningSession", False)),
        "total_runs": int(total_runs or 0),
        "total_submissions": int(total_submissions or 0),
        "start_time": session_data.get("startTime"),
        "end_time": session_data.get("endTime"),
        "analysis_status": analysis_status,
    }
