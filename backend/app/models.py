from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SessionSyncPayload(BaseModel):
    metadata: dict[str, Any]
    session: dict[str, Any]
    analysis: dict[str, Any] | None = None


class SessionSyncResponse(BaseModel):
    synced: bool = True
    session_id: str


class SessionSummary(BaseModel):
    session_id: str
    question_slug: str | None = None
    question_title: str | None = None
    difficulty: str | None = None
    accepted: bool = False
    classifications: list[str] = Field(default_factory=list)
    synced_at: datetime | None = None


class SessionDetail(BaseModel):
    session_id: str
    metadata: dict[str, Any]
    session: dict[str, Any]
    analysis: dict[str, Any] | None = None
    synced_at: datetime | None = None


class UserProfile(BaseModel):
    user_id: str
    total_sessions: int
    accepted_count: int
    classification_counts: dict[str, int]
