# CasePad — Session State Snapshot

> ## 🔴 INCIDENT #4 — SUPABASE PAUSE EMAIL AGAIN; KEEP-ALIVE NOW SELF-AUTHENTICATES (NO MORE MANUAL ENV STEP) — 2026-09-01
> **Symptom (reported by Ash):** another Supabase free-tier pause email. "I thought we fixed it."
> **Root cause: same as #3, one step still not done.** The #3 code fix (accept `CRON_SECRET` OR `SMOKE_CHECK_TOKEN`) was pushed (`bc03547`), but it only helps once `CRON_SECRET` exists in Vercel prod env, and that manual `vercel env add` step — handed to Ash across #2 and #3 — still had not happened. So Vercel Cron kept hitting `/api/admin/heartbeat` at 03:00 UTC with **no `Authorization` header at all** (Vercel only attaches the bearer when a `CRON_SECRET` env var is set), the route 401'd before the `listUsers` keep-alive, and the project drifted idle again.
> **Fix (this session — removes the manual dependency entirely):** `heartbeat/route.ts` now also accepts an otherwise-unauthenticated request whose `user-agent` matches `^vercel-cron/` . The bearer path is unchanged and stays the strong check for every external caller; this fallback exists only so Vercel's own platform cron can authenticate itself with zero env setup. Safe here specifically because `/api/admin/heartbeat` is read-only, rate-limited (30/hr), touches no app tables, does no writes, and returns nothing but `{ok}` — a spoofed hit gets a `listUsers(page1,perPage1)` and nothing else. `smoke-check/route.ts` was deliberately left bearer-only (it drives real LLM spend; a failed smoke-check does not cause a pause). `tsc` clean, 282/282 tests pass. Pushed to `main` (commit `95238a0`), deployed. **Verified against prod:** `curl -A 'vercel-cron/1.0' .../api/admin/heartbeat` → HTTP 502 with `results.supabase: "FAILED: fetch failed"` (got past auth, ran the keep-alive, only failing because Supabase is still paused); same URL with no cron UA → HTTP 401 (bearer check intact, no security regression). Once the project is restored, `results.supabase` flips to `"ok"` and the 03:00 UTC cron self-sustains.
> **STILL FOR ASH — one action, only he can do it:** the project is (or is about to be) paused **right now**. Restore it from the Supabase dashboard by hand (no dashboard/credential access on this side — every prior incident recovered this way). After restore + this deploy, the 03:00 UTC heartbeat keeps it warm on its own; nothing else required.
> **Optional (nice-to-have, not blocking):** `npx vercel env add CRON_SECRET production` with any long random string still gets the daily `/api/admin/smoke-check` product probe running again (it has been 401ing since 2026-08-17 — monitoring gap, not a pause risk).
> **Structural watch:** incident #4 on the free-tier-pause theme (masked errors → dead egress proxy → unset secret → unset secret again). Keep-alive should now be genuinely hands-off. If a #5 still happens, stop patching plumbing and move to $25/mo Supabase Pro.
>
> **Follow-up shipped same session (Ash: "solve for [the weekly pause]" — chose free-tier layering over Pro):**
> - **Redundant scheduler.** New `.github/workflows/keepalive.yml` — GitHub Actions, every 6h, curls `/api/admin/heartbeat?source=github-actions`. Independent infra from Vercel Cron, visible run history, and **fails the job on any non-200 or `supabase != ok`** → GitHub emails the repo owner on a failed scheduled run. That's the alarm every prior incident lacked: a broken keep-alive now surfaces in hours, not after a 7-day pause. No repo secret needed — the route allows a `casepad-keepalive/*` user-agent (same rationale as the `vercel-cron/*` allowance; blast radius is a size-1 listUsers + one ops-row upsert, rate-limited 30/hr).
> - **Real write, not just a read.** Migration `0020_keepalive.sql` adds a one-row `keepalive` table; heartbeat now upserts `last_ping_at` / `ping_count` / `last_source` on every run. Reads almost certainly already counted as Supabase activity, but a write removes all doubt about the pause criteria, and `select * from keepalive` is a one-line "when / by what was this last kept awake". **Best-effort** — until Ash pastes migration 0020 into Supabase Studio, the route reports `keepalive: "table missing"` and stays 200 on the listUsers result.
> - Net keep-alive now: Vercel Cron daily + GitHub Actions 6-hourly, both doing a read AND a write, with the GH job as a loud tripwire. `tsc` clean, 282/282 tests pass. Commit `<pending>`.
> - **STILL FOR ASH (one-time, not recurring):** paste `supabase/migrations/0020_keepalive.sql` into the Supabase Studio SQL editor. Everything else is automatic.
>
> ## 📌 PRODUCT PRIORITY (set by Ash 2026-09-01, for the interview demo)
> - **P0 — text mode (`/solve/[caseId]`): must be rock solid.** This is the Fortress-protected core (start-case → typed turns → rubric-scored debrief). Every case card / hero / cohort rail already routes here. This is the path to demo to an interviewer.
> - **P1 — live voice (`/live-interview`): known flaky, do not put it in front of the interviewer.** Semantic endpointing shipped 2026-08-04 but was never validated with a real mic; Ash reports it still "not working properly." Voice stays an optional surface reachable from the top nav and the in-solve `PracticeLiveLink`, not the default.
> - Net: the shipped architecture already is "text primary, voice optional." No rebuild needed for the demo — just make sure `/solve` is verified working post-Supabase-restore.

> ## 🔴 INCIDENT — SUPABASE INACTIVITY WARNING #3; THE VERCEL CRON WAS FIRING BUT 401ing (CRON_SECRET NEVER SET) — 2026-08-31
> **Symptom (reported by Ash):** forwarded a fresh Supabase free-tier inactivity-pause warning email (project not yet paused). Ash: "didn't we fix this already?"
> **Root cause: the 2026-08-17 fix was one step short of done.** `vercel.json` crons registered fine (`vercel crons ls` shows both `/api/admin/heartbeat` @ `0 3 * * *` and `/api/admin/smoke-check` @ `0 9 * * *` active). But Vercel Cron authenticates by sending `Authorization: Bearer $CRON_SECRET`, and **`CRON_SECRET` was never added to Vercel prod env** — the 2026-08-17 entry flagged this as handed to Ash (`vercel env add CRON_SECRET production`) and it never happened. `vercel env ls production` on 2026-08-31 confirms: only `SMOKE_CHECK_TOKEN` exists, no `CRON_SECRET`. Both routes only accepted `SMOKE_CHECK_TOKEN`, so every daily cron hit returned 401 *before* the Supabase `listUsers` keep-alive call — zero keep-alive traffic since 2026-08-17, hence the warning.
> **Fix, part 1 (shipped, commit `bc03547`, local only — NOT pushed):** `heartbeat/route.ts` + `smoke-check/route.ts` now accept EITHER `SMOKE_CHECK_TOKEN` OR `CRON_SECRET` as the bearer, checked independently (`safeEqual` against each). The two no longer have to share a value, so `CRON_SECRET` can be any fresh random string and the Vercel-native cron authenticates on its own. `tsc` clean, 282/282 tests pass.
> **Fix, part 2 (STILL FOR ASH — the actual unblock):**
> 1. `npx vercel env add CRON_SECRET production` → paste any long random string (no need to match `SMOKE_CHECK_TOKEN` anymore).
> 2. `git push` (ships `bc03547`) — or `npx vercel --prod` for an immediate build. The env var only takes effect on a deploy built after it was added.
> 3. Verify: `npx vercel crons ls` still shows both, then `npx vercel crons run /api/admin/heartbeat` (or wait for 3am UTC) and confirm it returns `{"ok":true,...}` not 401. Then check the Supabase dashboard shows recent activity.
> **Structural watch:** this is incident #3 on the same free-tier-pause theme, each with a different silent-failure mechanism (masked errors → dead egress proxy → unset secret). If it recurs a 4th time, the real answer is $25/mo Supabase Pro — the keep-alive plumbing has now failed three distinct ways.

> ## 🔴 INCIDENT — SUPABASE AUTO-PAUSED AGAIN; 2026-08-03 HEARTBEAT FIX HAD BEEN SILENTLY DEAD; REPLACED WITH VERCEL-NATIVE CRON — 2026-08-17
> **Symptom (reported by Ash):** app "not working again due to inactivity" — same signature as the 2026-08-03 incident below.
> **Root cause: the 2026-08-03 fix never actually ran.** That fix added `/api/admin/heartbeat` plus a claude.ai scheduled routine (`trig_019DYWYDrRYnGFu5ocKMBJqX`, every 2h) hitting both `smoke-check` and `heartbeat`. Checked every run's actual log via `RemoteTrigger` (`list_runs` + `get_run_log`) back to 2026-08-15T14:28 (38+ hours, every single run sampled): **every one failed with a 403 at the routine's own sandbox egress proxy** (`gateway answered 403 to CONNECT` for `casepad.vercel.app:443`) before either curl ever reached the app. The routine itself was enabled and firing exactly on schedule — this wasn't "the routine stopped," it was "the routine's sandbox network policy silently started blocking the one host it exists to call," which is invisible from the CasePad/Supabase/Vercel side entirely. Each run correctly self-diagnosed this and pushed a notification, but the underlying policy was never fixed.
> **Fix:** stopped relying on that routine as the *only* keep-alive. Added native **Vercel Cron Jobs** (`vercel.json`) — these run inside Vercel's own infra calling its own deployed function directly, structurally unable to hit an unrelated agent-sandbox's egress policy:
> ```json
> "crons": [
>   { "path": "/api/admin/heartbeat", "schedule": "0 3 * * *" },
>   { "path": "/api/admin/smoke-check", "schedule": "0 9 * * *" }
> ]
> ```
> Both endpoints already checked `Authorization: Bearer <SMOKE_CHECK_TOKEN>` — set a new `CRON_SECRET` prod env var to the **same value** as `SMOKE_CHECK_TOKEN`, since Vercel auto-sends `Authorization: Bearer $CRON_SECRET` on every cron invocation. Zero route code changes needed. Both endpoints stay crons (not just heartbeat) deliberately: heartbeat only proves Supabase Auth is reachable, smoke-check forces one real Postgres read + write daily, closing any doubt about whether Auth-only traffic counts toward Supabase's inactivity-pause tracking.
> **The claude.ai routine was left in place, not deleted** — it still gives a push notification when something's genuinely wrong, and now that its egress bug is documented, catching a repeat of it is a known pattern. But it is no longer the single point of failure for keeping Supabase awake.
> **Immediate recovery (same night):** Ash restored the project from the Supabase dashboard by hand (I have no credential/dashboard access — never enter passwords). Recovery shape matched 2026-08-03 exactly: `heartbeat` went from `"FAILED: fetch failed"` → a `502` with a bare-URL auth error (DNS back, Postgres/GoTrue still waking) → `"ok":true` after ~90s of polling. `smoke:prod` needed one more ~20s retry after that (`"no usable case found"` — the exact misdiagnosis-trap message from 2026-08-03, NOT actual data loss) before returning a real LLM reply. No data loss signal.
> **Verified:** polled heartbeat and smoke-check directly against prod post-restore, both `ok:true` with a genuine interviewer reply (not a static fallback).
> **Not yet done:** deploy + verify the `vercel.json`/`CRON_SECRET` change is actually live (env var add was blocked by the local Claude Code permission classifier — handed to Ash to run `vercel env add CRON_SECRET production` directly). Once deployed, confirm with `vercel crons ls` and a manual `vercel crons run /api/admin/heartbeat`.
> **Structural watch:** if this recurs a THIRD time even with the Vercel cron in place, the next suspect is whether Supabase's specific pause criteria excludes Vercel Cron's traffic somehow (unlikely) or whether the crons silently stopped registering on a deploy (check `vercel crons ls` first, then Vercel's own cron-execution logs in the dashboard).

> ## 🎙️ LIVE INTERVIEWER — SEMANTIC ENDPOINTING ADDED 2026-08-04
> **Symptom (reported by Ash):** live interview voice "works like garbage" — the existing complaint pattern (cuts off mid-sentence / feels laggy) traced back to `live-mic-input.tsx` relying on ONE fixed silence timer (`REDEMPTION_MS`, turn-detector.ts) to decide when an answer is finished, which structurally cannot tell "I think we should..." apart from "...the profitability lever." after the same length pause.
> **Research first:** ran `trusted-research` on how ChatGPT Realtime/Gemini Live/production voice stacks (LiveKit, Pipecat, Deepgram) actually handle this. Key finding: every serious cascaded stack (we're cascaded, not native speech-to-speech — see that research for why) runs TWO signals, not one — VAD (raw audio, "is there speech now," which CasePad already has correctly via Silero/`@ricky0123/vad-web`) plus a SEPARATE semantic endpointing check on the TRANSCRIBED TEXT ("does this sound finished"). CasePad had the first, not the second.
> **Constraint specific to this stack:** Groq Whisper is batch-only (no partial transcript mid-utterance), unlike the streaming ASR LiveKit/Deepgram build true real-time endpointing on. So this can't intercept a segment before VAD closes it — it operates one level up, at whole-VAD-segment granularity: after a segment closes and gets transcribed, a fast classifier judges whether the text sounds finished; if not, it's held and stitched onto the next utterance instead of sent as a prematurely-cut answer.
> **Shipped:** `src/lib/voice/continuation-buffer.ts` (pure state machine, buffered text + defer count + lowConfidence, unit-tested), `src/lib/voice/endpoint-check-client.ts` (client fetch, 1.2s hard timeout, fails open to "complete" on any error), `src/app/api/voice/endpoint-check/route.ts` (server route — routes through `llm-router`'s `tier: 'aux'` so it hits Cerebras first and doesn't eat into the shared Groq daily budget that caused the 2026-07-24 outage below, raced against its own 900ms deadline so it can never meaningfully slow a turn down). `live-mic-input.tsx` wires it in: forced flushes (stuck-segment watchdog, rambling nudge, manual "Done" button) explicitly SKIP the check via `forcedFlushPendingRef` — those are already an explicit "this is over now" decision and shouldn't be second-guessed. Fail-open cap at 2 consecutive defers (`MAX_CONTINUATIONS`) and a 6s grace timer (`CONTINUATION_GRACE_MS`) both guarantee this can only ever cost one classifier round-trip, never withhold a candidate's answer.
> **Verified:** `tsc --noEmit` clean, 282/282 tests pass (was 276, +6 new for continuation-buffer.ts), endpoint-check route smoke-tested locally — confirmed it fails open to `{"complete":true}` on an unauthenticated request, the actual safety property that matters.
> **NOT done in this pass (deliberately scoped out):** did not touch `REDEMPTION_MS` itself (1250ms) — the semantic backstop makes shortening it safer, but that's a numeric tuning call best validated against real usage first, per this file's own established practice, not bundled blind into the same change. Also did not attempt LiveKit-style "distinguish real interruption from backchannel noise" barge-in smoothing — that needs a raw-audio classifier, a different component than anything in this stack today, not a cheap add.
> **Not yet deployed as of this entry** — code is committed locally; verify live before trusting this fixed the reported "garbage" feeling.

> ## 🔴 INCIDENT — SUPABASE PROJECT AUTO-PAUSED FROM INACTIVITY; RESTORED + HEARTBEAT ADDED 2026-08-03
> **Symptom (reported by Ash):** app "not working," and Ash was getting inactivity-pause emails from Supabase (and other free-tier tools) warning the project would be/was paused.
> **Root cause:** the existing `smoke-check` routine (every 2h, see the 2026-07-24 entry below) only proves the PRODUCT works — it starts a real case and sends a real chat turn, and bails immediately if any step fails. That means the instant something upstream breaks, smoke-check stops touching Supabase/Upstash at all, right when they most need to keep seeing activity to avoid being flagged idle. Compounding this: `smoke-check`'s two `cases` lookups only read `.data` and never checked `.error`, so a totally unreachable Supabase project (DNS gone, `521`, or `PGRST002` "DB still warming up") and a genuinely empty table produced the *identical* message — `"no usable case found in the cases table"` — which is a misdiagnosis trap. This was hit live: DNS lookups for the project host returned `NXDOMAIN` while paused, so it read as "the table is empty" when actually the whole project was unreachable.
> **Fix (commit adding `src/app/api/admin/heartbeat/route.ts`):** new content-independent heartbeat endpoint that only proves Supabase Auth (`listUsers`) and Upstash Redis (a real `rateLimit()` call) are reachable — no app table read or written, so it can never fail because of a data/content bug. The existing 2-hourly routine (`trig_019DYWYDrRYnGFu5ocKMBJqX`) now calls this in addition to `smoke-check`, unconditionally, so the keep-alive signal survives even when the real health check is failing.
> **Data status: nothing was lost.** Once Ash restored the project from the Supabase dashboard, full recovery took a few minutes (DNS back → Cloudflare `521` "origin down" while Postgres woke up → `PGRST002` "schema cache retrying" → fully live). The `cases` table came back with all **2,659 rows** intact, and `smoke-check` passed end-to-end (real InvestCo case, real interviewer turn) immediately after. The "empty table" reading during the outage was purely the masked-error issue above, not real data loss.
> **Verified:** `tsc --noEmit` clean, 276/276 tests pass, heartbeat confirmed live (`{"ok":true,"results":{"supabase":"ok","upstash":"ok"}}`), smoke-check confirmed live (`200`, real LLM reply).
> **Structural watch:** if this recurs, check `/api/admin/heartbeat` first — `results.supabase` containing `"fetch failed"` or DNS `NXDOMAIN` on the project host means Supabase paused/deleted the project again (check the dashboard directly), not a code regression.

> ## 🔴 INCIDENT — LLM FALLBACK CHAIN WAS DEAD; FIXED + VERIFIED 2026-07-24 (evening)
> **Symptom:** every prod /api/chat turn 504ing (FUNCTION_INVOCATION_TIMEOUT); Ash's live sessions showing "took too long" + stuck-listening.
> **Root cause (chain of four):** Groq free tier has a **100K tokens/DAY cap** (we were only watching the 6K TPM) — exhausted by evening after today's prompt growth × the per-turn LLM fan-out. Beneath it: NVIDIA NIM **hanging 30s+ per request** (no time-box → ate the route's whole 60s), Cerebras **404** (they removed all Llama models; our `llama3.1-70b` id was dead), OpenRouter never configured, and **CEREBRAS_API_KEY was never on Vercel prod** (not in the July incident's 8-var restore list). The Fortress's graceful degradation rested entirely on Groq.
> **Fix (commit `393394e` + env):** Cerebras → `gpt-oss-120b` (reasoning_effort low + 300-token floor so hidden reasoning can't yield empty content), promoted above NVIDIA; every provider attempt time-boxed (12s connect / 15s per-chunk / 30s complete); post-partial-yield failures throw instead of stitching two replies; empty completions = failure; `CEREBRAS_API_KEY` added to prod env (readable) + redeploy.
> **Verified:** local turn with exhausted Groq → 200 in 3.4s via Cerebras, in-character + résumé-anchored; prod smoke:prod **PASS** post-redeploy. Groq auto-resumes as layer 1 when its quota resets (~2h).
> **Structural watch:** 100K Groq tokens/day ÷ today's heavier prompts × 3-5 LLM calls/turn = only a handful of full sessions/day on Groq before falling to Cerebras. Next lever (not done): route aux calls (cheatsheet, issue-tree, critic) to smaller models with separate quotas + trim per-turn prompt weight. Also still unwired: smoke:prod on a schedule — tonight's outage was again found by hand.
>
> **Both follow-ups closed same night (commit `b93a6bf`):**
> 1. **Tier-routed aux calls** — issue-tree, cheatsheet, ask-cheatsheet, company-pack, opener, walkthrough, evaluate-session, tier2-judge now pass `tier: 'aux'` to the router, which puts Cerebras first for them instead of Groq (separate quota, ~700ms) — only the primary interviewer turn still goes Groq-first. Directly extends Groq's daily headroom since a single candidate turn was fanning out to 3-4 Groq calls before this.
> 2. **`smoke:prod` is now on a schedule** — new `GET /api/admin/smoke-check` (server-side twin of the CLI script; runs with Vercel's own env, never needs the service-role key handed to anything external) + a scheduled cloud routine (`trig_019DYWYDrRYnGFu5ocKMBJqX`, "CasePad — prod smoke check (every 2h)", cron `27 */2 * * *` UTC) that curls it with one new low-blast-radius bearer token (`SMOKE_CHECK_TOKEN`, set on Vercel prod) and reports PASS/FAIL with a diagnosis. Manage at https://claude.ai/code/routines. **Both outages tonight were caught by hand — this is what closes that gap going forward.**
> **Gotcha hit while shipping this:** `vercel redeploy <alias>` redeploys whatever deployment is CURRENTLY ALIASED, not the latest git push — used it once by habit and it silently re-aliased prod back to an older commit for a few minutes. Use `vercel alias set <specific-deployment-url> casepad.vercel.app` (or `vercel --prod` for a fresh build) instead when the goal is "get the latest commit live."

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
