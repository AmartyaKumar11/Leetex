-- LeetEx full schema (v0.5+)
-- Run once in Supabase SQL editor.

-- =====================
-- USERS
-- =====================
CREATE TABLE IF NOT EXISTS users (
  clerk_user_id   TEXT PRIMARY KEY,
  email           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- PROBLEMS
-- =====================
CREATE TABLE IF NOT EXISTS problems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  leetcode_id     INTEGER,
  difficulty      TEXT,
  topic_tags      TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problems_slug
  ON problems(slug);
CREATE INDEX IF NOT EXISTS idx_problems_topic_tags
  ON problems USING GIN(topic_tags);

-- =====================
-- SESSIONS (base v0.5 + extensions)
-- =====================
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

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS problem_id UUID,
  ADD COLUMN IF NOT EXISTS is_returning_session BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS total_runs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_submissions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_time BIGINT,
  ADD COLUMN IF NOT EXISTS end_time BIGINT,
  ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS topic_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_sessions_analysis_status'
  ) THEN
    ALTER TABLE sessions
      ADD CONSTRAINT chk_sessions_analysis_status
      CHECK (analysis_status IN ('pending','skipped','processing','complete','failed'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_sessions_problem_id'
  ) THEN
    ALTER TABLE sessions
      ADD CONSTRAINT fk_sessions_problem_id
      FOREIGN KEY (problem_id) REFERENCES problems(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_sessions_clerk_user_id'
  ) THEN
    ALTER TABLE sessions
      ADD CONSTRAINT fk_sessions_clerk_user_id
      FOREIGN KEY (clerk_user_id) REFERENCES users(clerk_user_id)
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_clerk_user_id
  ON sessions(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_problem_id
  ON sessions(problem_id);
CREATE INDEX IF NOT EXISTS idx_sessions_classifications
  ON sessions USING GIN(classifications);
CREATE INDEX IF NOT EXISTS idx_sessions_analysis_status
  ON sessions(analysis_status);

-- =====================
-- SESSION DIAGNOSES
-- =====================
CREATE TABLE IF NOT EXISTS session_diagnoses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            TEXT NOT NULL REFERENCES sessions(session_id),
  clerk_user_id         TEXT NOT NULL REFERENCES users(clerk_user_id),
  problem_id            UUID REFERENCES problems(id),

  approach_taken        TEXT,
  stuck_point           TEXT,
  pattern_understanding TEXT,
  relied_on_external    BOOLEAN DEFAULT FALSE,
  debug_effectiveness   TEXT,
  code_quality          TEXT,
  struggle_areas        TEXT[] DEFAULT '{}',

  prompt_sent           TEXT,
  raw_llm_response      JSONB,
  model_used            TEXT,
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_diagnoses_pattern_understanding'
  ) THEN
    ALTER TABLE session_diagnoses
      ADD CONSTRAINT chk_diagnoses_pattern_understanding
      CHECK (pattern_understanding IN ('none','partial','solid'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_diagnoses_debug_effectiveness'
  ) THEN
    ALTER TABLE session_diagnoses
      ADD CONSTRAINT chk_diagnoses_debug_effectiveness
      CHECK (debug_effectiveness IN ('systematic','random','none'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_diagnoses_code_quality'
  ) THEN
    ALTER TABLE session_diagnoses
      ADD CONSTRAINT chk_diagnoses_code_quality
      CHECK (code_quality IN ('clean','messy','incomplete'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_diagnoses_clerk_user_id
  ON session_diagnoses(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_session_id
  ON session_diagnoses(session_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_problem_id
  ON session_diagnoses(problem_id);

-- =====================
-- USER TOPIC STATS
-- =====================
CREATE TABLE IF NOT EXISTS user_topic_stats (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id               TEXT NOT NULL REFERENCES users(clerk_user_id),
  topic_tag                   TEXT NOT NULL,

  total_sessions              INTEGER DEFAULT 0,
  self_solved_count           INTEGER DEFAULT 0,
  editorial_assisted_count    INTEGER DEFAULT 0,
  solution_assisted_count     INTEGER DEFAULT 0,
  debug_heavy_count           INTEGER DEFAULT 0,

  none_understanding_count    INTEGER DEFAULT 0,
  partial_understanding_count INTEGER DEFAULT 0,
  solid_understanding_count   INTEGER DEFAULT 0,

  weakness_score              NUMERIC(5,2) DEFAULT 0,
  last_updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(clerk_user_id, topic_tag)
);

CREATE INDEX IF NOT EXISTS idx_topic_stats_clerk_user_id
  ON user_topic_stats(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_topic_stats_weakness_score
  ON user_topic_stats(clerk_user_id, weakness_score ASC);

-- =====================
-- RECOMMENDATIONS
-- =====================
CREATE TABLE IF NOT EXISTS recommendations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id),
  problem_id    UUID NOT NULL REFERENCES problems(id),

  reason        TEXT NOT NULL,
  topic_tag     TEXT,
  priority      INTEGER NOT NULL DEFAULT 1,
  status        TEXT DEFAULT 'active',

  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dismissed_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_recommendations_status'
  ) THEN
    ALTER TABLE recommendations
      ADD CONSTRAINT chk_recommendations_status
      CHECK (status IN ('active','dismissed','completed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recommendations_clerk_user_id
  ON recommendations(clerk_user_id, status);

-- =====================
-- ROW LEVEL SECURITY
-- Service role key used by backend bypasses RLS automatically
-- =====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topic_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
