-- Fixes Supabase Security Advisor alert (received 2026-05-06):
--   rls_disabled_in_public on tavily_quota
--
-- Migration 0008_tavily_quota.sql created the table but forgot to run
-- `enable row level security`. With RLS off + the table in the `public`
-- schema, the Supabase REST API exposes it to anon and authenticated
-- callers. Anyone with the project URL could:
--   - read the row (low-risk; it's just an int counter)
--   - update count to 99999 → app thinks Tavily monthly cap is hit →
--     ingestion + cheat-sheet research stops working (denial of service)
--   - reset count to 0 → bypasses the 1,000-search/month free-tier guard,
--     runs up the bill on the real Tavily account
--
-- Tavily quota is server-only state. The only consumer is
-- src/lib/research/tavily-quota.ts which uses createSupabaseAdminClient()
-- (the service role client) — service role bypasses RLS by design, so
-- enabling RLS here does NOT break ingestion. Verified 2026-05-06.
--
-- Strategy: enable RLS with NO policies. RLS-on-no-policies = denied for
-- anon + authenticated. Service role still works.

alter table tavily_quota enable row level security;

-- Belt-and-suspenders: explicit revoke of table-level grants from anon
-- and authenticated. RLS already denies them, but revoking the grants
-- ensures any future policy mistake doesn't accidentally expose this.
revoke all on table tavily_quota from anon, authenticated;
