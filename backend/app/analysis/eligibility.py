import logging
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EligibilityResult:
    eligible: bool
    reason: str | None = None


def check_session_eligibility(session_row: dict[str, Any]) -> EligibilityResult:
    session = session_row.get("session_data")
    session = session if isinstance(session, dict) else {}
    metrics = session.get("metrics")
    metrics = metrics if isinstance(metrics, dict) else {}

    total_runs = _to_int(session_row.get("total_runs", metrics.get("totalRuns", 0)))
    total_submissions = _to_int(
        session_row.get("total_submissions", metrics.get("totalSubmissions", 0))
    )
    topic_tags = session_row.get("topic_tags") or session.get("topicTags") or []
    duration_seconds = _get_duration_seconds(session_row, session, metrics)
    is_returning_session = bool(
        session_row.get("is_returning_session", session.get("isReturningSession", False))
    )

    if total_runs == 0 and total_submissions == 0:
        return _skip(session_row, "no_runs_or_submissions")

    if not isinstance(topic_tags, list) or len(topic_tags) == 0:
        return _skip(session_row, "missing_topic_tags")

    if duration_seconds < 120:
        return _skip(session_row, "session_under_120_seconds")

    if is_returning_session and total_submissions == 0:
        return _skip(session_row, "returning_session_without_submission")

    return EligibilityResult(eligible=True)


def _skip(session_row: dict[str, Any], reason: str) -> EligibilityResult:
    logger.info(
        "Analysis skipped session_id=%s reason=%s",
        session_row.get("session_id"),
        reason,
    )
    return EligibilityResult(eligible=False, reason=reason)


def _get_duration_seconds(
    session_row: dict[str, Any],
    session: dict[str, Any],
    metrics: dict[str, Any],
) -> int:
    start_time = _to_int(session_row.get("start_time", session.get("startTime")))
    end_time = _to_int(session_row.get("end_time", session.get("endTime")))

    if start_time > 0 and end_time > start_time:
        return int((end_time - start_time) / 1000)

    return _to_int(metrics.get("sessionDuration", 0))


def _to_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0
