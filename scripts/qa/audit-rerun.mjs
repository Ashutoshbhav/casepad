// Re-run DB integrity audit. Read-only.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
if (!url || !key) {
  console.error('Missing supabase env. URL?', !!url, 'KEY?', !!key);
  process.exit(1);
}
const supa = createClient(url, key, { auth: { persistSession: false } });

const STARTER_IDS = [
  '00b44543-2b35-4f77-b6c2-a1fe3c2da09f',
  'ec7ee7fa-6646-4e28-bee0-a821132ca065',
  '94f69222-042d-41fe-82e0-b62330526ef3',
  '122ddcb6-5843-4b97-b359-aa048c7e54a7',
  '5973d2aa-da45-44ca-aaee-133fdabfe4f3',
  'a40af319-2678-4eb3-80a5-fe521d20bc4b',
  'a5803875-ec7b-48ef-83cf-49aae6901c06',
  'e7e74966-aaae-4d12-8a90-76941ac9a59f',
  '9c52a767-f746-4178-b875-9279157d0f88',
  '6e018d7f-2440-47d8-8a92-c03c133bd386',
];

async function fetchAllCases() {
  const all = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await supa
      .from('cases')
      .select('id, casebook_id, title, problem_statement, case_type, tracks, pre_case_crammer, ideal_walkthrough')
      .range(from, from + size - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return all;
}

async function run() {
  const out = {};

  // 1. Total rows
  const cases = await fetchAllCases();
  out.totalCases = cases.length;

  // 2. Industry stub fakes — title in known stub list AND ps starts with "Analyze the"
  const stubTitles = ['Airlines', 'FMCG', 'Telecom', 'Banking', 'Retail', 'Healthcare', 'Energy', 'Technology', 'Media', 'Insurance', 'Pharma', 'Pharmaceuticals', 'Automotive', 'Logistics', 'Hospitality'];
  const stubs = cases.filter(c =>
    stubTitles.includes((c.title || '').trim()) &&
    /^Analyze the /i.test(c.problem_statement || '')
  );
  out.industryStubs = { count: stubs.length, samples: stubs.slice(0, 5).map(s => ({ id: s.id, title: s.title, ps: (s.problem_statement || '').slice(0, 60) })) };

  // Also broad: any ps matching ^Analyze the X industry pattern
  const broadStubs = cases.filter(c => /^Analyze the .{1,40} industry/i.test(c.problem_statement || ''));
  out.industryStubsBroad = broadStubs.length;

  // 3. Tulsa Hotel rows + dup groups in same casebook
  const tulsa = cases.filter(c => /tulsa hotel/i.test(c.title || ''));
  out.tulsaHotelRows = tulsa.length;
  out.tulsaCasebooks = [...new Set(tulsa.map(c => c.casebook_id))].length;

  // group by (casebook_id, lower(title))
  const groups = new Map();
  for (const c of cases) {
    if (!c.casebook_id) continue;
    const k = c.casebook_id + '||' + (c.title || '').trim().toLowerCase();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  const dupGroups = [...groups.values()].filter(g => g.length > 1);
  out.dupGroupsInCasebook = dupGroups.length;
  out.dupSamples = dupGroups.slice(0, 5).map(g => ({ casebook: g[0].casebook_id, title: g[0].title, count: g.length }));

  // 4. unique index on (casebook_id, title) — try rpc, swallow errors
  try {
    const r = await supa.rpc('exec_sql', { sql: "select indexname, indexdef from pg_indexes where tablename='cases'" });
    out.indexCheck = { error: r.error ? String(r.error.message || r.error) : null, rows: r.data };
  } catch (e) {
    out.indexCheck = { error: String(e), rows: null };
  }

  // 5. case_type='other'
  const otherCount = cases.filter(c => c.case_type === 'other').length;
  out.caseTypeOther = otherCount;

  // 6. starter cases pre_case_crammer + ideal_walkthrough populated
  const { data: starters, error: stErr } = await supa
    .from('cases')
    .select('id, title, pre_case_crammer, ideal_walkthrough')
    .in('id', STARTER_IDS);
  if (stErr) throw stErr;
  out.starters = {
    found: starters.length,
    populatedBoth: starters.filter(s => s.pre_case_crammer != null && s.ideal_walkthrough != null).length,
    populatedCrammer: starters.filter(s => s.pre_case_crammer != null).length,
    populatedWalkthrough: starters.filter(s => s.ideal_walkthrough != null).length,
    list: starters.map(s => ({ id: s.id, title: s.title, hasCrammer: s.pre_case_crammer != null, hasWalk: s.ideal_walkthrough != null })),
  };

  // total non-null
  const totalCrammer = cases.filter(c => c.pre_case_crammer != null).length;
  const totalWalkthrough = cases.filter(c => c.ideal_walkthrough != null).length;
  const totalBoth = cases.filter(c => c.pre_case_crammer != null && c.ideal_walkthrough != null).length;
  out.allCrammer = totalCrammer;
  out.allWalkthrough = totalWalkthrough;
  out.allBoth = totalBoth;

  // 7. tracks
  const onlyConsulting = cases.filter(c => Array.isArray(c.tracks) && c.tracks.length === 1 && c.tracks[0] === 'consulting').length;
  const multiTrack = cases.filter(c => Array.isArray(c.tracks) && c.tracks.length > 1).length;
  const noTracks = cases.filter(c => !Array.isArray(c.tracks) || c.tracks.length === 0).length;
  const otherSingle = cases.filter(c => Array.isArray(c.tracks) && c.tracks.length === 1 && c.tracks[0] !== 'consulting').length;
  out.tracks = { onlyConsulting, multiTrack, noTracks, otherSingle, total: cases.length };

  // 8. sessions.issue_tree column exists + JSONB type
  // information_schema via rpc
  try {
    const colCheckSql = "select column_name, data_type, udt_name from information_schema.columns where table_name='sessions' and column_name='issue_tree'";
    const colRes = await supa.rpc('exec_sql', { sql: colCheckSql });
    out.issueTreeCol = { error: colRes.error ? String(colRes.error.message || colRes.error) : null, rows: colRes.data };
  } catch (e) {
    out.issueTreeCol = { error: String(e), rows: null };
  }

  // Also try selecting issue_tree directly from sessions to confirm column exists
  try {
    const { error: itErr } = await supa.from('sessions').select('id, issue_tree').limit(1);
    out.issueTreeSelect = { error: itErr ? String(itErr.message || itErr) : null, ok: !itErr };
  } catch (e) {
    out.issueTreeSelect = { error: String(e), ok: false };
  }

  // sessions by status
  const { data: statusRows, error: statusErr } = await supa
    .from('sessions')
    .select('id, status, started_at, ended_at')
    .limit(10000);
  if (statusErr) {
    out.sessionsErr = String(statusErr.message || JSON.stringify(statusErr));
  } else {
    const byStatus = {};
    for (const r of statusRows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    out.sessionsByStatus = byStatus;
    const cutoff = Date.now() - 24 * 3600 * 1000;
    const stale = statusRows.filter(r => r.status === 'in_progress' && new Date(r.started_at).getTime() < cutoff);
    out.staleInProgress = stale.length;
    out.totalSessions = statusRows.length;
  }

  // Tulsa detail
  const tulsaDetail = cases.filter(c => /tulsa hotel/i.test(c.title || '')).map(c => ({ id: c.id, title: c.title, casebook: c.casebook_id }));
  out.tulsaDetail = tulsaDetail;

  // group Tulsa by casebook
  const tulsaByCb = {};
  for (const t of tulsaDetail) tulsaByCb[t.casebook] = (tulsaByCb[t.casebook] || 0) + 1;
  out.tulsaByCasebook = tulsaByCb;

  console.log(JSON.stringify(out, null, 2));
}

run().catch(e => { console.error('FAIL', e); process.exit(1); });
