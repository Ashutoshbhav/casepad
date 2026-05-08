-- Migration 0012 — Add dossier column for per-case knowledge depth.
-- Stream 4 of the 2026-05-08 AI training plan.
-- Apply via Supabase Studio SQL editor (memory note: project has no
-- DATABASE_URL / SUPABASE_DB_PASSWORD configured for direct psql).

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS dossier JSONB DEFAULT NULL;

-- Index on schema_version so we can find cases needing re-enrichment after
-- a schema bump without scanning the full table.
CREATE INDEX IF NOT EXISTS idx_cases_dossier_schema_version
  ON public.cases ((dossier->>'schema_version'))
  WHERE dossier IS NOT NULL;

COMMENT ON COLUMN public.cases.dossier IS
  'Pre-computed knowledge dossier per case. Schema in scripts/qa/enrich-case-dossiers.ts. Used at chat-session start to give the AI deep per-case grounding. NULL = not yet enriched (chat falls back to problem_statement + interviewer_notes only).';
