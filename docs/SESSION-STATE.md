# CasePad — Session State Snapshot

> ## ✅ WAVE 2 (lever 1: ideal-answer) SHIPPED — 2026-06-03 (merged `feat/wave2-ideal-answer` → `main`, deployed)
> Scoring rebuild + ideal-answer upgrade are live. **Scoring:** code-computed verdict (`score-validator.ts`) recomputes totals, clamps dims, caps quant on candidate math errors — LLM score no longer trusted blindly. **Ideal answer:** dossier-grounded + case-type-anchored generation, 21-playbook synthesis, deep recursive **hand-drawn (rough.js) issue tree** with per-node assumption notes; stale Porter's-5-Forces box removed. **Live /solve tree** restyled to match (RoughRect cards, interactivity kept). **Deploy-safety:** walkthrough generation moved OUT of the page render into async `POST /api/walkthrough` (gated, `maxDuration=60`, stale-while-revalidate via `IdealWalkthroughLoader`) — fixes the 60-95s page-render timeout; fails soft. **Watch-item:** if a single generation exceeds 60s on prod it fails-soft → check `nsm_failures` for `route='walkthrough'`; tune = timebox Tavily / trim tokens. **Wave 2 remaining:** B (guesstimate engine), C (interviewer stage machine + per-track personas).

> ## ⚠️ OPEN REMINDER (2026-06-02): PUBLISH THE GOOGLE APP BEFORE INVITING THE COHORT
> Auth is now Google-only and the Google app is in **TESTING mode** — only test-user emails can log in. **Before inviting the cohort**, go to Google Cloud Console → project **CasePad** → **Google Auth Platform → Audience → Publish app** (or add their emails as Test users). Until then, only Ash (a test user) can log in via Google. Remove this banner once published.

> ## ✅ WAVE 1 SHIPPED — 2026-06-02 (commit `e9c0979`, deployed to prod)
> Launch-blockers from `docs/BACKEND-AUDIT-2026-06-02.md` closed: **C1** Google-only auth (account-takeover hole removed; email signin gone, `directSignIn` stubbed) · **C3** chat cost caps (capped `alreadyDisclosed` + regen budget=2) · **C4** `nsm_failures` telemetry (migration 0016 applied) · **H4** privacy region → Mumbai · **C5** RLS verified already sound. **Next = Wave 2: solving-engine rebuild** (see `docs/superpowers/specs/2026-06-02-solving-engine-redesign.md` + `docs/research/case-sources/`). Reskin branch `feat/solve-dashboard-reskin` still parked.

**Saved:** 2026-05-29 (post-crash recovery session)
**Trigger word:** `PAD` — say it in any new session to surface this state
**Project root:** `C:\Users\Ashutosh Bhavale\Documents\casepad`
**Production URL:** https://casepad.vercel.app
**Branch:** `main` · **Latest commit:** `0bb1f21` (wip(guesstimate): builder script + source PDFs)

> ⚠️ Deploy state of the latest commits is **UNKNOWN from local** — verify what's actually live on Vercel when resuming.

---

## 📍 Latest session (2026-05-29) — launch-readiness + design + crash

A system crash (~11:00, unclean shutdown during a Windows Update cycle) closed everything mid-session. **Nothing was lost** — all work was saved to disk; in-flight work has now been checkpoint-committed (see below). Recovery done from a home Claude session.

### Threads worked since the last snapshot (2026-05-08), newest first

| Commit | Thread | What |
|---|---|---|
| `0bb1f21` | Guesstimate | builder script (`scripts/guesstimate/build.py`) + 2 source PDFs — **WIP** |
| `4a4e806` | Content/Exhibits | Netflix case tooling + `src/lib/exhibits` scaffold + 4 case images + filter cleanup — **WIP** |
| `e9f6082` | Design (/sauce) | surgical audit fixes: privacy contrast, marquee edge-fade, MENU icon visibility, stale CTA |
| `5901a76` | Design (/sauce) | **REVERT** of the landing redesign (Ash: "my version was 1000× better") |
| `375508d`→`2f08ce5` | Design (/sauce) | landing rebuild on `/auth/signin` — overreach, reverted above |
| `95f94d9` | Design (/sauce) | SignInCard reskin → **ElevenLabs anchor** (this one stuck ✅) |
| `f45b541` | Auth | fix signin loop + add Sign in with Google |
| `a52e195` | BYOC | bring-your-own-case — private user-submitted cases (+ migration `0015_user_cases.sql`) |
| `b1830c6` | Solve UX | live-interview feel: typing indicator + dropped cheat-sheet drawer |
| `6720150` | Security | launch-readiness: gate all routes + security headers + privacy page |
| `0f8d589`→`0717048` | Content | per-case AI images (Pollinations→**Pixabay**) + title search; dropped obsolete dossier migration (→ filesystem) |
| `3c9f809` | Outcomes | layer-2 verified interview-outcome capture (+ migration `0014_interview_outcomes.sql`) |
| `4322548` | Security | rate-limit chat + steganographic watermark + leak-identification tool |
| `b05015f` | Data | dossier bulk enrichment **partial: 116 / 1,165 cases** |

### `/sauce` design thread — net result
Signin card reskinned to ElevenLabs ✅; HUPR landing **preserved** (the full-landing rebuild was reverted); 4 genuine UI flaws fixed. **Lesson saved to memory** as `only-touch-if-improvement` ("different ≠ better"). The design-supervisor log was NOT updated with this session (likely lost in the crash) — re-log if continuing design work.

---

## ⚠️ Outstanding for Ash (action required)
1. **Verify live deploy** — confirm `0bb1f21`/`e9f6082` are on `casepad.vercel.app`; redeploy if not.
2. **Decide on exhibits thread** — `pm-gate` flagged `src/lib/exhibits` as **REVIEW** ("user_pull unknown"). It's a scaffold, **not wired into any surface yet** (0 imports). Confirm a user actually wants in-case exhibits before building further, or shelve it.
3. **Pixabay/Supabase keys** — `generate-case-images-pixabay.ts` needs `PIXABAY_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (keys read from env — no hardcoded secrets ✅).

## 🟡 Outstanding for me (deferred)
| # | Task | Est. |
|---|---|---|
| 1 | Finish dossier enrichment (116 → 1,165 cases) | offline, free on Groq |
| 2 | Wire `src/lib/exhibits` into a case surface (IF user_pull confirmed) | 1-2 h |
| 3 | Finish Netflix case ingestion + verify it renders | 30 m |
| 4 | Guesstimate builder — finish `build.py`, generate first cases | 1-2 h |
| 5 | Stream 5: math drill MVP (RocketBlocks pattern) | 1-2 h |
| 6 | Improve no-probe rate on regen path | 30 m |
| 7 | Calculator tool-use via Groq native tool API (math reliability) | 1-2 h |

## ✅ Resolved since old snapshot (do NOT re-do)
- ~~Apply migration `0012_dossier.sql`~~ — **dropped** (`0717048`); dossiers moved to filesystem.
- Math flip-flop bug — fixed (Number Registry).
- Signin loop — fixed (`f45b541`).

---

## 📚 Research artifacts (foundational reading)
- `docs/research/INTEGRATED-PLAN.md` — 5-stream architecture
- `docs/research/FAILURE-MODE-CATALOG.md` — 80 detectors across 7 categories
- `docs/research/LLM-MATH-RELIABILITY.md` — Number Registry + calculator tool
- `docs/research/LLM-PERSONA-CONSISTENCY.md` — recent-turn + phrase cooldown + stale-context regen
- `docs/research/PER-CASE-KNOWLEDGE-DEPTH.md` — dossier schema + enrichment cost
- `docs/research/COMPETITOR-PLATFORMS.md` — Hacking the Case / LOMS / RocketBlocks
- `docs/playbook/01-05.md` — 1,119 MBB-interviewer findings
- `docs/AI-INTERVIEWER-TRAINING-PLAN.md`, `docs/SCORING-PHILOSOPHY.md`, `docs/NEVER-FAIL-AUDIT.md`

## 🔧 Key code surfaces
- `src/lib/eval/detectors.ts` — 13 deterministic Tier-1 detectors
- `src/lib/case-state/number-registry.ts` — committed-number extraction + contradiction detection
- `src/lib/groq/recent-turn-context.ts` — recent-turn render + phrase-repeat detection
- `src/lib/groq/dossier-context.ts` — per-case dossier block (filesystem-backed)
- `src/lib/exhibits/{loader,types}.ts` — exhibits scaffold (NEW, unwired)
- `scripts/qa/eval-interviewer.ts` — synthetic-candidate eval
- `scripts/qa/generate-case-images-pixabay.ts` — case image fetcher

## 🚦 How to resume
1. Say `PAD` in a new Claude Code session (ideally **in the Cursor terminal scoped to this repo**, so project CLAUDE.md + hooks load).
2. Verify live deploy state on Vercel.
3. `git log --since="2026-05-08" --oneline` for the full arc.
4. Baseline the interviewer: `npx tsx --env-file=.env.local scripts/qa/eval-interviewer.ts`
5. Pick from "Outstanding for me" — but **resolve the exhibits user_pull question first** (don't build unwired features).

## 💡 Key insights to NOT lose
1. **Content > Tech.** Moat = the 1,165-case corpus + Indian context + cohort signal + free tier, NOT AI cleverness. Invest in dossier quality before more AI layers. (See `project_casepad_moat_strategy` in memory.)
2. **Real cases only** — never generate synthetic cases for content padding (absolute rule; see `feedback_casepad_no_synthetic_cases`).
3. **Only touch existing design if it's a clear improvement** — "different" ≠ "better" (see `only-touch-if-improvement`; the reverted landing is the cautionary tale).
4. **Larger LLMs drift MORE on persona, not less** — fixes are structural (registry, recent-turn, cooldown), not "bigger model."
5. **Memory drift kicks in at 2,000-2,500 tokens** — registry re-injected at top AND bottom of system prompt.
6. **LOMS lifetime pricing is $297**, not $500 — market ceiling for lifetime case content ~$300.
