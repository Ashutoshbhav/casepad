# CasePad — Session State Snapshot

**Saved:** 2026-05-03 (post-cohort-share)
**Trigger word:** `PAD` — say it in any new session to surface this state
**Project root:** `C:\Users\Ashutosh Bhavale\Documents\casepad`
**Production URL:** https://casepad.vercel.app (alias of latest main deploy)
**Latest commit:** run `git log --oneline | head -5` to see most recent

---

## 🎉 MILESTONE: SHIPPED TO FIRST 5 COHORT MEMBERS (2026-05-03)

The build phase is complete. The product is live, allowlisted, and in real users' hands. Next phase = signal collection + iterate based on what users actually struggle with.

**Watch on `/admin/activity`:**
- Sign-in rate (5/5 within 24h = good)
- Sessions started vs completed (>50% = good)
- Avg session duration (>10 min = engaged)
- Track distribution (any spread off consulting = multi-track was worth it)
- Recent feedback feed (any sentiment data they submit)

---

## What's live in production

### Auth + access
- **Pure email-only sign-in** — type email, instantly inside (no magic link). Allowlist-gated.
- **2-device cap per user** — newest sign-in wins; oldest auto-booted via `prune_user_sessions()` SQL function.
- **AuthWatchdog** — patches `window.fetch`, detects 401 on /api/*, shows toast + redirects to /signin?return_to=current.
- **Sign-out button** in top nav account menu.
- **Rate limits** on /auth/signin: 8/min per IP + 4/min per email (in-memory sliding window).

### Core experience
- **Top nav** — sticky bar on every page (except /auth + /solve). Logo + 4 primary links (Cases, Drills, Cheats, Dashboard) + account dropdown (Track switch, How it works, Take a guided case, Admin (admin-only), Sign out). Mobile = hamburger drawer.
- **/cases** — 1,165-case library. Featured starters pinned at top (10 hand-curated, premium content cached). Junk filter (ps_len < 80 hidden by default; `?all=1` opt-in). Track filter pills. Industry/type/difficulty/search filters. 📚 primer button on each card (lazy-gen with cache).
- **/solve/[caseId]** — 3-panel arena (chat | tree | sheet). Tree extracts strictly from chat (no problem-statement leak). Cheat sheet auto-fills from rolling 8-turn transcript. Hanging-turn detection + retry button. Reset-session escape hatch at bottom.
- **/debrief/[sessionId]** — score, dimensional breakdown, strengths, gaps, ideal walkthrough (Tavily-grounded), issue tree visualization, sources. `loading.tsx` covers lazy-gen wait.
- **/dashboard** — per-track filter pills, score curve, weak spots, resume in-progress pills.
- **/cheatsheet** — 8 tabs filtered by track.
- **/tutorial** — 4-card picker for first-time users (Instagram guesstimate, DigiBooks gtm, InvestCo profitability, Doll Clothes market entry). All trigger 6-step solve overlay tour.
- **/how-it-works** — 10-section reference with replay-tour button.
- **/drills** — 3-card index for math/behavioral/recovery drill modes.

### Admin-only (gated by `ADMIN_EMAIL`)
- **/admin** — hub with cohort/case/session counts + 4 tool cards.
- **/admin/activity** — full cohort observability: per-user table (sessions, scores, time, last-active), recent sessions feed, engagement by case_type, recent feedback.
- **/admin/activity/[userId]** — per-user drill-in with full transcripts, score breakdowns, tree summary, feedback. Service-role bypasses RLS.
- **/admin/allowlist** — add/remove cohort emails.

### Fortress (4 layers of resilience)
- **L1 LLM chain:** Groq → NVIDIA NIM → Cerebras (llama3.1-8b) → OpenRouter. Static templates kick in if all 4 fail.
- **L2 Supabase:** `withRetry()` 3-attempt backoff (200ms/600ms/1500ms). `error.tsx` + `global-error.tsx` boundaries. Connection-banner on `online`/`offline` events.
- **L3 Validation:** every API route guards empty body / wrong types / oversized payloads. Tested against 19 hostile payloads — zero 500s.
- **L4 Corruption:** reset-session button. Sanity checks at JSONB read boundaries. Tree preserves prior on parse failure.

### IP / abuse safeguards
- GitHub repo private ✓
- Proprietary LICENSE
- /terms page linked from /auth/signin
- `productionBrowserSourceMaps: false` + `poweredByHeader: false`
- Rate limits on signin (per IP + per email)
- Watermark in DOM data attrs + meta tags + author/copyright metadata

### Performance
- **Vercel pinned to `bom1` (Mumbai)** — colocated with Supabase. Saved ~440ms × 3-4 calls per page.
- `getSession()` instead of `getUser()` on pages — saved ~250ms per page (no Supabase Auth round-trip).
- `Promise.all` on /solve (3 reads) and /dashboard (2 reads + write) — saved 2× RTT.
- Dropped `force-dynamic` on static pages (drills, how-it-works) — enabled cache.

### Data state
- **1,165 cases** (1,194 → 1,165 after cleanup; 10 industry-stub fakes + 19 in-casebook duplicates removed).
- **case_type distribution:** profitability 309, operations 301, market_entry 235, estimation 136, pricing 69, mna 55, gtm 51, other 9.
- **tracks coverage** (case may belong to multiple): consulting 1,047 / strategy_bizops 731 / pm 270 / marketing 244 / ib_pe_vc 146 / behavioral 23. Only 50 cases are single-track.
- **10 starter cases** + 1 tutorial estimation (Instagram) have pre_case_crammer + ideal_walkthrough cached.

### PWA
- Installable on desktop + mobile via Chrome/Edge "Install" button.
- `manifest.webmanifest` declares standalone display, theme `#10b981`, 3 jump-list shortcuts (Cases / Dashboard / Cheats).
- `/icon.svg` is the app icon.

---

## Critical credentials in `.env.local` (NOT committed)

```
NEXT_PUBLIC_SUPABASE_URL=https://cjanrluuqzyrpjtmuilc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GROQ_API_KEY=gsk_...
NVIDIA_API_KEY=nvapi-...
CEREBRAS_API_KEY=csk-...
TAVILY_API_KEY=tvly-...
ADMIN_EMAIL=ashutosh.25011@ssb.scaler.com
NEXT_PUBLIC_SITE_URL=https://casepad.vercel.app
```

(OpenRouter key not yet added — optional 4th LLM provider.)

---

## Database (Supabase project `cjanrluuqzyrpjtmuilc`, region `ap-south-1`)

10 migrations applied. Tables:
- `cases` (1,165 rows) — RLS read-allowed for all auth
- `casebooks` — read-allowed
- `sessions` — RLS owner-only via `auth.uid() = user_id`
- `cheat_sheets` — RLS via session ownership
- `cohort_notes` — RLS owner-only (was leaking until 2026-05-03 fix)
- `session_feedback` — RLS owner-only
- `email_allowlist` — RLS denied to all auth (service-role only)
- `tavily_quota` — RLS off (single-row, service-role only)

Functions:
- `prune_user_sessions(user_id, keep_count)` — SECURITY DEFINER, used by direct-signin to enforce 2-device cap.

---

## Common ops

| Task | Command / URL |
|---|---|
| Add cohort member | `/admin/allowlist` (admin only) |
| See what users are doing | `/admin/activity` |
| See one user's transcripts | `/admin/activity/<user_id>` |
| Check Vercel deploys | `npx vercel ls --token=<TOKEN>` |
| Re-run track backfill | `BACKFILL_CONCURRENCY=4 node --env-file=.env.local scripts/qa/backfill-tracks-and-types.mjs` |
| Pre-gen starter content | `npx tsx --env-file=.env.local scripts/qa/pregen-starter-content.ts` |
| Cross-casebook dedup | `node --env-file=.env.local scripts/qa/cross-casebook-dedup.mjs --apply` |

---

## Known polish items (won't block usage)

- 137 cases still typed as 'other' for case_type (down from 149) — could backfill further
- 50 cases still single-track tagged consulting only — could backfill further
- The PWA install prompt doesn't auto-show; user has to click Chrome's button
- Pregen script trips on `'server-only'` import via `tsx`; works for the 11 starter cases that matter

---

## In a new session, just say `PAD`

Memory will surface this file. The build phase is done — next phase is signal collection from real cohort users.
