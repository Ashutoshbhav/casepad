import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { extractIssueTree, type IssueTree } from '@/lib/groq/issue-tree';

// POST /api/issue-tree
//
// Body:
//   { sessionId: string, mode: 'extract'|'save', tree?: IssueTree }
//
// 'extract' (default): re-runs LLM extraction from the session's transcript
//   and saves the result on sessions.issue_tree.
// 'save': accepts an explicit tree from the client (after user manually
//   edits a node) and persists it. No LLM call.

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }

  const { sessionId, mode, tree } = body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });

  // Confirm the session belongs to the user
  const { data: session } = await supabase
    .from('sessions')
    .select('id, user_id, transcript, issue_tree, case_id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 });

  if (mode === 'save') {
    if (!tree || typeof tree !== 'object') {
      return NextResponse.json({ error: 'tree required for save mode' }, { status: 400 });
    }
    const { error } = await supabase
      .from('sessions')
      .update({ issue_tree: tree })
      .eq('id', sessionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tree });
  }

  // Default mode: extract from transcript
  const { data: caseRow } = await supabase
    .from('cases')
    .select('title, problem_statement')
    .eq('id', session.case_id)
    .single();
  if (!caseRow) return NextResponse.json({ error: 'case not found' }, { status: 404 });

  const transcript = (session.transcript as any[]) ?? [];
  const priorTree = (session.issue_tree as IssueTree | null) ?? null;
  const updated = await extractIssueTree(
    caseRow.title,
    caseRow.problem_statement || '',
    transcript,
    priorTree,
  );

  const { error } = await supabase
    .from('sessions')
    .update({ issue_tree: updated })
    .eq('id', sessionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tree: updated });
}
