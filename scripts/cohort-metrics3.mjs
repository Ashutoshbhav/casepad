import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const COHORT_EMAILS = [
  'geetikamehta002@gmail.com',
  'ronit.25034@ssb.scaler.com',
  'aditya.25005@ssb.scaler.com',
  'shreya.25039@ssb.scaler.com',
  'mahnoor.25024@ssb.scaler.com',
  'rohit.25033@ssb.scaler.com',
];

async function main() {
  const [{ data: sessions }, authResp, { data: cases }] = await Promise.all([
    sb.from('sessions').select('*'),
    sb.auth.admin.listUsers(),
    sb.from('cases').select('id, title, tracks, case_type'),
  ]);
  const authUsers = authResp.data?.users ?? [];
  const userById = new Map(authUsers.map((u) => [u.id, u]));
  const caseById = new Map((cases ?? []).map((c) => [c.id, c]));

  const cohortIds = new Set(
    authUsers.filter((u) => COHORT_EMAILS.includes(u.email)).map((u) => u.id),
  );
  const cohortSessions = sessions.filter((s) => cohortIds.has(s.user_id));

  // Engagement = transcript has at least 2 turns (user + interviewer reply)
  const engaged = cohortSessions.filter((s) => Array.isArray(s.transcript) && s.transcript.length >= 2);
  const empty = cohortSessions.filter((s) => !Array.isArray(s.transcript) || s.transcript.length === 0);

  // Per-user
  const perUser = {};
  for (const s of cohortSessions) {
    const u = userById.get(s.user_id);
    const email = u?.email ?? s.user_id;
    if (!perUser[email]) perUser[email] = { count: 0, engaged: 0, totalTurns: 0, lastActivity: null };
    perUser[email].count++;
    const turns = Array.isArray(s.transcript) ? s.transcript.length : 0;
    perUser[email].totalTurns += turns;
    if (turns >= 2) perUser[email].engaged++;
    // last activity proxy: latest transcript timestamp OR started_at
    let last = s.started_at;
    if (Array.isArray(s.transcript) && s.transcript.length) {
      const t = s.transcript[s.transcript.length - 1]?.timestamp;
      if (t) last = t;
    }
    if (!perUser[email].lastActivity || last > perUser[email].lastActivity) {
      perUser[email].lastActivity = last;
    }
  }

  // Track distribution
  const trackCounts = {};
  for (const s of cohortSessions) {
    const t = s.track || 'unknown';
    trackCounts[t] = (trackCounts[t] || 0) + 1;
  }

  // Top cases
  const caseCounts = {};
  for (const s of cohortSessions) caseCounts[s.case_id] = (caseCounts[s.case_id] || 0) + 1;
  const topCases = Object.entries(caseCounts).sort((a, b) => b[1] - a[1]);

  console.log('=== COHORT METRICS (post-ship, 2026-05-03 → 2026-05-04) ===\n');
  console.log(`Allowlist size: 7 (6 cohort + owner)`);
  console.log(`Cohort signed-in: 3/6 (Ronit, Aditya, Rohit)`);
  console.log(`Cohort NOT signed in: Geetika, Shreya, Mahnoor`);
  console.log('');
  console.log(`Cohort sessions started: ${cohortSessions.length}`);
  console.log(`Cohort sessions completed (status=completed): ${cohortSessions.filter((s) => s.status === 'completed').length}`);
  console.log(`Cohort sessions with ended_at: ${cohortSessions.filter((s) => s.ended_at).length}`);
  console.log(`Cohort sessions with ANY transcript turns: ${cohortSessions.filter((s) => Array.isArray(s.transcript) && s.transcript.length > 0).length}`);
  console.log(`Cohort sessions with empty transcript: ${empty.length}`);
  console.log(`Cohort sessions engaged (>=2 turns): ${engaged.length}`);
  console.log(`Cohort sessions scored: ${cohortSessions.filter((s) => s.score != null).length}`);
  console.log('');
  console.log('Track distribution:');
  for (const [t, c] of Object.entries(trackCounts).sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${c}`);
  console.log('');
  console.log('Per-user breakdown:');
  console.log('email | sessions | engaged(>=2 turns) | total_turns | last_activity');
  for (const email of COHORT_EMAILS) {
    const r = perUser[email];
    if (!r) {
      console.log(`${email} | 0 | 0 | 0 | NEVER`);
      continue;
    }
    console.log(`${email} | ${r.count} | ${r.engaged} | ${r.totalTurns} | ${r.lastActivity}`);
  }
  console.log('');
  console.log('Cases attempted (by cohort):');
  for (const [cid, c] of topCases) {
    const meta = caseById.get(cid);
    console.log(`  ${meta?.title ?? '(unknown)'} [${meta?.tracks?.join('/') ?? '?'} / ${meta?.case_type ?? '?'}]: ${c}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
