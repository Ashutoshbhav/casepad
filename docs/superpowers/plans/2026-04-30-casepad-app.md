# CasePad App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the cohort-gated CasePad web app — case browser, AI-powered solve arena with live cheat sheet, evaluator, and dashboard — wired to Supabase and Groq.

**Architecture:** Next.js 16 App Router with React Server Components for reads, Server Actions for mutations, and a streaming `/api/chat` route for the interviewer. Supabase Postgres (with RLS) for data, Supabase Auth (Google SSO) gated by an `email_allowlist` table. Groq Llama 3.1 70B for the interviewer/evaluator and 8B for cheat-sheet auto-fill. The ingestion pipeline (separate plan) writes cases into the same Supabase DB; this plan does NOT include ingestion.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Supabase JS v2, `@supabase/ssr`, `groq-sdk`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-30-casepad-design.md`

**Important constraints (from project memory):**
- Read Next.js 16 + React 19 docs from `node_modules` before relying on framework patterns — both ship breaking changes from training-data knowledge.
- No paid services. Groq + Supabase + Vercel free tiers only.
- No fabrication of cases or numbers; if a case has no `ideal_structure`, the evaluator should return a clear "insufficient data" rather than guess.

---

## Pre-flight

Before any task, the engineer must:

- [ ] **Read installed Next.js docs.** After Task 1's `npm install` completes, run:
  ```bash
  ls node_modules/next/dist/api-reference 2>/dev/null || ls node_modules/next/README.md
  cat node_modules/next/package.json | grep '"version"'
  ```
  Confirm Next.js is 16.x. Then read `node_modules/next/dist/build/templates/app-page.js` (or any installed README) to ground patterns in the actual installed version.

- [ ] **Verify Supabase project exists.** The user must provide:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GROQ_API_KEY`
  - `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` (configured in Supabase Auth dashboard)

  If absent, STOP and ask for them — do not proceed with placeholder keys.

---

## File Structure

```
casepad/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── .env.local.example
├── .env.local                 (gitignored)
├── .gitignore
├── middleware.ts              (Supabase auth + allowlist gate)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx           (landing → redirect by auth state)
│   │   ├── auth/
│   │   │   ├── signin/page.tsx
│   │   │   ├── callback/route.ts
│   │   │   └── no-access/page.tsx
│   │   ├── cases/
│   │   │   └── page.tsx       (case browser)
│   │   ├── solve/
│   │   │   └── [caseId]/page.tsx
│   │   ├── debrief/
│   │   │   └── [sessionId]/page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   └── allowlist/page.tsx
│   │   └── api/
│   │       ├── chat/route.ts          (streaming Groq interviewer)
│   │       ├── cheatsheet/route.ts    (auto-fill)
│   │       └── evaluate/route.ts      (post-session score)
│   ├── components/
│   │   ├── case-card.tsx
│   │   ├── case-filters.tsx
│   │   ├── chat-panel.tsx
│   │   ├── cheat-sheet-panel.tsx
│   │   ├── score-bar.tsx
│   │   ├── ideal-structure-tree.tsx
│   │   └── dashboard-charts.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts
│   │   │   ├── client.ts
│   │   │   └── admin.ts             (service-role client; server-only)
│   │   ├── groq/
│   │   │   ├── client.ts
│   │   │   ├── interviewer.ts
│   │   │   ├── cheatsheet.ts
│   │   │   └── evaluator.ts
│   │   ├── auth/
│   │   │   └── allowlist.ts
│   │   └── types/
│   │       ├── db.ts                (generated from Supabase)
│   │       └── domain.ts            (Case, Session, CheatSheet, ChatMessage)
│   └── server-actions/
│       ├── start-session.ts
│       ├── end-session.ts
│       └── update-cheatsheet.ts
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql
│       ├── 0002_rls_policies.sql
│       └── 0003_seed_admin.sql
├── tests/
│   ├── unit/
│   │   ├── groq/interviewer.test.ts
│   │   ├── groq/cheatsheet.test.ts
│   │   ├── groq/evaluator.test.ts
│   │   ├── auth/allowlist.test.ts
│   │   └── fixtures/
│   │       └── sample-case.json
│   └── e2e/
│       └── solve-flow.spec.ts
└── docs/
    ├── superpowers/specs/2026-04-30-casepad-design.md
    └── superpowers/plans/2026-04-30-casepad-app.md
```

---

## Task 1: Initialize Next.js project + dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env.local.example`

- [ ] **Step 1: Scaffold Next.js**

In `C:\Users\Ashutosh Bhavale\Documents\casepad`, run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --turbopack --import-alias "@/*" --no-git --use-npm --yes
```

Expected: project files generated. The git repo at the root (already `git init`d) is preserved because `--no-git`.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr groq-sdk zod
```

Expected: clean install, no peer warnings of substance.

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @types/react @types/react-dom playwright @playwright/test
npx playwright install chromium
```

Expected: Vitest and Playwright available. Chromium downloaded.

- [ ] **Step 4: Write `.env.local.example`**

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_EMAIL=
```

Copy to `.env.local` and ask the user to fill values.

- [ ] **Step 5: Update `.gitignore`** — add:
```
.env.local
casebooks/raw/
logs/
.next/
node_modules/
playwright-report/
test-results/
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts .env.local.example .gitignore src tailwind.config.ts postcss.config.mjs eslint.config.mjs
git commit -m "chore: scaffold Next.js 16 project with deps"
```

---

## Task 2: Configure Vitest + Playwright

**Files:**
- Create: `vitest.config.ts`, `playwright.config.ts`, `tests/setup.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 2: Write `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Write `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 4: Add npm scripts to `package.json`**

In the `"scripts"` block, add:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 5: Verify Vitest can run an empty suite**

Create `tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
describe('smoke', () => { it('runs', () => expect(1).toBe(1)); });
```

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts playwright.config.ts tests/ package.json
git commit -m "test: configure Vitest + Playwright"
```

---

## Task 3: Supabase schema migration

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`

- [ ] **Step 1: Write the schema**

```sql
-- supabase/migrations/0001_initial_schema.sql

create extension if not exists "pgcrypto";

create type case_industry as enum (
  'consulting', 'fmcg', 'tech', 'healthcare', 'finance',
  'infra', 'energy', 'retail', 'other'
);
create type case_type_enum as enum (
  'market_entry', 'profitability', 'mna', 'pricing',
  'operations', 'gtm', 'estimation', 'other'
);
create type case_difficulty as enum ('easy', 'medium', 'hard', 'expert');
create type session_status as enum ('in_progress', 'completed', 'abandoned');

create table casebooks (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  year int,
  title text not null,
  source_url text,
  local_path text,
  case_count int not null default 0,
  ingested_at timestamptz default now()
);

create table cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  industry case_industry not null default 'other',
  case_type case_type_enum not null default 'other',
  difficulty case_difficulty not null default 'medium',
  source text,
  casebook_id uuid references casebooks(id) on delete set null,
  problem_statement text not null,
  interviewer_notes jsonb not null default '[]'::jsonb,
  ideal_structure jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index cases_industry_idx on cases (industry);
create index cases_case_type_idx on cases (case_type);
create index cases_difficulty_idx on cases (difficulty);
create index cases_title_trgm on cases using gin (title gin_trgm_ops);
create extension if not exists pg_trgm;

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  case_id uuid references cases(id) on delete cascade not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  transcript jsonb not null default '[]'::jsonb,
  score int,
  score_breakdown jsonb,
  status session_status not null default 'in_progress'
);
create index sessions_user_idx on sessions (user_id);
create index sessions_case_idx on sessions (case_id);

create table cheat_sheets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade unique not null,
  framework text,
  hypothesis text,
  key_numbers jsonb not null default '[]'::jsonb,
  decisions text[] not null default '{}',
  next_steps text[] not null default '{}',
  manual_notes text,
  locked_fields text[] not null default '{}',
  last_updated timestamptz default now()
);

create table email_allowlist (
  email text primary key,
  added_by text,
  added_at timestamptz default now()
);
```

- [ ] **Step 2: Apply via Supabase SQL editor**

Open the Supabase project's SQL editor in the dashboard. Paste the contents of `0001_initial_schema.sql` and run.
Expected: All `CREATE` statements succeed.

- [ ] **Step 3: Verify**

Run in Supabase SQL editor: `select table_name from information_schema.tables where table_schema='public';`
Expected: `cases`, `sessions`, `cheat_sheets`, `casebooks`, `email_allowlist` listed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_initial_schema.sql
git commit -m "feat(db): initial schema for cases, sessions, cheat sheets, allowlist"
```

---

## Task 4: RLS policies

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`

- [ ] **Step 1: Write policies**

```sql
-- supabase/migrations/0002_rls_policies.sql

alter table cases enable row level security;
alter table sessions enable row level security;
alter table cheat_sheets enable row level security;
alter table casebooks enable row level security;
alter table email_allowlist enable row level security;

-- Cases: any authenticated user can read; only service role writes (ingestion pipeline)
create policy "cases_read_authenticated"
  on cases for select
  to authenticated
  using (true);

-- Casebooks: any authenticated user can read
create policy "casebooks_read_authenticated"
  on casebooks for select
  to authenticated
  using (true);

-- Sessions: a user sees only their own sessions
create policy "sessions_select_own"
  on sessions for select
  to authenticated
  using (auth.uid() = user_id);
create policy "sessions_insert_own"
  on sessions for insert
  to authenticated
  with check (auth.uid() = user_id);
create policy "sessions_update_own"
  on sessions for update
  to authenticated
  using (auth.uid() = user_id);

-- Cheat sheets: only the session owner
create policy "cheat_sheets_select_own"
  on cheat_sheets for select
  to authenticated
  using (
    exists (select 1 from sessions s where s.id = cheat_sheets.session_id and s.user_id = auth.uid())
  );
create policy "cheat_sheets_modify_own"
  on cheat_sheets for all
  to authenticated
  using (
    exists (select 1 from sessions s where s.id = cheat_sheets.session_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from sessions s where s.id = cheat_sheets.session_id and s.user_id = auth.uid())
  );

-- Email allowlist: only readable by service role; writable by service role only.
-- (No policies needed; RLS enabled with no policies = denied for anon/authenticated.)
```

- [ ] **Step 2: Apply via Supabase SQL editor**

Paste and run the contents of `0002_rls_policies.sql`.
Expected: All `CREATE POLICY` statements succeed.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_rls_policies.sql
git commit -m "feat(db): add RLS policies for cases, sessions, cheat sheets"
```

---

## Task 5: Seed admin allowlist + a sample case

**Files:**
- Create: `supabase/migrations/0003_seed_admin.sql`

- [ ] **Step 1: Write seed**

The user should replace `ash@example.com` with their actual email before applying. Show this in a comment.

```sql
-- supabase/migrations/0003_seed_admin.sql
-- IMPORTANT: replace 'ash@example.com' with your real email before running.

insert into email_allowlist (email, added_by)
values ('ash@example.com', 'system')
on conflict (email) do nothing;

insert into cases (title, industry, case_type, difficulty, source, problem_statement, interviewer_notes, ideal_structure)
values (
  'Cement plant entry — India (sample)',
  'infra',
  'market_entry',
  'medium',
  'CasePad sample',
  'Our client is a global cement major considering entry into the Indian market. They want to know if they should enter, and if so, how. The cement market in India is large and growing but highly fragmented. The client is open to greenfield, brownfield, or partnership.',
  '[
    {"trigger_keywords": ["market size", "demand", "tonnage"], "reveal_text": "India consumes ~380 MT of cement annually, growing at ~6% CAGR. Top 5 players hold ~50% share."},
    {"trigger_keywords": ["competition", "players", "rivals"], "reveal_text": "Top players: UltraTech (~25%), Shree Cement, Ambuja, ACC, Dalmia. Tier-2 regional players hold the rest."},
    {"trigger_keywords": ["cost structure", "input", "limestone"], "reveal_text": "Limestone is the largest cost. Eastern and southern India have abundant deposits; western India is constrained."},
    {"trigger_keywords": ["client capabilities", "advantages"], "reveal_text": "The client has world-leading kiln efficiency tech and a strong balance sheet."}
  ]'::jsonb,
  '{
    "framework": "Market Entry",
    "branches": [
      {"node": "Market attractiveness", "subnodes": ["Size & growth", "Profitability", "Regulation"]},
      {"node": "Client fit", "subnodes": ["Capabilities", "Cost position", "Brand"]},
      {"node": "Entry mode", "subnodes": ["Greenfield", "Brownfield", "Partnership", "Acquisition"]},
      {"node": "Risks", "subnodes": ["Capacity overhang", "Regulation", "Limestone access"]}
    ],
    "key_insights": [
      "Tech advantage matters most where cost competition is fiercest",
      "Limestone access dictates plant location",
      "Acquisition of a regional player may beat greenfield on time-to-market"
    ]
  }'::jsonb
)
on conflict do nothing;
```

- [ ] **Step 2: Apply via Supabase SQL editor (after editing email)**

Tell user: "Replace `ash@example.com` with your email, then paste and run."

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_seed_admin.sql
git commit -m "feat(db): seed admin allowlist + one sample case"
```

---

## Task 6: Supabase clients (server, browser, admin)

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/admin.ts`

- [ ] **Step 1: Server client**

`src/lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware refreshes the session.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 2: Browser client**

`src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: Admin client (service role; server-only)**

`src/lib/supabase/admin.ts`:
```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat(supabase): add server, browser, admin clients"
```

---

## Task 7: Allowlist gate (TDD)

**Files:**
- Create: `src/lib/auth/allowlist.ts`, `tests/unit/auth/allowlist.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/auth/allowlist.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { isEmailAllowed } from '@/lib/auth/allowlist';

describe('isEmailAllowed', () => {
  it('returns true when the email is in the allowlist', async () => {
    const fakeAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { email: 'ash@x.com' }, error: null }),
          }),
        }),
      }),
    };
    expect(await isEmailAllowed(fakeAdmin as any, 'ash@x.com')).toBe(true);
  });

  it('returns false when the email is not in the allowlist', async () => {
    const fakeAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    };
    expect(await isEmailAllowed(fakeAdmin as any, 'stranger@x.com')).toBe(false);
  });

  it('throws when the DB returns an error', async () => {
    const fakeAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: null, error: { message: 'boom' } }),
          }),
        }),
      }),
    };
    await expect(isEmailAllowed(fakeAdmin as any, 'a@b.com')).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- allowlist`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/auth/allowlist.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function isEmailAllowed(
  admin: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data, error } = await admin
    .from('email_allowlist')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- allowlist`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/allowlist.ts tests/unit/auth/allowlist.test.ts
git commit -m "feat(auth): allowlist check with tests"
```

---

## Task 8: Auth middleware + sign-in page

**Files:**
- Create: `middleware.ts`, `src/app/auth/signin/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/auth/no-access/page.tsx`

- [ ] **Step 1: Write `middleware.ts`**

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic =
    path.startsWith('/auth') ||
    path === '/' ||
    path.startsWith('/_next') ||
    path.startsWith('/api/auth');

  if (!user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/signin';
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Sign-in page**

`src/app/auth/signin/page.tsx`:
```tsx
'use client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignInPage() {
  const supabase = createSupabaseBrowserClient();
  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <h1 className="text-3xl font-semibold">CasePad</h1>
        <p className="text-zinc-400">Cohort access. Sign in with the email on the allowlist.</p>
        <button
          onClick={handleGoogle}
          className="w-full rounded-md bg-white text-zinc-900 py-2 font-medium hover:bg-zinc-200 transition"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: OAuth callback route (allowlist enforcement)**

`src/app/auth/callback/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isEmailAllowed } from '@/lib/auth/allowlist';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/auth/signin', req.url));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  const admin = createSupabaseAdminClient();
  const allowed = await isEmailAllowed(admin, data.user.email);
  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/auth/no-access', req.url));
  }
  return NextResponse.redirect(new URL('/cases', req.url));
}
```

- [ ] **Step 4: No-access page**

`src/app/auth/no-access/page.tsx`:
```tsx
export default function NoAccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-semibold">Access not granted</h1>
        <p className="text-zinc-400">Your email is not on the CasePad cohort allowlist. Ask Ash to add you.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Smoke test — visit signin**

Run: `npm run dev` in one terminal, then in another:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/auth/signin
```
Expected: `200`.

- [ ] **Step 6: Commit**

```bash
git add middleware.ts src/app/auth
git commit -m "feat(auth): Google SSO + allowlist gate via middleware"
```

---

## Task 9: Domain types

**Files:**
- Create: `src/lib/types/domain.ts`

- [ ] **Step 1: Write types**

```ts
// src/lib/types/domain.ts

export type CaseIndustry =
  | 'consulting' | 'fmcg' | 'tech' | 'healthcare'
  | 'finance' | 'infra' | 'energy' | 'retail' | 'other';

export type CaseTypeEnum =
  | 'market_entry' | 'profitability' | 'mna' | 'pricing'
  | 'operations' | 'gtm' | 'estimation' | 'other';

export type CaseDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface InterviewerNote {
  trigger_keywords: string[];
  reveal_text: string;
}

export interface IdealStructureBranch {
  node: string;
  subnodes?: string[];
}

export interface IdealStructure {
  framework?: string;
  branches?: IdealStructureBranch[];
  key_insights?: string[];
}

export interface CaseRow {
  id: string;
  title: string;
  industry: CaseIndustry;
  case_type: CaseTypeEnum;
  difficulty: CaseDifficulty;
  source: string | null;
  casebook_id: string | null;
  problem_statement: string;
  interviewer_notes: InterviewerNote[];
  ideal_structure: IdealStructure;
  tags: string[];
  provenance: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'interviewer';
  content: string;
  timestamp: string;
}

export interface CheatSheetState {
  framework: string | null;
  hypothesis: string | null;
  key_numbers: { label: string; value: string; unit?: string }[];
  decisions: string[];
  next_steps: string[];
  manual_notes: string | null;
  locked_fields: string[];
}

export interface ScoreBreakdown {
  structure: number;
  insight: number;
  speed: number;
  total: number;
  gaps: string[];
  strengths: string[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types/domain.ts
git commit -m "feat(types): domain types"
```

---

## Task 10: Groq client

**Files:**
- Create: `src/lib/groq/client.ts`

- [ ] **Step 1: Write client**

```ts
// src/lib/groq/client.ts
import 'server-only';
import Groq from 'groq-sdk';

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export const MODEL_LARGE = 'llama-3.1-70b-versatile';
export const MODEL_SMALL = 'llama-3.1-8b-instant';
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/groq/client.ts
git commit -m "feat(groq): client + model constants"
```

---

## Task 11: Interviewer prompt builder (TDD)

**Files:**
- Create: `src/lib/groq/interviewer.ts`, `tests/unit/groq/interviewer.test.ts`, `tests/unit/fixtures/sample-case.json`

- [ ] **Step 1: Sample case fixture**

`tests/unit/fixtures/sample-case.json`:
```json
{
  "title": "Cement plant entry — India",
  "problem_statement": "A global cement major is considering entry into India.",
  "interviewer_notes": [
    {
      "trigger_keywords": ["market size", "demand"],
      "reveal_text": "India consumes ~380 MT/year, growing at ~6%."
    },
    {
      "trigger_keywords": ["competition", "players"],
      "reveal_text": "Top 5 players hold ~50% share."
    }
  ]
}
```

- [ ] **Step 2: Write the failing test**

`tests/unit/groq/interviewer.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildInterviewerMessages } from '@/lib/groq/interviewer';
import sampleCase from '../fixtures/sample-case.json';

describe('buildInterviewerMessages', () => {
  it('includes problem statement and gated reveal notes in the system prompt', () => {
    const msgs = buildInterviewerMessages(
      sampleCase as any,
      [],
      [{ role: 'user', content: 'Hello, can I start?', timestamp: '' }]
    );
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('A global cement major');
    expect(msgs[0].content).toContain('REVEAL NOTES');
    expect(msgs[0].content).toContain('India consumes ~380 MT/year');
    expect(msgs[0].content).toContain('do NOT proactively share');
  });

  it('includes the disclosure log so already-revealed items are tracked', () => {
    const msgs = buildInterviewerMessages(
      sampleCase as any,
      ['India consumes ~380 MT/year, growing at ~6%.'],
      []
    );
    expect(msgs[0].content).toContain('ALREADY DISCLOSED');
    expect(msgs[0].content).toContain('India consumes ~380 MT/year');
  });

  it('appends the recent transcript turns as alternating user/assistant messages', () => {
    const msgs = buildInterviewerMessages(
      sampleCase as any,
      [],
      [
        { role: 'user', content: 'What is the market size?', timestamp: '' },
        { role: 'interviewer', content: '~380 MT/year.', timestamp: '' },
        { role: 'user', content: 'Who are the players?', timestamp: '' },
      ]
    );
    expect(msgs.length).toBe(4);
    expect(msgs[1]).toMatchObject({ role: 'user', content: 'What is the market size?' });
    expect(msgs[2]).toMatchObject({ role: 'assistant', content: '~380 MT/year.' });
    expect(msgs[3]).toMatchObject({ role: 'user', content: 'Who are the players?' });
  });

  it('limits transcript to last 10 turns', () => {
    const turns = Array.from({ length: 14 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'interviewer') as const,
      content: `turn ${i}`,
      timestamp: '',
    }));
    const msgs = buildInterviewerMessages(sampleCase as any, [], turns);
    expect(msgs.length).toBe(11); // 1 system + 10 turns
  });
});
```

- [ ] **Step 3: Run, expect failure**

Run: `npm test -- interviewer`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

`src/lib/groq/interviewer.ts`:
```ts
import 'server-only';
import type { CaseRow, ChatMessage } from '@/lib/types/domain';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildInterviewerMessages(
  caseRow: Pick<CaseRow, 'problem_statement' | 'interviewer_notes' | 'title'>,
  alreadyDisclosed: string[],
  transcript: ChatMessage[]
): Msg[] {
  const notesBlock = (caseRow.interviewer_notes || [])
    .map((n, i) => `${i + 1}. triggers: [${n.trigger_keywords.join(', ')}]\n   reveal: ${n.reveal_text}`)
    .join('\n');
  const disclosedBlock = alreadyDisclosed.length
    ? alreadyDisclosed.map((d, i) => `${i + 1}. ${d}`).join('\n')
    : '(none yet)';

  const system = `You are a consulting interviewer running a case study with a candidate.

CASE: ${caseRow.title}

PROBLEM STATEMENT (always known to you):
${caseRow.problem_statement}

REVEAL NOTES (you know these; do NOT proactively share — only reveal a note when the candidate's question semantically matches its trigger keywords):
${notesBlock}

ALREADY DISCLOSED (do not repeat):
${disclosedBlock}

RULES:
- Stay in character as a neutral, concise consulting interviewer.
- Never invent facts that are not in the problem statement or reveal notes. If asked something not covered, say "I don't have data on that — what would you assume and why?"
- If the candidate has gone 3+ turns without a clarifying question or structure, gently nudge them ("Want to walk me through your structure so far?").
- Do not lead the candidate. Do not give hints unless they are explicitly stuck.
- Keep responses under 80 words.`;

  const recent = transcript.slice(-10).map((t) => ({
    role: (t.role === 'interviewer' ? 'assistant' : 'user') as const,
    content: t.content,
  }));

  return [{ role: 'system', content: system }, ...recent];
}
```

- [ ] **Step 5: Run, expect pass**

Run: `npm test -- interviewer`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/groq/interviewer.ts tests/unit/groq/interviewer.test.ts tests/unit/fixtures/sample-case.json
git commit -m "feat(groq): interviewer message builder with reveal-gated prompt"
```

---

## Task 12: /api/chat streaming endpoint

**Files:**
- Create: `src/app/api/chat/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { groq, MODEL_LARGE } from '@/lib/groq/client';
import { buildInterviewerMessages } from '@/lib/groq/interviewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json() as { sessionId: string };
  const supabase = await createSupabaseServerClient();
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('id, transcript, case_id, user_id')
    .eq('id', sessionId)
    .single();
  if (sErr || !session) return new Response('session not found', { status: 404 });

  const { data: caseRow, error: cErr } = await supabase
    .from('cases')
    .select('title, problem_statement, interviewer_notes')
    .eq('id', session.case_id)
    .single();
  if (cErr || !caseRow) return new Response('case not found', { status: 404 });

  const transcript = session.transcript as { role: string; content: string; timestamp: string }[];
  const disclosed = transcript
    .filter((t) => t.role === 'interviewer')
    .map((t) => t.content);

  const messages = buildInterviewerMessages(caseRow as any, disclosed, transcript as any);

  const stream = await groq.chat.completions.create({
    model: MODEL_LARGE,
    messages: messages as any,
    stream: true,
    max_tokens: 300,
    temperature: 0.4,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let full = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          controller.enqueue(encoder.encode(delta));
        }
      }

      // Append the interviewer turn to the transcript when complete
      const newTranscript = [
        ...transcript,
        { role: 'interviewer', content: full, timestamp: new Date().toISOString() },
      ];
      await supabase
        .from('sessions')
        .update({ transcript: newTranscript })
        .eq('id', sessionId);
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

- [ ] **Step 2: Smoke check (will be exercised end-to-end in Task 22)**

No standalone test now — covered by E2E. Skip to commit.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(api): streaming /api/chat endpoint"
```

---

## Task 13: Cheat-sheet auto-fill (TDD)

**Files:**
- Create: `src/lib/groq/cheatsheet.ts`, `tests/unit/groq/cheatsheet.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildCheatSheetExtractionMessages } from '@/lib/groq/cheatsheet';

describe('buildCheatSheetExtractionMessages', () => {
  it('returns a system prompt instructing JSON-only output with the expected schema', () => {
    const msgs = buildCheatSheetExtractionMessages(
      'How big is the market?',
      'India consumes ~380 MT/year, growing at ~6%.',
      { framework: null, hypothesis: null, key_numbers: [], decisions: [], next_steps: [], manual_notes: null, locked_fields: [] }
    );
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('JSON only');
    expect(msgs[0].content).toContain('framework');
    expect(msgs[0].content).toContain('hypothesis');
    expect(msgs[0].content).toContain('key_numbers');
    expect(msgs[0].content).toContain('locked_fields');
  });

  it('includes the latest exchange in the user message', () => {
    const msgs = buildCheatSheetExtractionMessages(
      'How big is the market?',
      'India consumes ~380 MT/year.',
      { framework: null, hypothesis: null, key_numbers: [], decisions: [], next_steps: [], manual_notes: null, locked_fields: [] }
    );
    expect(msgs[1].role).toBe('user');
    expect(msgs[1].content).toContain('How big is the market?');
    expect(msgs[1].content).toContain('India consumes ~380 MT/year.');
  });

  it('includes locked field names in the system prompt so the model preserves them', () => {
    const msgs = buildCheatSheetExtractionMessages(
      'q',
      'a',
      { framework: 'Profit Tree', hypothesis: null, key_numbers: [], decisions: [], next_steps: [], manual_notes: null, locked_fields: ['framework'] }
    );
    expect(msgs[0].content).toContain('LOCKED FIELDS');
    expect(msgs[0].content).toContain('framework');
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- cheatsheet`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/lib/groq/cheatsheet.ts`:
```ts
import 'server-only';
import type { CheatSheetState } from '@/lib/types/domain';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildCheatSheetExtractionMessages(
  userQuestion: string,
  interviewerAnswer: string,
  current: CheatSheetState
): Msg[] {
  const lockedList = current.locked_fields.length
    ? current.locked_fields.join(', ')
    : '(none)';
  const system = `You update a structured cheat sheet for a consulting case in progress.

Output JSON only. Schema:
{
  "framework": string | null,
  "hypothesis": string | null,
  "key_numbers": [{ "label": string, "value": string, "unit": string | null }],
  "decisions": string[],
  "next_steps": string[]
}

Rules:
- Only update fields that the latest exchange clearly informs.
- Do NOT invent numbers — only extract them if present in the exchange.
- LOCKED FIELDS (do NOT modify these — leave the value identical to the current state): ${lockedList}
- Merge with the current state intelligently. For arrays, append new items rather than replacing.
- If nothing in the exchange is relevant, return the current state unchanged.`;

  const user = `CURRENT CHEAT SHEET:
${JSON.stringify(current, null, 2)}

LATEST EXCHANGE:
Q: ${userQuestion}
A: ${interviewerAnswer}

Return the updated cheat sheet JSON.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- cheatsheet`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/groq/cheatsheet.ts tests/unit/groq/cheatsheet.test.ts
git commit -m "feat(groq): cheat-sheet extraction prompt with TDD"
```

---

## Task 14: /api/cheatsheet endpoint

**Files:**
- Create: `src/app/api/cheatsheet/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/cheatsheet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { groq, MODEL_SMALL } from '@/lib/groq/client';
import { buildCheatSheetExtractionMessages } from '@/lib/groq/cheatsheet';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CheatSheetState } from '@/lib/types/domain';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { sessionId, userQuestion, interviewerAnswer } = (await req.json()) as {
    sessionId: string;
    userQuestion: string;
    interviewerAnswer: string;
  };
  const supabase = await createSupabaseServerClient();

  // Fetch current cheat sheet
  const { data: existing } = await supabase
    .from('cheat_sheets')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  const current: CheatSheetState = existing
    ? {
        framework: existing.framework,
        hypothesis: existing.hypothesis,
        key_numbers: existing.key_numbers,
        decisions: existing.decisions,
        next_steps: existing.next_steps,
        manual_notes: existing.manual_notes,
        locked_fields: existing.locked_fields,
      }
    : {
        framework: null,
        hypothesis: null,
        key_numbers: [],
        decisions: [],
        next_steps: [],
        manual_notes: null,
        locked_fields: [],
      };

  const messages = buildCheatSheetExtractionMessages(userQuestion, interviewerAnswer, current);
  const completion = await groq.chat.completions.create({
    model: MODEL_SMALL,
    messages: messages as any,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 600,
  });

  let parsed: Partial<CheatSheetState> = {};
  try {
    parsed = JSON.parse(completion.choices[0].message.content || '{}');
  } catch {
    return NextResponse.json({ error: 'invalid json from model' }, { status: 502 });
  }

  // Merge while respecting locked fields
  const merged: CheatSheetState = {
    framework: current.locked_fields.includes('framework')
      ? current.framework
      : (parsed.framework ?? current.framework),
    hypothesis: current.locked_fields.includes('hypothesis')
      ? current.hypothesis
      : (parsed.hypothesis ?? current.hypothesis),
    key_numbers: parsed.key_numbers ?? current.key_numbers,
    decisions: parsed.decisions ?? current.decisions,
    next_steps: parsed.next_steps ?? current.next_steps,
    manual_notes: current.manual_notes,
    locked_fields: current.locked_fields,
  };

  if (existing) {
    await supabase
      .from('cheat_sheets')
      .update({ ...merged, last_updated: new Date().toISOString() })
      .eq('session_id', sessionId);
  } else {
    await supabase
      .from('cheat_sheets')
      .insert({ session_id: sessionId, ...merged });
  }

  return NextResponse.json(merged);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cheatsheet/route.ts
git commit -m "feat(api): /api/cheatsheet auto-fill endpoint"
```

---

## Task 15: Evaluator prompt (TDD)

**Files:**
- Create: `src/lib/groq/evaluator.ts`, `tests/unit/groq/evaluator.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { buildEvaluatorMessages } from '@/lib/groq/evaluator';

describe('buildEvaluatorMessages', () => {
  it('asks for JSON with structure/insight/speed scores summing to 100', () => {
    const msgs = buildEvaluatorMessages(
      [
        { role: 'user', content: 'Should we enter?', timestamp: '' },
        { role: 'interviewer', content: 'Tell me how you would approach this.', timestamp: '' },
      ] as any,
      { framework: 'Market Entry', branches: [{ node: 'Market attractiveness' }] } as any,
      { framework: 'Market Entry', hypothesis: 'Yes, attractive market', key_numbers: [], decisions: [], next_steps: [], manual_notes: null, locked_fields: [] } as any,
      8 * 60
    );
    expect(msgs[0].content).toContain('Structure');
    expect(msgs[0].content).toContain('Insight');
    expect(msgs[0].content).toContain('Speed');
    expect(msgs[0].content).toContain('total = structure + insight + speed');
    expect(msgs[0].content).toContain('"gaps"');
    expect(msgs[0].content).toContain('"strengths"');
  });

  it('includes the elapsed time and benchmark window', () => {
    const msgs = buildEvaluatorMessages([], {} as any, {} as any, 25 * 60);
    expect(msgs[1].content).toContain('Elapsed: 25 min');
  });

  it('returns insufficient-data instruction when ideal_structure is empty', () => {
    const msgs = buildEvaluatorMessages([], {} as any, {} as any, 0);
    expect(msgs[0].content).toContain('insufficient_data');
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- evaluator`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/groq/evaluator.ts
import 'server-only';
import type { ChatMessage, IdealStructure, CheatSheetState } from '@/lib/types/domain';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildEvaluatorMessages(
  transcript: ChatMessage[],
  ideal: IdealStructure,
  cheatSheet: CheatSheetState,
  elapsedSeconds: number
): Msg[] {
  const elapsedMin = Math.round(elapsedSeconds / 60);
  const idealJson = JSON.stringify(ideal, null, 2);
  const isEmpty =
    !ideal || (!ideal.framework && !(ideal.branches?.length ?? 0));

  const system = `You evaluate a consulting case interview transcript against an ideal structure.

Score on three dimensions:
- Structure (0-40): Did the candidate use the right framework? Were the key branches covered?
- Insight (0-40): Were hypotheses well-formed? Did they connect data to conclusions?
- Speed (0-20): Time taken vs benchmark. Easy=15min, Medium=25min, Hard=35min, Expert=45min. 20pt if at or under benchmark, scaled down to 5pt at 2x benchmark.

Return JSON only:
{
  "structure": int,
  "insight": int,
  "speed": int,
  "total": int,            // total = structure + insight + speed
  "gaps": string[],        // 3-6 specific things the candidate missed or did poorly
  "strengths": string[],   // 2-4 things they did well
  "insufficient_data": boolean   // true if the ideal structure is empty and you cannot fairly score Structure/Insight
}

If insufficient_data is true, set structure=0, insight=0, total=speed, and explain in gaps.`;

  const user = `IDEAL STRUCTURE:
${idealJson}

FINAL CHEAT SHEET:
${JSON.stringify(cheatSheet, null, 2)}

TRANSCRIPT (${transcript.length} turns):
${transcript.map((t) => `${t.role.toUpperCase()}: ${t.content}`).join('\n')}

Elapsed: ${elapsedMin} min

Score this case. JSON only.`;

  return [
    { role: 'system', content: system + (isEmpty ? '\nNote: ideal_structure is empty. Set insufficient_data=true.' : '') },
    { role: 'user', content: user },
  ];
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npm test -- evaluator`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/groq/evaluator.ts tests/unit/groq/evaluator.test.ts
git commit -m "feat(groq): evaluator prompt with TDD"
```

---

## Task 16: /api/evaluate endpoint

**Files:**
- Create: `src/app/api/evaluate/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/evaluate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { groq, MODEL_LARGE } from '@/lib/groq/client';
import { buildEvaluatorMessages } from '@/lib/groq/evaluator';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { sessionId } = (await req.json()) as { sessionId: string };
  const supabase = await createSupabaseServerClient();

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 });

  const { data: caseRow } = await supabase
    .from('cases')
    .select('ideal_structure')
    .eq('id', session.case_id)
    .single();

  const { data: cheatSheet } = await supabase
    .from('cheat_sheets')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  const startMs = new Date(session.started_at).getTime();
  const elapsedSec = Math.round((Date.now() - startMs) / 1000);

  const messages = buildEvaluatorMessages(
    session.transcript as any,
    (caseRow?.ideal_structure ?? {}) as any,
    (cheatSheet ?? {
      framework: null, hypothesis: null, key_numbers: [],
      decisions: [], next_steps: [], manual_notes: null, locked_fields: [],
    }) as any,
    elapsedSec
  );

  const completion = await groq.chat.completions.create({
    model: MODEL_LARGE,
    messages: messages as any,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 800,
  });

  let breakdown: any;
  try {
    breakdown = JSON.parse(completion.choices[0].message.content || '{}');
  } catch {
    return NextResponse.json({ error: 'invalid evaluator output' }, { status: 502 });
  }

  await supabase
    .from('sessions')
    .update({
      score: breakdown.total ?? 0,
      score_breakdown: breakdown,
      ended_at: new Date().toISOString(),
      status: 'completed',
    })
    .eq('id', sessionId);

  return NextResponse.json(breakdown);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/evaluate/route.ts
git commit -m "feat(api): /api/evaluate endpoint"
```

---

## Task 17: Server actions for session lifecycle

**Files:**
- Create: `src/server-actions/start-session.ts`, `src/server-actions/end-session.ts`, `src/server-actions/update-cheatsheet.ts`

- [ ] **Step 1: start-session**

```ts
// src/server-actions/start-session.ts
'use server';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function startSession(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: user.id, case_id: caseId, transcript: [] })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message || 'failed to start session');

  await supabase.from('cheat_sheets').insert({ session_id: data.id });
  redirect(`/solve/${caseId}?session=${data.id}`);
}
```

- [ ] **Step 2: end-session**

```ts
// src/server-actions/end-session.ts
'use server';
import { redirect } from 'next/navigation';

export async function endSession(sessionId: string) {
  // Trigger evaluator via fetch to /api/evaluate
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: '' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error('evaluate failed');
  redirect(`/debrief/${sessionId}`);
}
```

- [ ] **Step 3: update-cheatsheet (manual edits)**

```ts
// src/server-actions/update-cheatsheet.ts
'use server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function updateCheatSheetField(
  sessionId: string,
  field: 'framework' | 'hypothesis' | 'manual_notes',
  value: string,
  lock: boolean
) {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('cheat_sheets')
    .select('locked_fields')
    .eq('session_id', sessionId)
    .single();
  const lockedFields = new Set(existing?.locked_fields ?? []);
  if (lock) lockedFields.add(field); else lockedFields.delete(field);

  await supabase
    .from('cheat_sheets')
    .update({
      [field]: value,
      locked_fields: Array.from(lockedFields),
      last_updated: new Date().toISOString(),
    })
    .eq('session_id', sessionId);
  revalidatePath(`/solve/[caseId]`, 'page');
}
```

- [ ] **Step 4: Commit**

```bash
git add src/server-actions
git commit -m "feat(actions): session start/end + cheat sheet update"
```

---

## Task 18: Layout + landing page

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

- [ ] **Step 1: Replace `globals.css`**

```css
@import 'tailwindcss';

:root {
  color-scheme: dark;
}
html, body {
  background: #09090b;
  color: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

- [ ] **Step 2: Replace `layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CasePad',
  description: 'Cohort case interview practice',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Replace `page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/cases');
  redirect('/auth/signin');
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/app/page.tsx
git commit -m "feat(ui): root layout + auth-aware landing redirect"
```

---

## Task 19: Case browser page

**Files:**
- Create: `src/app/cases/page.tsx`, `src/components/case-card.tsx`, `src/components/case-filters.tsx`

- [ ] **Step 1: Case card**

```tsx
// src/components/case-card.tsx
import Link from 'next/link';
import type { CaseRow } from '@/lib/types/domain';

export function CaseCard({ c }: { c: CaseRow }) {
  return (
    <Link
      href={`/solve/${c.id}`}
      className="block rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase text-zinc-500">{c.case_type.replace('_', ' ')}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${diffStyle(c.difficulty)}`}>{c.difficulty}</span>
      </div>
      <h3 className="font-medium text-zinc-100 mb-1 line-clamp-2">{c.title}</h3>
      <div className="text-xs text-zinc-500">{c.source ?? 'unknown'} · {c.industry}</div>
    </Link>
  );
}

function diffStyle(d: string) {
  switch (d) {
    case 'easy': return 'bg-emerald-900/40 text-emerald-300';
    case 'medium': return 'bg-amber-900/40 text-amber-300';
    case 'hard': return 'bg-rose-900/40 text-rose-300';
    case 'expert': return 'bg-fuchsia-900/40 text-fuchsia-300';
    default: return 'bg-zinc-800 text-zinc-300';
  }
}
```

- [ ] **Step 2: Case filters (client component)**

```tsx
// src/components/case-filters.tsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';

const INDUSTRIES = ['consulting', 'fmcg', 'tech', 'healthcare', 'finance', 'infra', 'energy', 'retail', 'other'];
const TYPES = ['market_entry', 'profitability', 'mna', 'pricing', 'operations', 'gtm', 'estimation', 'other'];
const DIFFS = ['easy', 'medium', 'hard', 'expert'];

export function CaseFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`/cases?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select
        defaultValue={params.get('industry') ?? ''}
        onChange={(e) => setParam('industry', e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm"
      >
        <option value="">All industries</option>
        {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
      </select>
      <select
        defaultValue={params.get('type') ?? ''}
        onChange={(e) => setParam('type', e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm"
      >
        <option value="">All types</option>
        {TYPES.map((i) => <option key={i} value={i}>{i.replace('_', ' ')}</option>)}
      </select>
      <select
        defaultValue={params.get('difficulty') ?? ''}
        onChange={(e) => setParam('difficulty', e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm"
      >
        <option value="">All difficulties</option>
        {DIFFS.map((i) => <option key={i} value={i}>{i}</option>)}
      </select>
      <input
        type="text"
        placeholder="Search title…"
        defaultValue={params.get('q') ?? ''}
        onChange={(e) => setParam('q', e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]"
      />
    </div>
  );
}
```

- [ ] **Step 3: Browser page**

```tsx
// src/app/cases/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CaseCard } from '@/components/case-card';
import { CaseFilters } from '@/components/case-filters';

export default async function CasesPage({
  searchParams,
}: { searchParams: Promise<{ industry?: string; type?: string; difficulty?: string; q?: string }> }) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('cases').select('*').order('created_at', { ascending: false }).limit(120);
  if (sp.industry) query = query.eq('industry', sp.industry);
  if (sp.type) query = query.eq('case_type', sp.type);
  if (sp.difficulty) query = query.eq('difficulty', sp.difficulty);
  if (sp.q) query = query.ilike('title', `%${sp.q}%`);

  const { data: cases } = await query;
  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <a href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">Dashboard →</a>
      </header>
      <CaseFilters />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(cases ?? []).map((c) => <CaseCard key={c.id} c={c as any} />)}
      </div>
      {(cases ?? []).length === 0 && (
        <div className="text-zinc-500 text-sm mt-12">No cases match these filters.</div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Visit and verify**

Run dev server, sign in, visit `/cases`. Expected: see the seeded sample case (from Task 5).

- [ ] **Step 5: Commit**

```bash
git add src/app/cases src/components/case-card.tsx src/components/case-filters.tsx
git commit -m "feat(ui): case browser with filters"
```

---

## Task 20: Solve arena — chat panel + cheat sheet panel

**Files:**
- Create: `src/components/chat-panel.tsx`, `src/components/cheat-sheet-panel.tsx`, `src/app/solve/[caseId]/page.tsx`

- [ ] **Step 1: Chat panel (client)**

```tsx
// src/components/chat-panel.tsx
'use client';
import { useState, useRef, useEffect } from 'react';

type Msg = { role: 'user' | 'interviewer'; content: string };

export function ChatPanel({ sessionId, initial }: { sessionId: string; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Msg = { role: 'user', content: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setStreaming(true);

    // Persist user turn first via fetch to a tiny endpoint, OR include in /api/chat body.
    // For simplicity here, we call /api/chat which expects sessionId — we update the session
    // transcript on the server side to append the user turn before calling Groq.
    // (Implementation note: amend /api/chat to accept { sessionId, userTurn }.)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userTurn: input }),
    });

    setMessages((m) => [...m, { role: 'interviewer', content: '' }]);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += decoder.decode(value);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'interviewer', content: acc };
        return copy;
      });
    }
    setStreaming(false);

    // Trigger cheat sheet auto-fill
    fetch('/api/cheatsheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userQuestion: input, interviewerAnswer: acc }),
    }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-zinc-800 ml-auto' : 'bg-zinc-900 border border-zinc-800'}`}>
            {m.content || <span className="text-zinc-600">…</span>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-zinc-800 p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask the interviewer…"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
          disabled={streaming}
        />
        <button onClick={send} disabled={streaming} className="px-4 py-2 bg-white text-zinc-900 rounded text-sm font-medium disabled:opacity-50">
          Send
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Patch `/api/chat` to accept the user's turn**

Open `src/app/api/chat/route.ts` and modify the handler to accept `userTurn`, append it to the transcript, then run the existing logic. Replace the existing function body with:

```ts
export async function POST(req: NextRequest) {
  const { sessionId, userTurn } = await req.json() as { sessionId: string; userTurn: string };
  const supabase = await createSupabaseServerClient();
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('id, transcript, case_id, user_id')
    .eq('id', sessionId)
    .single();
  if (sErr || !session) return new Response('session not found', { status: 404 });

  const { data: caseRow, error: cErr } = await supabase
    .from('cases')
    .select('title, problem_statement, interviewer_notes')
    .eq('id', session.case_id)
    .single();
  if (cErr || !caseRow) return new Response('case not found', { status: 404 });

  const transcriptIn = (session.transcript as any[]) ?? [];
  const withUser = [...transcriptIn, { role: 'user', content: userTurn, timestamp: new Date().toISOString() }];
  const disclosed = withUser.filter((t) => t.role === 'interviewer').map((t) => t.content);
  const messages = buildInterviewerMessages(caseRow as any, disclosed, withUser as any);

  const stream = await groq.chat.completions.create({
    model: MODEL_LARGE, messages: messages as any, stream: true, max_tokens: 300, temperature: 0.4,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let full = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) { full += delta; controller.enqueue(encoder.encode(delta)); }
      }
      const finalTranscript = [
        ...withUser,
        { role: 'interviewer', content: full, timestamp: new Date().toISOString() },
      ];
      await supabase.from('sessions').update({ transcript: finalTranscript }).eq('id', sessionId);
      controller.close();
    },
  });
  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
```

- [ ] **Step 3: Cheat sheet panel (client)**

```tsx
// src/components/cheat-sheet-panel.tsx
'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { updateCheatSheetField } from '@/server-actions/update-cheatsheet';
import type { CheatSheetState } from '@/lib/types/domain';

export function CheatSheetPanel({ sessionId, initial }: { sessionId: string; initial: CheatSheetState }) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`cs-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'cheat_sheets',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => setState(payload.new as any))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const Field = ({ name, label }: { name: 'framework' | 'hypothesis' | 'manual_notes'; label: string }) => {
    const locked = state.locked_fields.includes(name);
    const [val, setVal] = useState((state[name] as string) || '');
    return (
      <div className="rounded border border-zinc-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase text-zinc-500">{label}</span>
          <button
            onClick={() => updateCheatSheetField(sessionId, name, val, !locked)}
            className={`text-xs ${locked ? 'text-amber-400' : 'text-zinc-500'}`}
          >
            {locked ? '🔒 locked' : 'lock'}
          </button>
        </div>
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => updateCheatSheetField(sessionId, name, val, locked)}
          rows={2}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm resize-none"
        />
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-300">Cheat Sheet</h2>
      <Field name="framework" label="Framework" />
      <Field name="hypothesis" label="Hypothesis" />
      <div className="rounded border border-zinc-800 p-3">
        <div className="text-xs uppercase text-zinc-500 mb-2">Key numbers</div>
        <ul className="text-sm space-y-1">
          {state.key_numbers.map((n, i) => (
            <li key={i} className="text-zinc-300">• {n.label}: <span className="text-zinc-100">{n.value} {n.unit}</span></li>
          ))}
          {state.key_numbers.length === 0 && <li className="text-zinc-600 text-xs italic">none yet</li>}
        </ul>
      </div>
      <div className="rounded border border-zinc-800 p-3">
        <div className="text-xs uppercase text-zinc-500 mb-2">Decisions</div>
        <ul className="text-sm space-y-1">
          {state.decisions.map((d, i) => <li key={i} className="text-zinc-300">• {d}</li>)}
          {state.decisions.length === 0 && <li className="text-zinc-600 text-xs italic">none yet</li>}
        </ul>
      </div>
      <div className="rounded border border-zinc-800 p-3">
        <div className="text-xs uppercase text-zinc-500 mb-2">Next steps</div>
        <ul className="text-sm space-y-1">
          {state.next_steps.map((d, i) => <li key={i} className="text-zinc-300">• {d}</li>)}
          {state.next_steps.length === 0 && <li className="text-zinc-600 text-xs italic">none yet</li>}
        </ul>
      </div>
      <Field name="manual_notes" label="Notes" />
    </div>
  );
}
```

- [ ] **Step 4: Solve arena page**

```tsx
// src/app/solve/[caseId]/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ChatPanel } from '@/components/chat-panel';
import { CheatSheetPanel } from '@/components/cheat-sheet-panel';
import { startSession } from '@/server-actions/start-session';
import { endSession } from '@/server-actions/end-session';

export default async function SolvePage({
  params, searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { caseId } = await params;
  const { session: sessionParam } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  // If no session yet, start one
  if (!sessionParam) {
    await startSession(caseId);
  }

  const sessionId = sessionParam!;
  const { data: session } = await supabase
    .from('sessions').select('*').eq('id', sessionId).single();
  const { data: caseRow } = await supabase
    .from('cases').select('title, difficulty, problem_statement').eq('id', caseId).single();
  const { data: cs } = await supabase
    .from('cheat_sheets').select('*').eq('session_id', sessionId).maybeSingle();

  if (!session || !caseRow) redirect('/cases');

  const initialMessages = ((session.transcript as any[]) ?? []).map((t) => ({
    role: t.role, content: t.content,
  }));
  const initialCs = cs ?? {
    framework: null, hypothesis: null, key_numbers: [],
    decisions: [], next_steps: [], manual_notes: null, locked_fields: [],
  };

  return (
    <main className="h-screen flex flex-col bg-zinc-950">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase">{caseRow.difficulty}</div>
          <h1 className="text-sm font-semibold">{caseRow.title}</h1>
        </div>
        <form action={endSession.bind(null, sessionId)}>
          <button className="text-xs px-3 py-1.5 bg-rose-900/40 text-rose-300 rounded">End session</button>
        </form>
      </header>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-x divide-zinc-800 overflow-hidden">
        <ChatPanel sessionId={sessionId} initial={initialMessages as any} />
        <CheatSheetPanel sessionId={sessionId} initial={initialCs as any} />
      </div>
      <details className="border-t border-zinc-800 px-4 py-2">
        <summary className="text-xs text-zinc-500 cursor-pointer">Show problem statement</summary>
        <p className="text-sm text-zinc-400 mt-2">{caseRow.problem_statement}</p>
      </details>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/solve src/components/chat-panel.tsx src/components/cheat-sheet-panel.tsx
git commit -m "feat(ui): solve arena with streaming chat + live cheat sheet"
```

---

## Task 21: Debrief view

**Files:**
- Create: `src/app/debrief/[sessionId]/page.tsx`, `src/components/score-bar.tsx`, `src/components/ideal-structure-tree.tsx`

- [ ] **Step 1: Score bar**

```tsx
// src/components/score-bar.tsx
export function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-200">{value}/{max}</span>
      </div>
      <div className="h-2 bg-zinc-900 rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ideal structure tree**

```tsx
// src/components/ideal-structure-tree.tsx
import type { IdealStructure } from '@/lib/types/domain';

export function IdealStructureTree({ s }: { s: IdealStructure }) {
  if (!s || (!s.framework && !(s.branches?.length))) {
    return <div className="text-sm text-zinc-500 italic">No ideal structure available for this case.</div>;
  }
  return (
    <div className="text-sm space-y-3">
      {s.framework && <div className="font-semibold text-zinc-200">Framework: {s.framework}</div>}
      <ul className="space-y-1">
        {(s.branches ?? []).map((b, i) => (
          <li key={i}>
            <span className="text-zinc-200">▸ {b.node}</span>
            {b.subnodes && b.subnodes.length > 0 && (
              <ul className="ml-5 text-zinc-400 text-xs mt-1">
                {b.subnodes.map((n, j) => <li key={j}>· {n}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {(s.key_insights ?? []).length > 0 && (
        <div>
          <div className="font-semibold text-zinc-300 mt-3">Key insights</div>
          <ul className="ml-3 text-zinc-400 text-xs space-y-1 mt-1">
            {s.key_insights!.map((k, i) => <li key={i}>• {k}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Debrief page**

```tsx
// src/app/debrief/[sessionId]/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ScoreBar } from '@/components/score-bar';
import { IdealStructureTree } from '@/components/ideal-structure-tree';

export default async function DebriefPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from('sessions').select('*').eq('id', sessionId).single();
  if (!session) redirect('/cases');
  const { data: caseRow } = await supabase
    .from('cases').select('title, ideal_structure').eq('id', session.case_id).single();

  const b = (session.score_breakdown ?? {}) as any;

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <a href="/cases" className="text-sm text-zinc-500 hover:text-zinc-300">← back to cases</a>
      <h1 className="text-2xl font-semibold mt-2 mb-1">{caseRow?.title ?? '—'}</h1>
      <div className="text-sm text-zinc-500 mb-6">Total score: <span className="text-zinc-100 text-lg">{session.score ?? 0}</span> / 100</div>

      <section className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-3">
          <ScoreBar label="Structure" value={b.structure ?? 0} max={40} />
          <ScoreBar label="Insight" value={b.insight ?? 0} max={40} />
          <ScoreBar label="Speed" value={b.speed ?? 0} max={20} />
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Strengths</h3>
            <ul className="text-sm text-zinc-400 space-y-1">
              {(b.strengths ?? []).map((s: string, i: number) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Gaps</h3>
            <ul className="text-sm text-zinc-400 space-y-1">
              {(b.gaps ?? []).map((g: string, i: number) => <li key={i}>• {g}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded border border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Ideal structure</h3>
        <IdealStructureTree s={(caseRow?.ideal_structure ?? {}) as any} />
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/debrief src/components/score-bar.tsx src/components/ideal-structure-tree.tsx
git commit -m "feat(ui): debrief with score bars + ideal structure"
```

---

## Task 22: Dashboard

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Dashboard page**

```tsx
// src/app/dashboard/page.tsx
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, started_at, score, case_id, status, cases(title, case_type)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(20);

  const completed = (sessions ?? []).filter((s) => s.status === 'completed');
  const avg = completed.length
    ? Math.round(completed.reduce((a, s) => a + (s.score ?? 0), 0) / completed.length)
    : 0;

  // Weak spots: avg score per case_type, flag < 65
  const byType: Record<string, { sum: number; n: number }> = {};
  for (const s of completed) {
    const t = (s as any).cases?.case_type ?? 'other';
    byType[t] = byType[t] ?? { sum: 0, n: 0 };
    byType[t].sum += s.score ?? 0;
    byType[t].n += 1;
  }
  const weakSpots = Object.entries(byType)
    .map(([t, v]) => ({ type: t, avg: Math.round(v.sum / v.n), n: v.n }))
    .filter((w) => w.avg < 65 && w.n >= 2);

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/cases" className="text-sm text-zinc-400 hover:text-zinc-200">All cases →</Link>
      </header>

      <section className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="Sessions" value={String((sessions ?? []).length)} />
        <Stat label="Completed" value={String(completed.length)} />
        <Stat label="Avg score" value={`${avg}`} />
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recent sessions</h2>
        <div className="rounded border border-zinc-800 divide-y divide-zinc-800">
          {(sessions ?? []).map((s: any) => (
            <Link
              key={s.id}
              href={s.status === 'completed' ? `/debrief/${s.id}` : `/solve/${s.case_id}?session=${s.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-900"
            >
              <div>
                <div className="text-sm">{s.cases?.title ?? 'Untitled case'}</div>
                <div className="text-xs text-zinc-500">{new Date(s.started_at).toLocaleString()}</div>
              </div>
              <div className="text-sm">{s.status === 'completed' ? `${s.score ?? 0}/100` : <span className="text-amber-400">in progress</span>}</div>
            </Link>
          ))}
          {(sessions ?? []).length === 0 && <div className="px-4 py-6 text-sm text-zinc-500">No sessions yet — start one from <a href="/cases" className="underline">Cases</a>.</div>}
        </div>
      </section>

      {weakSpots.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Weak spots</h2>
          <div className="flex flex-wrap gap-2">
            {weakSpots.map((w) => (
              <span key={w.type} className="text-xs px-3 py-1.5 rounded bg-rose-900/30 text-rose-300">
                {w.type.replace('_', ' ')} · avg {w.avg} ({w.n})
              </span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-800 p-4">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard
git commit -m "feat(ui): dashboard with stats, recent sessions, weak spots"
```

---

## Task 23: Admin allowlist page

**Files:**
- Create: `src/app/admin/allowlist/page.tsx`, `src/server-actions/manage-allowlist.ts`

- [ ] **Step 1: Server action**

```ts
// src/server-actions/manage-allowlist.ts
'use server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    throw new Error('not admin');
  }
  return user;
}

export async function addEmailToAllowlist(formData: FormData) {
  await assertAdmin();
  const email = String(formData.get('email') || '').toLowerCase().trim();
  if (!email) return;
  const admin = createSupabaseAdminClient();
  await admin.from('email_allowlist').insert({ email, added_by: 'admin-ui' }).throwOnError();
  revalidatePath('/admin/allowlist');
}

export async function removeEmailFromAllowlist(email: string) {
  await assertAdmin();
  const admin = createSupabaseAdminClient();
  await admin.from('email_allowlist').delete().eq('email', email);
  revalidatePath('/admin/allowlist');
}
```

- [ ] **Step 2: Allowlist page**

```tsx
// src/app/admin/allowlist/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { addEmailToAllowlist, removeEmailFromAllowlist } from '@/server-actions/manage-allowlist';

export default async function AllowlistPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  if (user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return <main className="p-8">Not admin.</main>;
  }
  const admin = createSupabaseAdminClient();
  const { data: rows } = await admin.from('email_allowlist').select('*').order('added_at', { ascending: false });

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Cohort allowlist</h1>
      <form action={addEmailToAllowlist} className="flex gap-2 mb-6">
        <input name="email" type="email" required placeholder="someone@school.edu" className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm" />
        <button className="px-4 py-2 bg-white text-zinc-900 rounded text-sm font-medium">Add</button>
      </form>
      <ul className="rounded border border-zinc-800 divide-y divide-zinc-800">
        {(rows ?? []).map((r) => (
          <li key={r.email} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{r.email}</span>
            <form action={removeEmailFromAllowlist.bind(null, r.email)}>
              <button className="text-xs text-rose-400 hover:underline">remove</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin src/server-actions/manage-allowlist.ts
git commit -m "feat(admin): allowlist management page"
```

---

## Task 24: E2E happy-path test

**Files:**
- Create: `tests/e2e/solve-flow.spec.ts`

- [ ] **Step 1: Write the test**

This test assumes the user has run `npm run dev` and the seed (`0003_seed_admin.sql`) is applied.

```ts
import { test, expect } from '@playwright/test';

test.describe('CasePad happy path', () => {
  test('cases page loads', async ({ page }) => {
    await page.goto('/cases');
    // Will redirect to /auth/signin if not logged in — which is OK; we just want
    // to confirm the route resolves without server crash.
    await expect(page).toHaveURL(/\/(cases|auth\/signin)/);
  });

  test('signin page renders', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page.getByText('Continue with Google')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run**

```bash
npm run test:e2e
```

Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e
git commit -m "test(e2e): happy path smoke"
```

---

## Task 25: Vercel deployment

**Files:**
- Modify: `next.config.ts` (if needed for Supabase image domains)

- [ ] **Step 1: Login to Vercel + link**

In the project root:
```bash
npx vercel login
npx vercel link
```

- [ ] **Step 2: Set env vars in Vercel dashboard**

Set in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `ADMIN_EMAIL`
- `NEXT_PUBLIC_SITE_URL` (set to the Vercel preview URL after first deploy)

- [ ] **Step 3: Deploy preview**

```bash
npx vercel
```

Expected: a preview URL.

- [ ] **Step 4: Update Supabase OAuth redirect**

In Supabase dashboard → Auth → URL Configuration, add the Vercel preview URL with `/auth/callback` to allowed redirect URLs.

- [ ] **Step 5: Smoke test the preview**

Open the preview URL → sign in with the allowlisted email → land on `/cases`. Confirm one full round-trip works (browse → solve → end → debrief).

- [ ] **Step 6: Commit**

```bash
git add .
git commit --allow-empty -m "chore: deployed to Vercel preview"
```

---

## Self-Review Notes

**Spec coverage check (cross-reference to spec sections):**
- §2 Scope-In: case browser ✓ (T19), solve arena ✓ (T20), AI interviewer ✓ (T11-12), cheat sheet auto-fill ✓ (T13-14), evaluator ✓ (T15-16), dashboard ✓ (T22), cohort auth ✓ (T7-8), allowlist admin ✓ (T23). **Ingestion pipeline is in the SEPARATE plan** (`2026-04-30-casepad-ingestion.md`) — intentional split.
- §3 Tech stack: ✓ Next.js 16 (T1), Supabase (T6), Groq (T10-15), Vercel (T25), no Anthropic/Gemini.
- §4 Data model: ✓ schema migration covers all five tables (T3).
- §5 AI interviewer: ✓ T11 implements reveal-gated, no-fabrication, nudge rules.
- §6 Cheat sheet auto-fill: ✓ T13-14, lock-fields supported.
- §7 Evaluator: ✓ T15-16, Structure/Insight/Speed plus insufficient_data when ideal_structure is empty.
- §9 Auth: ✓ T7-8, Google SSO + allowlist enforced server-side at OAuth callback AND middleware.
- §10 UI surfaces: ✓ all routes implemented.

**Type consistency check:**
- `CheatSheetState` shape consistent across `domain.ts`, `cheatsheet.ts`, `update-cheatsheet.ts`, `chat-panel.tsx`, `cheat-sheet-panel.tsx`. ✓
- `ChatMessage` (role: 'user'|'interviewer') used consistently. ✓
- `IdealStructure` shape used in evaluator + tree component. ✓
- API endpoints `/api/chat` `/api/cheatsheet` `/api/evaluate` accept `sessionId` and (where relevant) `userTurn`/`userQuestion`/`interviewerAnswer`. ✓

**Placeholder scan:**
- No "TBD" / "TODO" / "implement later".
- All code blocks contain complete code.
- Sample seed includes a placeholder email `ash@example.com` — this is intentional and called out in the task.

---

## Execution

After approval, this plan should be executed via **superpowers:subagent-driven-development** (recommended) for fast iteration with review between tasks. Each task is atomic and self-contained — a fresh subagent can pick up any task by reading the file paths and step definitions.
