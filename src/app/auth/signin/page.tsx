'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'rate_limited'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState<string>('/cases');
  const [expiredHint, setExpiredHint] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const rt = sp.get('return_to');
    if (rt && rt.startsWith('/') && !rt.startsWith('//')) setReturnTo(rt);
    if (sp.get('error') === 'expired' || sp.has('return_to')) setExpiredHint(true);
  }, []);

  // Cooldown timer: ticks down once per second while >0.
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setTimeout(() => setCooldownLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldownLeft]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (cooldownLeft > 0) return;
    setStatus('sending');
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const callbackUrl = `${window.location.origin}/auth/callback?return_to=${encodeURIComponent(returnTo)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: callbackUrl,
        shouldCreateUser: true,
      },
    });
    if (error) {
      // Detect Supabase rate-limit response. The SDK surfaces 429 via either
      // `status` (HTTP) or a message like "rate limit exceeded" / "too many".
      const msg = (error.message || '').toLowerCase();
      // AuthApiError carries `.status` as the HTTP status; treat any 429 or
      // rate-limit-shaped message as a soft cooldown trigger.
      const errStatus = (error as { status?: number }).status;
      const isRateLimited = errStatus === 429 || /rate.?limit|too many|too.?frequent/i.test(msg);
      if (isRateLimited) {
        setStatus('rate_limited');
        setError(null);
        // Disable submit for 30s so the user can't keep mashing the button.
        setCooldownLeft(30);
      } else {
        setStatus('error');
        setError(error.message);
      }
    } else {
      setStatus('sent');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <h1 className="text-3xl font-semibold">CasePad</h1>
        {expiredHint && (
          <div className="rounded-md border border-indigo-800 bg-indigo-950/40 p-3 text-xs text-indigo-200">
            🔑 Your session expired. Sign in again to pick up where you left off.
          </div>
        )}
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
              disabled={status === 'sending' || !email.trim() || cooldownLeft > 0}
              className="w-full rounded-md bg-white text-zinc-900 py-2 font-medium hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'sending'
                ? 'Sending…'
                : cooldownLeft > 0
                ? `Wait ${cooldownLeft}s…`
                : 'Email me a sign-in link'}
            </button>
            {status === 'rate_limited' && (
              <div className="rounded-md border border-amber-700 bg-amber-950/40 p-3 text-xs text-amber-200 text-left">
                ⏱ Too many requests — wait 60 seconds before trying again.
              </div>
            )}
            {status === 'error' && (
              <div className="text-xs text-rose-400 text-left">{error}</div>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
