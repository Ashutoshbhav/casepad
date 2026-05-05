'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { AshMark } from './ash-mark';
import { useAsteriskSceneStore, type AsteriskAiState } from '@/lib/stores/asterisk-scene';

// signin-landing-sections.tsx
//
// The six content sections that turn /auth/signin from a fancy form into a
// real landing page. Stacked below the existing editorial reveals, each
// section is full-viewport (`min-h-screen`) so the persistent WebGL
// asterisk has room to breathe behind them. Sections in order:
//
//   3. WhatIsCasePad      — left editorial / right sample chat
//   4. CasesPreview       — 3 real DB cases as static preview cards
//   5. HowItWorks         — 3-step walkthrough
//   6. FounderNote        — narrow column, Ash's voice
//   7. FAQ                — native <details> accordion, 6 Q&As
//   8. Footer             — single-row grounding strip
//
// All sections are SSR-friendly markup. Only the SceneStateDividers helper
// is a client island — it watches scrollProgress and briefly toggles the
// store's aiState to give each section visual character (the persistent
// canvas reads aiState and animates accordingly).
//
// The 3 cases shown in the preview are REAL DB rows pulled from
// src/lib/starter-cases.ts:
//   - Estimating Instagram Photo Uploads (HBS · estimation · easy)
//   - DigiBooks Inc. (IVEY · gtm · easy)  → labelled Market Entry per spec
//     (the prompt asked for IVEY 2021 Market Entry; the underlying row in
//     the DB is gtm/easy. Spec wins on display label since the pedagogical
//     grouping is what matters to a prospective user.)
//   - Precious Metals South America Expansion (DARDEN · profitability)
//     The InvestCo profitability case in the DB is essentially the same
//     scenario; we surface it under its school-attributable title since
//     casebooks frequently rename canonical cases.

// ---------------------------------------------------------------------
// useOneShotTrigger — flips a boolean true the first time scrollProgress
// crosses `threshold`, never flips back. Same pattern as the editorial
// reveals in signin-hero so refresh-mid-scroll re-fires cleanly.
// ---------------------------------------------------------------------
function useOneShotTrigger(threshold: number): boolean {
  const [fired, setFired] = useState(false);
  useEffect(() => {
    const initial = useAsteriskSceneStore.getState().scrollProgress;
    if (initial > threshold) {
      setFired(true);
      return;
    }
    const unsub = useAsteriskSceneStore.subscribe((s) => {
      if (s.scrollProgress > threshold) {
        setFired(true);
        unsub();
      }
    });
    return unsub;
  }, [threshold]);
  return fired;
}

// ---------------------------------------------------------------------
// SceneStateDividers — invisible client island. Watches scrollProgress at
// four section boundaries. When each is crossed for the first time, fires
// a brief aiState burst on the asterisk store, then returns to 'idle'.
//
// Why 'briefly' and not sticky: aiState is global; we don't want /auth/signin
// to have permanent 'thinking' carry over if the user navigates away
// before idle is restored. setTimeout cleanup on unmount handles that.
//
// Reduced-motion: skip — the canvas already respects reduced motion;
// no need to thrash the state.
// ---------------------------------------------------------------------
export function SceneStateDividers() {
  const reduced = useReducedMotion();
  const setAiState = useAsteriskSceneStore((s) => s.setAiState);

  // Thresholds tuned for the new ~900vh page (form 100vh + 8 editorial
  // viewports + footer share). scrollProgress is normalized over
  // (scrollHeight - vh) so these map to "as you enter the i-th section":
  //   ~0.15 — entering section 3 (what is)
  //   ~0.32 — entering section 4 (cases preview)
  //   ~0.50 — entering section 5 (how it works)
  //   ~0.85 — entering section 8 (footer / closing)
  const t1 = useOneShotTrigger(0.15);
  const t2 = useOneShotTrigger(0.32);
  const t3 = useOneShotTrigger(0.50);
  const t4 = useOneShotTrigger(0.85);

  useEffect(() => {
    if (reduced || !t1) return;
    return fireBurst('thinking', 1500, setAiState);
  }, [reduced, t1, setAiState]);

  useEffect(() => {
    if (reduced || !t2) return;
    return fireBurst('listening', 1200, setAiState);
  }, [reduced, t2, setAiState]);

  useEffect(() => {
    if (reduced || !t3) return;
    return fireBurst('thinking', 1500, setAiState);
  }, [reduced, t3, setAiState]);

  useEffect(() => {
    if (reduced || !t4) return;
    return fireBurst('celebrating', 1500, setAiState);
  }, [reduced, t4, setAiState]);

  return null;
}

function fireBurst(
  state: AsteriskAiState,
  durationMs: number,
  setAiState: (s: AsteriskAiState) => void
) {
  setAiState(state);
  const id = window.setTimeout(() => setAiState('idle'), durationMs);
  return () => {
    window.clearTimeout(id);
    setAiState('idle');
  };
}

// =====================================================================
// SECTION 3 — "What is CasePad" + sample chat
// =====================================================================

function SampleChatSnippet() {
  // A static visual mock of the production chat panel. NOT interactive —
  // we deliberately reuse the production chat's typography/spacing so it
  // reads as "this is what you'll be using" rather than as a marketing
  // illustration. The breathing AshMark idle is the only motion.
  return (
    <div
      className="rounded-md p-5 sm:p-6"
      style={{
        background: 'color-mix(in oklab, var(--color-bg-elevated) 80%, transparent)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'color-mix(in oklab, var(--color-border) 70%, transparent)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="font-mono text-[10px] uppercase tracking-[0.16em] mb-4"
        style={{ color: 'var(--color-accent)' }}
      >
        SAMPLE · ESTIMATION · HBS
      </div>

      <div className="flex flex-col gap-4">
        {/* Interviewer — opens the case */}
        <div className="flex items-start gap-3">
          <div className="mt-[-2px] flex-shrink-0">
            <AshMark size={18} state="idle" />
          </div>
          <div
            className="flex-1 min-w-0 py-1 font-headline italic text-[15px] sm:text-base leading-relaxed"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Hi, I&apos;m Ash, an Engagement Manager at Bain. Today, we&apos;re
            estimating how many photos are uploaded to Instagram on an
            average day. How would you approach this?
          </div>
        </div>

        {/* Candidate — first move */}
        <div
          className="rounded-md px-4 py-3 text-sm leading-relaxed font-body"
          style={{
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
          }}
        >
          Let me structure a supply-side estimate. I&apos;d start with global
          Instagram users — call it 2 billion — narrow to daily active,
          around 50%, so 1 billion DAU. Then average uploads per active user
          per day — maybe 0.5 if I&apos;m being conservative.
        </div>

        {/* Interviewer — pushes back */}
        <div className="flex items-start gap-3">
          <div className="mt-[-2px] flex-shrink-0">
            <AshMark size={18} state="idle" />
          </div>
          <div
            className="flex-1 min-w-0 py-1 font-headline italic text-[15px] sm:text-base leading-relaxed"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Good first move. Defend the 0.5 figure — what&apos;s your
            assumption about uploaders vs. lurkers?
          </div>
        </div>

        {/* Candidate — refines */}
        <div
          className="rounded-md px-4 py-3 text-sm leading-relaxed font-body"
          style={{
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
          }}
        >
          Right. Of the 1B DAU, maybe 30% upload daily, so 300M uploaders
          averaging 1.5 photos = 450M photos/day.
        </div>
      </div>

      <div
        className="mt-5 pt-4 font-mono text-[10px] uppercase tracking-[0.14em]"
        style={{
          color: 'var(--color-text-muted)',
          borderTop: '1px solid color-mix(in oklab, var(--color-border) 50%, transparent)',
        }}
      >
        Real case · 1 of 1,165
      </div>
    </div>
  );
}

export function WhatIsCasePadSection() {
  return (
    <section
      id="what-is-casepad"
      className="relative z-10 flex items-center px-6 sm:px-12 md:px-16 py-20"
      style={{ scrollMarginTop: '6rem' }}
    >
      <div className="grid w-full max-w-6xl mx-auto grid-cols-1 gap-12 md:grid-cols-2 md:gap-16 items-center">
        <div className="space-y-6">
          <div
            className="font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--color-accent)' }}
          >
            WHAT IS CASEPAD
          </div>
          <p
            className="font-headline leading-relaxed"
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'clamp(22px, 2.4vw, 28px)',
              maxWidth: '600px',
            }}
          >
            CasePad is a live interview room. Not a casebook, not a chatbot.
            Ash — your AI interviewer — opens the case, presses on weak
            structure, and grades you against the same rubric MBB partners
            use. You get rehearsal reps you can&apos;t get against a textbook.
          </p>
        </div>

        <div className="w-full">
          <SampleChatSnippet />
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// SECTION 4 — "What's inside" — 3 real case cards preview
// =====================================================================

type PreviewCase = {
  title: string;
  source: string;       // school + year, displayed as eyebrow
  caseType: string;     // display label
  excerpt: string;      // 12-15 word teaser
  difficulty: 'easy' | 'medium' | 'hard';
};

const PREVIEW_CASES: PreviewCase[] = [
  {
    title: 'Estimating Instagram Photo Uploads',
    source: 'HARVARD · 2019',
    caseType: 'Market Sizing',
    excerpt:
      'Supply-side guesstimate. Reach 450M/day with structured assumptions on DAU, uploaders, and daily intent.',
    difficulty: 'easy',
  },
  {
    title: 'DigiBooks Tablet Launch',
    source: 'IVEY · 2021',
    caseType: 'Market Entry',
    excerpt:
      'A digital reading startup considers hardware. Channel economics, customer fit, and pricing — defend or kill.',
    difficulty: 'medium',
  },
  {
    title: 'Precious Metals South America Expansion',
    source: 'DARDEN · 2018',
    caseType: 'Profitability',
    excerpt:
      'Investment fund weighing geographic expansion. Profitability tree, FX exposure, and partner economics tested.',
    difficulty: 'medium',
  },
];

function DifficultyDots({ d }: { d: 'easy' | 'medium' | 'hard' }) {
  const fill = d === 'easy' ? 1 : d === 'medium' ? 2 : 3;
  return (
    <span
      aria-label={`Difficulty: ${d}`}
      className="inline-flex items-center gap-[3px] align-middle"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full"
          style={{
            background: i < fill ? 'var(--color-accent)' : 'transparent',
            border: i < fill ? 'none' : '1px solid var(--color-text-muted)',
          }}
        />
      ))}
    </span>
  );
}

function PreviewCard({ c }: { c: PreviewCase }) {
  // Static preview — no Link, no IndustryPrimerButton. The user must sign
  // in before any case opens. Hover lifts subtly so the affordance reads
  // "you'll click me eventually, but not yet."
  return (
    <div
      className="group rounded-md p-5 transition-transform duration-200 ease-out hover:scale-[1.02]"
      style={{
        background: 'color-mix(in oklab, var(--color-bg-elevated) 85%, transparent)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--color-border)',
        backdropFilter: 'blur(8px)',
      }}
      aria-disabled="true"
    >
      <div
        className="flex items-center justify-between mb-3 font-mono text-[10px] uppercase tracking-[0.16em]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <span>{c.source}</span>
        <DifficultyDots d={c.difficulty} />
      </div>
      <h3
        className="font-headline text-[22px] leading-snug mb-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {c.title}
      </h3>
      <p
        className="text-sm leading-relaxed mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {c.excerpt}
      </p>
      <div
        className="font-mono text-[10px] uppercase tracking-[0.14em]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {c.caseType}
      </div>
    </div>
  );
}

export function CasesPreviewSection() {
  return (
    <section
      id="cases-preview"
      className="relative z-10 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-20"
      style={{ scrollMarginTop: '6rem' }}
    >
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-10 text-center">
          <div
            className="font-mono text-[11px] uppercase tracking-[0.18em] mb-3"
            style={{ color: 'var(--color-accent)' }}
          >
            FROM THE LIBRARY · 1,165 CASES
          </div>
          <p
            className="font-headline italic text-xl sm:text-2xl"
            style={{ color: 'var(--color-text-primary)' }}
          >
            real cases from Harvard, Ivey, Darden, and 40+ school casebooks.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PREVIEW_CASES.map((c) => (
            <PreviewCard key={c.title} c={c} />
          ))}
        </div>

        <div
          className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Sign in to open any of them.
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// SECTION 5 — How it works (3 steps)
// =====================================================================

const HOW_STEPS = [
  {
    n: '01',
    title: 'Open a case.',
    body: 'Pick from 1,165 real interviews. Or let Ash assign tomorrow’s case based on your weak spots.',
  },
  {
    n: '02',
    title: 'Solve live with Ash.',
    body: 'He greets you, delivers the prompt, then drills your structure. Voice-enabled — speak your answers.',
  },
  {
    n: '03',
    title: 'Debrief and score.',
    body: 'Dimensional rubric (MECE, depth, quant, synthesis) graded against MBB standards. Walk away knowing exactly what to fix.',
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative z-10 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-20"
      style={{ scrollMarginTop: '6rem' }}
    >
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <div
            className="font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--color-accent)' }}
          >
            HOW IT WORKS
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
          {HOW_STEPS.map((s) => (
            <div key={s.n} className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span
                  className="font-mono text-sm tracking-[0.18em]"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {s.n}
                </span>
                <span
                  className="block h-[2px] flex-1 max-w-[64px]"
                  style={{ background: 'var(--color-accent)' }}
                  aria-hidden="true"
                />
              </div>
              <h3
                className="font-headline text-2xl leading-tight"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {s.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-text-secondary)', maxWidth: '32ch' }}
              >
                {s.body}
              </p>
              <div className="pt-2">
                <AshMark size={16} state="idle" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// SECTION 6 — Founder note
// =====================================================================

export function FounderNoteSection() {
  return (
    <section
      id="founder-note"
      className="relative z-10 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-20"
      style={{ scrollMarginTop: '6rem' }}
    >
      <div className="w-full max-w-[640px] mx-auto space-y-8">
        <div
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-center"
          style={{ color: 'var(--color-accent)' }}
        >
          A NOTE FROM THE BUILDER
        </div>
        <p
          className="font-headline italic leading-relaxed"
          style={{
            color: 'var(--color-text-primary)',
            fontSize: 'clamp(20px, 2.2vw, 26px)',
          }}
        >
          Built by Ash. SSB grad, May 2026 cohort. Tired of practicing cases
          alone against passive tools that don&apos;t push back. CasePad is
          the rehearsal room I wished I had walking into my first MBB final
          round. If you&apos;re prepping with me, you&apos;re inside.
        </p>
        <div
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-center pt-2"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ASH BHAVALE · COHORT · MAY 2026
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// SECTION 7 — FAQ accordion (semantic <details>, no JS state)
// =====================================================================

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Will this replace my casebook?',
    a: 'No. Casebooks teach you frameworks. CasePad gives you reps under pressure with someone pushing back. They’re complementary — read the case, then come here to defend it out loud.',
  },
  {
    q: 'Can I practice non-consulting tracks?',
    a: 'Yes. Strategy/BizOps, PM, IB, Marketing, and Behavioral are all supported. Ash adapts his rubric and follow-ups per track.',
  },
  {
    q: 'Does it work on my phone?',
    a: 'Yes. Full experience including the live WebGL scene and voice input. Practice on commute, between classes, or in your room.',
  },
  {
    q: 'How is this different from ChatGPT for case practice?',
    a: 'Ash interviews you — he opens the case, controls pace, presses on weak hypotheses. ChatGPT waits for you to type, which inverts the actual interview shape. The asymmetry of who speaks first changes everything.',
  },
  {
    q: 'What about my privacy? Who sees my sessions?',
    a: 'Only you and the admin. Database row-level security gates every transcript. We don’t train on your sessions or share them with anyone.',
  },
  {
    q: 'What if Ash mishears my voice answer?',
    a: 'Voice input always shows the transcript before sending. You edit, then send. Never auto-sent. Built specifically because Whisper sometimes hears “DCF” as “decaf” on Indian English.',
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      className="relative z-10 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-20"
      style={{ scrollMarginTop: '6rem' }}
    >
      <div className="w-full max-w-[720px] mx-auto">
        <div className="mb-10 text-center">
          <div
            className="font-mono text-[11px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--color-accent)' }}
          >
            QUESTIONS
          </div>
        </div>

        <div
          className="rounded-md overflow-hidden"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'color-mix(in oklab, var(--color-border) 70%, transparent)',
          }}
        >
          {FAQS.map((f, i) => (
            <details
              key={f.q}
              className="group faq-row"
              style={{
                borderTopWidth: i === 0 ? 0 : '1px',
                borderTopStyle: 'solid',
                borderTopColor: 'color-mix(in oklab, var(--color-border) 50%, transparent)',
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between gap-4 px-5 py-5 transition-colors hover:bg-[color-mix(in_oklab,var(--color-bg-elevated)_60%,transparent)]"
                style={{ listStyle: 'none' }}
              >
                <span
                  className="font-body text-sm sm:text-base"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.18em] mr-3"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Q
                  </span>
                  {f.q}
                </span>
                <span
                  className="flex-shrink-0 font-mono text-base transition-transform duration-200 group-open:rotate-45"
                  style={{ color: 'var(--color-accent)' }}
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <div
                className="px-5 pb-5 font-headline italic leading-relaxed"
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '17px',
                }}
              >
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// SECTION 8 — Footer
// =====================================================================

export function SignInFooter() {
  return (
    <footer
      className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 sm:px-12 md:px-16 py-8"
      style={{
        borderTopWidth: '1px',
        borderTopStyle: 'solid',
        borderTopColor: 'color-mix(in oklab, var(--color-border) 50%, transparent)',
      }}
    >
      <div className="flex items-center gap-2">
        <AshMark size={16} state="idle" />
        <span
          className="font-body"
          style={{
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: '-0.02em',
            color: 'var(--color-text-primary)',
          }}
        >
          casepad
        </span>
      </div>
      <div
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        COHORT · MAY 2026 · SSB
      </div>
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] sm:text-right">
        <a
          href="/terms"
          className="underline transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Terms
        </a>
      </div>
    </footer>
  );
}
