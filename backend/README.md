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

Run in the Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  clerk_user_id TEXT NOT NULL,
  question_slug TEXT,
  question_title TEXT,
  difficulty TEXT,
  accepted BOOLEAN DEFAULT FALSE,
  classifications TEXT[] DEFAULT '{}',
  metadata JSONB,
  session_data JSONB NOT NULL,
  analysis_data JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_clerk_user_id ON sessions(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_question_slug ON sessions(question_slug);
```

## Run

```bash
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

Requests require `Authorization: Bearer <clerk_jwt>`. Tokens are verified against `CLERK_JWKS_URL` using RS256. The `sub` claim is used as `clerk_user_id`.

## Extension

Set `PLASMO_PUBLIC_BACKEND_URL=http://localhost:8000` in `.env.development`. The extension auto-syncs completed sessions when the user is signed in.
