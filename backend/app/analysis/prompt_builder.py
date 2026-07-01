from typing import Any

SYSTEM_PROMPT = """You are an expert DSA learning coach analyzing a student's LeetCode problem-solving session.

Your job is to produce a precise, structured diagnosis of how the student approached this problem. This diagnosis will be used to build their personalized learning roadmap — it must be accurate, specific, and grounded in the evidence provided.

OUTPUT RULES:
- Respond with a single valid JSON object. Nothing else.
- No markdown. No code fences. No explanation. No preamble.
- Every field is required. Null is only allowed where explicitly stated.
- Enum fields must use EXACTLY the values listed — no variations, no synonyms.
- struggle_areas and strengths must only contain items from the provided taxonomy.
- improvement_suggestion must be specific to THIS session — not generic advice.
- confidence reflects how certain you are given the evidence. If the session is short or ambiguous, confidence should be lower.

OUTPUT SCHEMA:
{
  "approach_taken": "direct_optimal" | "brute_force_only" | "brute_force_to_optimal" | "trial_and_error" | "copy_paste" | "incomplete",
  "pattern_understanding": "none" | "partial" | "solid",
  "stuck_point": string (max 120 chars) | null,
  "debug_effectiveness": "systematic" | "random" | "none",
  "code_quality": "clean" | "messy" | "incomplete",
  "relied_on_external": boolean,
  "struggle_areas": string[] (0-3 items from taxonomy),
  "strengths": string[] (0-3 items from taxonomy),
  "improvement_suggestion": string (max 160 chars),
  "confidence": float (0.0-1.0)
}

TAXONOMY (only these exact strings are valid for struggle_areas and strengths):
pattern_recognition, algorithm_selection, complexity_awareness, boundary_conditions,
state_management, recursion_design, loop_logic, debugging, implementation_speed,
code_structure, edge_case_handling

FIELD GUIDANCE:
- approach_taken: how did the student arrive at their solution? copy_paste means the solution appeared fully formed with no incremental development.
- pattern_understanding: did they demonstrate they understood WHY this algorithm works, not just that it works?
- stuck_point: the single most specific moment or concept where progress stalled. null if they moved through cleanly.
- debug_effectiveness: systematic = targeted changes with clear intent, random = shotgun changes hoping something works, none = no debugging needed or no runs made.
- code_quality: clean = readable structure and naming, messy = works but hard to follow, incomplete = unfinished or has dead code.
- relied_on_external: true only if editorial or solutions were visited. Use the behavioral summary — do not infer this from code quality alone.
- relied_on_external: Solutions visited under 5000ms may indicate a quick reference check. Over 10000ms strongly indicates the student studied or copied the solution. Weight the duration when assessing approach_taken.
- confidence: reduce confidence if the session is under 3 minutes, has fewer than 3 snapshots, or the code journey is ambiguous.
- confidence: also reduce confidence if isReturningSession is true — the behavioral baseline is contaminated by a previous sitting."""


def build_prompt(session: dict, problem: dict, selected_snapshots: list[dict]) -> tuple[str, str]:
    metrics = session.get("metrics", {})
    sources = session.get("learningSources", {})
    classifications = session.get("analysis", {}).get("classifications", [])

    editorial = sources.get("editorial", {})
    solutions = sources.get("solutions", {})

    editorial_visited = editorial.get("visits", 0) > 0
    solutions_visited = solutions.get("visits", 0) > 0

    time_to_first_edit = metrics.get("timeToFirstEdit")
    tte_str = f"{time_to_first_edit}s" if time_to_first_edit else "unknown"
    attempts = session.get("attemptHistory", [])
    attempt_history = " → ".join(
        [
            attempt.get("status", "Unknown")
            for attempt in attempts
            if isinstance(attempt, dict) and attempt.get("type") in ("RUN", "SUBMIT")
        ]
    ) or "none"

    user_prompt = f"""PROBLEM
Title: {problem.get('title')} ({problem.get('difficulty', 'Unknown')})
Topic tags: {', '.join(problem.get('topic_tags', [])) or 'none'}

BEHAVIORAL SUMMARY
Time to first edit: {tte_str}
Total runs: {metrics.get('totalRuns', 0)}
Total submissions: {metrics.get('totalSubmissions', 0)}
Attempt history: {attempt_history}
Accepted: {'yes' if session.get('analysis', {}).get('summary', {}).get('accepted') else 'no'}
Returning session: {'yes — prior code exists at session start' if session.get('isReturningSession') else 'no'}
Editorial visited: {'yes (' + str(editorial.get('timeMs', 0)) + 'ms)' if editorial_visited else 'no'}
Solutions visited: {'yes (' + str(solutions.get('timeMs', 0)) + 'ms)' if solutions_visited else 'no'}
System classifications: {', '.join(classifications) if classifications else 'none'}

CODE JOURNEY
{_format_snapshots(selected_snapshots)}

Diagnose this session. Return only the JSON object."""

    return SYSTEM_PROMPT, user_prompt


def _format_snapshots(snapshots: list[dict]) -> str:
    lines = []

    for i, snap in enumerate(snapshots):
        ts = snap.get("relativeTimestamp", 0)
        minutes = ts // 60
        seconds = ts % 60
        timestamp_str = f"T+{minutes}:{seconds:02d}"

        similarity = snap.get("similarityToPrevious")
        sim_str = (
            "similarity_to_previous: baseline"
            if i == 0 or similarity is None
            else f"similarity_to_previous: {similarity:.2f}"
        )

        code = snap.get("code", "").strip()

        lines.append(f"[{timestamp_str}] {sim_str}")
        lines.append(code)
        lines.append("---")

    return "\n".join(lines)


def select_snapshots(session: dict[str, Any]) -> list[dict[str, Any]]:
    snapshots = session.get("snapshots")
    if not isinstance(snapshots, list) or len(snapshots) == 0:
        return []

    start_time = _to_int(session.get("startTime"))
    duration_seconds = _get_duration_seconds(session, snapshots)
    bucket_size = max(duration_seconds / 15, 1)
    selected_by_index: dict[int, dict[str, Any]] = {}

    for snapshot in snapshots:
        if not isinstance(snapshot, dict):
            continue

        relative_timestamp = _relative_timestamp(snapshot, start_time)
        bucket_index = int(relative_timestamp / bucket_size)
        selected_by_index[bucket_index] = {
            **snapshot,
            "relativeTimestamp": relative_timestamp,
        }

    first = {
        **snapshots[0],
        "relativeTimestamp": _relative_timestamp(snapshots[0], start_time),
    }
    last = {
        **snapshots[-1],
        "relativeTimestamp": _relative_timestamp(snapshots[-1], start_time),
    }

    selected = [first, *selected_by_index.values(), last]
    deduped: dict[str, dict[str, Any]] = {}

    for snapshot in selected:
        key = str(snapshot.get("snapshotId") or snapshot.get("timestamp") or len(deduped))
        deduped[key] = snapshot

    for snapshot in snapshots:
        if not isinstance(snapshot, dict):
            continue

        similarity = snapshot.get("similarityToPrevious")
        if not isinstance(similarity, int | float) or similarity >= 0.6:
            continue

        key = str(snapshot.get("snapshotId") or snapshot.get("timestamp"))
        if key not in deduped:
            deduped[key] = {
                **snapshot,
                "relativeTimestamp": _relative_timestamp(snapshot, start_time),
            }

    return sorted(
        deduped.values(),
        key=lambda snapshot: _to_int(snapshot.get("timestamp")),
    )


def _relative_timestamp(snapshot: dict[str, Any], start_time: int) -> int:
    timestamp = _to_int(snapshot.get("timestamp"))
    if start_time <= 0 or timestamp <= start_time:
        return 0

    return int((timestamp - start_time) / 1000)


def _get_duration_seconds(session: dict[str, Any], snapshots: list[Any]) -> int:
    metrics = session.get("metrics")
    metrics = metrics if isinstance(metrics, dict) else {}
    metric_duration = _to_int(metrics.get("sessionDuration"))

    if metric_duration > 0:
        return metric_duration

    start_time = _to_int(session.get("startTime"))
    end_time = _to_int(session.get("endTime"))

    if start_time > 0 and end_time > start_time:
        return int((end_time - start_time) / 1000)

    first_timestamp = _to_int(snapshots[0].get("timestamp")) if isinstance(snapshots[0], dict) else 0
    last_snapshot = snapshots[-1]
    last_timestamp = _to_int(last_snapshot.get("timestamp")) if isinstance(last_snapshot, dict) else 0

    if first_timestamp > 0 and last_timestamp > first_timestamp:
        return int((last_timestamp - first_timestamp) / 1000)

    return 1


def _to_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0
