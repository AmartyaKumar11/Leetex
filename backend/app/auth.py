from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient, PyJWTError

from app.config import get_settings

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


async def get_current_user_id(
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
    user_id = claims.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    return user_id
