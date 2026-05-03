import { directSignIn } from '@/server-actions/direct-signin';

// Cohort access — pure email-only sign-in. If the email is on the allowlist,
// the server action mints a session immediately and redirects to /cases.
// No inbox round-trip, no magic link, no password.
//
// Trade-off (explicit): anyone who knows an allowlisted email can sign in
// as that person. Acceptable for a private 5-30 cohort with low-stakes
// content (case-solve transcripts only).

const ERROR_MESSAGES: Record<string, string> = {
  'missing-email': 'Please enter your email.',
  'invalid-email': 'That doesn’t look like a valid email.',
  'link-mint-failed': 'Couldn’t prepare your sign-in. Try again in a moment.',
  'verify-failed': 'Sign-in failed. Try again — if this keeps happening, ping the admin.',
  'expired': 'Your session expired. Sign in again to pick up where you left off.',
  'exchange': 'Sign-in link is invalid or expired. Try entering your email again.',
  'otp': 'Sign-in code is invalid or expired. Try entering your email again.',
  'rate-limited': 'Too many sign-in attempts. Please wait a minute and try again.',
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string }> }) {
  const sp = await searchParams;
  const errMsg = sp.error ? ERROR_MESSAGES[sp.error] : null;
  const returnTo = sp.return_to;
  const showSessionExpired = sp.error === 'expired' || !!sp.return_to;

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <h1 className="text-3xl font-semibold">CasePad</h1>

        {showSessionExpired && (
          <div className="rounded-md border border-indigo-800 bg-indigo-950/40 p-3 text-xs text-indigo-200">
            🔑 Your session expired. Sign in again to pick up where you left off.
          </div>
        )}

        <p className="text-zinc-400 text-sm">
          Cohort access. Enter the email on the allowlist — we&apos;ll sign you in immediately.
        </p>

        <form action={directSignIn} className="space-y-3">
          <input
            name="email"
            type="email"
            placeholder="you@school.edu"
            required
            autoFocus
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
          />
          {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
          <button
            type="submit"
            className="w-full rounded-md bg-white text-zinc-900 py-2 font-medium hover:bg-zinc-200 transition"
          >
            Sign in
          </button>
          {errMsg && (
            <div className="text-xs text-rose-400 text-left">{errMsg}</div>
          )}
        </form>

        <div className="text-[10px] text-zinc-600 leading-relaxed">
          Not on the allowlist? Ask the admin (your cohort lead) to add your email at /admin/allowlist.
        </div>
        <div className="text-[9px] text-zinc-700 leading-relaxed">
          By signing in, you agree to the{' '}
          <a href="/terms" className="underline hover:text-zinc-500">Terms of Use</a>{' '}
          (allowlist-only · no copying · no scraping · personal use).
        </div>
      </div>
    </main>
  );
}
