from datetime import datetime, timezone
from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient, PyJWTError

from app.config import get_settings
from app.database import get_supabase

security = HTTPBearer(auto_error=False)

CLERK_AUTHORIZED_PARTIES = (
    "chrome-extension://oemcjojcdpdkcaominnhhehamfjokjaa",
    "http://localhost:3000",
)


@lru_cache(maxsize=1)
def _get_jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url, cache_keys=True)


def verify_clerk_token(token: str) -> dict:
    settings = get_settings()

    try:
        client = _get_jwks_client(settings.clerk_jwks_url)
        signing_key = client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
            leeway=30,
        )

        azp = claims.get("azp")
        allowed_parties = {*CLERK_AUTHORIZED_PARTIES, settings.clerk_publishable_key}
        if azp and azp not in allowed_parties:
            raise PyJWTError(f"Unauthorized party: {azp}")

        return claims
    except PyJWTError as exc:
        detail = "Invalid authentication token"
        if settings.environment == "development":
            detail = f"Invalid authentication token: {exc}"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        ) from exc


def _extract_email_from_claims(claims: dict) -> str | None:
    for key in ("email", "primary_email_address"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return None


def _upsert_user(clerk_user_id: str, email: str | None) -> None:
    record: dict[str, str] = {
        "clerk_user_id": clerk_user_id,
        "last_active_at": datetime.now(timezone.utc).isoformat(),
    }

    if email:
        record["email"] = email

    get_supabase().table("users").upsert(record, on_conflict="clerk_user_id").execute()


def refresh_user_profile(clerk_user_id: str, email: str | None) -> None:
    _upsert_user(clerk_user_id, email)


async def upsert_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    token = credentials.credentials.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    claims = verify_clerk_token(token)
    clerk_user_id = claims.get("sub")

    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    _upsert_user(clerk_user_id, _extract_email_from_claims(claims))

    return clerk_user_id
