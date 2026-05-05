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
// owner = ashutosh.25011@ssb.scaler.com — exclude from cohort metrics

async function main() {
  const [{ data: allow }, { data: sessions }, { data: feedback }, { data: notes }, authResp] =
    await Promise.all([
      sb.from('email_allowlist').select('*'),
      sb.from('sessions').select('*'),
      sb.from('session_feedback').select('*'),
      sb.from('cohort_notes').select('*'),
      sb.auth.admin.listUsers(),
    ]);

  const authUsers = authResp.data?.users ?? [];
  const userById = new Map(authUsers.map((u) => [u.id, u]));
  const ownerEmail = 'ashutosh.25011@ssb.scaler.com';

  // Cohort sign-in (5 cohort members, excluding owner)
  const signedInCohort = authUsers.filter(
    (u) => COHORT_EMAILS.includes(u.email) && u.last_sign_in_at,
  );

  // Filter to last 24h cutoff for "post-ship" — ship was 2026-05-03
  // We'll report all sessions from cohort users
  const cohortUserIds = new Set(
    authUsers.filter((u) => COHORT_EMAILS.includes(u.email)).map((u) => u.id),
  );
  const ownerId = authUsers.find((u) => u.email === ownerEmail)?.id;

  const cohortSessions = sessions.filter((s) => cohortUserIds.has(s.user_id));
  const ownerSessions = sessions.filter((s) => s.user_id === ownerId);

  // Stats
  const completed = cohortSessions.filter((s) => s.status === 'completed' || s.ended_at);
  const completionRate = cohortSessions.length
    ? ((completed.length / cohortSessions.length) * 100).toFixed(0)
    : 0;

  const durationsMs = cohortSessions
    .filter((s) => s.started_at && s.ended_at)
    .map((s) => new Date(s.ended_at) - new Date(s.started_at));
  const avgDurMin = durationsMs.length
    ? (durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 60000).toFixed(1)
    : 'n/a';

  // Track distribution
  const trackCounts = {};
  for (const s of cohortSessions) {
    const t = s.track || 'unknown';
    trackCounts[t] = (trackCounts[t] || 0) + 1;
  }

  // Score distribution per user
  const perUser = {};
  for (const s of cohortSessions) {
    const u = userById.get(s.user_id);
    const email = u?.email ?? s.user_id;
    if (!perUser[email]) perUser[email] = { count: 0, completed: 0, scores: [], durations: [] };
    perUser[email].count++;
    if (s.status === 'completed' || s.ended_at) perUser[email].completed++;
    if (typeof s.score === 'number') perUser[email].scores.push(s.score);
    if (s.started_at && s.ended_at) {
      perUser[email].durations.push((new Date(s.ended_at) - new Date(s.started_at)) / 60000);
    }
  }

  // Most-used cases
  const caseCounts = {};
  for (const s of cohortSessions) {
    caseCounts[s.case_id] = (caseCounts[s.case_id] || 0) + 1;
  }
  const topCases = Object.entries(caseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Lookup case titles
  const caseIds = Object.keys(caseCounts);
  let caseTitles = {};
  if (caseIds.length) {
    const { data: cases } = await sb.from('cases').select('id, title, track').in('id', caseIds);
    if (cases) for (const c of cases) caseTitles[c.id] = { title: c.title, track: c.track };
  }

  // Drop-off cases
  const dropoffs = cohortSessions.filter((s) => !s.ended_at && s.status !== 'completed');
  const dropoffByCase = {};
  for (const s of dropoffs) {
    dropoffByCase[s.case_id] = (dropoffByCase[s.case_id] || 0) + 1;
  }

  // Print report
  const allScores = cohortSessions.map((s) => s.score).filter((x) => typeof x === 'number');
  const avgScore = allScores.length
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
    : 'n/a';

  console.log('=== COHORT METRICS ===');
  console.log(`Allowlist: ${allow.length} (cohort: ${COHORT_EMAILS.length} + owner)`);
  console.log(`Auth users total: ${authUsers.length}`);
  console.log(`Cohort signed in: ${signedInCohort.length} / ${COHORT_EMAILS.length}`);
  console.log(
    `Cohort signed-in emails: ${signedInCohort.map((u) => u.email).join(', ') || 'none'}`,
  );
  const notSignedIn = COHORT_EMAILS.filter(
    (e) => !signedInCohort.some((u) => u.email === e),
  );
  console.log(`Cohort NOT signed in: ${notSignedIn.join(', ') || 'none'}`);
  console.log('');
  console.log(`Cohort sessions total: ${cohortSessions.length}`);
  console.log(`Cohort completed: ${completed.length} (${completionRate}%)`);
  console.log(`Cohort avg duration: ${avgDurMin} min`);
  console.log(`Cohort avg score: ${avgScore}`);
  console.log(`Owner sessions (excluded): ${ownerSessions.length}`);
  console.log(`Feedback rows: ${feedback?.length ?? 0}`);
  console.log(`Notes rows: ${notes?.length ?? 0}`);
  console.log('');
  console.log('Track distribution (cohort):');
  for (const [t, c] of Object.entries(trackCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t}: ${c}`);
  }
  console.log('');
  console.log('Per-user breakdown:');
  console.log('email | sessions | completed | avg_score | avg_min');
  for (const email of COHORT_EMAILS) {
    const r = perUser[email];
    if (!r) {
      console.log(`${email} | 0 | 0 | n/a | n/a`);
      continue;
    }
    const avgS =
      r.scores.length > 0 ? (r.scores.reduce((a, b) => a + b, 0) / r.scores.length).toFixed(1) : 'n/a';
    const avgD =
      r.durations.length > 0
        ? (r.durations.reduce((a, b) => a + b, 0) / r.durations.length).toFixed(1)
        : 'n/a';
    console.log(`${email} | ${r.count} | ${r.completed} | ${avgS} | ${avgD}`);
  }
  console.log('');
  console.log('Top cases (cohort):');
  for (const [cid, c] of topCases) {
    const meta = caseTitles[cid];
    console.log(`  ${meta?.title ?? cid} [${meta?.track ?? '?'}]: ${c}`);
  }
  console.log('');
  console.log('Drop-offs (started, not completed):');
  console.log(`  total: ${dropoffs.length}`);
  for (const [cid, c] of Object.entries(dropoffByCase)) {
    const meta = caseTitles[cid];
    console.log(`  ${meta?.title ?? cid}: ${c}`);
  }

  // Also dump raw status counts
  const statusCounts = {};
  for (const s of cohortSessions) statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  console.log('');
  console.log('Status counts:', statusCounts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
