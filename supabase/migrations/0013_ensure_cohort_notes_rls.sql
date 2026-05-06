-- Defensive: ensure RLS is enabled on cohort_notes.
--
-- Migration 0010_lock_cohort_notes_to_owner.sql tightened SELECT/UPDATE/
-- DELETE policies on cohort_notes but never explicitly enabled RLS — the
-- table itself was created via the Supabase dashboard, not a migration,
-- so its RLS state is implicit. If RLS was somehow off (e.g. dashboard
-- create defaulted to off in the past, or a future migration disabled
-- it), the policies in 0010 are silently bypassed and notes are public.
--
-- This migration is idempotent: if RLS is already enabled, this is a
-- no-op. If somehow disabled, it locks the table down to match the
-- intent stated in 0010 (each user reads/writes only their own notes).
--
-- No grants change — 0010's existing policies remain authoritative.

alter table cohort_notes enable row level security;
