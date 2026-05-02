import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ReplayTourButton } from '@/components/replay-tour-button';

export default async function HowItWorksPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');
  const user = session.user;

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">How CasePad works</h1>
          <p className="text-xs text-zinc-500 mt-1">A reference for the questions that come up first.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <Link href="/cases" className="text-zinc-400 hover:text-zinc-200">← Back to cases</Link>
        </nav>
      </header>

      <div className="space-y-7 sm:space-y-9">
        <Section n={1} title="What is CasePad?">
          <p>
            A cohort case-prep app for B-school students. <Code>1,100+</Code> real cases sourced from
            casebooks (Harvard, Ivey, school books) — no synthetic content. Practice is conversational,
            not multiple choice.
          </p>
          <p>
            Tracks supported: <Code>consulting</Code>, <Code>IB / PE / VC</Code>, <Code>PM</Code>,{' '}
            <Code>marketing</Code>, <Code>strategy / bizops</Code>, and <Code>behavioral</Code>.
          </p>
        </Section>

        <Section n={2} title="How do I solve a case?">
          <p>
            Pick a case from <Code>/cases</Code> and you land in the 3-panel solve arena:{' '}
            <Code>chat</Code> on the left, <Code>issue tree</Code> in the middle, <Code>cheat sheet</Code>{' '}
            on the right.
          </p>
          <p>
            Type your structure, clarifying questions, and math into chat the way you would in a real
            interview. The tree and cheat sheet auto-fill from what you say. When you&apos;re done, click{' '}
            <Code>End session</Code> for a score and an ideal walkthrough.
          </p>
        </Section>

        <Section n={3} title="What's the issue tree?">
          <p>
            The middle panel. AI infers your structure from your chat — you don&apos;t build it by hand.
            Each node gets scored on <Code>MECE</Code>, depth, hypothesis-attached, and root-driven.
          </p>
          <p>
            Click a node to rename it, <Code>×</Code> to delete, drag to re-parent. Hit <Code>↻</Code> to
            force a rebuild from the latest chat.
          </p>
        </Section>

        <Section n={4} title="What's the cheat sheet?">
          <p>
            Auto-extracts <Code>framework</Code>, <Code>hypothesis</Code>, <Code>key numbers</Code>,{' '}
            <Code>decisions</Code>, and <Code>next steps</Code> from your chat. Updates as you talk.
          </p>
          <p>
            Use the <Code>lock</Code> button next to a field to freeze it — locked fields won&apos;t get
            overwritten on the next extraction.
          </p>
        </Section>

        <Section n={5} title="What's the score?">
          <p>
            100-point scale across 7 dimensions for consulting: <Code>Structure 25</Code>,{' '}
            <Code>Quant 20</Code>, <Code>Judgment 15</Code>, <Code>Communication 15</Code>,{' '}
            <Code>Hypothesis Mgmt 10</Code>, <Code>Creativity 10</Code>, <Code>Synthesis 5</Code>.
          </p>
          <p>
            Switching tracks tweaks the weights — IB leans quant-heavy, PM leans judgment + communication,
            marketing leans creativity.
          </p>
        </Section>

        <Section n={6} title="Drills">
          <p>
            Three short-form practice modes outside the case arena:
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-300">
            <li>
              <Code>/math-drill</Code> — mental math at <Code>L1-L4</Code> difficulty, timed.
            </li>
            <li>
              <Code>/behavioral-drill</Code> — STAR responses with LLM scoring.
            </li>
            <li>
              <Code>/drill</Code> — recovery curveballs: silent stretch, contradictory data, hostile
              interviewer, etc.
            </li>
          </ul>
        </Section>

        <Section n={7} title="Industry primer">
          <p>
            See the <Code>📚</Code> button on each card in <Code>/cases</Code>? It loads a pre-case
            industry brief — margins, KPIs, competitors, frameworks specific to that sector.
          </p>
          <p>
            Read this <em>before</em> you click solve. The room itself is intentionally cold — same as a
            real interview, no cheat sheet handed to you on the way in.
          </p>
        </Section>

        <Section n={8} title="Stuck?">
          <p>
            Every <Code>/solve</Code> page has a collapsible{' '}
            <Code>Session stuck or broken? Reset.</Code> at the bottom. It wipes that session&apos;s
            chat, tree, and cheat sheet so you can start the case over without losing the URL.
          </p>
        </Section>

        <Section n={9} title="Tracks">
          <p>
            Switch your track in <Code>/onboarding/track</Code>. This changes which cases show up in{' '}
            <Code>/cases</Code> and tweaks scoring weights to match what that role&apos;s interviews
            actually test.
          </p>
        </Section>

        <Section n={10} title="Replay the tour">
          <p>
            Want the guided tour again? <ReplayTourButton /> — we&apos;ll clear the &quot;tour seen&quot;
            flags and drop you back on <Code>/cases</Code>.
          </p>
        </Section>
      </div>

      <footer className="mt-10 pt-6 border-t border-zinc-800 text-xs text-zinc-500">
        Still stuck? Ping the cohort channel — most issues are 1-line fixes.
      </footer>
    </main>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base sm:text-lg font-semibold text-zinc-100 mb-2 flex items-baseline gap-2">
        <span className="text-emerald-500/80 text-sm font-mono">{String(n).padStart(2, '0')}</span>
        {title}
      </h2>
      <div className="text-sm text-zinc-400 space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-emerald-300 text-[0.85em] font-mono">
      {children}
    </code>
  );
}
