# LeetEx Backend (v0.5)

FastAPI service for Clerk-authenticated session sync and retrieval via Supabase.

## Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
```

Fill `.env` with your Supabase and Clerk credentials.

### Supabase schema

Full schema lives in [`schema.sql`](schema.sql) (users, problems, sessions, diagnoses, topic stats, recommendations, RLS).

Run that file once in the Supabase SQL editor. The v0.5 sync endpoint expects at minimum `users`, `problems`, and `sessions`.

On every authenticated request the backend upserts `users`. On `/sessions/sync` it also upserts `problems` (by slug) and links `sessions.problem_id`.

## Run

From repo root (extension + API together):

```bash
npm run dev:all
```

Backend only:

```bash
npm run dev:backend
```

Or manually:

```bash
cd backend
uvicorn app.main:app --reload
```

Health check: `GET http://localhost:8000/health`

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Service health |
| POST | `/sessions/sync` | Bearer JWT | Upsert session export payload |
| GET | `/sessions` | Bearer JWT | List session summaries |
| GET | `/sessions/{session_id}` | Bearer JWT | Full session detail |
| GET | `/users/me` | Bearer JWT | Aggregated user profile |

## Auth

Requests require `Authorization: Bearer <clerk_jwt>`. Tokens are verified against `CLERK_JWKS_URL` using RS256. The `sub` claim is used as `clerk_user_id`. Every authenticated request upserts the caller into `users` (`last_active_at`, `email` when present in the JWT).

## Extension

Set `PLASMO_PUBLIC_BACKEND_URL=http://localhost:8000` in `.env.development`. The extension auto-syncs on submit and when a session ends.
