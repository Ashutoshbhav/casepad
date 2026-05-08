# CasePad — Never-Fail Audit (2026-05-08)
> Mandate: NSM (start-case → complete-all-turns → debrief-with-score → persist) must never fail.
> Audit by senior-backend-architect agent, 2026-05-08. Status: FINAL.

## TL;DR
- **8 P0 issues** found that today can break the NSM end-to-end. All are fixable in <250 LOC.
- **Single most dangerous gap:** `vercel.json` has NO `maxDuration` config — every LLM-touching route is silently capped at Vercel's 10s Hobby default. `vercel.json:1-3`.
- "Never-fail" is **structurally achievable** — no fundamental infra constraint blocks it. Current code has solid fallback fortress + region pinning + retries on most reads. Gaps are concentrated in (a) Vercel platform config, (b) chat write-path persistence, (c) idempotency, (d) `endSession` blocking on evaluator.

---

## 1. Verified — what currently works

1. **LLM router has 4 layers wired correctly** — `src/lib/llm-router.ts:27-66`. Providers ordered Groq → NVIDIA → Cerebras → OpenRouter; only added if API key present. 429/5xx fallthrough at `:103-106` (stream) and `:170-173` (non-stream).
2. **Static fallbacks exist for evaluator, issue tree, crammer, walkthrough** — `src/lib/groq/static-fallbacks.ts:16-121`. Valid-shape JSON with `fallback_used: true` flag.
3. **`evaluateSession` actually wires the static fallback when all 4 LLMs fail** — `src/lib/groq/evaluate-session.ts:63-82`. Catches throws AND unparseable JSON. Debrief always renders even if every LLM is down.
4. **`generateOpener` has a 3-tier fallback (Groq SDK direct → 4-layer router → static)** — `src/lib/groq/opener.ts:122-150`. Session creation NEVER blocks on AI being up. Confirmed.
5. **Reads on `/cases`, `/solve`, `evaluate-session` use `withRetry`** — exponential backoff (200/600/1500ms), correctly skips 4xx. `src/lib/supabase/with-retry.ts:14, 60`.
6. **Mumbai region pin** — `vercel.json:2` `bom1`. Reduces cross-region latency.
7. **Chat input validation is robust** — `src/app/api/chat/route.ts:30-48`: ≤100 char sessionId, ≤10000 char turn, control-char strip.
8. **Voice transcribe has structured 401/400/413/502/503 error handling** — `src/app/api/voice/transcribe/route.ts:42-131`.
9. **Browser-side error boundaries are wired and visually solid** — both `src/app/error.tsx` and `src/app/global-error.tsx` exist with reset + back-to-cases buttons. AuthWatchdog mounted at `src/app/layout.tsx:111`. ConnectionBanner mounted at `:110`.
10. **`assignDailyCase` is idempotent** via compound primary key + ignoreDuplicates — `src/server-actions/assign-daily-case.ts:117-127`. Same-day re-render is safe.
11. **`resetSession` ownership-checked** before mutation — `src/server-actions/reset-session.ts:25-32`.
12. **`endSession` ownership-checked** before evaluation — `src/server-actions/end-session.ts:16-22`.
13. **Guardrail GATE mode regenerates once on prompt-injection** — `src/app/api/chat/route.ts:103-138`. Single retry; on retry-fail, ships original. No infinite loop.
14. **Canned-template detection wrapped in try/catch** — `src/app/api/chat/route.ts:81-90`. Detection bug can never break chat.
15. **`/api/chat` catches LLM stream errors** and returns the partial `[Service is busy...]` text — `src/app/api/chat/route.ts:159-164`. Stream completion is preserved.
16. **`generateOpener` static fallback uses raw `problem_statement`** — `src/lib/groq/opener.ts:101-104`. User still sees a usable opener with zero AI.

---

## 2. Critical gaps (rank P0 → P3)

### P0-1: `vercel.json` has NO `maxDuration` — every LLM route capped at 10s
- **What can fail:** `src/app/api/chat/route.ts`, `src/app/api/evaluate/route.ts`, `src/app/api/cheatsheet/route.ts`, `src/app/api/crammer/route.ts`, `src/app/api/ask-cheatsheet/route.ts`, `src/app/api/issue-tree/route.ts`, `src/app/api/voice/transcribe/route.ts`, `src/app/api/company-pack/route.ts`, `src/app/api/behavioral-feedback/route.ts` — all hit Vercel's default 10s timeout. Hobby max is 60s and is NOT configured.
- **Probability:** FREQUENT. Cold starts, evaluator JSON synthesis (3-8s), provider failover (Groq fail → NVIDIA latency adds 2-5s), Tavily-touching crammer (5-15s).
- **Blast radius:** 100% of NSM. Truncated stream → user sees half a sentence + transcript-save line at `:177` never executes → assistant turn lost from DB.
- **Current coverage:** ZERO. `vercel.json:1-3` only specifies region.
- **Concrete patch (~12 LOC, `vercel.json`):**
  ```json
  {
    "regions": ["bom1"],
    "functions": {
      "src/app/api/chat/route.ts":            { "maxDuration": 60 },
      "src/app/api/evaluate/route.ts":        { "maxDuration": 60 },
      "src/app/api/cheatsheet/route.ts":      { "maxDuration": 30 },
      "src/app/api/crammer/route.ts":         { "maxDuration": 60 },
      "src/app/api/ask-cheatsheet/route.ts":  { "maxDuration": 60 },
      "src/app/api/issue-tree/route.ts":      { "maxDuration": 30 },
      "src/app/api/voice/transcribe/route.ts":{ "maxDuration": 30 },
      "src/app/api/company-pack/route.ts":    { "maxDuration": 60 },
      "src/app/api/behavioral-feedback/route.ts":{ "maxDuration": 30 }
    }
  }
  ```

### P0-2: `/api/chat` final transcript-save is NOT wrapped in `withRetry` and silently swallowed
- **What can fail:** `src/app/api/chat/route.ts:177` — `await supabase.from('sessions').update({ transcript: finalTranscript }).eq('id', sessionId);`. No retry, no error inspection. A transient Supabase 503 / network blip after a successful LLM stream = user saw the assistant turn, but DB has stale transcript. On refresh / `/debrief`, the turn is GONE.
- **Probability:** OCCASIONAL — transient Supabase 503s are rare but real on free tier.
- **Blast radius:** 1 lost turn per failure. If on the LAST turn before `endSession`, the evaluator scores against incomplete transcript → wrong score → score-corrupt NSM.
- **Current coverage:** None.
- **Concrete patch (~6 LOC):** Wrap in `withRetry` + `console.error` on residual failure. Or even better: write to DB BEFORE closing the controller so failure can stream a `[[SAVE_FAILED]]` sentinel back.

### P0-3: `/api/chat` poisons transcript with error text on LLM failure
- **What can fail:** `src/app/api/chat/route.ts:140-145, 159-164` — when `streamChat` throws (all providers down), the route enqueues `[Service is busy — please retry in a few seconds. <err>]` to the client AND assigns it to `full`. Then at `:173-177` that error text is persisted as the `interviewer` turn. On the user's next turn, the LLM sees `"[Service is busy...]"` as the prior interviewer message → broken context → poisoned conversation forever.
- **Probability:** RARE (4-layer fortress) but every occurrence is permanent corruption.
- **Blast radius:** Entire session poisoned; subsequent turns score nonsensically.
- **Current coverage:** None — no static template chat fallback exists for the chat turn (unlike the opener / evaluator / crammer / walkthrough which DO have static fallbacks).
- **Concrete patch (~25 LOC):**
  1. Add `staticChatTurnFallback(caseRow, transcriptIn)` to `src/lib/groq/static-fallbacks.ts` — returns a deterministic clarifying probe like `"Walk me through how you'd structure this."` or `"What's your hypothesis so far?"`. Keep conversation alive.
  2. In `chat/route.ts` catch path, replace the error-text injection with the static turn. Persist that, NOT an error string.
  3. Surface a non-blocking client banner ("AI services degraded — basic mode") via response header or sentinel.

### P0-4: `/api/chat` has NO idempotency — retried turns duplicate transcript
- **What can fail:** Browser network blip mid-stream → user clicks "Send" again, OR mobile retry kicks in → server appends a SECOND user turn + SECOND interviewer turn. Both get scored. Looking at chat-panel `src/components/chat-panel.tsx:140-229`, there's NO duplicate guard on retry. The "Try again?" UI at `:170-178` just refires `sendUserTurn` with the same text.
- **Probability:** OCCASIONAL on flaky networks (mobile cohort during travel).
- **Blast radius:** Score becomes garbage (duplicate user reasoning + duplicate interviewer probes confuse the evaluator); replay UX shows duplicates.
- **Current coverage:** None.
- **Concrete patch (~15 LOC):** Client sends `clientTurnId` (uuid) on each send. Server stores it inside the user turn object. Before processing, check `transcript[].clientTurnId === incoming.clientTurnId` — if yes, replay the existing assistant response without re-calling the LLM.

### P0-5: `endSession` server action throws if evaluator fails after retry — blocks NSM completion
- **What can fail:** `src/server-actions/end-session.ts:24-27` — `if (!result.ok) throw new Error('evaluate failed...')`. But `evaluateSession` returns `ok: false` only at `:25` (session not found, 404). The static-fallback path returns `ok: true, status: 200`. So practically this throw fires only on missing session — OK. **But the fail mode is the silent one:** `evaluateSession` does `await supabase.from('sessions').update({...})` at `:84` without retry or error check. If Supabase is unreachable at that exact moment, `score` and `ended_at` never get written → session stuck `in_progress` forever → user can't complete NSM. AND `endSession` redirects to `/debrief/[id]` regardless, where `/debrief/[sessionId]/page.tsx` will render a session with `score: null`.
- **Probability:** RARE.
- **Blast radius:** Score never persists; user re-runs `endSession` but evaluator runs AGAIN against full transcript (no idempotency on evaluation either) → duplicate Groq cost + possibly different score on retry.
- **Current coverage:** None.
- **Concrete patch (~10 LOC):** Wrap the final `update` in `evaluate-session.ts:84-92` in `withRetry`. If still fails, return `ok: false, status: 503, body: { error: 'persistence failed', breakdown }`. `endSession` already throws on `!ok` — the user's error.tsx boundary catches it and shows "Try again". Add a `evaluated_at` timestamp + early return if already set so retried evaluations are idempotent.

### P0-6: `startSession` final session insert + cheat-sheet insert are NOT retried, NOT in transaction
- **What can fail:** `src/server-actions/start-session.ts:103-115` — `sessions` insert + `cheat_sheets` insert. No `withRetry`. No transaction. If `cheat_sheets` insert fails (transient), the session row exists but cheat sheet doesn't → cheatsheet panel will silently fail-soft, but it's a degraded NSM start.
- **Probability:** RARE.
- **Blast radius:** Local UX degraded; NSM still completes. **Bigger risk:** if `sessions` insert itself fails, `redirect('/solve/...')` at `:116` runs anyway with `data` `null`-deref → uncaught throw → user sees error.tsx instead of starting case.
- **Current coverage:** Throws "failed to start session" at `:113`; caught by SolvePage's try/catch wrapper at `src/app/solve/[caseId]/page.tsx:33-40` which redirects to `/cases`. So user is bounced, not crashed. Acceptable degradation but they lose the caseId selection.
- **Concrete patch (~8 LOC):** Wrap inserts in `withRetry`. After retry-fail, redirect with `?err=startup_failed` so /cases can surface a toast.

### P0-7: `/api/evaluate` and `/api/cheatsheet` have NO Supabase retry on writes
- **What can fail:** `src/lib/groq/evaluate-session.ts:84-92` — final `update`. `src/app/api/cheatsheet/route.ts:103-112` — both update and insert paths. None use `withRetry`.
- **Probability:** RARE; OCCASIONAL on Supabase free-tier maintenance windows.
- **Blast radius:** Score lost (P0-5) or cheatsheet lost. Cheatsheet loss is recoverable since it's regenerated each turn; score loss is NSM-fatal.
- **Current coverage:** None.
- **Concrete patch (~6 LOC):** Wrap the write in `withRetry` for evaluator. Cheatsheet write can stay as-is since it's regenerated next turn.

### P0-8: `evaluateSession` is not idempotent — re-runs on already-completed sessions overwrite score
- **What can fail:** `src/lib/groq/evaluate-session.ts:18-95` — there's no early-return guard for `session.ended_at !== null`. If `endSession` is called twice (user double-clicks "End" or React Strict Mode in dev), the evaluator re-runs against the same transcript, possibly producing a DIFFERENT score (LLM is non-deterministic at temp 0.2), overwriting the original.
- **Probability:** OCCASIONAL.
- **Blast radius:** Score volatility — same session can show different scores on refresh.
- **Current coverage:** None.
- **Concrete patch (~6 LOC):** At top of `evaluateSession`, after fetching session, check `if (session.status === 'completed' && session.score_breakdown) return { ok: true, status: 200, body: session.score_breakdown }`.

---

### P1-9: No abort signal / streaming heartbeat — long Groq tails leave client hung
- **What can fail:** If Groq starts streaming then stalls (rare, but happens — provider hiccup), the client `for await reader.read()` in `src/components/chat-panel.tsx:183-192` hangs indefinitely with no timeout. User has no way to cancel mid-stream.
- **Probability:** OCCASIONAL.
- **Patch (~20 LOC):** Wrap fetch in `AbortController` with a 60s client-side timeout. Add a "Stop" button while `streaming === true`.

### P1-10: `/cases` has NO static fallback when Supabase is down
- **What can fail:** `src/app/cases/page.tsx:43-61` — `cases` query is wrapped in try/catch but on failure leaves `cases: null`. The page renders empty. No starter-case fallback hardcoded.
- **Probability:** RARE.
- **Patch (~30 LOC):** Hardcode 5 starter cases (id + title + problem_statement) into `src/lib/starter-cases.ts` (already exists with IDs only — extend with full content). On query fail, render those.

### P1-11: AuthWatchdog only fires on 401 from `/api/*` — silent JWT expiry on server-action calls bypasses it
- **What can fail:** `src/components/auth-watchdog.tsx:42-47` checks only `/api/*` URLs. Server actions go through Next.js `_action` POST endpoints, not `/api/`. If JWT expires mid-session, `endSession` returns redirect to `/auth/signin` (handled by proxy) — but proxy returns 307, not 401. So AuthWatchdog never fires for server-action auth loss.
- **Probability:** OCCASIONAL — Supabase access token default TTL is 60min.
- **Patch (~8 LOC):** Also intercept response.redirected + response.url.includes('/auth/signin'). Or set up token-refresh in proxy.ts.

### P1-12: No SSE keep-alive on chat stream
- **What can fail:** Vercel may close idle streams. Mid-stream silence (rare model pause) could trigger 503.
- **Probability:** RARE.
- **Patch (~10 LOC):** Send a `: heartbeat` comment every 10s during model wait.

### P1-13: `/api/chat` does not auth-check the user owns `sessionId`
- **What can fail:** `src/app/api/chat/route.ts:51-56` fetches session by id only — no `user_id` filter. Any signed-in user with knowledge of a sessionId can append turns to another user's session.
- **Probability:** RARE (sessionIds are uuids, not enumerable) but security-relevant.
- **Patch (~6 LOC):** Add `.eq('user_id', user.id)` after auth check.

### P1-14: `/api/voice/transcribe` does NOT use the LLM router — Groq direct only
- **What can fail:** `src/app/api/voice/transcribe/route.ts:105-109` — only Groq. If Groq is down, voice mode is dead. No fallback to OpenAI Whisper / NVIDIA Riva / etc.
- **Probability:** OCCASIONAL.
- **Blast radius:** Voice users blocked; can still type. NSM still completes.
- **Patch (~30 LOC):** Add a tiny voice-router with optional `OPENAI_API_KEY` for `whisper-1` fallback. Or accept this as voice-only degradation.

---

### P2-15: `assignDailyCase` write at `:117-127` not retried
- Failure → no daily case. Acceptable; user can pick from `/cases` directly.

### P2-16: PWA caching strategy not verified
- Couldn't verify in this audit if `next-pwa` runtime caching covers `/cases` page shell for offline. Worth a check separately.

### P2-17: `chat-panel.tsx` retry button just re-fires `sendUserTurn` with same text — racy if user spam-clicks
- Patch: disable button while `streaming === true` (probably already covered by `if (streaming) return` at `:141`, verify visually).

### P2-18: No structured logging / failure telemetry
- All failures `console.warn` to Vercel logs. No alerting. You won't KNOW the NSM failed unless you check logs daily.
- Patch: add a single Supabase `nsm_failures` table; insert on every catch path with `{ session_id, route, error, ts }`. ~40 LOC.

---

### P3-19: `getGroq()` direct usage in `src/lib/groq/opener.ts:124` and `src/lib/groq/client.ts:33`
- The opener tries Groq direct as Layer 1, then falls back to the router. Acceptable — already has fallback. Direct Groq imports verified at:
  - `src/lib/groq/opener.ts:124` (has fallback)
  - `src/lib/groq/client.ts` (used in opener + ingest scripts)
- **Conclusion: only ONE call site bypasses the router, and it has its own fallback. Router fortress is otherwise universal.**

### P3-20: Cold-start on `/cases` page latency
- `dynamic = 'force-dynamic'` at `src/app/cases/page.tsx:14` means every request hits Supabase. No ISR. Mumbai region helps. Accept; rebuild as `cache: 'force-cache'` with `revalidate: 60` if perf becomes a problem. Not NSM-blocking.

---

## 3. Patch priority order

**P0 (must fix today — blocks "never-fail" claim):**
- P0-1: `vercel.json` `maxDuration` config (~12 LOC)
- P0-2: `withRetry` on chat transcript save (~6 LOC)
- P0-3: Static chat-turn fallback + remove error-text from persisted transcript (~25 LOC)
- P0-4: `clientTurnId` idempotency on `/api/chat` (~15 LOC)
- P0-5: Retry + idempotency on evaluator final write (~10 LOC)
- P0-6: `withRetry` on `startSession` inserts (~8 LOC)
- P0-7: `withRetry` on evaluator write (~6 LOC, overlaps with P0-5)
- P0-8: Idempotent `evaluateSession` early-return (~6 LOC)
- **Total P0:** ~88 LOC across 5 files.

**P1 (this week):**
- P1-9: Client-side abort + 60s timeout (~20 LOC)
- P1-10: Static `/cases` fallback (~30 LOC)
- P1-11: Server-action auth-loss handling (~8 LOC)
- P1-12: SSE heartbeat (~10 LOC)
- P1-13: User-ownership check in `/api/chat` (~6 LOC)
- P1-14: Whisper fallback or voice graceful-degrade banner (~30 LOC)
- **Total P1:** ~104 LOC.

**P0 + P1 combined: ~192 LOC.**

**P2 (this month):**
- Telemetry table, daily-case retry, retry button race fix.

**P3 (known limitations — document only):**
- Single Groq call site in opener layer 1 (has fallback already).
- `/cases` cold-start latency (not NSM-blocking).

---

## 4. Things that MAY fail but are ACCEPTABLE risk

1. **Voice transcription full outage.** If Groq Whisper is down, voice mode is dead but typing still works. NSM still completes. Patching is P1, not P0.
2. **Cheat sheet stale by one turn.** `/api/cheatsheet` runs fire-and-forget after each turn — if it fails, the panel shows last good state. Self-heals next turn. No NSM impact.
3. **Issue tree extraction failure.** Has static fallback; tree shows "rebuild" hint. UX-degraded but not NSM-blocking.
4. **Tomorrow's daily case unavailable.** `/debrief` already wraps in try/catch at `src/app/debrief/[sessionId]/page.tsx:91-99` — page renders without the card.
5. **Pre-case crammer (Tavily down).** Has static fallback in `src/lib/groq/static-fallbacks.ts:60-90`. Not on critical path.
6. **Reduced-motion users / 3D AshMark failures.** Pure visual; chat works.

---

## 5. Audit blind spots

1. **Env var presence** — couldn't verify which of the 4 LLM providers actually have keys configured in production. If only `GROQ_API_KEY` is set, the "4-layer fortress" is a 1-layer shack. **Action: Ash should verify all 4 keys are in Vercel env.**
2. **Supabase RLS policies** — couldn't verify (CLAUDE.md prohibits touching). If RLS is over-restrictive, `/api/chat`'s session update could silently fail with no visible error. The retry won't help — RLS denies are 4xx.
3. **Vercel plan tier** — assumed Hobby (10s default, 60s max). If on Pro, default is 60s and max is 300s; patch `maxDuration` accordingly.
4. **Supabase tier limits** — free tier has request rate limits; couldn't verify cohort size vs limits.
5. **Real-world cohort scale** — couldn't load-test. NSM may degrade differently at 50 concurrent users than at 1.
6. **PWA offline mode** — didn't verify next-pwa runtime caching for `/solve/[caseId]` route. If a user's network drops mid-session, what does the SW serve?
7. **Browser tab backgrounding** — if user backgrounds tab mid-stream on mobile Safari, the fetch may be paused/killed. Couldn't verify.
8. **`/api/chat` does NOT verify `user_id` matches session owner** — flagged as P1-13. Security-relevant but not NSM-availability.

---

## Verdict

**Is "never fail" structurally possible? YES.** No fundamental architectural blocker. The fortress is real, the fallbacks exist, the retries exist. The gaps are concentrated in:
- Vercel platform config (1 file, P0-1 — most dangerous)
- Chat write-path persistence (chat route, P0-2/3/4)
- Evaluator idempotency + retry (evaluate-session, P0-5/7/8)
- Session create retry (start-session, P0-6)

**Time to NSM-rock-solid:** ~88 LOC of focused work. One sitting.

Without P0-1 (vercel.json maxDuration), every other patch is moot — Vercel will kill the function before any of them run.
