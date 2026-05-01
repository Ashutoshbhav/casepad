# CasePad — Session State Snapshot

**Saved:** 2026-05-01 17:45 IST
**Trigger word:** `PAD` — say it in any new session to surface this state
**Project root:** `C:\Users\Ashutosh Bhavale\Documents\casepad`
**Latest commit:** `a1a3df7` (run `git log --oneline | head -5` to verify)

---

## Where we are RIGHT NOW

### ✅ App is working end-to-end locally
- Magic-link sign-in works (verified — Ash signed in successfully)
- `/cases` renders the seed case
- Solve arena chat works (Groq Llama 3.3-70b streams responses)
- Cheat sheet auto-fill works (after Realtime was enabled on `cheat_sheets` table via `alter publication supabase_realtime add table cheat_sheets;`)
- **End-session was broken (commit a1a3df7 fixed it) but NOT yet re-tested**

### ✅ Code complete (40+ commits)
- Plan A (App): 25/25 tasks complete
- Plan B (Ingestion): 11/11 tasks complete
- Tests: 24 passing across 9 files
- See `docs/superpowers/specs/2026-04-30-casepad-design.md` for design
- See `docs/superpowers/plans/` for implementation plans
- See `docs/ARCHITECTURE-AND-JOURNEY.md` for full architecture + UX walkthrough

### ✅ Sources research complete
- 6 parallel research agents found 131 verified casebook PDFs
- All 131 URLs in `scripts/ingest/sources.json` → `extra_pdf_urls`
- See `docs/research/SUMMARY.md` for full breakdown
- 126 of 131 PDFs already pre-downloaded to `casebooks/raw/` (444MB)

### ✅ Credentials configured
`.env.local` has:
- `NEXT_PUBLIC_SUPABASE_URL` (Supabase project: cjanrluuqzyrpjtmuilc)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- `ADMIN_EMAIL=ashutosh.25011@ssb.scaler.com`

### ✅ Supabase configured
- 3 migrations applied (schema, RLS, seed)
- Email auth enabled
- Site URL = http://localhost:3000
- Redirect URLs include http://localhost:3000/auth/callback
- Realtime enabled on `cheat_sheets` table

---

## ⚠️ CRITICAL pre-deploy items (devil's-advocate review surfaced these)

In priority order — DO NOT deploy until at least 1, 2, 3 are addressed:

1. **Verify the debrief loop works.** End-session was just fixed at `a1a3df7`. Need to:
   - Refresh solve arena page
   - Click "End session"
   - Confirm `/debrief/<sessionId>` renders score + bars + gaps + ideal structure
   - If error, dig into logs at `logs/dev.log`

2. **Regex fix for case extraction.** The PDF parser's case-header regex `/Case\s+\d+\s*[:\-—]/gi` only catches 31/126 PDFs. The other 91 (including IIMA Prep Book ~75 cases, ISB Casebook ~50 cases, XLRI CRUX ~40 cases) come back as 1 chunk = the live ingest will burn Groq credits producing useless single-row garbage. Inspect actual case headers in those PDFs (use `scripts/ingest/inspect-headers.ts <filename>`) and update the regex. Without this, ingest yields ~400 cases instead of ~1500.

3. **Production URL config.** Before Vercel deploy:
   - Add the production URL to Supabase → Authentication → URL Configuration → Redirect URLs (e.g., `https://casepad-xxx.vercel.app/auth/callback`)
   - Update Site URL too (or keep localhost for testing — depends if you want both to work)
   - Set `NEXT_PUBLIC_SITE_URL` in Vercel env to the prod URL

4. **Mobile responsiveness.** Solve arena split-pane is unusable on mobile. At minimum tell cohort "desktop only" before sharing. Real fix is a stacked layout below 800px.

5. **Quality gate on extracted cases.** No mechanism to flag bad extractions. First user solving "Case 1" with no problem statement will hit a wall. At minimum add a moderation pass or "report this case" button.

6. **No production backups.** Supabase free tier has no auto-backup. Run `pg_dump` periodically or accept the risk.

7. **Cohort validation.** Have you actually shown this design to anyone in your SSB cohort? Risk: ship to silence.

Full devil's-advocate review is preserved in conversation history (12 items total). Re-grill yourself by invoking `/devils-advocate` after restart.

---

## Outstanding workstreams (in dependency order)

### A. Verify debrief works (5 min, BLOCKING)
1. Refresh http://localhost:3000/solve/d0d124ab-33af-41d6-8482-dd1206e45a5a?session=53636830-8cb4-4481-89d1-203dd4a19447 (or start a new session)
2. Send a few chat turns
3. Click End session
4. Verify debrief loads with non-zero score

### B. Fix the chunk-splitter regex (~30 min, BLOCKING for ingest)
- Inspect 3-5 of the "one chunk" PDFs
- Improve regex in `scripts/ingest/parse.ts:CASE_HEADER_RE`
- Re-run `npm run audit:pdfs`
- Confirm chunks > 1 for the previously-broken PDFs

### C. Run ingestion (~2-3 hours wall-clock)
```bash
npm run ingest:run:disk
```
Processes all 126 PDFs in `casebooks/raw/`. Throttled to 25 Groq calls/min. Idempotent.

### D. Vercel deploy (~15-20 min)
1. Push code to GitHub (need to create repo first — currently local-only)
2. Connect Vercel to GitHub repo
3. Set all env vars in Vercel dashboard
4. Update Supabase Site URL + Redirect URLs to include prod
5. Smoke test: sign in, browse cases, solve, end session, debrief

### E. Cohort invite
- Add cohort emails via `/admin/allowlist` (logged in as ash@...)
- Share Vercel URL
- Onboard 2-3 friendly users first to gut-check before broader cohort

---

## Skills + hook setup (installed but needs restart to fully activate)

Installed at `~/.claude/skills/`:
- `grillme` (Jekudy) — deep socratic interview before building
- `grill-me` (RobMitt) — relentless decision-tree interrogation
- `grill-me-usirin` — depth-first decision tree
- `devils-advocate` (brandonsimpson) — adversarial critique of work
- `agent-review-panel` — multi-agent code review (`/roundtable`)
- `rubber-duck` — socratic debugging

Slash command at `~/.claude/commands/devils-advocate.md` (richiethomas's variant — has name collision with skill above).

Hook installed in `~/.claude/settings.json` → `UserPromptSubmit`:
- Script: `~/.claude/scripts/grill-router.sh`
- Behavior: classifies user message and tells Claude which skill to auto-invoke
  - design/scope/build → `grillme`
  - completion claims → `devils-advocate` BEFORE confirming
  - debugging → `rubber-duck`
  - code review → `roundtable`

**For full activation: restart Claude Code.** The hook + skills will be live from message 1 of the new session.

---

## Memory files in `~/.claude/projects/<sanitized-cwd>/memory/`

- `project_casepad.md` — main project memory
- `feedback_pad_trigger.md` — "PAD" trigger that surfaces this file
- `MEMORY.md` — index, includes both above

In the new session, just say **"PAD"** and Claude will surface this file and the project context.

---

## Commit log (most recent first)

Run `git log --oneline | head -20` in `C:\Users\Ashutosh Bhavale\Documents\casepad` to see all 40+ commits. Highlights:

- `a1a3df7` — fix(end-session): use evaluateSession helper directly (latest, not yet re-tested)
- `4b16486` — fix(eval): refactor evaluator into shared helper
- `57cad18` — fix(auth): callback handles both PKCE and OTP flows
- `41816d2` — feat(auth): switch sign-in to email magic link
- `571a212` — docs: architecture + user-journey reference
- `5708516` — feat(ingest): aggregate 131 verified casebook URLs
- `a5fd224` — feat(ingest): URL verifier script
- `41c2111` — fix(groq): lazy client init
- `7249bd2` — feat(ingest): --from-disk mode
- `4ab2c55` — fix(ingest): correct pdf-parse v2 import
- `03a117f` — chore: scaffold Next.js 16 project (T1 of Plan A)

---

## What to say in the new session

> "PAD"

Or more explicitly:
> "PAD — pick up CasePad where we left off. Read docs/SESSION-STATE.md."
