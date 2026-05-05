// One-shot: apply supabase/migrations/0011_daily_assignments.sql.
//
// Tries three paths in order, stops at the first one that works:
//   1. `pg` direct connection if SUPABASE_DB_URL or DATABASE_URL is set
//   2. `exec_sql` Supabase RPC (only works if the project has it installed —
//      this one doesn't, but we keep the path for repeatability across envs)
//   3. Print the raw SQL + Studio URL so it can be pasted manually
//
// The migration is idempotent (`create table if not exists`, etc.), so
// re-running is safe.
//
// Usage:
//   node --env-file=.env.local scripts/apply-migration-0011.mjs

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const sqlPath = path.resolve('supabase/migrations/0011_daily_assignments.sql');
const sql = await readFile(sqlPath, 'utf8');

console.log(`[apply] reading ${sqlPath} (${sql.length} chars)`);

let applied = false;

// Path 1: pg direct connection (requires DATABASE_URL / SUPABASE_DB_URL)
if (dbUrl && !applied) {
  console.log('[apply] trying pg direct connection...');
  try {
    const pg = await import('pg').catch(() => null);
    if (!pg) {
      console.log('[apply] pg not installed — run `npm i -D pg` to enable this path. Skipping.');
    } else {
      const { Client } = pg.default ?? pg;
      const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log('[apply] pg direct: OK');
      applied = true;
    }
  } catch (e) {
    console.warn('[apply] pg direct failed:', e?.message || e);
  }
}

// Path 2: exec_sql RPC (legacy — only works if installed in target project)
if (!applied) {
  console.log('[apply] trying rpc(exec_sql)...');
  const supa = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await supa.rpc('exec_sql', { sql });
  if (error) {
    console.warn('[apply] exec_sql RPC not available:', error.message);
  } else {
    console.log('[apply] exec_sql RPC: OK');
    applied = true;
  }
}

if (!applied) {
  // Path 3: manual paste fallback
  const ref = url.replace(/^https?:\/\//, '').split('.')[0];
  const studioUrl = `https://supabase.com/dashboard/project/${ref}/sql/new`;
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Could not apply migration automatically.');
  console.log('');
  console.log('Open Studio SQL editor and paste the SQL below:');
  console.log(`  ${studioUrl}`);
  console.log('');
  console.log('--- BEGIN SQL ---');
  console.log(sql);
  console.log('--- END SQL ---');
  console.log('');
  console.log('After running, re-run this script to verify:');
  console.log('  node --env-file=.env.local scripts/apply-migration-0011.mjs --verify-only');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(1);
}

// Verify
console.log('[verify] checking daily_assignments is reachable...');
const supa = createClient(url, serviceKey, { auth: { persistSession: false } });
const { count, error: countErr } = await supa
  .from('daily_assignments')
  .select('*', { count: 'exact', head: true });
if (countErr) {
  console.error('[verify] could not query daily_assignments:', countErr.message);
  process.exit(1);
}
console.log(`[verify] daily_assignments table reachable. Row count: ${count ?? 0}`);
console.log('[apply] DONE.');
