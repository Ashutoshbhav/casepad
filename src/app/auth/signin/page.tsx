'use client';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignInPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    if (error) {
      setStatus('error');
      setError(error.message);
    } else {
      setStatus('sent');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <h1 className="text-3xl font-semibold">CasePad</h1>
        <p className="text-zinc-400">Cohort access. Enter the email on the allowlist — we'll email you a sign-in link.</p>

        {status === 'sent' ? (
          <div className="rounded-md border border-emerald-800 bg-emerald-900/30 p-4 text-sm text-emerald-200">
            <div className="font-medium mb-1">Check your inbox</div>
            <div className="text-emerald-300/80">A sign-in link is on the way to <span className="text-emerald-100">{email}</span>. Click it to come back here signed in.</div>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              required
              disabled={status === 'sending'}
              className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status === 'sending' || !email.trim()}
              className="w-full rounded-md bg-white text-zinc-900 py-2 font-medium hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            {status === 'error' && (
              <div className="text-xs text-rose-400 text-left">{error}</div>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
