import { NextRequest, NextResponse } from 'next/server';
import { withRetry } from '@/lib/supabase/with-retry';
import { extractIssueTree, type IssueTree } from '@/lib/groq/issue-tree';
import { gateRequest } from '@/lib/api/gate';

// POST /api/issue-tree
//
// Body:
//   { sessionId: string, mode: 'get'|'extract'|'save', tree?: IssueTree }
//
// 'get': returns the existing saved tree on the session row (no LLM call,
//   fast — used on panel mount so the user sees their tree instantly).
// 'extract' (default): re-runs LLM extraction from the session's transcript
//   and saves the result on sessions.issue_tree.
// 'save': accepts an explicit tree from the client (after user manually
//   edits a node) and persists it. No LLM call.

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }

  const { sessionId, mode, tree } = body || {};
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return NextResponse.json({ error: 'sessionId (string, ≤100 chars) required' }, { status: 400 });
  }
  if (mode !== undefined && typeof mode !== 'string') {
    return NextResponse.json({ error: 'mode must be a string' }, { status: 400 });
  }
  if (mode && !['get', 'extract', 'save'].includes(mode)) {
    return NextResponse.json({ error: "mode must be 'get'|'extract'|'save'" }, { status: 400 });
  }

  // Mixed mode (get/extract/save) — the 'extract' branch fires a Groq
  // call, the others are cheap DB reads. 30/min covers active panel use.
  const gate = await gateRequest({ routeName: 'issue-tree', perUserPerMinute: 30 });
  if (!gate.ok) return gate.response;
  const { user, supabase } = gate;

  // Confirm the session belongs to the user
  const { data: session } = await withRetry(() =>
    supabase
      .from('sessions')
      .select('id, user_id, transcript, issue_tree, case_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
  );

  if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 });

  if (mode === 'get') {
    return NextResponse.json({ tree: session.issue_tree ?? null });
  }

  if (mode === 'save') {
    if (!tree || typeof tree !== 'object' || Array.isArray(tree)) {
      return NextResponse.json({ error: 'tree (object) required for save mode' }, { status: 400 });
    }
    // Cap tree size at 100KB serialized to prevent abuse
    let serialized: string;
    try { serialized = JSON.stringify(tree); }
    catch { return NextResponse.json({ error: 'tree could not be serialized' }, { status: 400 }); }
    if (serialized.length > 100_000) {
      return NextResponse.json({ error: 'tree too large (>100KB)' }, { status: 413 });
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
  let updated: IssueTree;
  try {
    updated = await extractIssueTree(
      caseRow.title,
      caseRow.problem_statement || '',
      transcript,
      priorTree,
    );
  } catch {
    return NextResponse.json({ error: 'issue tree extraction failed' }, { status: 502 });
  }

  const { error } = await supabase
    .from('sessions')
    .update({ issue_tree: updated })
    .eq('id', sessionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tree: updated });
}
