# CasePad — Session State Snapshot

**Saved:** 2026-05-02 (post-rigorous-test, P0s patched)
**Trigger word:** `PAD` — say it in any new session to surface this state
**Project root:** `C:\Users\Ashutosh Bhavale\Documents\casepad`
**Latest commit:** run `git log --oneline | head -5` to see most recent
**Production URL:** https://casepad.vercel.app (alias of latest main deploy)

---

## Where we are RIGHT NOW

The "build everything then only stop" phase is complete. Next phase = real-user testing.

### Live on production
- Vercel auto-deploys main branch; alias `casepad.vercel.app` always points to the latest production build.
- Magic-link sign-in via Supabase, gated by `email_allowlist` table.
- Solve arena → debrief loop verified.
- 1,194 cases in DB (1,225 raw → 31 cross-casebook duplicates removed via `scripts/qa/cross-casebook-dedup.mjs`).

### Case mix (`case_type` distribution)
- profitability: 256
- operations: 205
- market_entry: 202
- other: 132
- estimation: 80
- pricing: 59
- mna: 42
- gtm: 24
- null (un-classified): 194 — backfill pass would clean these up

### Multi-track support
6 tracks: `consulting`, `ib_pe_vc`, `pm`, `marketing`, `strategy_bizops`, `behavioral`. User picks one in `/onboarding/track`; cheat sheet, scoring rubric, frameworks, math drills, recovery scripts are all track-aware.

### Cheat sheet hub (`/cheatsheet`)
8 tabs: frameworks, math, behavioral, industry primers, firm packs (20 firms — McKinsey/BCG/Bain etc.), drills, killer phrases, common mistakes. Per-track filtering via `frameworksFor` / `mathFor` / `primersFor` in `src/components/cheatsheet-tabs.tsx`.

### Drills
- `/drill` — recovery curveballs (silent stretch / abrupt redirect / contradictory data / pace pressure / aggressive challenge / numbers blank).
- `/math-drill` — 100 sequenced math drill questions (L1–L4).
- `/behavioral-drill` — 30 BEHAVIORAL_30 questions; LLM rubric feedback against 6 dims; "see ideal answer" reveals 90+-scoring STAR response with Indian B-school context.

### Dashboard (`/dashboard`)
- Stats: total sessions, completed, avg score, streak.
- Per-track filter pills (`?track=consulting`).
- Score-curve trend (inline SVG, no chart lib).
- Weak-spots panel surfaces case_types where avg < 65 over 2+ sessions.

### Live LLM features
- Solve arena chat: streaming via `src/lib/llm-router.ts` (Groq → NVIDIA NIM DeepSeek V4 Flash failover on 429/5xx).
- Pre-case crammer: `src/lib/groq/pre-case-crammer.ts` with 3-attempt exponential backoff; surfaces actual error in UI on failure.
- Ideal walkthrough generator: `src/lib/groq/walkthrough.ts` with Tavily web-grounding + anti-slop edge cases.
- Behavioral feedback API: 6-dim rubric + suggested rewrite of weakest section.

### PM operating system (founder discipline)
- Pre-commit hook installed at `.git/hooks/pre-commit` runs `scripts/pm-gate.mjs` — every new feature file gets a 3-criterion check (NSM impact / user pull / falsifiable). Returns PASS / REVIEW / FAIL.
- North Star Metric: avg score + offer rate (set during /grillme session 2026-05-01).
- Counter-metrics tracked: feedback velocity, weekly active solvers, median session time.

### Concurrent user capacity
~10–25 (multi-provider LLM routing keeps any single rate-limit from blocking the room). Designed for a college group share, not public traffic.

### Mobile
Full sweep done. Padding scales `p-4 → sm:p-8` everywhere. SolveLayout has tab-toggle (chat | sheet) below `sm`. InSolveHintPanel goes full-width on phones. Headers stack on mobile. Admin allowlist also mobile-friendly.

---

## Outstanding (pre-cohort-share)

1. **Cohort allowlist + first user test** — Ash adds 1-3 cohort emails via `/admin/allowlist` and screen-shares with one friend to spot anything broken end-to-end on a phone.
2. **Tracks backfill (~85% remaining)** — running in background via `BACKFILL_CONCURRENCY=2 node scripts/qa/backfill-tracks-and-types.mjs --only-tracks --provider=nvidia`. NVIDIA NIM free tier is rate-limited so this is slow (~30 cases/5 min). Currently 182/1165 cases have multi-track tagging. Acceptable for cohort v1 since most users start on consulting track.
3. **Pre-generate primer/walkthrough for top-50 cases** (currently 10) — lazy-gen works in ~18s but would be smoother if the popular cases were warm.

## Recently shipped (today's session, in addition to fortress-build)

- Crammer feature removed from in-room `/solve` (interview authenticity). Same generator now lives as a 📚 primer button on each `/cases` card.
- Fixed P0: `/api/chat`, `/api/crammer`, `/api/behavioral-feedback` empty-body 500s (now 400 with validation).
- Fixed P0: end-session crashed when Groq TPD exhausted. Swapped 7 direct Groq SDK calls for the multi-provider `completeChat()` router (Groq → NVIDIA NIM auto-fallback). All affected: evaluate-session, cheatsheet, behavioral-feedback, pre-case-crammer, walkthrough, company-pack, ask-cheatsheet.
- Foundation cleanup: deleted 29 cases (10 industry-stub fakes + 19 in-casebook duplicates). Total now **1,165 cases**. Added unique partial index on (casebook_id, lower(title)).
- Bundle 3 complete: 10 starter cases now have pre_case_crammer + ideal_walkthrough populated (used NVIDIA NIM since Groq TPD was exhausted).
- Issue tree UX: instant-load on mount via new `'get'` API mode (returns saved tree, no LLM). Re-extract triggers only on chat turns, with `updating…` indicator.
- Auth gate hardened: 6 routes (/cases, /dashboard, /drill, /math-drill, /behavioral-drill, /onboarding/track) now server-side `redirect()` for anon users. OG/Twitter meta + robots.txt added.
- Pause/resume: dashboard auto-expires `in_progress > 24h` and shows resume pills.

## Verified end-to-end via Playwright on prod

Auth ✓ → /cases tour ✓ → solve InvestCo (chat → tree → cheat sheet) ✓ → end session ✓ → debrief with score 70/100 + ideal walkthrough + L0-L4 + 9 sources ✓ → dashboard with NSM curve + resume pills ✓ → primer modal lazy-gen on non-starter case ✓ → mobile 375px 3-tab toggle ✓ → math drill ✓ → behavioral drill scoring 92/100 via NVIDIA fallback ✓.

---

## Skills + hook setup

Slash commands available:
- `/grillme` — sokratic interview before building
- `/devils-advocate` — adversarial critique of completion claims (was missed earlier in session — be vigilant)
- `/rubber-duck` — sokratic debugging
- `/ultrareview` — multi-agent cloud review (user-triggered, billed)

Hook installed at `~/.claude/settings.json` → `UserPromptSubmit` routes to `~/.claude/scripts/grill-router.sh`.

---

## Memory files

- `~/.claude/projects/<sanitized-cwd>/memory/project_casepad.md` — main project memory (kept in sync with this file)
- `~/.claude/projects/<sanitized-cwd>/memory/feedback_pad_trigger.md` — "PAD" trigger
- `~/.claude/projects/<sanitized-cwd>/memory/feedback_zero_miss_extraction.md` — never let LLM gatekeep cases
- `~/.claude/projects/<sanitized-cwd>/memory/feedback_assume_yes.md` — Ash granted blanket "assume yes, don't ask permissions" for build mode

In a new session, just say **"PAD"** and Claude will surface this file.

---

## Key directories

- `src/app/` — Next.js App Router pages (cases, solve, debrief, cheatsheet, drill, math-drill, behavioral-drill, dashboard, company-pack, onboarding, admin)
- `src/lib/tracks*.ts` — per-track rubrics, frameworks, math, behavioral content
- `src/lib/firm-packs.ts` — 20-firm interview packs (overview, process, archetypes, dimensions, spike, avoid, behavioral_questions)
- `src/lib/groq/` — LLM helpers (interviewer, evaluator, walkthrough, crammer)
- `src/lib/research/tavily.ts` — Tavily web grounding
- `scripts/ingest/` — 5-phase ingestion pipeline (extract → classify → OCR → slabify → targeted)
- `scripts/qa/cross-casebook-dedup.mjs` — SHA-256 fingerprint dedup of `problem_statement[:200]` across casebook_ids
- `scripts/pm-gate.mjs` — AI-PM commit gate
- `supabase/migrations/` — schema (cases, sessions, cheat_sheets, email_allowlist, ideal_walkthrough, tracks, cohort_notes, session_feedback)
- `casebooks/` — raw + OCR'd PDFs (excluded from git via `.vercelignore` and `.gitignore`)
