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

  const endSessionAction = endSession.bind(null, sessionId);

  return (
    <LiveInterviewSession
      sessionId={sessionId}
      initialMessages={initialMessages}
      endSessionAction={endSessionAction}
    />
  );
}
