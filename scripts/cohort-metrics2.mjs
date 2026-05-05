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
  // Discover cases columns
  const { data: oneCase } = await sb.from('cases').select('*').limit(1);
  console.error('CASE COLUMNS:', oneCase?.[0] ? Object.keys(oneCase[0]).join(', ') : 'none');

  const { data: sessions } = await sb.from('sessions').select('*');
  const { data: authResp } = await sb.auth.admin.listUsers();
  const authUsers = authResp?.users ?? [];
  const userById = new Map(authUsers.map((u) => [u.id, u]));

  const cohortIds = new Set(
    authUsers.filter((u) => COHORT_EMAILS.includes(u.email)).map((u) => u.id),
  );
  const cohortSessions = sessions.filter((s) => cohortIds.has(s.user_id));

  // Inspect one cohort session to understand transcript / duration semantics
  console.error('Sample cohort session:', JSON.stringify(cohortSessions[0], null, 2).slice(0, 2000));

  // Compute engagement duration from started_at -> ended_at (treat ended_at as last-activity ts)
  for (const s of cohortSessions.slice(0, 5)) {
    const dur = s.started_at && s.ended_at ? (new Date(s.ended_at) - new Date(s.started_at)) / 60000 : null;
    const turns = Array.isArray(s.transcript) ? s.transcript.length : 0;
    console.error(
      `  user=${userById.get(s.user_id)?.email} status=${s.status} dur_min=${dur?.toFixed(1)} turns=${turns} score=${s.score} case=${s.case_id.slice(0, 8)}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
