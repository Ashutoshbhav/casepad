import Link from 'next/link';

// User-facing privacy policy. Linked from /auth/signin alongside /terms.
// Required for the public LinkedIn launch — covers what CasePad collects,
// where it's stored, who it's shared with (LLM providers), retention,
// cookies, and India DPDP user rights (delete, export, correction).
//
// Plain-language style intentionally — matches /terms. Keep sections
// short so users actually read them.

export default function PrivacyPage() {
  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-3xl mx-auto text-zinc-700">
      <Link href="/auth/signin" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← back to sign in
      </Link>
      <h1 className="text-2xl sm:text-3xl font-semibold mt-3 mb-2 text-zinc-900">Privacy Policy</h1>
      <p className="text-xs text-zinc-600 mb-8">Last updated: 2026-05-29</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">1. What we collect</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Account info:</strong> your email address (via OAuth from your sign-in
              provider — Google) and a unique user ID. We don&apos;t see your password.
            </li>
            <li>
              <strong>Practice data:</strong> the case interview transcripts you generate, the
              cheatsheet notes derived from them, your evaluation scores, and the daily case
              assignments tied to your account.
            </li>
            <li>
              <strong>Voice (optional):</strong> when you use the mic button, the audio recording
              is sent to Groq&apos;s Whisper API for transcription. We don&apos;t store the audio
              file; only the resulting text is saved as part of your session transcript.
            </li>
            <li>
              <strong>Real-interview logs (optional):</strong> if you use the &quot;Real
              interviews&quot; feature, we store what you choose to enter — firm name, date,
              outcome, what was asked, and any verification text you paste. This is owner-scoped
              and never visible to other users.
            </li>
            <li>
              <strong>Cohort notes (optional):</strong> notes you choose to publish to the cohort
              spike library are visible to other authenticated users.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">
            2. What we don&apos;t collect
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>No third-party advertising cookies or trackers.</li>
            <li>No browsing-behaviour data outside CasePad.</li>
            <li>No location data.</li>
            <li>No payment information (the product is free).</li>
            <li>
              We don&apos;t train AI models on your data. Your transcripts are not used to improve
              Groq / NVIDIA / Cerebras models — those providers process them as customer data only
              and discard them per their own policies.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">3. Where it&apos;s stored</h2>
          <p>
            Your account data and practice transcripts are stored in Supabase Postgres,
            US-East region. Authentication is handled by Supabase Auth. All connections use HTTPS;
            data at rest is encrypted by Supabase.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">
            4. Who else sees your data
          </h2>
          <p>
            To generate AI interviewer replies, your conversation turns are sent to one of these
            providers (whichever responds first): Groq, NVIDIA NIM, or Cerebras. They process the
            text as inference input and don&apos;t retain it after the response is delivered. For
            the &quot;company pack&quot; feature, the firm name you enter is sent to Tavily as a
            web-search query. No other third party receives your data.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">5. Cookies</h2>
          <p>
            We use exactly one category of cookies: Supabase Auth session cookies, set when you
            sign in. They keep you logged in across page refreshes. We don&apos;t use any analytics,
            ad, or third-party cookies. Clearing your cookies signs you out.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">6. Retention</h2>
          <p>
            We keep your account data and transcripts for as long as your account is active. If
            you stop using CasePad and want your data removed, see section 7 below.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">
            7. Your rights (India DPDP Act + general)
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Export:</strong> Email us and we will send you a JSON export of every row
              tied to your user ID.
            </li>
            <li>
              <strong>Delete:</strong> Email us and we will permanently delete your account,
              transcripts, cheatsheets, interview-outcome logs, and any cohort notes you authored.
              Deletion is within 14 days of request.
            </li>
            <li>
              <strong>Correction:</strong> You can edit or delete cohort notes you authored
              directly in the product; for any other field, email us.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">8. Contact</h2>
          <p>
            For privacy questions, data export, or deletion requests: email{' '}
            <a
              href="mailto:ashutosh.25011@ssb.scaler.com"
              className="underline hover:text-zinc-900"
            >
              ashutosh.25011@ssb.scaler.com
            </a>
            . We respond within 7 days.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">9. Changes to this policy</h2>
          <p>
            If we materially change this policy, we&apos;ll update the &quot;Last updated&quot;
            date at the top and email signed-in users about the change before it takes effect.
          </p>
        </div>
      </section>

      <div className="mt-12 pt-6 border-t border-zinc-300 text-xs text-zinc-600">
        <Link href="/terms" className="hover:text-zinc-900">
          ← View Terms of Use
        </Link>
      </div>
    </main>
  );
}
