import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { HuprObserveReveals } from '@/components/hupr/hupr-observe-reveals';

// Drills index — three short-form practice modes outside the case arena.
// Linked from the top nav so users find them without hunting through urls.

const DRILLS = [
  {
    href: '/math-drill',
    label: 'Math drill',
    desc: 'Mental math under interview pressure. L1–L4 difficulty. 100-question pool. Auto-tracks your accuracy.',
    photo:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80',
    bg: '#a69385', // warm sand
  },
  {
    href: '/behavioral-drill',
    label: 'Behavioral drill',
    desc: '30 STAR-style questions. Type your response, get LLM-rubric feedback across 6 dimensions plus an ideal-answer reference.',
    photo:
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1600&q=80',
    bg: '#a64b52', // terracotta
  },
  {
    href: '/drill',
    label: 'Recovery drill',
    desc: 'Curveballs interviewers throw — silent stretch, contradictory data, abrupt redirect. Practice not freezing.',
    photo:
      'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1600&q=80',
    bg: '#7a8f92', // sage
  },
];

export default async function DrillsIndexPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--color-bg-canvas)', color: 'var(--color-text-primary)' }}
    >
      <HuprObserveReveals />

      {/* Header band */}
      <section className="px-6 sm:px-12 pt-12 pb-8 max-w-6xl mx-auto">
        <span className="hupr-mono-eyebrow">Drills</span>
        <hr className="hupr-hairline" />
        <h1
          className="uppercase mt-6 mb-4"
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 700,
            fontSize: 'clamp(40px, 6vw, 72px)',
            lineHeight: 1,
            margin: 0,
            color: 'var(--color-text-primary)',
            maxWidth: '20ch',
          }}
        >
          Sharpen the muscle
        </h1>
        <p
          className="mt-6 hupr-fade-up"
          style={{
            fontFamily: 'var(--font-accent)',
            fontSize: 17,
            lineHeight: 1.55,
            color: 'var(--color-text-primary)',
            maxWidth: '60ch',
            margin: 0,
          }}
        >
          Short-form practice modes outside the case arena. Pick what you want
          to sharpen — each is 5–15 minutes. Reps compound; the curve bends in
          the second half of the cohort.
        </p>
      </section>

      {/* Three sticky stacking colored drill cards — HUPR's service-stack pattern */}
      <section>
        {DRILLS.map((d, idx) => (
          <Link
            href={d.href}
            key={d.href}
            className="sticky lg:flex flex-col px-6 sm:px-12 py-12 lg:py-16 transition-opacity hover:opacity-95"
            style={{
              backgroundColor: d.bg,
              top: idx * 60,
              zIndex: idx + 1,
              minHeight: '60vh',
              textDecoration: 'none',
            }}
          >
            <div className="flex-grow">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#FFFFFF',
                  opacity: 0.85,
                }}
              >
                0{idx + 1}
              </span>
              <h2
                className="uppercase mt-3"
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 700,
                  fontSize: 'clamp(48px, 9vw, 144px)',
                  lineHeight: 0.95,
                  color: '#FFFFFF',
                  margin: 0,
                  maxWidth: '70%',
                }}
              >
                {d.label}
              </h2>
            </div>
            <div className="lg:flex items-end gap-12 mt-8 lg:mt-0">
              <div className="w-full lg:w-3/12">
                <div className="overflow-hidden" style={{ aspectRatio: '4 / 2.8' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.photo}
                    alt=""
                    className="hupr-image-zoom w-full h-full object-cover"
                    style={{ filter: 'saturate(0.9)' }}
                  />
                </div>
              </div>
              <div className="w-full lg:w-7/12 lg:pl-12 mt-6 lg:mt-0">
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 17,
                    lineHeight: 1.55,
                    color: '#FFFFFF',
                    margin: 0,
                  }}
                >
                  {d.desc}
                </p>
              </div>
              <div className="w-full lg:w-2/12 mt-6 lg:mt-0 flex lg:justify-end">
                <span
                  className="hupr-anim-btn"
                  style={{
                    background: '#FFFFFF',
                    color: d.bg,
                    padding: '12px 18px',
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'inline-block',
                  }}
                >
                  Start →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
