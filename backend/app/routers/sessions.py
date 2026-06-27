from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models import (
    SessionDetail,
    SessionSummary,
    SessionSyncPayload,
    SessionSyncResponse,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _extract_classifications(analysis: dict[str, Any] | None) -> list[str]:
    if not analysis:
        return []

    raw = analysis.get("classifications", [])
    return [str(item) for item in raw] if isinstance(raw, list) else []


def _extract_accepted(analysis: dict[str, Any] | None) -> bool:
    if not analysis:
        return False

    summary = analysis.get("summary")
    if isinstance(summary, dict):
        return bool(summary.get("accepted", False))

    return False


def _row_to_summary(row: dict[str, Any]) -> SessionSummary:
    return SessionSummary(
        session_id=row["session_id"],
        question_slug=row.get("question_slug"),
        question_title=row.get("question_title"),
        difficulty=row.get("difficulty"),
        accepted=bool(row.get("accepted", False)),
        classifications=row.get("classifications") or [],
        synced_at=row.get("synced_at"),
    )


def _row_to_detail(row: dict[str, Any]) -> SessionDetail:
    return SessionDetail(
        session_id=row["session_id"],
        metadata=row.get("metadata") or {},
        session=row.get("session_data") or {},
        analysis=row.get("analysis_data"),
        synced_at=row.get("synced_at"),
    )


@router.post("/sync", response_model=SessionSyncResponse)
async def sync_session(
    payload: SessionSyncPayload,
    user_id: str = Depends(get_current_user_id),
) -> SessionSyncResponse:
    session_data = payload.session
    session_id = session_data.get("sessionId")

    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="session.sessionId is required",
        )

    synced_at = datetime.now(timezone.utc).isoformat()
    analysis = payload.analysis

    record = {
        "session_id": session_id,
        "clerk_user_id": user_id,
        "question_slug": session_data.get("questionSlug"),
        "question_title": session_data.get("questionTitle"),
        "difficulty": session_data.get("difficulty"),
        "accepted": _extract_accepted(analysis),
        "classifications": _extract_classifications(analysis),
        "metadata": payload.metadata,
        "session_data": session_data,
        "analysis_data": analysis,
        "synced_at": synced_at,
    }

    supabase = get_supabase()
    supabase.table("sessions").upsert(record, on_conflict="session_id").execute()

    return SessionSyncResponse(session_id=session_id)


@router.get("", response_model=list[SessionSummary])
async def list_sessions(
    user_id: str = Depends(get_current_user_id),
) -> list[SessionSummary]:
    supabase = get_supabase()
    result = (
        supabase.table("sessions")
        .select(
            "session_id, question_slug, question_title, difficulty, accepted, classifications, synced_at"
        )
        .eq("clerk_user_id", user_id)
        .order("synced_at", desc=True)
        .execute()
    )

    return [_row_to_summary(row) for row in result.data or []]


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
) -> SessionDetail:
    supabase = get_supabase()
    result = (
        supabase.table("sessions")
        .select("*")
        .eq("session_id", session_id)
        .limit(1)
        .execute()
    )

    rows = result.data or []

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    row = rows[0]

    if row.get("clerk_user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session belongs to a different user",
        )

    return _row_to_detail(row)
