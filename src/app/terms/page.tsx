import Link from 'next/link';

// User-facing terms. Linked from /auth/signin. Keep concise + plain-language.

export default function TermsPage() {
  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-3xl mx-auto text-zinc-700">
      <Link href="/auth/signin" className="text-sm text-zinc-600 hover:text-zinc-900">← back to sign in</Link>
      <h1 className="text-2xl sm:text-3xl font-semibold mt-3 mb-2 text-zinc-900">Terms of Use</h1>
      <p className="text-xs text-zinc-600 mb-8">Last updated: 2026-05-03</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">1. Access</h2>
          <p>
            CasePad is currently free to use for case-interview practice. Access may be open to
            any verified email (public mode) or restricted to an admin-managed allowlist
            (cohort mode) depending on the current launch phase. Either way, please don&apos;t
            share your account credentials with anyone else.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">2. Personal use only</h2>
          <p>
            You may use CasePad to practice case interviews for your own preparation. You may not
            use the service for commercial purposes, to train other AI models, or to provide
            services to third parties.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">3. No copying or replication</h2>
          <p>
            The application&apos;s code, prompts, scoring rubrics, case dataset, frameworks, math
            drills, behavioral questions, and overall design are the exclusive intellectual
            property of the author. You may not copy, redistribute, mirror, or build a derivative
            work — whether by hand, with AI assistance, or by any combination — that reproduces
            the user-facing experience or underlying data model.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">4. No scraping</h2>
          <p>
            Automated probing, bulk extraction of cases, or any sustained programmatic crawl of
            this application is prohibited. Such activity may constitute unauthorized access
            under applicable computer-misuse laws.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">5. Privacy</h2>
          <p>
            Your session transcripts, scores, and notes are visible only to you and to the
            application administrator. They are not shared with other cohort members. The
            administrator may use aggregate data to improve the application.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">6. No warranty</h2>
          <p>
            The service is provided &quot;as is&quot;. The author makes no guarantees about
            availability, accuracy of AI-generated feedback, or fitness for any particular
            interview. Use it as practice — not as a substitute for real preparation.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-900 mb-1.5">7. Termination</h2>
          <p>
            The administrator may remove your access at any time, for any reason, by removing
            your email from the allowlist.
          </p>
        </div>
      </section>
    </main>
  );
}
