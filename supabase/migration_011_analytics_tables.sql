-- Migration 011: Analytics instrumentation tables
-- Run in Supabase Dashboard → SQL Editor → New Query

-- ── diagnostic_sessions (drop-off tracking) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diagnostic_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject      text NOT NULL CHECK (subject IN ('maths', 'reading')),
  status       text NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'abandoned', 'completed')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.diagnostic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diagnostic_sessions_service" ON public.diagnostic_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "diagnostic_sessions_own" ON public.diagnostic_sessions FOR ALL USING (auth.uid() = user_id);

-- ── ai_logs (AI cost + latency tracking) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id               bigserial PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint         text NOT NULL,
  model            text,
  call_type        text CHECK (call_type IN ('chat', 'tts', 'translate', 'hint', 'report')),
  prompt_tokens    int,
  completion_tokens int,
  duration_ms      int,
  first_token_ms   int,
  status           text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'fallback')),
  used_fallback    boolean DEFAULT false,
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_logs_created_idx ON public.ai_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_logs_endpoint_idx ON public.ai_logs (endpoint, created_at DESC);
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_logs_service" ON public.ai_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── mode_sessions (Guide / Practice / Socratic split) ────────────────────────
ALTER TABLE public.skill_attempts ADD COLUMN IF NOT EXISTS mode text CHECK (mode IN ('practice', 'socratic', 'guided'));
ALTER TABLE public.skill_attempts ADD COLUMN IF NOT EXISTS duration_ms int;
ALTER TABLE public.skill_attempts ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE public.skill_attempts ADD COLUMN IF NOT EXISTS question_index int;

-- ── chat_messages enhancements ──────────────────────────────────────────────
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_hint_request boolean DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS has_image boolean DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_regeneration boolean DEFAULT false;

-- ── milestone_events (first success tracking) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.milestone_events (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS milestone_events_user_type ON public.milestone_events (user_id, event_type);
ALTER TABLE public.milestone_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "milestone_events_service" ON public.milestone_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── feature_usage ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_usage (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key  text NOT NULL,
  first_used   timestamptz NOT NULL DEFAULT now(),
  last_used    timestamptz NOT NULL DEFAULT now(),
  use_count    int NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, feature_key)
);
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_usage_service" ON public.feature_usage FOR ALL TO service_role USING (true) WITH CHECK (true);
