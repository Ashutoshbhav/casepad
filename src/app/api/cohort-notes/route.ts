import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Cohort spike-library annotations. Scope is "framework:Profitability" or
// "case:<uuid>" or "track:consulting" — flexible. Anyone can read, only
// authed users can write their own.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const scope = url.searchParams.get('scope');
  const scope_id = url.searchParams.get('scope_id');
  if (!scope || !scope_id) return NextResponse.json({ notes: [] });

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('cohort_notes')
    .select('id, body, upvotes, created_at, user_id')
    .eq('scope', scope)
    .eq('scope_id', scope_id)
    .order('upvotes', { ascending: false })
    .limit(20);
  return NextResponse.json({ notes: data || [] });
}

export async function POST(req: NextRequest) {
  const { scope, scope_id, body } = await req.json();
  if (!scope || !scope_id || !body) return NextResponse.json({ error: 'missing fields' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('cohort_notes')
    .insert({ user_id: user.id, scope, scope_id, body: body.slice(0, 1000) })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}
