import json
import logging
from typing import Any

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

from app.config import get_settings

logger = logging.getLogger(__name__)


class RateLimitError(Exception):
    """Raised when Gemini returns a rate-limit response."""


def generate_diagnosis(
    *,
    session_id: str,
    system_prompt: str,
    user_prompt: str,
) -> dict[str, Any]:
    settings = get_settings()

    if not settings.gemini_api_key or settings.gemini_api_key == "your_gemini_api_key_here":
        raise RuntimeError("GEMINI_API_KEY is not configured")

    estimated_tokens = max(1, int((len(system_prompt) + len(user_prompt)) / 4))
    logger.info(
        "Gemini request prepared session_id=%s estimated_tokens=%s",
        session_id,
        estimated_tokens,
    )

    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction=system_prompt,
            generation_config={
                "temperature": 0.2,
                "response_mime_type": "application/json",
            },
        )
        response = model.generate_content(user_prompt)
        raw_text = response.text or ""

        return _parse_json_object(raw_text)
    except ResourceExhausted as exc:
        raise RateLimitError(str(exc)) from exc
    except Exception as exc:
        if _is_rate_limit_error(exc):
            raise RateLimitError(str(exc)) from exc
        raise


def _is_rate_limit_error(exc: Exception) -> bool:
    code = getattr(exc, "code", None)
    status_code = getattr(exc, "status_code", None)
    message = str(exc).lower()

    return code == 429 or status_code == 429 or "429" in message or "rate limit" in message


def _parse_json_object(raw_text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        parsed = _extract_last_json_object(raw_text)

    if not isinstance(parsed, dict):
        raise ValueError("Gemini returned non-object JSON")

    return parsed


def _extract_last_json_object(raw_text: str) -> dict[str, Any]:
    decoder = json.JSONDecoder()
    candidates: list[dict[str, Any]] = []

    for index, char in enumerate(raw_text):
        if char != "{":
            continue

        try:
            parsed, _ = decoder.raw_decode(raw_text[index:])
        except json.JSONDecodeError:
            continue

        if isinstance(parsed, dict):
            candidates.append(parsed)

    if not candidates:
        raise ValueError("Gemini returned invalid JSON")

    return candidates[-1]
