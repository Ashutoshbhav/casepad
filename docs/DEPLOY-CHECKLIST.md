# CasePad — Deploy Checklist

Last updated: 2026-05-01.
Prepared for Ash to execute when returning from offline work.
Estimated time: 20-30 minutes total.

## Pre-flight (already done)

- [x] App working end-to-end locally (sign-in → cases → solve → debrief verified, score=45 written to DB)
- [x] Ingest regex fixed + safety guard for whole-document chunks
- [x] Corpus deduped (126 → 110 unique PDFs)
- [x] Ingest running in background (~75 min, 1,419 expected case rows)

## Step 1 — Push to GitHub (5 min)

The repo is local-only. Pick one:

**Option A — gh CLI (install first):**
```bash
winget install GitHub.cli   # one time
gh auth login               # browser flow
gh repo create casepad --private --source=. --remote=origin --push
```

**Option B — manual:**
1. Create empty repo at https://github.com/new (name: `casepad`, private)
2. Run in `C:\Users\Ashutosh Bhavale\Documents\casepad`:
   ```bash
   git remote add origin https://github.com/<your-user>/casepad.git
   git branch -M main
   git push -u origin main
   ```

## Step 2 — Vercel deploy (10 min)

1. Go to https://vercel.com/new — sign in with GitHub
2. Import `casepad` repo
3. **Framework preset:** Next.js (auto-detected)
4. **Environment variables** (paste these — values are in `.env.local`):

   | Key | Value source |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from .env.local |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from .env.local |
   | `SUPABASE_SERVICE_ROLE_KEY` | from .env.local |
   | `GROQ_API_KEY` | from .env.local |
   | `ADMIN_EMAIL` | from .env.local |
   | `NEXT_PUBLIC_SITE_URL` | **set this AFTER first deploy** to the assigned vercel domain (e.g. `https://casepad-xxx.vercel.app`) |

5. Deploy. First build ~3-4 min.
6. Note the assigned production URL (e.g. `casepad-ash.vercel.app`).
7. Go back to Vercel → Project → Settings → Environment Variables and update `NEXT_PUBLIC_SITE_URL` to the prod URL. Redeploy (Deployments → … → Redeploy).

## Step 3 — Supabase URL config (3 min)

Go to https://supabase.com/dashboard/project/cjanrluuqzyrpjtmuilc/auth/url-configuration

1. **Site URL** — change to the Vercel prod URL (or keep `http://localhost:3000` if you want both to work; Site URL is the default redirect, others are allowed via Redirect URLs).
2. **Redirect URLs** — add:
   - `https://<vercel-domain>/auth/callback`
   - `https://<vercel-domain>/**` (covers any post-auth landing)
   - Keep `http://localhost:3000/auth/callback` for local dev

Save.

## Step 4 — Smoke test prod (2 min)

1. Open `https://<vercel-domain>` in an incognito window
2. Sign in with your email — magic link should land at the Vercel URL (not localhost)
3. Browse `/cases` — should show all ingested cases
4. Open one, send a few chat turns, click End session
5. Confirm `/debrief/<id>` renders the score breakdown

## Step 5 — Cohort allowlist (5 min)

1. Sign in to prod as `ashutosh.25011@ssb.scaler.com` (the ADMIN_EMAIL from .env.local)
2. Go to `https://<vercel-domain>/admin/allowlist`
3. Add 2-3 friendly cohort emails first (close friends — for gut-check)
4. Share the URL with them
5. After their feedback, add the broader cohort

## Rollback

Deployment going sideways?
- **Bad code:** Vercel → Deployments → click previous green deploy → "Promote to Production"
- **Bad data in Supabase:** the ingest is idempotent on `(casebook_id, title)`. To wipe + re-ingest, run in Supabase SQL editor:
  ```sql
  delete from cases where casebook_id is not null;
  delete from casebooks;
  ```
  Then `npm run ingest:run:disk` again.
- **Worst case:** drop site, keep working locally, fix forward.
