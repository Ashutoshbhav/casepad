import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';
import { withRetry } from '@/lib/supabase/with-retry';
import { endSession } from '@/server-actions/end-session';
import { LiveInterviewSession } from '@/components/live-interview-session';

export default async function LiveInterviewSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { supabase, user } = await requireUser();

  const { data: session, error } = await withRetry(() =>
    supabase
      .from('sessions')
      .select('id, transcript, status, case_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
  );
  if (error || !session) redirect('/live-interview');
  if (session.status === 'completed') redirect(`/debrief/${sessionId}`);

  const initialMessages = (
    (session.transcript as { role: 'user' | 'interviewer'; content: string; timestamp: string }[]) ?? []
  ).map((t) => ({ role: t.role, content: t.content }));

  // Case-based sessions get the problem statement (persistent display) and
  // the issue tree (builds live as the candidate speaks) — neither applies
  // to caseless/behavioral sessions, so both are gated on case_id being set.
  // Not persisted on `sessions` itself (only baked into the opener text at
  // session-start) so it's re-fetched here on every load, same as /solve
  // does from `cases` directly.
  let caseTitle: string | null = null;
  let problemStatement: string | null = null;
  if (session.case_id) {
    const { data: caseRow } = await withRetry(() =>
      supabase.from('cases').select('title, problem_statement').eq('id', session.case_id).maybeSingle()
    );
    caseTitle = caseRow?.title ?? null;
    problemStatement = caseRow?.problem_statement ?? null;
  }

  const endSessionAction = endSession.bind(null, sessionId);

  return (
    <LiveInterviewSession
      sessionId={sessionId}
      initialMessages={initialMessages}
      endSessionAction={endSessionAction}
      caseTitle={caseTitle}
      problemStatement={problemStatement}
    />
  );
}
