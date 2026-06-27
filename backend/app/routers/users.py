from collections import Counter

from fastapi import APIRouter, Depends

from app.auth import get_current_user_id
from app.database import get_supabase
from app.models import UserProfile

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    user_id: str = Depends(get_current_user_id),
) -> UserProfile:
    supabase = get_supabase()
    result = (
        supabase.table("sessions")
        .select("accepted, classifications")
        .eq("clerk_user_id", user_id)
        .execute()
    )

    rows = result.data or []
    classification_counter: Counter[str] = Counter()
    accepted_count = 0

    for row in rows:
        if row.get("accepted"):
            accepted_count += 1

        classifications = row.get("classifications") or []
        if isinstance(classifications, list):
            classification_counter.update(str(item) for item in classifications)

    return UserProfile(
        user_id=user_id,
        total_sessions=len(rows),
        accepted_count=accepted_count,
        classification_counts=dict(classification_counter),
    )
