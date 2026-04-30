# CasePad — Design Spec

**Date:** 2026-04-30
**Owner:** Ash
**Status:** Approved for implementation

## 1. Purpose

A cohort-gated case interview practice platform for SSB classmates and similar consulting-prep groups. Users solve real B-school case studies end-to-end: ask a Groq-powered AI interviewer clarifying questions, maintain a live cheat sheet as info is revealed, and receive a structured score + gap analysis at the end. The platform doubles as a queryable case library and personal performance tracker.

This is **Path A** in the brainstorming fork — real cases only (no synthetic), private cohort use (~5-30 users), no public hosting. IP posture is acceptable for cohort-internal use because cases come from openly-published B-school consulting club casebooks; no paywalled HBS/Ivey/Darden content is touched.

## 2. Scope (v1, today)

**In:**
- Case browser with filter (industry, type, difficulty, source)
- Solve arena: split-pane chat (left) + live cheat sheet (right)
- AI interviewer with reveal-gated disclosure logic
- Cheat sheet with auto-fill from session context + manual override
- Post-case evaluator with score (Structure 40 + Insight 40 + Speed 20) and gap analysis
- Progress dashboard (history, average score, basic weak-spot detection by case type)
- Cohort auth via Supabase Google SSO + email allowlist
- Ingestion pipeline that crawls openly-published casebook PDFs, parses them with Groq, and inserts cases into Supabase
- Target ≥300 cases in DB by end of day; pipeline keeps running afterward toward 1000+

**Out (deferred):**
- Mobile responsiveness pass
- Admin panel for editing cases (use Supabase table editor for v1)
- Advanced weak-spot detection (framework over-reliance, cheat-sheet-field completion patterns)
- Multiplayer / video / AI case generator (post-v1 per original plan)

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind CSS | Standard for Ash; matches CONVERGE / ShadiGhar stack |
| Hosting | Vercel free tier | Zero-cost; native Next.js |
| DB + Auth | Supabase free tier (Postgres, Google SSO) | Zero-cost; matches original plan |
| AI — interviewer + evaluator | Groq Llama 3.1 70B-versatile | High quality, free tier, Ash already uses Groq for ASH |
| AI — case extraction in pipeline | Groq Llama 3.1 8B-instant | Cheaper for high-volume parsing; 70B as fallback for hard cases |
| PDF parsing | `pdf-parse` (Node) → `tesseract.js` for OCR fallback on scanned PDFs | Free, runs locally |
| Casebook PDF storage | Local disk (`casebooks/raw/`) | Supabase free tier storage cap is 1GB; PDFs may exceed |

**Explicitly NOT used:** Anthropic Claude API (no key, zero-budget rule), Gemini (memory: returns limit:0 for Ash's project), any paid service.

## 4. Data Model

### `users`
Standard Supabase auth user + an allowlist check. Email allowlist table gates sign-in.

### `casebooks` (provenance)
- `id` UUID PK
- `school` (e.g. "IIM-A", "ISB", "Wharton")
- `year` int
- `title` (e.g. "IIM-A Consult Club Casebook 2023")
- `source_url` original PDF URL
- `local_path` path on disk
- `ingested_at` timestamp
- `case_count` int (denormalized for quick stats)

### `cases`
- `id` UUID PK
- `title` short descriptive name
- `industry` enum: Consulting, FMCG, Tech, Healthcare, Finance, Infra, Energy, Retail, Other
- `case_type` enum: Market Entry, Profitability, M&A, Pricing, Operations, GTM, Estimation, Other
- `difficulty` enum: Easy, Medium, Hard, Expert
- `source` text (firm or competition where applicable, e.g. "BCG", "McKinsey", "Mahindra War Room")
- `casebook_id` FK → casebooks (nullable for cases sourced outside casebooks)
- `problem_statement` text shown to solver at start
- `interviewer_notes` JSONB array of `{trigger_keywords: string[], reveal_text: string}` — gated reveal logic
- `ideal_structure` JSONB tree: framework + branches + key insights
- `tags` text[] freeform
- `provenance` JSONB: `{casebook_id, page_range, school, year, extracted_by_model}`
- `created_at`, `updated_at`

### `sessions`
- `id` UUID PK
- `user_id` FK
- `case_id` FK
- `started_at`, `ended_at`
- `transcript` JSONB array of `{role: 'user'|'interviewer', content, timestamp}`
- `score` int 0-100 (null until evaluated)
- `score_breakdown` JSONB: `{structure: int, insight: int, speed: int, gaps: string[]}`
- `status` enum: in_progress, completed, abandoned

### `cheat_sheets`
- `id` UUID PK
- `session_id` FK (one-to-one)
- `framework` text
- `hypothesis` text
- `key_numbers` JSONB array of `{label, value, unit}`
- `decisions` text[]
- `next_steps` text[]
- `manual_notes` text
- `last_updated` timestamp

### `email_allowlist`
- `email` text PK
- `added_by` text
- `added_at` timestamp

## 5. AI Interviewer — System Prompt Design

The Groq Llama 3.1 70B interviewer receives, on every turn:

1. **Full case problem statement** (always)
2. **Interviewer reveal notes** (gated — model sees them but is instructed NOT to share unprompted)
3. **Disclosure log** — list of reveal-note items already shared this session
4. **Recent transcript** — last 10 turns
5. **Behavioral rules:**
   - Reveal a `reveal_text` ONLY when the user's question matches its `trigger_keywords` semantically
   - Never invent facts that aren't in problem_statement or interviewer_notes
   - If the user has gone 3+ turns without a clarifying question, gently nudge ("Want to share your structure so far?")
   - Stay in character as a consulting interviewer — concise, neutral, no leading

A strict no-fabrication clause is enforced via system prompt + a post-response check: the interviewer's reply is screened for content not present in the case data. If it fabricates, the response is regenerated.

## 6. Cheat Sheet Auto-fill

After every interviewer turn, a lightweight Groq 8B call analyzes the latest exchange and proposes updates to the cheat sheet's structured fields (framework, hypothesis, key_numbers, decisions, next_steps). Updates are merged with the existing sheet. The user can edit any field manually at any time; manual edits take precedence over future auto-updates for that field (a "locked" flag per field).

## 7. Evaluator

At session end, Groq 70B receives:
- Full transcript
- The case's `ideal_structure`
- The final cheat sheet
- Time taken vs benchmark for difficulty level

Returns:
```json
{
  "structure": 0-40,
  "insight": 0-40,
  "speed": 0-20,
  "total": 0-100,
  "gaps": ["Did not consider competitive response", "Missed segmentation by region"],
  "strengths": ["Clear profitability tree", "Strong revenue hypothesis"],
  "ideal_structure_overlay": "<rendered tree comparing user's approach to ideal>"
}
```

## 8. Ingestion Pipeline (parallel workstream)

A standalone Node script at `scripts/ingest/`:

**Stage 1 — Crawl:** A list of seed URLs (IIM consulting club sites, ISB SAC, FMS, MDI, XLRI, SPJIMR, Wharton/Kellogg/Booth/Tuck/Stern/INSEAD/LBS where openly hosted). For each, find linked PDFs that match casebook patterns (filename or page text containing "casebook"/"case book"/"consulting club").

**Stage 2 — Download:** Fetch each PDF to `casebooks/raw/<school>-<year>.pdf`. Skip if already downloaded. Skip paywalled (any 401/403/login-redirect).

**Stage 3 — Parse:**
- `pdf-parse` for text extraction
- If extracted text is < 100 chars per page on average, treat as scanned → OCR via tesseract.js (slower; goes to a separate queue so it doesn't block the line)
- Pass parsed text to Groq 8B with a prompt that splits the casebook into individual cases and extracts structured fields per case
- Validate output JSON against schema; if invalid, retry with 70B

**Stage 4 — Insert:** Push each case to Supabase. Idempotent on `(casebook_id, title)` — re-runs skip duplicates.

**Throttling:** Groq free tier ~30 RPM. Pipeline runs serially with built-in 2s sleep between calls. Auto-pauses on rate-limit response and resumes after the cooldown.

**Observability:** Pipeline logs to `logs/ingest-<timestamp>.log` with per-stage status. A `casebooks` row tracks ingest state (`pending`, `downloading`, `parsing`, `complete`, `failed`).

## 9. Auth Flow

1. User clicks "Sign in with Google" → Supabase OAuth
2. On callback, server checks email against `email_allowlist`
3. If listed: session created, redirect to `/cases`
4. If not listed: signed out + shown a "Request access" page that emails Ash

## 10. UI Surfaces

- **`/cases`** — case browser. Filter chips (industry, type, difficulty, source). Search by title. Sort by recent / difficulty / unsolved-by-me.
- **`/solve/[caseId]`** — solve arena. Left: chat with interviewer. Right: cheat sheet (collapsible field cards). Top bar: case title, difficulty, elapsed timer. Bottom bar: "End session" button.
- **`/debrief/[sessionId]`** — score card (Structure/Insight/Speed bars), gap analysis bullets, ideal-structure tree overlay, transcript replay.
- **`/dashboard`** — last 10 sessions list, average score line chart, weak-spot pill cards (case types where avg < 65), session count + streak.
- **`/admin/allowlist`** — Ash-only page for adding cohort emails.

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Open casebook discovery yields < 1000 cases | Accept the gap — no synthetic fill (per Ash's rule). Update target post-day-1. |
| Groq rate limits stall ingestion | Throttle + auto-resume; multi-day timeline acceptable for case count > 300 |
| Scanned PDFs slow OCR | Deferred queue; OCR runs after text-extractable PDFs are done |
| Supabase free tier DB size | 1000 cases × ~10KB each = 10MB. Comfortable. PDFs go to local disk, not Supabase Storage. |
| Casebook copyright | Path A scoping (private cohort, no public hosting) is the mitigation. Don't expose direct PDF download endpoints. Provenance shown so users can verify source. |
| AI interviewer fabricates facts not in case | System prompt rule + post-response screening. If detected, regenerate. |

## 12. Phase Gates

Today's success criteria:
- App deployed and reachable at a Vercel preview URL
- Ash can sign in (email pre-allowlisted)
- ≥300 real cases in `cases` table with valid `provenance`
- One full happy-path solve session completes end-to-end (browse → solve → debrief)
- Ingestion pipeline still running, queued for the rest

48-hour target:
- ≥1000 cases in DB OR a documented cap (e.g., "open sources yielded 720; ceiling reached")

## 13. What Comes Next

Once approved, transition to `superpowers:writing-plans` to produce the step-by-step implementation plan, then execute (likely with parallel subagents — one for app build, one for ingestion pipeline build).
