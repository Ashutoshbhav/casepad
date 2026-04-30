'use server';
import { redirect } from 'next/navigation';

export async function endSession(sessionId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error('evaluate failed');
  redirect(`/debrief/${sessionId}`);
}
