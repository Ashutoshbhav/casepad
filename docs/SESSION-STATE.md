# CasePad — Session State Snapshot

> ## 🔴 INCIDENT — LLM FALLBACK CHAIN WAS DEAD; FIXED + VERIFIED 2026-07-24 (evening)
> **Symptom:** every prod /api/chat turn 504ing (FUNCTION_INVOCATION_TIMEOUT); Ash's live sessions showing "took too long" + stuck-listening.
> **Root cause (chain of four):** Groq free tier has a **100K tokens/DAY cap** (we were only watching the 6K TPM) — exhausted by evening after today's prompt growth × the per-turn LLM fan-out. Beneath it: NVIDIA NIM **hanging 30s+ per request** (no time-box → ate the route's whole 60s), Cerebras **404** (they removed all Llama models; our `llama3.1-70b` id was dead), OpenRouter never configured, and **CEREBRAS_API_KEY was never on Vercel prod** (not in the July incident's 8-var restore list). The Fortress's graceful degradation rested entirely on Groq.
> **Fix (commit `393394e` + env):** Cerebras → `gpt-oss-120b` (reasoning_effort low + 300-token floor so hidden reasoning can't yield empty content), promoted above NVIDIA; every provider attempt time-boxed (12s connect / 15s per-chunk / 30s complete); post-partial-yield failures throw instead of stitching two replies; empty completions = failure; `CEREBRAS_API_KEY` added to prod env (readable) + redeploy.
> **Verified:** local turn with exhausted Groq → 200 in 3.4s via Cerebras, in-character + résumé-anchored; prod smoke:prod **PASS** post-redeploy. Groq auto-resumes as layer 1 when its quota resets (~2h).
> **Structural watch:** 100K Groq tokens/day ÷ today's heavier prompts × 3-5 LLM calls/turn = only a handful of full sessions/day on Groq before falling to Cerebras. Next lever (not done): route aux calls (cheatsheet, issue-tree, critic) to smaller models with separate quotas + trim per-turn prompt weight. Also still unwired: smoke:prod on a schedule — tonight's outage was again found by hand.

> ## 🎭 LIVE-INTERVIEW "ASH BLOB" REDESIGN + SIMLI REMOVED + VOICE GUARDRAILS — 2026-07-23 (evening, on `main`)
> **Supersedes the morning's Simli ICE-servers entry below: Simli is now REMOVED entirely** (Ash's call — "jarvis only"): deleted `live-interview-avatar.tsx` + `/api/voice/avatar-session`, uninstalled `simli-client`, stripped the mode toggle and the TTS route's `pcm16` branch. `SIMLI_API_KEY` still sits in `.env.local` (harmless, unused — remove at leisure).
> **New live-interview visual** (4th structural attempt; JARVIS orb, glass retune, and NERV dial all rejected): a realistic iridescent 3D blob (RoomEnvironment reflections, mood-light trio per state) wearing a **hand-drawn rough.js anime face** — ^ ^ happy idle w/ blush + pupil-wander, determined brows + amplitude-driven open talking mouth, sparkle listening eyes + nod, thinking glance + sweat drop + "…", squeezed > < error face + tremble. Per-vertex jiggle removed (face can't track 3D deformation); shared breathing pulse keeps body+face in lockstep. Blob now animates while ASH talks: AnalyserNode on server-TTS audio, synthetic pulse for browser-speech fallback. Background: mood glow + contour waves + dust. Fonts on this screen moved from mono to Montserrat.
> **Voice guardrails** (Ash report: "keeps listening after I'm done"): stuck-segment watchdog force-flushes when no confident speech for 3s (6.5s in thinking mode), manual "✓ Done — send it" button while a segment is open, and a visible "Didn't catch that" notice on empty transcriptions. Perf: face redraws throttled from 60fps to change-driven (~6-8/s settled); analyser graph nodes now disconnected per turn.
> **Verified:** tsc clean + 268/268 tests at every step; idle/ai/processing expressions confirmed live in-browser. **NOT verified:** sparkle/error faces, watchdog, and Done-button live with a real mic (needs a spoken session — watchdog logs a console warning when it fires).



> ## 🔴 INCIDENT — PRODUCTION FULLY DEGRADED FOR ~34 DAYS, FIXED 2026-07-16
> **Symptom (reported by Ash):** couldn't start a case; when one did start, dialogue never got past the first message.
> **Root cause:** every app secret on Vercel Production (`GROQ_API_KEY`, `NVIDIA_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `TAVILY_API_KEY`, `ALLOWLIST_MODE`) had been overwritten with **empty-string values** — confirmed via `vercel env pull --environment=production`, twice, ruling out a CLI artifact. No CI workflow and no shell history (bash/zsh/PowerShell) showed a `vercel env` command, so the likely mechanism is a manual dashboard/CLI edit where an empty paste was silently accepted (Vercel doesn't validate non-empty on save). App code was never at fault — local dev against the same production Supabase DB worked end-to-end throughout.
> **Why this matches both symptoms:** blank Supabase creds → every DB call fails → the app's own defensive code (by design) redirects to `/cases` or `/auth/signin` instead of crashing, reading as "won't start." Blank Groq/NVIDIA keys → all 4 LLM-router layers fail on every turn → Fortress's fail-open logic (correctly) ships the static `staticChatTurnFallback()` probe instead of a real interviewer turn, reading as "dialogue frozen after 1 message."
> **Why Fortress didn't catch it:** Fortress is designed to smooth over *transient* failures (a slow Groq call, a flaky Supabase 503), not to detect *sustained* config failure. It did exactly its job — degrade instead of crash — which is precisely why this went unnoticed for over a month: nothing was watching "is every single request hitting the fallback."
> **Fix:** restored all 8 vars from the verified-working `.env.local` values, added as `--no-sensitive` (so they stay readable for future audits — they'd drifted to Vercel's write-only "Sensitive" type on the first restore attempt, which would have made this exact failure mode undetectable by `env pull` again), triggered a fresh production deploy (`dpl_3V5kofzPSqgkmV1R4yRgLLSSMqRs`, aliased to `casepad.vercel.app`), and verified live via a real signed-in browser session: case start, opener, a real turn-2 interviewer reply, and issue-tree update all confirmed working against production, not just local dev.
> **New guardrail:** `scripts/smoke/production-check.ts` (`npm run smoke:prod`) — starts a real case and sends a real turn against a live deployment (default `https://casepad.vercel.app`, override with `PROD_URL`), and fails loudly if the response matches one of the known static-fallback probes instead of a real LLM reply. This is the check that should have been screaming for the last month; it is **not yet wired to a schedule** — do that next (see the `schedule` skill) so it's actually watched instead of being a one-off manual run.
> **Resolves** the "Outstanding for Ash #1: Verify live deploy" item that had sat open since the 2026-05-29 snapshot below — that drift (nobody checking the live app after a code change) is exactly how this went unnoticed.

> ## 🔧 SIMLI AVATAR ICE-SERVERS FIX + HUD POLISH — 2026-07-23 (commit `28c6465`, branch `feat/voice-first-case-solving`, NOT merged to main)
> The optional Simli talking-head avatar (shipped `28e7875`) hard-failed live with `"Ice Servers Required for P2P Mode"` — the session route passed `null` instead of real ICE servers to `SimliClient`'s P2P transport. Fix: `avatar-session/route.ts` now calls `generateIceServers(apiKey)` alongside `generateSimliSessionToken` (`Promise.all`, still fails open to 502 → client falls back to the JARVIS HUD) and `live-interview-avatar.tsx` threads `iceServers` through to the client constructor. Bundled in the same commit (unrelated concern, Ash's call): a JARVIS HUD glassmorphism/bloom retune in `live-interview-scene.tsx` (bloom threshold 0.15→0.75 — was blooming everything uniformly) and `live-interview-session.tsx` (panel opacity dropped ~0.5→0.2 with added text-shadows for legibility, inset glow spread reduced).
> **Verified:** `tsc --noEmit` clean, `vitest` 268/268 pass, and `generateIceServers()` called live against the real Simli key — confirmed it returns 4 real STUN/TURN entries with `urls`/`username`/`credential`, so the fix isn't just type-correct.
> **NOT verified:** the actual browser WebRTC handshake, and the HUD polish hasn't been looked at visually — `/api/voice/avatar-session` requires a signed-in Supabase session (`gateRequest`), so neither a bare curl nor a headless Playwright run (blocked on Google OAuth) could confirm it live. Do this from a real signed-in browser session next.
> **Also untracked, undecided, not part of this commit:** `docs/launch/` (carousel HTML/PDF + screenshots — launch-marketing prep) and `gcp_tts_pricing.md` (GCP TTS pricing scrape — cost research, purpose unclear, likely for the voice feature). Neither triaged this session.
> **Still open from the 2026-07-16 snapshot below, untouched this session:** `npm run smoke:prod` is still not wired to a schedule.

> ## ✅ INDIA NUMBER-BANK + CLARIFIER BANK SHIPPED — 2026-06-12
> Two new pure/static modules ground the engine in real India data + the right opening questions: **`src/lib/india-reference.ts`** = ~63 India macro/income/digital/sector anchors, EACH WebSearch-verified on 2026-06-12 with `sourceName`+`sourceUrl`+`asOf`+`confidence` ([V]erified primary vs [E]stimate). NCCS class shares + tier-spend splits deliberately OMITTED (no credible free source — no-assumptions). **`src/lib/case-clarifiers.ts`** = per-`CaseType` clarify-first question banks (from the faculty case method). Wired **fail-open** into `generateIdealWalkthrough` (walkthrough.ts, `WALKTHROUGH_GENERATOR_VERSION` 5→6 so cached walkthroughs regenerate) + `generatePreCaseCrammer` — generation paths only, **NOT the live chat loop** (protects Groq TPM + the Fortress NSM). Renderers are pure+total (never throw). Built from a 4-agent verification fan-out comparing two faculty cheat-sheets (India Guesstimate + Case Study Interview) against the codebase — only the verified India number-bank was a real gap; frameworks/dialogue/scoring were already deeper in CasePad. 251/251 tests (was 239), tsc clean, build green. Provenance of the comparison: the two `.xlsx` cheat-sheets in Downloads.

> ## 🏁 WAVE 2 ENGINE REBUILD COMPLETE — lever B (guesstimate) SHIPPED 2026-06-03 (merged `feat/wave2-guesstimate-engine` → `main`)
> Estimation/market-sizing is now first-class: `arithmetic-verifier` does **+ − × ÷ and %** (was ×÷ only, % mis-parsed); new pure `src/lib/case-state/estimation-state.ts` (assumptions, structured-first?, sanity-checked?, blurted-number?, arith errors) wired **fail-open** into `/api/chat` (interviewer applies the guesstimate playbook) and into scoring (`score-validator`/`evaluate-session` grade **structure + sanity-check, final-number proximity unweighted**; blurted-number caps quant, stacks under the math-error cap). 232/232 tests, tsc clean, smoke-tested. **All 4 Wave-2 levers now live: scoring · ideal-answer · interviewer engine (C) · guesstimate (B).** Remaining = audit cleanup (wire remaining dead detectors, small/large model routing, route.ts decomposition) + ops (publish Google app).

> ## ✅ WAVE 2 (lever C: interviewer engine) SHIPPED — 2026-06-03 (merged `feat/wave2-interviewer-engine` → `main`)
> Deterministic **stage machine** (7 stages scoping→…→wrap; drive-to-close forces synthesis at 9 turns) + **track-aware personas** (consulting/PM/IB/marketing/strategy), all grounded in a **50-lane interview-dynamics research run** (`docs/research/interview-dynamics/PLAYBOOKS.md`). New: `src/lib/interview/{stage-machine,personas,track-playbooks}.ts`; wired **fail-open** into `interviewer.ts`/`opener.ts`/`api/chat/route.ts`/`start|reset-session.ts` (no new LLM calls, no new writes — Fortress intact). Ash smoke-tested locally before ship. **Watch:** chat system prompt ~15-20% bigger → monitor Groq TPM on the free tier. **Wave 2 remaining:** lever B (guesstimate engine) — hook ready at the `quant` stage + `GUESSTIMATE_PLAYBOOK`.

> ## ✅ WAVE 2 (lever 1: ideal-answer) SHIPPED — 2026-06-03 (merged `feat/wave2-ideal-answer` → `main`, deployed)
> Scoring rebuild + ideal-answer upgrade are live. **Scoring:** code-computed verdict (`score-validator.ts`) recomputes totals, clamps dims, caps quant on candidate math errors — LLM score no longer trusted blindly. **Ideal answer:** dossier-grounded + case-type-anchored generation, 21-playbook synthesis, deep recursive **hand-drawn (rough.js) issue tree** with per-node assumption notes; stale Porter's-5-Forces box removed. **Live /solve tree** restyled to match (RoughRect cards, interactivity kept). **Deploy-safety:** walkthrough generation moved OUT of the page render into async `POST /api/walkthrough` (gated, `maxDuration=60`, stale-while-revalidate via `IdealWalkthroughLoader`) — fixes the 60-95s page-render timeout; fails soft. **Watch-item:** if a single generation exceeds 60s on prod it fails-soft → check `nsm_failures` for `route='walkthrough'`; tune = timebox Tavily / trim tokens. **Wave 2 remaining:** B (guesstimate engine), C (interviewer stage machine + per-track personas).

> ## ✅ GOOGLE APP PUBLISHED — 2026-06-03 (last launch blocker cleared)
> Google OAuth app is now **In production** (Google Auth Platform → Audience). Any Google account can log in; CasePad's allowlist still gates who actually gets in. No verification review needed (basic sign-in scopes only). **The cohort can be invited.**

> ## ✅ WAVE 1 SHIPPED — 2026-06-02 (commit `e9c0979`, deployed to prod)
> Launch-blockers from `docs/BACKEND-AUDIT-2026-06-02.md` closed: **C1** Google-only auth (account-takeover hole removed; email signin gone, `directSignIn` stubbed) · **C3** chat cost caps (capped `alreadyDisclosed` + regen budget=2) · **C4** `nsm_failures` telemetry (migration 0016 applied) · **H4** privacy region → Mumbai · **C5** RLS verified already sound. **Next = Wave 2: solving-engine rebuild** (see `docs/superpowers/specs/2026-06-02-solving-engine-redesign.md` + `docs/research/case-sources/`). Reskin branch `feat/solve-dashboard-reskin` still parked.

**Saved:** 2026-07-23 (Simli ICE-servers fix + HUD polish — see entry above; production-outage incident note above is still the last verified prod state)
**Trigger word:** `PAD` — say it in any new session to surface this state
**Project root:** `C:\Users\Ashutosh Bhavale\Documents\casepad`
**Production URL:** https://casepad.vercel.app — **last verified live 2026-07-16**, NOT re-verified since (this session's commit was never deployed); re-verify with `npm run smoke:prod` before trusting this line
**Branch:** `feat/voice-first-case-solving` (5 commits ahead of `main`@`bb465f8`, not merged) · **Latest commit:** `28c6465` (fix(live-interview): wire real ICE servers into Simli avatar + retune JARVIS HUD glass/bloom)

> ⚠️ Deploy state of the latest commits is **UNKNOWN from local** — verify what's actually live on Vercel when resuming. This branch in particular has not been deployed or merged.

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
1. ~~Verify live deploy~~ — **done 2026-07-16**, and it was NOT fine (see incident note at top: all production secrets were blank). Fixed + verified live. New action: wire `npm run smoke:prod` to a schedule so this can't silently drift again — nothing currently re-checks production on a cadence.
2. **Decide on exhibits thread** — `pm-gate` flagged `src/lib/exhibits` as **REVIEW** ("user_pull unknown"). It's a scaffold, **not wired into any surface yet** (0 imports). Confirm a user actually wants in-case exhibits before building further, or shelve it.
3. **Pixabay/Supabase keys** — `generate-case-images-pixabay.ts` needs `PIXABAY_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (keys read from env — no hardcoded secrets ✅).
4. **Triage `docs/launch/` + `gcp_tts_pricing.md`** (untracked, 2026-07-23) — carousel/launch-marketing files and a GCP TTS pricing scrape sitting uncommitted. Decide if/where these belong (commit, `.gitignore`, or delete) before they go stale.
5. **Live-verify the Simli avatar fix** (commit `28c6465`) from a real signed-in browser session — the ICE-servers fix is verified at the API/type level but the actual WebRTC P2P handshake has never been watched connect. Also eyeball the JARVIS HUD glassmorphism/bloom retune in the same commit — visual-only change, never rendered.
6. **Merge or keep parking `feat/voice-first-case-solving`** — 6 commits ahead of `main`, undeployed. Five other feature branches are also parked unmerged (`feat/launch-landing`, `feat/llm-budget-caps`, `feat/solve-dashboard-reskin`, `feat/upstash-ratelimit`) — worth a pass to merge, rebase, or prune.

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
| 8 | Wire `npm run smoke:prod` to a schedule (see `schedule` skill) | 30 m |

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
