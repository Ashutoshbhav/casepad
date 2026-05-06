#!/usr/bin/env node
// scripts/lint-rls.mjs
//
// Scans supabase/migrations/*.sql and fails if any table created via
// `create table [if not exists] <name> (...)` doesn't have a matching
// `alter table <name> enable row level security` somewhere in the same
// or any later migration.
//
// Why this exists:
//   2026-05-06 — Supabase Security Advisor flagged tavily_quota for
//   rls_disabled_in_public. Migration 0008_tavily_quota.sql created
//   the table but forgot the RLS-enable line. We patched in 0012, but
//   nothing prevents the same mistake on the next new table. This
//   script is the guard.
//
// Behavior:
//   - Walks supabase/migrations/*.sql in alphabetical (= chronological)
//     order, since migrations are numbered 0001_, 0002_, ...
//   - Parses each file with regex (no SQL parser dep): finds CREATE
//     TABLE statements + ALTER TABLE ... ENABLE ROW LEVEL SECURITY.
//   - Strips line- and block-comments before parsing so we don't
//     match a CREATE TABLE inside a `-- create table foo` comment.
//   - For every created table, requires a matching ENABLE RLS in
//     the same or any subsequent migration. Schema-qualified names
//     (`public.cases`) are normalized to bare names for matching.
//   - Allowlist: tables in PUBLIC_BY_DESIGN below are explicitly
//     skipped. Empty by default — every table starts as MUST-HAVE-RLS.
//
// Usage:
//   node scripts/lint-rls.mjs       → exit 0 = pass, exit 1 = fail
//   npm run lint:rls                → same, via package.json script
//
// Wired into:
//   scripts/pm-gate.mjs              → runs automatically on commits
//                                       that touch supabase/migrations/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

// Tables that intentionally do NOT need RLS (e.g. anonymous-readable
// public catalogs that have no per-row owner concept). Empty by default.
// Add an entry only with an inline comment justifying why.
const PUBLIC_BY_DESIGN = new Set([
  // example: 'reference_country_codes',
]);

// Strip SQL comments so the regex doesn't match inside them.
function stripComments(sql) {
  // Block comments first (they can span lines).
  let out = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  // Line comments.
  out = out.replace(/--[^\n]*/g, '');
  return out;
}

// Normalize a table reference: strip optional schema prefix + quotes,
// lowercase. `public."cases"` → `cases`.
function normalizeTableName(raw) {
  return raw.replace(/^[a-z_][a-z0-9_]*\./i, '')
            .replace(/[`"\[\]]/g, '')
            .trim()
            .toLowerCase();
}

// Find all `create table [if not exists] <name>` in a file.
// Captures the table name after the optional schema qualifier.
const CREATE_RE = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?((?:[a-z_][a-z0-9_]*\.)?[a-z_"`\[][a-z0-9_"`\]]*)/gi;

// Find all `alter table <name> ... enable row level security`.
const ENABLE_RLS_RE = /\balter\s+table\s+(?:only\s+)?((?:[a-z_][a-z0-9_]*\.)?[a-z_"`\[][a-z0-9_"`\]]*)\s+enable\s+row\s+level\s+security/gi;

function lint() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`[lint-rls] migrations dir not found: ${MIGRATIONS_DIR}`);
    process.exit(2);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[lint-rls] no migration files found — pass.');
    process.exit(0);
  }

  // Collect: { tableName: { createdIn: file, rlsEnabledIn: file | null } }
  const tables = new Map();

  for (const file of files) {
    const sqlRaw = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const sql = stripComments(sqlRaw);

    // Records new table creations (only if not already tracked — duplicate
    // `create table if not exists` in a later migration is a no-op).
    let m;
    while ((m = CREATE_RE.exec(sql)) !== null) {
      const name = normalizeTableName(m[1]);
      if (!tables.has(name)) {
        tables.set(name, { createdIn: file, rlsEnabledIn: null });
      }
    }

    // Records RLS enables — we accept a match in the same or any later
    // file (because we walk in chronological order, this naturally
    // works as long as we also track tables created in earlier files).
    while ((m = ENABLE_RLS_RE.exec(sql)) !== null) {
      const name = normalizeTableName(m[1]);
      const existing = tables.get(name);
      if (existing) {
        if (!existing.rlsEnabledIn) existing.rlsEnabledIn = file;
      } else {
        // Table was created via dashboard (not in any migration) but
        // RLS is enabled in a migration. Track it so we don't error
        // if it appears in PUBLIC_BY_DESIGN check.
        tables.set(name, { createdIn: '<dashboard>', rlsEnabledIn: file });
      }
    }
  }

  const failures = [];
  const passes = [];
  const skipped = [];

  for (const [name, info] of tables) {
    if (PUBLIC_BY_DESIGN.has(name)) {
      skipped.push({ name, info });
      continue;
    }
    if (!info.rlsEnabledIn) {
      failures.push({ name, info });
    } else {
      passes.push({ name, info });
    }
  }

  // Report
  if (passes.length > 0) {
    console.log(`[lint-rls] ✓ ${passes.length} table(s) with RLS enabled:`);
    for (const { name, info } of passes) {
      console.log(`            ${name.padEnd(28)} created=${info.createdIn} rls=${info.rlsEnabledIn}`);
    }
  }
  if (skipped.length > 0) {
    console.log(`[lint-rls] · ${skipped.length} table(s) explicitly public-by-design (skipped):`);
    for (const { name } of skipped) console.log(`            ${name}`);
  }
  if (failures.length > 0) {
    console.error(`\n[lint-rls] ✗ ${failures.length} table(s) WITHOUT RLS:`);
    for (const { name, info } of failures) {
      console.error(`            ${name.padEnd(28)} created=${info.createdIn}`);
    }
    console.error(`\n[lint-rls] FIX: add to a migration (any number ≥ ${failures[0].info.createdIn.split('_')[0]}):`);
    for (const { name } of failures) {
      console.error(`              alter table ${name} enable row level security;`);
    }
    console.error(`\n[lint-rls] If a table is intentionally public (e.g. anonymous-readable`);
    console.error(`            catalog), add it to PUBLIC_BY_DESIGN in scripts/lint-rls.mjs`);
    console.error(`            with an inline justification comment.`);
    process.exit(1);
  }

  console.log(`\n[lint-rls] ✓ all ${passes.length} table(s) RLS-enabled — pass.`);
  process.exit(0);
}

lint();
