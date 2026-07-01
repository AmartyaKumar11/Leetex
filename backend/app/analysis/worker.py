import logging
from datetime import datetime, timezone
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from supabase import Client

from app.analysis.eligibility import check_session_eligibility
from app.analysis.gemini_client import RateLimitError, generate_diagnosis
from app.analysis.prompt_builder import build_prompt, select_snapshots
from app.analysis.stats_updater import update_user_topic_stats
from app.analysis.validator import ValidationError, validate_diagnosis
from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)

MAX_SESSIONS_PER_CYCLE = 10


def start_analysis_worker() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_analysis_cycle,
        "interval",
        seconds=60,
        id="analysis_worker",
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info("Analysis worker started")
    return scheduler


def stop_analysis_worker(scheduler: BackgroundScheduler | None) -> None:
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Analysis worker stopped")


def run_analysis_cycle() -> None:
    settings = get_settings()
    if not settings.gemini_api_key or settings.gemini_api_key == "your_gemini_api_key_here":
        logger.warning("Analysis worker cycle skipped result=gemini_api_key_not_configured")
        return

    supabase = get_supabase()
    processed = 0
    skipped = 0
    failed = 0
    rate_limited = False

    logger.info("Analysis worker cycle started")

    try:
        sessions = _fetch_pending_sessions(supabase)
    except Exception:
        logger.exception("Analysis worker failed to fetch pending sessions")
        return

    for session_row in sessions:
        session_id = str(session_row.get("session_id") or "")
        clerk_user_id = session_row.get("clerk_user_id")

        if not session_id or not isinstance(clerk_user_id, str) or not clerk_user_id:
            logger.warning("Analysis skipped session_id=%s result=missing_user", session_id)
            failed += 1
            continue

        try:
            if not _user_exists(supabase, clerk_user_id):
                logger.warning("Analysis skipped session_id=%s result=user_not_found", session_id)
                _set_analysis_status(supabase, session_id, clerk_user_id, "failed")
                failed += 1
                continue

            eligibility = check_session_eligibility(session_row)
            if not eligibility.eligible:
                _set_analysis_status(supabase, session_id, clerk_user_id, "skipped")
                logger.info("Analysis outcome session_id=%s result=skipped", session_id)
                skipped += 1
                continue

            problem = _fetch_problem(supabase, session_row)
            if not problem:
                logger.warning("Analysis failed session_id=%s result=problem_not_found", session_id)
                _set_analysis_status(supabase, session_id, clerk_user_id, "failed")
                failed += 1
                continue

            _set_analysis_status(supabase, session_id, clerk_user_id, "processing")
            diagnosis = _analyze_session(session_row, problem)
            _insert_diagnosis(supabase, session_row, problem, diagnosis)
            update_user_topic_stats(
                supabase,
                session_row=session_row,
                problem=problem,
                diagnosis=diagnosis,
            )
            _set_analysis_status(supabase, session_id, clerk_user_id, "complete")
            logger.info("Analysis outcome session_id=%s result=complete", session_id)
            processed += 1
        except RateLimitError:
            _set_analysis_status(supabase, session_id, clerk_user_id, "pending")
            logger.warning("Analysis rate limited session_id=%s result=pending", session_id)
            rate_limited = True
            break
        except ValidationError as exc:
            _set_analysis_status(supabase, session_id, clerk_user_id, "failed")
            logger.error(
                "Analysis validation failed session_id=%s field=%s",
                session_id,
                exc.field,
            )
            failed += 1
        except Exception:
            _set_analysis_status(supabase, session_id, clerk_user_id, "failed")
            logger.exception("Analysis failed session_id=%s", session_id)
            failed += 1

    logger.info(
        "Analysis worker cycle summary processed=%s skipped=%s failed=%s rate_limited=%s",
        processed,
        skipped,
        failed,
        rate_limited,
    )


def _fetch_pending_sessions(supabase: Client) -> list[dict[str, Any]]:
    result = (
        supabase.table("sessions")
        .select("*")
        .eq("analysis_status", "pending")
        .neq("clerk_user_id", "")
        .order("synced_at", desc=False)
        .limit(MAX_SESSIONS_PER_CYCLE)
        .execute()
    )
    return result.data or []


def _user_exists(supabase: Client, clerk_user_id: str) -> bool:
    result = (
        supabase.table("users")
        .select("clerk_user_id")
        .eq("clerk_user_id", clerk_user_id)
        .limit(1)
        .execute()
    )
    return bool(result.data)


def _fetch_problem(
    supabase: Client,
    session_row: dict[str, Any],
) -> dict[str, Any] | None:
    problem_id = session_row.get("problem_id")
    if not problem_id:
        return None

    result = supabase.table("problems").select("*").eq("id", problem_id).limit(1).execute()
    rows = result.data or []
    return rows[0] if rows else None


def _analyze_session(
    session_row: dict[str, Any],
    problem: dict[str, Any],
) -> dict[str, Any]:
    session_id = str(session_row["session_id"])
    session_data = session_row.get("session_data")
    session_data = session_data if isinstance(session_data, dict) else {}
    analysis_data = session_row.get("analysis_data")
    analysis_data = analysis_data if isinstance(analysis_data, dict) else {}
    session_for_prompt = {**session_data, "analysis": analysis_data}
    selected_snapshots = select_snapshots(session_for_prompt)
    system_prompt, user_prompt = build_prompt(session_for_prompt, problem, selected_snapshots)
    raw_diagnosis = generate_diagnosis(
        session_id=session_id,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )
    return validate_diagnosis(raw_diagnosis, session_id=session_id)


def _insert_diagnosis(
    supabase: Client,
    session_row: dict[str, Any],
    problem: dict[str, Any],
    diagnosis: dict[str, Any],
) -> None:
    settings = get_settings()
    record = {
        "session_id": session_row["session_id"],
        "clerk_user_id": session_row["clerk_user_id"],
        "problem_id": problem.get("id"),
        "approach_taken": diagnosis["approach_taken"],
        "stuck_point": diagnosis["stuck_point"],
        "pattern_understanding": diagnosis["pattern_understanding"],
        "relied_on_external": diagnosis["relied_on_external"],
        "debug_effectiveness": diagnosis["debug_effectiveness"],
        "code_quality": diagnosis["code_quality"],
        "struggle_areas": diagnosis["struggle_areas"],
        "strengths": diagnosis["strengths"],
        "improvement_suggestion": diagnosis["improvement_suggestion"],
        "confidence": diagnosis["confidence"],
        "raw_llm_response": diagnosis,
        "model_used": settings.gemini_model,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    supabase.table("session_diagnoses").insert(record).execute()


def _set_analysis_status(
    supabase: Client,
    session_id: str,
    clerk_user_id: str,
    status: str,
) -> None:
    supabase.table("sessions").update(
        {
            "analysis_status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("session_id", session_id).eq("clerk_user_id", clerk_user_id).execute()
