// scripts/qa/show-my-recent-session.ts
// One-shot: pull Ash's most recent session via service-role, print the
// transcript + case title + score so we can review live behavior post-deploy.
//
// Usage: npx tsx --env-file=.env.local scripts/qa/show-my-recent-session.ts

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }
  if (!adminEmail) {
    console.error('Missing ADMIN_EMAIL in env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error: uErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (uErr) {
    console.error('listUsers failed:', uErr);
    process.exit(1);
  }
  const me = users?.users.find((u) => u.email === adminEmail);
  if (!me) {
    console.error(`No user found with email ${adminEmail}`);
    process.exit(1);
  }
  console.log(`User: ${me.email} (${me.id})`);

  const { data: sessions, error: sErr } = await supabase
    .from('sessions')
    .select('id, case_id, status, score, score_breakdown, started_at, ended_at, transcript, track')
    .eq('user_id', me.id)
    .order('started_at', { ascending: false })
    .limit(3);

  if (sErr) {
    console.error('sessions query failed:', sErr);
    process.exit(1);
  }
  if (!sessions || sessions.length === 0) {
    console.log('No sessions found for this user.');
    return;
  }

  for (const s of sessions) {
    const { data: caseRow } = await supabase
      .from('cases')
      .select('title, problem_statement')
      .eq('id', s.case_id)
      .single();
    const turns = (s.transcript as any[]) ?? [];
    const userTurns = turns.filter((t) => t.role === 'user').length;
    const interviewerTurns = turns.filter((t) => t.role === 'interviewer').length;
    const startedAt = new Date(s.started_at);
    const endedAt = s.ended_at ? new Date(s.ended_at) : null;
    const durationMin = endedAt
      ? Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)
      : Math.round((Date.now() - startedAt.getTime()) / 60000);

    console.log('\n' + '='.repeat(70));
    console.log(`SESSION ${s.id}`);
    console.log(`Case   : ${caseRow?.title || '(unknown)'}`);
    console.log(`Track  : ${s.track || '(none)'}`);
    console.log(`Status : ${s.status} | Score: ${s.score ?? 'n/a'} | Turns: ${userTurns}u/${interviewerTurns}i | Duration: ${durationMin}min`);
    console.log(`Started: ${startedAt.toISOString()}${endedAt ? ` | Ended: ${endedAt.toISOString()}` : ''}`);
    console.log('-'.repeat(70));

    if (s.score_breakdown) {
      const b = s.score_breakdown as any;
      console.log('Score breakdown:');
      if (b.dimensions) {
        for (const [k, v] of Object.entries(b.dimensions)) {
          console.log(`  ${k}: ${v}`);
        }
      }
      if (b.strengths?.length) console.log('  Strengths:', JSON.stringify(b.strengths));
      if (b.gaps?.length) console.log('  Gaps:', JSON.stringify(b.gaps));
      if (b.fallback_used) console.log('  ⚠️  fallback_used=true (LLM unavailable at scoring time)');
    }

    console.log('\nTranscript:');
    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      const tag = t.role === 'user' ? 'CANDIDATE' : 'ASH      ';
      const content = String(t.content || '').slice(0, 600);
      console.log(`\n[${i}] ${tag}: ${content}${(t.content || '').length > 600 ? '…[truncated]' : ''}`);
      if (t.citations && Array.isArray(t.citations) && t.citations.length > 0) {
        console.log(`    citations: ${t.citations.map((c: any) => `§${c.section}`).join(' · ')}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
