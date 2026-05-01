# CasePad — Architecture & User Journey

**Last updated:** 2026-05-01
**Audience:** Ash + cohort dev reference

---

## Part 1 · System Architecture

### A. Layer view

| Layer | Pieces | Lives at |
|---|---|---|
| **Edge / proxy** | `proxy.ts` runs on every request — checks Supabase session cookie, enforces auth before route handlers see traffic. (Note: `middleware.ts` was renamed to `proxy.ts` in Next.js 16.) | `proxy.ts` |
| **UI (Server Components)** | Pages render on the server, query Supabase directly via cookies | `src/app/cases/page.tsx`, `src/app/solve/[caseId]/page.tsx`, `src/app/debrief/[sessionId]/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/admin/allowlist/page.tsx` |
| **UI (Client Components)** | Interactive bits — chat input, cheat sheet textareas, filters | `src/components/chat-panel.tsx`, `src/components/cheat-sheet-panel.tsx`, `src/components/case-filters.tsx` |
| **Server Actions** | Mutations triggered from forms — start/end session, lock cheat sheet field, manage allowlist | `src/server-actions/start-session.ts`, `end-session.ts`, `update-cheatsheet.ts`, `manage-allowlist.ts` |
| **API routes (streaming)** | `/api/chat` streams interviewer responses; `/api/cheatsheet` auto-fills after each turn; `/api/evaluate` scores at session end | `src/app/api/{chat,cheatsheet,evaluate}/route.ts` |
| **AI clients** | Groq SDK; lazy-init so module load doesn't need a key. Two models: 3.3-70b for interviewer + evaluator, 3.1-8b for auto-fill + ingestion extract | `src/lib/groq/client.ts`, `interviewer.ts`, `cheatsheet.ts`, `evaluator.ts` |
| **Data clients** | Three Supabase clients: server (cookies-aware), browser (for realtime sub), admin (service-role, bypasses RLS — for the ingestion pipeline + allowlist write) | `src/lib/supabase/{server,client,admin}.ts` |
| **Data** | Postgres on Supabase free tier — 6 tables with RLS | `supabase/migrations/0001_initial_schema.sql` + `0002_rls_policies.sql` |
| **Ingestion pipeline** | Standalone Node scripts run via tsx — fully decoupled from the app | `scripts/ingest/{discover,download,parse,extract,insert,index}.ts` |

### B. The 6 tables (and what each one is for)

```
casebooks       → which PDF a case came from (provenance: school, year, source_url, local_path)
cases           → the actual case content (problem_statement, gated reveal notes, ideal_structure)
sessions        → one solve attempt by one user (transcript, score, status)
cheat_sheets    → live state during a session (framework, hypothesis, key_numbers, locked_fields)
email_allowlist → cohort gate (only emails on this table can sign in)
auth.users      → Supabase's built-in auth table
```

Relationships:
- `cases.casebook_id` → `casebooks.id` (many cases per casebook)
- `sessions.user_id` → `auth.users.id`
- `sessions.case_id` → `cases.id`
- `cheat_sheets.session_id` → `sessions.id` (one-to-one)

RLS posture: cases + casebooks are world-readable for any authenticated user. Sessions + cheat sheets are per-user (own only). `email_allowlist` is service-role only — the OAuth callback uses the admin client to check it.

### C. The chat loop (the heart of the app)

This is the most complex flow. Data path for one user turn:

```
USER                           BROWSER                       SERVER                          GROQ                SUPABASE
────                           ───────                       ──────                          ────                ────────
types question →
clicks Send  →
                              ChatPanel.send():
                              optimistic add user msg →
                              POST /api/chat
                              { sessionId, userTurn }  →
                                                            chat/route.ts:
                                                            await session by id      →                          select sessions
                                                            await case by session.case_id →                     select cases
                                                            append userTurn to transcript
                                                            buildInterviewerMessages(
                                                              caseRow,
                                                              alreadyDisclosed,
                                                              transcript
                                                            ) → [system, user, asst, user...]
                                                            groq.chat.completions.create(
                                                              model=3.3-70b,
                                                              stream=true
                                                            )                          →
                                                                                                        ← stream
                                                                                                          chunks
                                                            ReadableStream forwards
                                                            each delta as it comes   ←
                                                                              text chunks
                              ChatPanel reads stream,
                              appends to last msg in
                              real time, UI updates
                              token-by-token
                                                            on stream end:
                                                            update sessions.transcript
                                                            with full asst turn      →                          update sessions
                                                            close stream

                              streaming done →
                              fire-and-forget POST
                              /api/cheatsheet            →
                                                            cheatsheet/route.ts:
                                                            select current cheat sheet →                        select cheat_sheets
                                                            buildCheatSheetExtractionMessages(
                                                              userQuestion,
                                                              interviewerAnswer,
                                                              currentCS
                                                            )
                                                            groq.chat.completions.create(
                                                              model=3.1-8b,
                                                              response_format=json_object
                                                            )                          →
                                                                                                        ← JSON
                                                            merge respecting locked_fields
                                                            update cheat_sheets       →                          update cheat_sheets
                                                                                                                  └─ triggers postgres_changes
                              CheatSheetPanel realtime
                              subscription receives the
                              new state, re-renders
                              fields, key numbers, etc.
```

Two important details:

1. **The interviewer never sees user-locked fields differently** — the cheat sheet model gets passed the locked list and is told "do not modify these in your response", but the interviewer has no concept of locks. Locks are purely a user-facing protection against the AI overwriting their thinking.
2. **The cheat sheet update is fire-and-forget** — if `/api/cheatsheet` is slow or fails, the chat keeps working. The cheat sheet just doesn't update for that turn. This is a deliberate UX choice — chat latency is sacred, cheat sheet auto-fill is a nice-to-have.

### D. Reveal-gated AI interviewer

Each `case` row stores `interviewer_notes` as JSONB:
```json
[
  { "trigger_keywords": ["market size", "demand", "tonnage"], "reveal_text": "India consumes ~380 MT..." },
  { "trigger_keywords": ["competition", "players", "rivals"], "reveal_text": "Top 5 players hold ~50% share..." },
  ...
]
```

The system prompt (built in `src/lib/groq/interviewer.ts`) gives the model:

1. Full problem statement (always known)
2. ALL reveal notes verbatim — but with strong instruction: "do NOT proactively share — only reveal a note when the candidate's question semantically matches its trigger keywords"
3. List of already-disclosed reveal_texts (to avoid repeating)
4. Last 10 turns of transcript

Plus 5 behavioral rules including: "Never invent facts that are not in the problem statement or reveal notes" and "If the candidate has gone 3+ turns without a clarifying question or structure, gently nudge them."

This is why the model behaves like a real interviewer — it knows the answers but is instructed to be guarded.

### E. The evaluator (post-session)

`endSession()` server action POSTs to `/api/evaluate`. The evaluator:

1. Pulls `sessions.transcript`, `cases.ideal_structure`, `cheat_sheets`, and computes `elapsedSec`
2. Calls Groq 3.3-70b with `response_format: json_object`
3. Returns `{ structure: 0-40, insight: 0-40, speed: 0-20, total, gaps: [], strengths: [], insufficient_data: bool }`
4. Persists to `sessions.score` + `sessions.score_breakdown`, sets `status='completed'`
5. Redirects user to `/debrief/[sessionId]`

Key safety rule: if the case has no `ideal_structure` (empty), the evaluator returns `insufficient_data: true` and only scores Speed. This prevents the model from inventing scores against a missing rubric.

### F. Ingestion pipeline (decoupled)

Lives entirely in `scripts/ingest/`. Doesn't share a process with the app — it runs from your machine via `npm run ingest:run` (or `:disk` for from-disk-only mode). Writes to Supabase via the service-role admin client (bypasses RLS).

Stage pipeline:
```
sources.json → discover(html scrape)              ┐
                                                   ├→ targets list
extra_pdf_urls (verified URLs from research)     ┘
        ↓
   downloadOne()  → casebooks/raw/<school>__<file>.pdf  (idempotent — skip if exists)
        ↓
   parsePdfFile() → text + needsOcr flag (scanned PDFs marked deferred)
        ↓
   splitIntoCaseChunks()  → array of "Case N: ..." chunks
        ↓
   FOR each chunk:
     throttle.acquire()  (≤25 Groq calls/min)
     extractCase()  → JSON with title, industry, type, difficulty, problem_statement,
                      interviewer_notes, ideal_structure, tags
     upsertCasebook() → casebooks row
     insertCase() → cases row (idempotent on (casebook_id, title))
        ↓
   bumpCasebookCount()
```

The throttle is critical — Groq free tier is ~30 RPM, we run at 25 to leave headroom.

---

## Part 2 · User Journey

Three personas, all probably you in different modes:

| Persona | What they do |
|---|---|
| **Solver** (you + cohort) | Browses cases, solves them, gets scored |
| **Admin** (you only) | Adds emails to allowlist, eyeballs DB |
| **Operator** (you only) | Runs ingestion to grow the case library |

### Solver journey — first visit, end to end

#### Step 1: Land
You hit `https://casepad.vercel.app`. `proxy.ts` runs first — checks Supabase session cookie. None present (first visit). Path is `/` which is "public" per the proxy's `isPublic` check, so it falls through to `src/app/page.tsx`. That page calls `supabase.auth.getUser()` server-side, sees no user, calls `redirect('/auth/signin')`. Browser sees a 307 → renders `/auth/signin`.

#### Step 2: Sign in
`SignInPage` is a client component. One button: "Continue with Google". On click, `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })` runs in the browser. Browser redirects to Google's consent screen. You consent, Google redirects back to `https://casepad.vercel.app/auth/callback?code=...`.

#### Step 3: Allowlist enforcement
`callback/route.ts` runs server-side:

1. Reads `?code=...`
2. `supabase.auth.exchangeCodeForSession(code)` → creates a Supabase session, returns `data.user`
3. **Critical step**: `isEmailAllowed(adminClient, data.user.email)` — checks `email_allowlist` table via service-role client (because allowlist has no RLS-readable policy)
4. If NOT allowed → `supabase.auth.signOut()` and redirect to `/auth/no-access` (you see "Access not granted, ask Ash")
5. If allowed → redirect to `/cases`

This double-gate matters: even if someone tricks Google OAuth (they can't, but hypothetically), the allowlist check happens server-side with the admin client. They can't sign in if their email isn't on the list.

#### Step 4: Browse cases
`/cases` is a server component. It awaits `searchParams` (Next.js 16 made these `Promise<...>`), reads any `?industry=fmcg&type=profitability` filters, queries Supabase:
```ts
supabase.from('cases').select('*').order('created_at', { ascending: false }).limit(120)
  .eq('industry', sp.industry)  // if present
  .eq('case_type', sp.type)
  .eq('difficulty', sp.difficulty)
  .ilike('title', `%${sp.q}%`)
```

You see a 3-column grid of `CaseCard`s (zinc-900 cards, color-coded difficulty pills). Click any → `/solve/[caseId]`.

`CaseFilters` is a client component — when you change a filter dropdown, it pushes `?industry=fmcg` to the URL via `router.push()`, which re-runs the server component with the new search params. Stateless filtering — no client cache to manage.

#### Step 5: Start a session
`/solve/[caseId]` is a server component. First check: `?session=...` query param. If not present, this is a fresh start, so it calls the `startSession(caseId)` server action:

1. Inserts a row into `sessions` with `user_id`, `case_id`, empty transcript, `status='in_progress'`
2. Inserts an empty row into `cheat_sheets` with that `session_id`
3. Calls `redirect(/solve/${caseId}?session=${newSessionId})`

That redirect re-renders the same page with `?session=...` set. Now the page knows which session to load. It pulls the session, case, and cheat sheet rows.

You see:

- Header: case title, difficulty pill, "End session" button
- Left pane: empty chat (since it's fresh)
- Right pane: empty cheat sheet (4 textareas: framework, hypothesis, key numbers, decisions, next steps, manual notes)
- Bottom: collapsible "Show problem statement"

#### Step 6: Read the problem
You expand "Show problem statement". Read it. (For the seed case: "A global cement major considering entry into India...")

#### Step 7: Ask clarifying questions
You type "What's the market size?" and hit Enter. The chat loop kicks in (see Part 1 §C). Token-by-token, the interviewer streams back: "India consumes ~380 MT of cement annually, growing at ~6% CAGR..."

The reveal happens because "market size" semantically matches the trigger_keywords `["market size", "demand", "tonnage"]` for that reveal_text. The model is smart enough to match "what's the market size" to those keywords without needing exact word match.

If you ask about something the case has NO data on (e.g., "What's their CEO's name?"), the model says "I don't have data on that — what would you assume and why?" That's the no-fabrication rule baked into the system prompt.

#### Step 8: Cheat sheet auto-fills
While the interviewer answer is streaming, ChatPanel fires a parallel POST to `/api/cheatsheet` with `{userQuestion, interviewerAnswer}`. Groq 3.1-8b reads both, extracts structured updates:
```json
{
  "framework": null,
  "hypothesis": null,
  "key_numbers": [{ "label": "India cement consumption", "value": "380", "unit": "MT/year" }],
  "decisions": [],
  "next_steps": []
}
```
These get merged into the existing cheat sheet (locked fields preserved verbatim) and written to `cheat_sheets`. Postgres emits a `postgres_changes` event. The browser's CheatSheetPanel has subscribed via Supabase Realtime — it receives the new state and re-renders. You see "India cement consumption: 380 MT/year" appear on the right ~2-3 sec after the interviewer's reply finishes.

#### Step 9: Manually edit the cheat sheet
You decide your hypothesis: type "Yes, market is large enough — entry mode is the real question" into the Hypothesis textarea. On blur, the `updateCheatSheetField` server action fires:
```ts
updateCheatSheetField(sessionId, 'hypothesis', value, false)
// false = not locked
```
Server writes to DB, revalidates the page. Realtime fires, your local state updates.

You then click the "lock" button next to Hypothesis. Now `locked_fields = ['hypothesis']`. Next time the AI auto-fill runs, the cheat sheet prompt sees `LOCKED FIELDS: hypothesis` and returns the existing hypothesis unchanged. Server-side merge logic also enforces this as a safety net.

#### Step 10: Build out the structure
You ask 5-10 more questions. Each turn: chat streams in, cheat sheet auto-fills (decisions and next_steps populate). You manually fill `framework: "Market Entry"` and lock it. After ~15-20 minutes, your cheat sheet looks complete.

#### Step 11: End session
Click "End session" (red pill in header). The form action calls `endSession(sessionId)`:

1. POSTs to `/api/evaluate`
2. `/api/evaluate` pulls transcript + ideal_structure + cheat sheet + elapsed time
3. Groq 3.3-70b scores: e.g. `{structure: 32, insight: 28, speed: 18, total: 78, gaps: ["Did not explore competitive response", "Missed regional segmentation by limestone access"], strengths: ["Clear Market Entry framework", "Specific volume hypothesis"], insufficient_data: false}`
4. Persists to `sessions.score` (78) and `sessions.score_breakdown` (the JSON), sets `status='completed'`, `ended_at=now()`
5. Returns the JSON to `endSession()`
6. `endSession()` calls `redirect(/debrief/${sessionId})`

#### Step 12: Read the debrief
`/debrief/[sessionId]` shows:

- Total score: 78/100 (big, top of page)
- Three colored bars: Structure 32/40 (amber), Insight 28/40 (amber), Speed 18/20 (green)
- Strengths list (bullets)
- Gaps list (bullets) — the actionable feedback
- Ideal structure tree at the bottom — shows you the framework + branches the case "wanted" so you can compare to what you did

#### Step 13: Back to dashboard
Click "← back to cases" or navigate to `/dashboard`. Dashboard shows:

- 3 stat tiles: Sessions count, Completed count, Avg score
- Recent sessions (last 20) — clickable: completed → `/debrief/...`, in-progress → resume `/solve/...?session=...`
- Weak spots: case_type pills where your avg is < 65 over ≥ 2 sessions ("market entry · avg 58 (3)")

You're now in a loop — pick another case, repeat. The dashboard rewards spaced practice (the streak isn't built in v1 but the data structure supports it for v2).

### Solver — edge cases

| Scenario | What happens |
|---|---|
| You go 3+ turns without a clarifying question | Interviewer's system prompt rule fires: "gently nudge — 'Want to walk me through your structure so far?'" |
| You refresh the browser mid-session | `?session=...` is in the URL. Page re-renders, pulls full transcript + cheat sheet from DB. You're back where you were, no data loss. |
| Network drop mid-stream | The chat panel's reader stops getting bytes; the in-flight `interviewer` message stays partial. You can re-send the question — but the partial assistant turn was never saved (server only persists when the stream completes). |
| You start a session but never finish | `sessions.status` stays `'in_progress'`. Visible on dashboard with "in progress" amber tag. Click to resume. |
| The case has empty `ideal_structure` (e.g. ingest extracted only the problem) | Evaluator returns `insufficient_data: true`, sets structure=0, insight=0, total=speed only, explains in `gaps`. Debrief still renders, ideal-structure tree shows "No ideal structure available for this case." |
| You ask the AI something it has no data for | Returns "I don't have data on that — what would you assume and why?" Doesn't invent. |
| Two users solve the same case | Each has their own session row. RLS prevents them from seeing each other's transcripts. Cases are read-only shared. |

### Admin journey
You sign in with the email that matches `process.env.ADMIN_EMAIL`. Visit `/admin/allowlist`. Page checks `user.email === ADMIN_EMAIL`. If yes, shows:

- Email input + "Add" button
- List of all allowlisted emails with "remove" buttons

Each form action calls `assertAdmin()` server-side first — re-checks the env match. Defense in depth: even if someone navigates to the admin URL, the action fails unless they're admin.

### Operator journey

You're running the ingestion to grow the case library. Two modes:

**Mode A — Crawl + ingest:**
```
npm run ingest:run
```
Reads `sources.json`. Discovers PDFs from landing pages. Downloads anything in `extra_pdf_urls`. Parses, extracts via Groq, inserts. Runs at ~25 cases/min. To process 131 PDFs with avg 25 cases each = ~3275 extract calls = ~2.2 hours of wall-clock time.

**Mode B — From-disk only:**
```
npm run ingest:run:disk
```
Skips network entirely. Scans `casebooks/raw/*.pdf`, processes new ones. Useful when a cohort member shares a PDF you drop in manually.

**Dry runs:** Append `--dry-run` to either. Logs `[dry] would insert: <title>` without writing to DB. Validates that extraction produces sensible output before committing.

**Idempotency:** Re-running either mode is safe. `casebooks` are upserted by `(school, title)`. `cases` are upserted by `(casebook_id, title)`. Duplicates skip cleanly.

**Provenance per case:** Every row has `provenance: { school, casebook_title, source_url }` so when a user is solving "Cement plant entry — India", you can trace back to "IIM Vizag Casebook 2023-24, page 47" if needed.
