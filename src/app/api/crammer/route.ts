import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generatePreCaseCrammer } from '@/lib/groq/pre-case-crammer';
import type { Track } from '@/lib/tracks';

// Generates (or returns cached) pre-case crammer for the given case.
// Pulls user's preferred_track + their weakest dimensions across last 10
// sessions to personalize the watch-outs.
export async function POST(req: NextRequest) {
  const { caseId } = await req.json();
  if (!caseId) return NextResponse.json({ error: 'caseId required' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, title, problem_statement, pre_case_crammer')
    .eq('id', caseId)
    .single();
  if (!caseRow) return NextResponse.json({ error: 'case not found' }, { status: 404 });

  // Cached?
  if (caseRow.pre_case_crammer) {
    return NextResponse.json({ crammer: caseRow.pre_case_crammer, cached: true });
  }

  // Personalize: track + weakest dims from last 10 completed sessions
  const track: Track = (user.user_metadata?.preferred_track as Track) || 'consulting';

  const { data: lastSessions } = await supabase
    .from('sessions')
    .select('score_breakdown')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('ended_at', { ascending: false })
    .limit(10);

  const weakest = computeWeakestDimensions(lastSessions || []);

  let crammer = null;
  let errorDetail = null;
  try {
    crammer = await generatePreCaseCrammer(
      caseRow.title,
      caseRow.problem_statement || '',
      track,
      weakest
    );
  } catch (err) {
    errorDetail = (err as Error).message.slice(0, 300);
    console.error('[crammer] generation failed:', errorDetail);
  }

  if (crammer) {
    const admin = createSupabaseAdminClient();
    await admin.from('cases').update({ pre_case_crammer: crammer }).eq('id', caseId);
    return NextResponse.json({ crammer });
  }

  return NextResponse.json({ crammer: null, error: errorDetail || 'crammer generation returned null' }, { status: 200 });
}

function computeWeakestDimensions(sessions: { score_breakdown: any }[]): string[] {
  const totals: Record<string, { sum: number; count: number; max: number }> = {};
  for (const s of sessions) {
    const b = s.score_breakdown || {};
    for (const [k, v] of Object.entries(b)) {
      if (typeof v !== 'number' || k === 'total') continue;
      if (!totals[k]) totals[k] = { sum: 0, count: 0, max: 0 };
      totals[k].sum += v as number;
      totals[k].count++;
      totals[k].max = Math.max(totals[k].max, v as number);
    }
  }
  const ratios = Object.entries(totals).map(([k, t]) => ({
    dim: k,
    ratio: t.count ? t.sum / t.count / (t.max || 1) : 1,
  }));
  ratios.sort((a, b) => a.ratio - b.ratio);
  return ratios.slice(0, 3).map((r) => r.dim);
}
