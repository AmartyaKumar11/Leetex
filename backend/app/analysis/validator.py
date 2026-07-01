import logging
from typing import Any

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    def __init__(self, field: str, value: Any, message: str = "invalid value") -> None:
        super().__init__(f"{field}: {message}: {value!r}")
        self.field = field
        self.value = value


APPROACH_VALUES = {
    "direct_optimal",
    "brute_force_only",
    "brute_force_to_optimal",
    "trial_and_error",
    "copy_paste",
    "incomplete",
}
PATTERN_VALUES = {"none", "partial", "solid"}
DEBUG_VALUES = {"systematic", "random", "none"}
CODE_QUALITY_VALUES = {"clean", "messy", "incomplete"}
TAXONOMY_VALUES = {
    "pattern_recognition",
    "algorithm_selection",
    "complexity_awareness",
    "boundary_conditions",
    "state_management",
    "recursion_design",
    "loop_logic",
    "debugging",
    "implementation_speed",
    "code_structure",
    "edge_case_handling",
}
REQUIRED_FIELDS = {
    "approach_taken",
    "pattern_understanding",
    "stuck_point",
    "debug_effectiveness",
    "code_quality",
    "relied_on_external",
    "struggle_areas",
    "strengths",
    "improvement_suggestion",
    "confidence",
}
CORRECTIONS = {
    "approach_taken": {
        "brute_force": "brute_force_only",
        "optimal": "direct_optimal",
        "direct": "direct_optimal",
        "trial_error": "trial_and_error",
        "copy paste": "copy_paste",
    },
    "pattern_understanding": {
        "no": "none",
        "none_understanding": "none",
        "partial_understanding": "partial",
        "solid_understanding": "solid",
    },
    "debug_effectiveness": {
        "not_applicable": "none",
        "n/a": "none",
        "no_debugging": "none",
    },
    "code_quality": {
        "good": "clean",
        "poor": "messy",
        "unfinished": "incomplete",
    },
}


def validate_diagnosis(diagnosis: dict[str, Any], *, session_id: str) -> dict[str, Any]:
    missing = REQUIRED_FIELDS - diagnosis.keys()
    if missing:
        raise ValidationError("required_fields", sorted(missing), "missing required fields")

    normalized = dict(diagnosis)

    normalized["approach_taken"] = _validate_enum(
        normalized,
        "approach_taken",
        APPROACH_VALUES,
        session_id=session_id,
    )
    normalized["pattern_understanding"] = _validate_enum(
        normalized,
        "pattern_understanding",
        PATTERN_VALUES,
        session_id=session_id,
    )
    normalized["debug_effectiveness"] = _validate_enum(
        normalized,
        "debug_effectiveness",
        DEBUG_VALUES,
        session_id=session_id,
    )
    normalized["code_quality"] = _validate_enum(
        normalized,
        "code_quality",
        CODE_QUALITY_VALUES,
        session_id=session_id,
    )
    normalized["relied_on_external"] = _validate_bool(normalized, "relied_on_external")
    normalized["struggle_areas"] = _validate_taxonomy_array(normalized, "struggle_areas")
    normalized["strengths"] = _validate_taxonomy_array(normalized, "strengths")
    normalized["stuck_point"] = _validate_optional_string(normalized, "stuck_point", 120)
    normalized["improvement_suggestion"] = _validate_required_string(
        normalized,
        "improvement_suggestion",
        160,
    )
    normalized["confidence"] = _validate_confidence(normalized)

    return normalized


def _validate_enum(
    diagnosis: dict[str, Any],
    field: str,
    allowed_values: set[str],
    *,
    session_id: str,
) -> str:
    value = diagnosis.get(field)
    if not isinstance(value, str):
        raise ValidationError(field, value)

    if value in allowed_values:
        return value

    corrected = CORRECTIONS.get(field, {}).get(value.strip().lower())
    if corrected in allowed_values:
        logger.warning(
            "Validation corrected enum session_id=%s field=%s received=%s corrected=%s",
            session_id,
            field,
            value,
            corrected,
        )
        return corrected

    raise ValidationError(field, value)


def _validate_bool(diagnosis: dict[str, Any], field: str) -> bool:
    value = diagnosis.get(field)
    if not isinstance(value, bool):
        raise ValidationError(field, value)
    return value


def _validate_taxonomy_array(diagnosis: dict[str, Any], field: str) -> list[str]:
    value = diagnosis.get(field)
    if not isinstance(value, list):
        raise ValidationError(field, value)

    if len(value) > 3:
        raise ValidationError(field, value, "too many items")

    normalized: list[str] = []
    for item in value:
        if not isinstance(item, str) or item not in TAXONOMY_VALUES:
            raise ValidationError(field, item)
        normalized.append(item)

    return normalized


def _validate_optional_string(
    diagnosis: dict[str, Any],
    field: str,
    max_length: int,
) -> str | None:
    value = diagnosis.get(field)
    if value is None:
        return None

    if not isinstance(value, str):
        raise ValidationError(field, value)

    if len(value) > max_length:
        raise ValidationError(field, value, f"exceeds {max_length} characters")

    return value


def _validate_required_string(
    diagnosis: dict[str, Any],
    field: str,
    max_length: int,
) -> str:
    value = diagnosis.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(field, value)

    if len(value) > max_length:
        raise ValidationError(field, value, f"exceeds {max_length} characters")

    return value


def _validate_confidence(diagnosis: dict[str, Any]) -> float:
    value = diagnosis.get("confidence")
    if not isinstance(value, int | float):
        raise ValidationError("confidence", value)

    confidence = float(value)
    if confidence < 0 or confidence > 1:
        raise ValidationError("confidence", value, "outside 0.0-1.0")

    return confidence
