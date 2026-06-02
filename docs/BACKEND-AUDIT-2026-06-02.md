# CasePad Backend — Deep Audit (2026-06-02)

**Scope:** "look at absolutely everything." 6 parallel specialist audits (API routes · server-actions/auth · database/data-layer · LLM/Groq+cost · security · code-health) + 2 prior this-session audits (solving-engine, Fortress). Read-only. HEAD `741b9f2`. Cited to `file:line` throughout the sub-reports; this is the consolidated, deduped master.

## Honest verdict
The backend is **NOT uniformly "messed up."** It's **strong in the boring-but-critical places** (secrets clean incl. full git history, input validation consistent, RLS sound on every *migrated* table, the Fortress/never-fail layer is real and 7/8 P0s closed, SQLi/XSS/IDOR clean) and **seriously exposed in five concentrated areas**: identity/auth, cost/abuse, observability, scoring integrity, and schema reproducibility. It's *over-grown in one spot (chat route) and under-instrumented everywhere.* The frontend got months of polish; the backend got correct bones but missing alarm systems and a few live landmines.

---

## 🔴 CRITICAL — fix before any public/LinkedIn exposure

| # | Issue | Evidence | Fix | LOC |
|---|---|---|---|---|
| C1 | **Account takeover.** `ALLOWLIST_MODE=open` + instant email sign-in = type *any* email → instantly become that identity (incl. admin/`ADMIN_EMAIL`), zero ownership proof. No inbox round-trip. | `src/lib/auth/allowlist.ts:17`, `src/server-actions/direct-signin.ts:30,61-78`; `.env.local ALLOWLIST_MODE=open` | In open mode disable instant-email, force Google OAuth (proves ownership) or real magic-link `signInWithOtp`; never combine open+instant-email. | ~15 |
| C2 | **No bot protection anywhere** (no Turnstile/CAPTCHA/honeypot). With C1, automated account creation → unlimited authenticated LLM/Tavily abuse. | absent across `src/**`, `proxy.ts` | Cloudflare Turnstile (free) on sign-in, OR keep allowlist **closed** for launch. | ~30 |
| C3 | **Free-tier self-DoS / cost blowup.** Up to **5 sequential 70b regens per turn**, each re-sending an **unbounded** system prompt (`alreadyDisclosed` concatenates *every* prior interviewer turn), + cheatsheet + issue-tree firing **every turn on 70b** in parallel. One active user mid-case can 429 Groq's ~6K TPM for the whole cohort. | `api/chat/route.ts:281-439`, `interviewer.ts:14`, `cheatsheet/route.ts:81`, `issue-tree.ts:109` | Cap regens to 1–2; cap `alreadyDisclosed` (last 8 / 2k chars); move cheatsheet+issue-tree to 8b + debounce. | ~70 |
| C4 | **Zero production observability.** No telemetry, no Sentry, no `nsm_failures` table — every failure is ephemeral `console.warn`. Ash cannot know when the backend is failing. "A fortress with no alarm system." | `chat/route.ts:454,483,535`; `llm-router.ts:142`; `NEVER-FAIL-AUDIT.md:154` (P2-18, never built) | One `nsm_failures` table + `logFailure(route,session,err)` in every catch. | ~50 |
| C5 | **RESOLVED by verification 2026-06-02 — NOT a live hole.** Live DB check: `cohort_notes` + `session_feedback` both have `rls_enabled=true` WITH owner policies (4 and 2 respectively); there is **no `public.users` table** (profile data like `preferred_track` lives in `auth.users.user_metadata`, never anon-exposed). The audit's "users PII leak" assumed a public.users table that doesn't exist. Remaining (LOW, deferred): these dashboard-created tables aren't captured in migration files (reproducibility only). Migration `0017` was written then **removed** (would error on the non-existent users table). | live query (pg_class.relrowsecurity + pg_policies) | None for launch. Later: codify existing tables' DDL into a migration for reproducibility. | 0 |

## 🟠 HIGH — fix soon (correctness, money, integrity)

| # | Issue | Evidence | Fix |
|---|---|---|---|
| H1 | **Scoring integrity broken.** 717 LOC of detectors+judge are **dead at runtime** (only the offline harness uses them); final score is a **single unvalidated LLM self-report** (`total` trusted verbatim); "below-3 auto-reject" never enforced. | `eval/detectors.ts`+`tier2-judge.ts` (no `src/app` importer), `evaluate-session.ts:101` | Wire detectors/judge into a programmatic, validated rubric (the redesign spec's #1). |
| H2 | **Dual-rubric `score_breakdown` shape collision** corrupts analytics — generic `{structure,insight,speed}` vs per-track keys both write one jsonb column; readers mis-average. | `evaluator.ts:23` vs `track-evaluator.ts:18`, `evaluate-session.ts:100`, `cheatsheet/page.tsx:35` | Add `rubric_version` discriminator; branch readers. |
| H3 | **Filesystem dossiers likely don't ship to Vercel serverless** (no `outputFileTracingIncludes`) → AI's deep grounding silently → `null` in prod. | `dossier-context.ts:22`, `next.config.ts` (absent), `data/dossiers/` (116 files) | Add file tracing, or move dossiers to a `case_dossiers` table. |
| H4 | **Privacy data-residency misstatement (DPDP).** Policy says PII in "Supabase US-East"; functions deploy `bom1` (Mumbai). Factual legal error to fix regardless. | `privacy/page.tsx:72` vs `vercel.json:2` | Confirm real Supabase region; correct text; assess cross-border basis. |
| H5 | **No global LLM spend/volume cap** (only per-user/session). A bot fleet drains the shared free tier and takes the interviewer offline for all. (Tavily *does* have a DB cap — clone it.) | all LLM routes; `tavily-quota.ts:10` (the good pattern) | Global daily LLM request counter. |
| H6 | **In-memory per-instance rate limiter** — resets on cold start, multiplies by warm-instance count; the abuse caps aren't truly enforced. | `src/lib/rate-limit.ts:6` | Move money-spend routes to Upstash/Vercel KV. |
| H7 | **8b/70b routing waste** — `critic` + `tier2-judge` + cheatsheet + issue-tree run 70b though designed for 8b (`llm-router` has no model param; explicit TODO). ~70% of per-turn 70b calls avoidable. | `critic.ts:68 TODO`, `llm-router.ts:34`, only `opener.ts:125` uses 8b | Add `model` to router; push extraction/judge tasks to 8b. |
| H8 | **`/api/evaluate` + `/api/cheatsheet` lean 100% on RLS** (no explicit ownership filter); cheatsheet even *writes* without confirming ownership. | `evaluate-session.ts:22`, `cheatsheet/route.ts:45` | Add `.eq('user_id', user.id)` defense-in-depth. |
| H9 | **Untyped Supabase client → `as any` at the trust boundary** (no generated `database.types.ts`), eroding `strict:true` exactly where DB data enters. | `chat/route.ts:179`, `evaluate-session.ts:53-74`, ~30 more | `supabase gen types` → `createClient<Database>()`. |
| H10 | **No estimation/guesstimate engine + no interview-stage model** (from engine audit) — guesstimates run the generic path; registry discards %s/multipliers; no rapport/fit/behavioral/candidate-Q arc. | `number-registry.ts:64`, engine audit | The solving-engine redesign (separate spec). |

## 🟡 MEDIUM / 🟢 LOW (selected — full detail in sub-reports)
- **No CSP** (other headers strong) — `next.config.ts:46`; ship `Report-Only` first. (MED)
- **`chat/route.ts` is a 547-line God object** doing 13 jobs + bypasses the shared `gate.ts` 10/11 routes use. (MED — decompose)
- **3 divergent number-extraction regexes** will disagree; arithmetic-verifier silently mis-scales `%`/crore + can't add/subtract. (MED — unify)
- **Idempotency race (DA-2, ~1.5s)** can double-post a turn; **P0-4** partial. (MED)
- **Manual-only data deletion** (email, 14 days) — DPDP wants self-serve erase. (MED)
- **`cohort-notes` GET unauthenticated + contract mismatch** (RLS makes the "shared library" return only own notes) + silent 1000-char truncation. (MED)
- **`assignDailyCase` trusts a `userId` arg** (no internal auth) — safe today, latent IDOR. (MED)
- Non-idempotent double-submit on `startSession`/`createUserCase`/`logInterviewOutcome`; `addEmailToAllowlist` throws on duplicate; `fail-open` on `canCallTavily` (money risk). (LOW–MED)

## ✅ What's actually solid (don't "fix")
Secrets: **clean** (working tree + full git history; service-role key `server-only`, no `NEXT_PUBLIC` secret). RLS sound on every migrated user table; no A-acts-on-B path found. Input validation strong + length-capped everywhere; filesystem readers sanitize against path traversal. SQLi/XSS/IDOR clean. Security headers strong (minus CSP). Fortress/never-fail real (7/8 P0 closed). `strict: true`. Code is well-commented and defensively written.

---

## Proposed fix roadmap
**Wave 1 — Launch blockers (do before real users):** C1, C2, C5 (verify+codify), H4 (privacy text), then C3+C4 (cost cap + telemetry). These are the "lose money / leak data / can't see failures / get taken over" set.
**Wave 2 — Integrity + money:** H1+H2 (scoring rebuild — ties into the engine redesign spec), H5, H6, H7, H8, H3.
**Wave 3 — Structure/quality:** H9 (types), H10 (estimation engine + stage model), CSP, decompose `chat/route.ts`, unify number parser.

Each wave = its own spec→plan→build. Sub-reports (full file:line detail) are the source of truth for each fix.
