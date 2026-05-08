'use client';

// Full HUPR replica — composition of every behavior on hupr.ca's home + about,
// adapted to CasePad's product. All tokens forensically extracted from
// hupr.ca's main.css (see ../page.tsx header for source URLs).
//
// HUPR's exact design language:
//   - Surfaces  : white canvas; #f4f4f4 sunken; #e8e8e8 borders; #323234 ink/buttons
//   - Fonts     : Montserrat (display, 700/900) / IBM Plex Mono (body) / Moderustic (long prose)
//   - Eyebrow   : Plex Mono UPPERCASE 13–15px under hairline
//   - Display   : Montserrat 700 UPPERCASE — 40px → 90–160px on lg+
//   - Buttons   : black-fill rounded-md w/ anim-btn (text slides up, replacement comes from below)
//   - Cards     : sticky stack with offset tops + warm-sand/terra/sage backgrounds
//   - Marquee   : 25s linear-infinite x-translate, photo cutouts inline
//   - Carousel  : auto-advance 5500ms, prev/next buttons, splitting word reveal
//   - Spheres   : click-to-switch image+description list
//   - Menu      : slide-in drawer from right, white panel inset 1rem, cascading link reveals
//   - Image rev : scale(1.3) blur(4px) → scale(1) blur(0) when in viewport
//
// Adapted to CasePad context:
//   tagline  → "When Cases Become Conviction"
//   stats    → 1,165 cases / 12 schools / 5 tracks / 240+ cohort hours
//   tracks   → Solve / Drill / Debrief
//   spheres  → Structure / Insight / Speed / Voice
//   news     → Featured cases
//
// Note: HUPR's WP theme name is "Wolfpack" — this is mostly a recreation of
// that template's behavioral layer.

import { useEffect, useState, type ReactNode } from 'react';
import { IBM_Plex_Mono, Montserrat, Moderustic } from 'next/font/google';

// Fonts — exact families HUPR ships.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hupr-body',
  weight: ['400', '500', '700'],
});
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hupr-display',
  weight: ['400', '700', '900'],
});
const moderustic = Moderustic({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hupr-accent',
  weight: ['400', '500'],
});

// Three landscape photos for the hero crossfade. Empty boardroom / classroom
// shots — Unsplash, free for commercial use, no model release issue.
const HERO_PHOTOS = [
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=2400&q=80',
  'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=2400&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2400&q=80',
];

// Adapter for HUPR's "stats carousel" — 4 entries auto-advance every 5500ms.
const STATS = [
  {
    headline: '2026',
    body:
      'Built this year for case-prep cohorts who needed actual reps, not casebooks. CasePad ships real interviews with Ash — your AI engagement manager — across consulting, IB, PM, marketing, and strategy tracks.',
  },
  {
    headline: '+ Than 1,165',
    body:
      'Real, source-attributed cases ingested from Harvard, Wharton, Ivey, IIM, and 8 other schools. Zero synthetic. Every case is the case a real candidate sat in a real room.',
  },
  {
    headline: '+ Than 12',
    body:
      'B-school programs across India and North America in the cohort. Members debrief together, share scoring rubrics, and watch the curve bend within weeks — not months.',
  },
  {
    headline: '5',
    body:
      'Tracks live: Consulting, Investment Banking, Product Management, Marketing, and Strategy. Each with its own scoring tree, ideal answer set, and reps-to-mastery curve.',
  },
];

// HUPR's three-card service stack. Each card has the exact background from
// the live site (warm sand / terracotta / sage), an image, a giant title, and
// a paragraph.
const TRACKS = [
  {
    title: 'Solve',
    photo:
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1200&q=80',
    body:
      'Live case interviews with Ash, your AI engagement manager. Pick a track, get a real prompt from a real school, and start the timer. Ash holds the room — pushes when you stall, calls when the math drifts, and asks the follow-ups that come up in the actual interview.',
    bg: '#a69385', // warm sand
  },
  {
    title: 'Drill',
    photo:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    body:
      'Targeted reps on the muscle that gave way last time. Math speed, framework branching, behavioral STAR responses — short, sharp, repeatable, scored. The drill pool grows from your own scoring breakdowns; you train where the lift is, not where you already shine.',
    bg: '#a64b52', // terracotta
  },
  {
    title: 'Debrief',
    photo:
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1200&q=80',
    body:
      'Every rep ends with a written take. Score, rubric breakdown, ideal structure tree, two specific lessons — published privately to your debrief feed. The cohort sees the lessons that helped them. The lesson lands before the next case starts.',
    bg: '#7a8f92', // sage
  },
];

// HUPR's "spheres of innovation" — click-to-switch image + description list.
const SPHERES = [
  {
    label: 'Structure',
    image:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80',
    body:
      'MECE first. Branches before details. Every case CasePad serves has its ideal structure tree pre-built — five candidate trees, scoring on coverage and depth, no marks for memorized frameworks that miss the question. The tree teaches the muscle.',
  },
  {
    label: 'Insight',
    image:
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1600&q=80',
    body:
      "Hypothesis-led, data-supported. Ash listens for the moment you commit to a number — and pushes if the support isn't there yet. The interview rewards bets that survive scrutiny, not the longest answer.",
  },
  {
    label: 'Speed',
    image:
      'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1600&q=80',
    body:
      "Within the window, decisive, precise. Math drills tuned to the time pressure of the actual interview — under 30 seconds for most arithmetic, under 90 for the structured ones. Reps are short on purpose; what compounds is the daily return.",
  },
  {
    label: 'Voice',
    image:
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1600&q=80',
    body:
      "Calm under pressure. Cohort-tested. Behavioral interview pool curated from real consulting, IB, and PM stories — STAR scoring, behavioral signal map, and a peer cohort that hears the same prompt the same week so the deltas show up sharp.",
  },
];

const NEWS = [
  {
    image:
      'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1200&q=80',
    title: 'Cohort drop — June 2026 enrollment open',
    date: 'May 2026',
    body:
      'Twelve B-schools, fifty seats, eight weeks. Daily live case with Ash, weekly cohort debrief in the open, written take after every rep. Applications close end of May.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    title: 'New ingest — IIM Bangalore strategy casebook',
    date: 'April 2026',
    body:
      "Eighty cases across strategy, ops, and growth. All source-attributed, all cleaned, all on the live track. The case you sat in your interview prep last year is probably already on the platform.",
  },
];

// Optional slots that let consumers (auth/signin, design-lab/hupr) drop in
// their own content into HUPR's signature locations:
//   - heroRightCard  : the floating white card on the hero (default: "What we
//                       do" + Learn more CTA → for signin, gets the email form)
//   - eyebrow        : top-left tagline next to the wordmark in the header
//   - menuLinks      : nav drawer items
export interface HuprDesignProps {
  heroRightCard?: ReactNode;
  eyebrow?: string;
  menuLinks?: { label: string; href: string }[];
  // When passed, replaces the entire <Hero> section (marquee + photo +
  // floating right-card). Used by `/` so the home page gets a distinct
  // marketing-first hero instead of the signin-shaped composition.
  customHero?: ReactNode;
}

export function HuprDesign({ heroRightCard, eyebrow, menuLinks, customHero }: HuprDesignProps = {}) {
  // Single IntersectionObserver wires HUPR's two reveal classes:
  //   .hupr-image-zoom — scale(1.3) blur(4px) → scale(1) blur(0)
  //   .hupr-fade-up    — opacity 0 + translateY(24px) → 1 + 0
  // On reduced-motion preference, instantly mark every target as is-in
  // so nothing remains hidden.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const targets = document.querySelectorAll<HTMLElement>(
      '.hupr-image-zoom, .hupr-fade-up'
    );

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    targets.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className={`${plexMono.variable} ${montserrat.variable} ${moderustic.variable}`}
      style={{
        background: '#FFFFFF',
        color: '#323234',
        fontFamily: 'var(--font-hupr-body)',
        fontWeight: 500,
        minHeight: '100vh',
      }}
    >
      <HuprStyles />
      <Header eyebrow={eyebrow} menuLinks={menuLinks} />
      {customHero ?? <Hero rightCard={heroRightCard} />}
      <StatsBillboard />
      <ServiceStack />
      <Spheres />
      <News />
      <Footer />
    </div>
  );
}

/* ───────────────── Global styles — keyframes + utility classes ──────── */

function HuprStyles() {
  // All HUPR keyframes + their actual @keyframes names, copied verbatim from
  // main.css so behavior matches the live site.
  return (
    <style jsx global>{`
      .hupr-marquee {
        display: flex;
        animation: hupr-scrolling 25s linear infinite;
        will-change: transform;
      }
      @keyframes hupr-scrolling {
        0% { transform: translateX(0); }
        100% { transform: translateX(calc(-100% / 3)); }
      }

      .hupr-image-zoom {
        transform: scale(1.3);
        filter: blur(4px);
        transition: transform 1.2s cubic-bezier(0.3, 0.86, 0.36, 0.95),
                    filter 1.2s cubic-bezier(0.3, 0.86, 0.36, 0.95);
      }
      .hupr-image-zoom.is-in {
        transform: scale(1);
        filter: blur(0);
      }

      .hupr-fade-up {
        opacity: 0;
        transform: translateY(24px);
        transition: opacity .9s cubic-bezier(.3,.86,.36,.95),
                    transform .9s cubic-bezier(.3,.86,.36,.95);
      }
      .hupr-fade-up.is-in {
        opacity: 1;
        transform: translateY(0);
      }

      .hupr-anim-btn {
        position: relative;
        overflow: hidden;
        display: inline-block;
      }
      .hupr-anim-btn .top,
      .hupr-anim-btn .btm {
        display: block;
        transition: transform .3s cubic-bezier(.34,.7,.27,1);
      }
      .hupr-anim-btn .btm {
        position: absolute;
        inset: 0;
        transform: translateY(100%);
      }
      .hupr-anim-btn:hover .top { transform: translateY(-100%); }
      .hupr-anim-btn:hover .btm { transform: translateY(0); }

      .hupr-page-transition {
        position: fixed;
        inset: 0;
        z-index: 11111;
        background-color: #323234;
        transform-origin: top;
        transform: scaleY(0);
        pointer-events: none;
        transition: transform .5s cubic-bezier(.34,.7,.27,1);
      }
      .hupr-page-transition.is-active {
        transform-origin: bottom;
        transform: scaleY(1);
      }

      .hupr-menu-drawer {
        transform: translateX(100%);
        transition: transform .6s cubic-bezier(.34,.7,.27,1);
      }
      .hupr-menu-drawer.is-open { transform: translateX(0); }

      .hupr-menu-link-row {
        overflow: hidden;
      }
      .hupr-menu-link {
        display: inline-block;
        transform: translateY(115%);
        transition: transform .5s cubic-bezier(.34,.7,.27,1);
      }
      .hupr-menu-drawer.is-open .hupr-menu-link {
        transform: translateY(0);
      }
      .hupr-menu-drawer.is-open li:nth-child(1) .hupr-menu-link { transition-delay: .15s; }
      .hupr-menu-drawer.is-open li:nth-child(2) .hupr-menu-link { transition-delay: .25s; }
      .hupr-menu-drawer.is-open li:nth-child(3) .hupr-menu-link { transition-delay: .35s; }
      .hupr-menu-drawer.is-open li:nth-child(4) .hupr-menu-link { transition-delay: .45s; }

      .hupr-h1, .hupr-h2 {
        font-family: var(--font-hupr-display);
        font-weight: 700;
        color: #323234;
      }
      .hupr-h1 {
        font-size: 40px;
        line-height: 49px;
      }
      .hupr-h2 {
        font-size: 30px;
        line-height: 34px;
      }
      @media (min-width: 1024px) {
        .hupr-h1 { font-size: 90px; line-height: 85px; }
        .hupr-h2 { font-size: 90px; line-height: 85px; }
      }

      .hupr-eyebrow {
        font-family: var(--font-hupr-display);
        font-weight: 900;
        font-size: 15px;
        line-height: 20px;
        text-transform: uppercase;
        color: #323234;
      }

      .hupr-mono-eyebrow {
        font-family: var(--font-hupr-body);
        font-weight: 400;
        font-size: 13px;
        line-height: 1.4;
        text-transform: uppercase;
        color: #323234;
        letter-spacing: 0.02em;
      }

      .hupr-prose p { font-family: var(--font-hupr-accent); }

      .hupr-btn-square {
        position: relative;
        display: inline-block;
        aspect-ratio: 1 / 1;
        height: 124px;
        width: 124px;
        border: 1px solid #323234;
        padding: 1rem;
        background: transparent;
        transition: all .3s ease-in-out;
        cursor: pointer;
      }
      .hupr-btn-square::before {
        content: "";
        position: absolute;
        top: 6px;
        left: -2px;
        width: calc(100% + 4px);
        height: calc(100% - 12px);
        background: #fff;
        transform: scaleY(1);
        transition: .5s ease-in-out;
      }
      .hupr-btn-square::after {
        content: "";
        position: absolute;
        left: 6px;
        top: -2px;
        height: calc(100% + 4px);
        width: calc(100% - 12px);
        background: #fff;
        transform: scaleX(1);
        transition: .5s ease-in-out;
      }
      .hupr-btn-square:hover::before { transform: scaleY(0); }
      .hupr-btn-square:hover::after { transform: scaleX(0); }
      .hupr-btn-square > * { position: relative; z-index: 2; }
      .hupr-btn-square .arrow {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        transform: rotate(-45deg);
        transition: all .3s ease-in-out;
      }
      .hupr-btn-square:hover .arrow { top: 0.5rem; right: 0.5rem; }

      /* HUPR uses scrollbar-gutter: stable for sticky cards on desktop */
      @media (min-width: 1280px) {
        .hupr-services-container {
          height: calc(85vh * 3 + 160px);
        }
      }
    `}</style>
  );
}

/* ───────────────── 1. Header + slide-in menu drawer ─────────────────── */

const DEFAULT_MENU_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Tracks', href: '#tracks' },
  { label: 'Cohort', href: '#spheres' },
  { label: 'News', href: '#news' },
];

function Header({
  eyebrow,
  menuLinks,
}: {
  eyebrow?: string;
  menuLinks?: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const links = menuLinks ?? DEFAULT_MENU_LINKS;
  const tagline = eyebrow ?? 'Case-prep cohort for B-school candidates';

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-30 w-full">
        <nav className="flex w-full items-start px-5 py-8 xl:p-8">
          {/* Logo + tagline */}
          <div className="w-7/12 lg:w-9/12 lg:flex items-center">
            <div className="w-10/12 xl:w-6/12 lg:flex items-center lg:gap-3">
              <a
                href="/design-lab/hupr"
                className="hupr-anim-btn p-5"
                style={{
                  fontFamily: 'var(--font-hupr-display)',
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: '-0.01em',
                  color: '#FFFFFF',
                }}
              >
                <span className="top">CasePad</span>
                <span className="btm">CasePad</span>
              </a>
              <p
                className="hidden lg:block"
                style={{
                  fontFamily: 'var(--font-hupr-body)',
                  fontSize: 12,
                  color: '#FFFFFF',
                  marginLeft: 24,
                }}
              >
                {tagline}
              </p>
            </div>
          </div>

          {/* Menu trigger pill */}
          <div className="w-5/12 lg:w-3/12 fixed right-5 xl:right-8 z-40">
            <div className="py-5 lg:p-4">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between p-2"
                style={{
                  background: '#e8e8e8',
                  borderRadius: 4,
                  cursor: 'pointer',
                  border: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-hupr-body)',
                    fontSize: 13,
                    textTransform: 'uppercase',
                    color: '#323234',
                    letterSpacing: '0.02em',
                  }}
                >
                  {open ? 'Close' : 'Menu'}
                </span>
                <span
                  className="flex flex-col gap-1 items-end"
                  style={{ width: 40 }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 2,
                      background: '#323234',
                      transformOrigin: 'left',
                      transition: 'all .3s',
                      transform: open ? 'rotate(45deg) translateY(-2px)' : 'none',
                    }}
                  />
                  <span
                    style={{
                      width: 40,
                      height: 2,
                      background: '#323234',
                      transformOrigin: 'left',
                      transition: 'all .3s',
                      transform: open ? 'rotate(-45deg) translateY(2px)' : 'none',
                    }}
                  />
                </span>
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Drawer overlay */}
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-20"
        style={{
          background: '#1c1c1c7a',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .4s',
        }}
      />

      {/* White slide-in drawer panel */}
      <aside
        className={`hupr-menu-drawer fixed top-0 right-0 z-30 h-screen ${open ? 'is-open' : ''}`}
        style={{
          background: '#FFFFFF',
          width: 'min(420px, 90vw)',
          padding: '6rem 2rem 2rem 2rem',
        }}
      >
        <ul
          className="text-right"
          style={{
            fontFamily: 'var(--font-hupr-display)',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: 56,
            lineHeight: 1.1,
            color: '#323234',
            margin: 0,
            padding: 0,
            listStyle: 'none',
          }}
        >
          {links.map((m) => (
            <li
              key={m.label}
              className="hupr-menu-link-row"
              style={{ marginBottom: 8 }}
            >
              <a
                href={m.href}
                className="hupr-menu-link"
                onClick={() => setOpen(false)}
                style={{ color: '#323234', textDecoration: 'none' }}
              >
                {m.label}
              </a>
            </li>
          ))}
        </ul>
        <div
          style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: '1px solid #323234',
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-hupr-body)',
            fontSize: 12,
            textTransform: 'uppercase',
            color: '#323234',
          }}
        >
          <a
            href="https://www.linkedin.com/in/ashutoshbhavale"
            style={{ color: '#323234', textDecoration: 'none' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            href="/design-lab"
            style={{ color: '#323234', textDecoration: 'none' }}
          >
            ↩ Design Lab
          </a>
        </div>
      </aside>
    </>
  );
}

/* ───────────────── 2. Hero — fullscreen photo + marquee ─────────────── */

function Hero({ rightCard }: { rightCard?: ReactNode }) {
  // Cycle through 3 background photos every 4s.
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % HERO_PHOTOS.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="home"
      className="relative w-full overflow-hidden"
      style={{ height: '100vh', minHeight: 760 }}
    >
      {/* Photo crossfade — HUPR uses .slider--bg with z-index -1 */}
      <div className="absolute inset-0">
        {HERO_PHOTOS.map((url, i) => (
          <div
            key={url}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${url})`,
              backgroundSize: 'cover',
              backgroundPosition: '50% 50%',
              opacity: active === i ? 1 : 0,
              transition: 'opacity 1.2s cubic-bezier(.3,.86,.36,.95)',
              filter: 'brightness(0.85) saturate(0.92)',
            }}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(50,50,52,0.35) 0%, rgba(50,50,52,0.05) 35%, rgba(50,50,52,0.0) 65%, rgba(50,50,52,0.45) 100%)',
          }}
        />
      </div>

      {/* Auto-scrolling marquee headline. pointer-events:none so its huge
          15vw H1 doesn't eat clicks on the floating right-card (sign-in)
          when the marquee text scrolls behind/across it. Decorative only. */}
      <div
        className="absolute z-10 whitespace-nowrap overflow-hidden"
        style={{
          top: 'calc(75vh - 11vw)',
          left: 0,
          right: 0,
          pointerEvents: 'none',
        }}
      >
        <div className="hupr-marquee items-center">
          {[0, 1, 2].map((k) => (
            <div className="flex items-center" style={{ marginRight: '4vw' }} key={k}>
              <h1
                className="flex items-center"
                style={{
                  fontFamily: 'var(--font-hupr-display)',
                  fontWeight: 700,
                  fontSize: '15vw',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                  gap: '3vw',
                }}
              >
                When Cases
                <span
                  style={{
                    display: 'inline-block',
                    width: '15vw',
                    minWidth: 200,
                    aspectRatio: '0.75',
                    height: 'auto',
                    backgroundImage: `url(${HERO_PHOTOS[(k + 1) % HERO_PHOTOS.length]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                Build Conviction
              </h1>
            </div>
          ))}
        </div>
      </div>

      {/* Floating right-card slot — defaults to "What we do / Learn more"
          on /design-lab/hupr; signin overrides with the email form.
          isolation:isolate forces a fresh stacking context so the marquee
          (z-10 inside the same SECTION) cannot paint over the card no
          matter what stacking-context tricks the marquee CSS pulls. */}
      <div
        className="absolute z-30 px-5 lg:px-0"
        style={{
          top: '50%',
          right: '2rem',
          width: 'min(420px, 92vw)',
          transform: 'translateY(-50%)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          isolation: 'isolate',
        }}
      >
        {rightCard ?? (
          <div
            style={{
              background: '#FFFFFF',
              padding: '2rem',
              borderRadius: 4,
            }}
          >
            <h2
              className="hupr-mono-eyebrow"
              style={{ marginBottom: 8 }}
            >
              What we do
            </h2>
            <hr
              style={{
                border: 0,
                borderTop: '1px solid #323234',
                margin: '8px 0 24px',
              }}
            />
            <p
              style={{
                fontFamily: 'var(--font-hupr-body)',
                fontSize: 16,
                lineHeight: 1.55,
                color: '#323234',
                margin: 0,
              }}
            >
              CasePad runs cohort case-prep for B-school candidates — daily live
              cases with Ash, your AI engagement manager, plus drill loops and
              written debriefs.
            </p>
            <div className="pt-8">
              <a
                href="#tracks"
                className="hupr-anim-btn"
                style={{
                  display: 'inline-block',
                  background: '#323234',
                  color: '#FFFFFF',
                  padding: '10px 18px',
                  borderRadius: 6,
                  fontFamily: 'var(--font-hupr-body)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  textDecoration: 'none',
                }}
              >
                <span className="top">Learn more</span>
                <span className="btm">Learn more</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────────── 3. Stats carousel + billboard h1 ─────────────────── */

function StatsBillboard() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % STATS.length), 5500);
    return () => clearInterval(id);
  }, []);

  const s = STATS[i];

  return (
    <section className="w-full px-5 py-8 xl:p-8">
      <div className="lg:flex py-10 gap-6">
        {/* Left — rotating stats card */}
        <div className="w-full lg:w-5/12 xl:w-4/12 pr-10">
          <div className="flex items-center">
            <div className="w-8/12">
              <h3 className="hupr-mono-eyebrow">Highlights</h3>
            </div>
            <div className="w-4/12 flex justify-end">
              <span
                style={{
                  fontFamily: 'var(--font-hupr-body)',
                  fontSize: 13,
                  color: '#323234',
                }}
              >
                {String(i + 1).padStart(2, '0')} / {String(STATS.length).padStart(2, '0')}
              </span>
            </div>
          </div>
          <hr
            style={{
              border: 0,
              borderTop: '1px solid #323234',
              margin: '8px 0',
            }}
          />

          <div className="py-4">
            <h3
              style={{
                fontFamily: 'var(--font-hupr-display)',
                fontWeight: 700,
                fontSize: 'clamp(40px, 6vw, 64px)',
                lineHeight: 1.05,
                color: '#323234',
                margin: 0,
              }}
            >
              {s.headline}
            </h3>
          </div>
          <p
            className="hupr-prose hupr-fade-up"
            style={{
              fontFamily: 'var(--font-hupr-accent)',
              fontSize: 16,
              lineHeight: 1.55,
              color: '#323234',
              margin: 0,
              minHeight: 132,
            }}
          >
            {s.body}
          </p>

          <div className="flex gap-3 py-8" style={{ width: '40%' }}>
            <button
              type="button"
              onClick={() => setI((x) => (x - 1 + STATS.length) % STATS.length)}
              aria-label="Previous"
              style={{
                flex: 1,
                background: '#f4f4f4',
                padding: 12,
                borderRadius: 6,
                border: 0,
                cursor: 'pointer',
                fontSize: 18,
                color: '#323234',
              }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setI((x) => (x + 1) % STATS.length)}
              aria-label="Next"
              style={{
                flex: 1,
                background: '#f4f4f4',
                padding: 12,
                borderRadius: 6,
                border: 0,
                cursor: 'pointer',
                fontSize: 18,
                color: '#323234',
              }}
            >
              →
            </button>
          </div>
        </div>

        {/* Right — giant billboard */}
        <div className="w-full lg:w-7/12 xl:w-8/12 pt-20 lg:pt-0">
          <h3 className="hupr-mono-eyebrow">About CasePad</h3>
          <hr
            style={{
              border: 0,
              borderTop: '1px solid #323234',
              margin: '8px 0',
            }}
          />
          <h1
            className="hupr-h1"
            style={{
              textTransform: 'uppercase',
              padding: '20px 0',
              margin: 0,
            }}
          >
            <span>The Room Before the Room</span>
          </h1>
          <div className="py-4">
            <a
              href="#tracks"
              className="hupr-btn-square no-underline"
              aria-label="Explore tracks"
            >
              <span className="arrow" aria-hidden>↗</span>
              <span
                className="block uppercase text-center"
                style={{
                  fontFamily: 'var(--font-hupr-body)',
                  fontSize: 13,
                  color: '#323234',
                  letterSpacing: '0.04em',
                  paddingTop: 56,
                }}
              >
                Tracks
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────── 4. Sticky stacking service cards ─────────────────── */

function ServiceStack() {
  return (
    <section id="tracks">
      <div className="w-full px-5 py-8 xl:p-8">
        <h3 className="hupr-mono-eyebrow">Service offer</h3>
        <hr style={{ border: 0, borderTop: '1px solid #323234', margin: '8px 0' }} />
      </div>

      <div className="hupr-services-container relative">
        {TRACKS.map((t, idx) => (
          <article
            key={t.title}
            className="sticky h-full xl:h-[85vh] lg:flex flex-col px-5 py-8 xl:p-8"
            style={{
              backgroundColor: t.bg,
              top: idx * 70,
              zIndex: idx + 1,
            }}
          >
            <div className="h-full w-full">
              <h2
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-hupr-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(48px, 9vw, 160px)',
                  lineHeight: 0.95,
                  width: '70%',
                  color: '#FFFFFF',
                  margin: 0,
                }}
              >
                {t.title}
              </h2>
            </div>
            <div className="flex-grow h-full xl:h-[35vh] lg:flex items-start pt-8">
              <div className="w-full lg:w-3/12">
                <div
                  className="overflow-hidden"
                  style={{ aspectRatio: '4 / 2.8' }}
                >
                  <img
                    src={t.photo}
                    alt=""
                    className="hupr-image-zoom w-full h-full object-cover"
                    style={{ filter: 'saturate(0.85)' }}
                  />
                </div>
              </div>
              <div className="w-full lg:w-9/12 lg:px-24 pt-6 lg:pt-0">
                <p
                  style={{
                    fontFamily: 'var(--font-hupr-body)',
                    fontSize: 17,
                    lineHeight: 1.55,
                    color: '#FFFFFF',
                    margin: 0,
                  }}
                >
                  {t.body}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ───────────────── 5. Spheres — click-to-switch image ───────────────── */

function Spheres() {
  const [active, setActive] = useState(0);
  const s = SPHERES[active];

  return (
    <section
      id="spheres"
      className="px-5 py-8 xl:p-8 pt-20"
      style={{ background: '#f4f4f4', minHeight: '100vh' }}
    >
      <div className="w-full">
        <h3 className="hupr-mono-eyebrow">Method principles</h3>
        <hr style={{ border: 0, borderTop: '1px solid #323234', margin: '8px 0' }} />
      </div>

      <div className="xl:flex h-full pt-10">
        <div className="w-full xl:w-7/12 2xl:w-8/12 py-10">
          <ul
            className="flex flex-col items-start"
            style={{
              fontFamily: 'var(--font-hupr-display)',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: 'clamp(40px, 5vw, 80px)',
              lineHeight: 1.1,
              margin: 0,
              padding: 0,
              listStyle: 'none',
              color: '#323234',
            }}
          >
            {SPHERES.map((sp, i) => (
              <li
                key={sp.label}
                onClick={() => setActive(i)}
                className="cursor-pointer transition-opacity duration-300"
                style={{
                  marginBottom: 16,
                  opacity: i === active ? 1 : 0.3,
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <span>{sp.label}</span>
                <span
                  aria-hidden
                  style={{
                    transform: 'rotate(-45deg)',
                    fontSize: '0.5em',
                    opacity: i === active ? 1 : 0,
                    transition: 'opacity .3s',
                  }}
                >
                  ↗
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full xl:w-5/12 2xl:w-4/12 py-8">
          <div
            className="overflow-hidden"
            style={{ aspectRatio: '4 / 2.8' }}
          >
            <img
              src={s.image}
              alt={s.label}
              className="hupr-image-zoom w-full h-full object-cover"
              style={{
                filter: 'saturate(0.92)',
                transition: 'opacity .3s, transform 1.2s cubic-bezier(.3,.86,.36,.95), filter 1.2s cubic-bezier(.3,.86,.36,.95)',
              }}
            />
          </div>
          <p
            className="hupr-prose hupr-fade-up"
            style={{
              fontFamily: 'var(--font-hupr-accent)',
              fontSize: 16,
              lineHeight: 1.55,
              color: '#323234',
              margin: 0,
              padding: '24px 0',
            }}
          >
            {s.body}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────── 6. News pair ─────────────────────────────────────── */

function News() {
  return (
    <section id="news" className="py-20">
      <div className="w-full px-5 py-8 xl:p-8">
        <h1
          className="text-center uppercase pb-20"
          style={{
            fontFamily: 'var(--font-hupr-display)',
            fontWeight: 700,
            fontSize: 'clamp(48px, 9vw, 160px)',
            lineHeight: 1,
            color: '#323234',
            margin: 0,
            width: '100%',
          }}
        >
          News
        </h1>
        {NEWS.map((n) => (
          <div key={n.title} className="w-full py-4">
            <hr style={{ border: 0, borderTop: '1px solid #323234', margin: '8px 0' }} />
            <div className="lg:flex py-4 gap-10">
              <div className="w-full lg:w-6/12 xl:w-3/12">
                <div
                  className="overflow-hidden"
                  style={{ aspectRatio: '4 / 2.8' }}
                >
                  <img
                    src={n.image}
                    alt=""
                    className="hupr-image-zoom w-full h-full object-cover"
                    style={{ filter: 'saturate(0.92)' }}
                  />
                </div>
              </div>
              <div className="w-full lg:w-6/12 xl:w-9/12 xl:flex pt-5 lg:pt-0">
                <div className="w-full xl:w-6/12 px-0 xl:px-20">
                  <h3
                    className="uppercase"
                    style={{
                      fontFamily: 'var(--font-hupr-display)',
                      fontWeight: 700,
                      fontSize: 24,
                      lineHeight: 1.2,
                      color: '#323234',
                      margin: 0,
                    }}
                  >
                    {n.title}
                  </h3>
                  <div
                    style={{
                      fontFamily: 'var(--font-hupr-body)',
                      fontSize: 13,
                      color: '#323234',
                      paddingTop: 8,
                      opacity: 0.7,
                    }}
                  >
                    {n.date}
                  </div>
                </div>
                <div className="w-full xl:w-6/12 pt-5 xl:pt-0">
                  <p
                    className="hupr-prose hupr-fade-up"
                    style={{
                      fontFamily: 'var(--font-hupr-accent)',
                      fontSize: 16,
                      lineHeight: 1.55,
                      color: '#323234',
                      margin: 0,
                    }}
                  >
                    {n.body}
                  </p>
                  <div className="py-4">
                    <a
                      href="#"
                      className="hupr-anim-btn"
                      style={{
                        display: 'inline-block',
                        background: '#323234',
                        color: '#FFFFFF',
                        padding: '10px 18px',
                        borderRadius: 6,
                        fontFamily: 'var(--font-hupr-body)',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        textDecoration: 'none',
                      }}
                    >
                      <span className="top">Read more</span>
                      <span className="btm">Read more</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────── 7. Footer ────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="w-full px-5 py-8 xl:p-8">
      <hr style={{ border: 0, borderTop: '1px solid #323234', margin: '8px 0' }} />

      <div className="flex items-center gap-6 lg:gap-3 justify-between">
        <div className="w-6/12 lg:w-7/12 py-5 lg:p-5">
          <div
            style={{
              fontFamily: 'var(--font-hupr-display)',
              fontWeight: 700,
              fontSize: 28,
              color: '#323234',
            }}
          >
            CasePad
          </div>
        </div>
        <div className="w-6/12 lg:w-4/12 xl:w-3/12 flex justify-end">
          <span
            style={{
              fontFamily: 'var(--font-hupr-body)',
              fontSize: 13,
              color: '#323234',
              opacity: 0.6,
            }}
          >
            Cohort case-prep
          </span>
        </div>
      </div>

      <div className="footer-links pt-10 lg:pt-20">
        <div className="lg:flex gap-8 flex-wrap xl:flex-nowrap">
          <div className="w-full xl:w-9/12 lg:flex gap-8">
            <div className="w-full lg:w-6/12 xl:w-4/12">
              <h3 className="hupr-mono-eyebrow">Useful links</h3>
              <hr
                style={{
                  border: 0,
                  borderTop: '1px solid #323234',
                  margin: '8px 0',
                }}
              />
              <ul
                className="pt-4"
                style={{
                  fontFamily: 'var(--font-hupr-body)',
                  fontSize: 14,
                  color: '#323234',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                <li>
                  <a
                    href="/cases"
                    style={{ color: '#323234', textDecoration: 'underline' }}
                  >
                    Cases catalog
                  </a>
                </li>
                <li className="pt-2">
                  <a
                    href="/dashboard"
                    style={{ color: '#323234', textDecoration: 'underline' }}
                  >
                    Dashboard
                  </a>
                </li>
                <li className="pt-2">
                  <a
                    href="/auth/signin"
                    style={{ color: '#323234', textDecoration: 'underline' }}
                  >
                    Sign in
                  </a>
                </li>
              </ul>
            </div>

            <div className="w-full lg:w-6/12 xl:w-8/12 pt-10 lg:pt-0">
              <h3 className="hupr-mono-eyebrow">Contact information</h3>
              <hr
                style={{
                  border: 0,
                  borderTop: '1px solid #323234',
                  margin: '8px 0',
                }}
              />
              <div
                className="pt-4"
                style={{
                  fontFamily: 'var(--font-hupr-body)',
                  fontSize: 14,
                  color: '#323234',
                }}
              >
                <address style={{ fontStyle: 'normal' }}>
                  CasePad — Cohort case-prep for B-school candidates
                </address>
                <div className="py-4">
                  <a
                    href="mailto:hello@casepad.app"
                    style={{ color: '#323234', textDecoration: 'underline' }}
                  >
                    hello@casepad.app
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full xl:w-3/12 pt-10 lg:pt-0">
            <h3 className="hupr-mono-eyebrow">Cohort</h3>
            <hr
              style={{
                border: 0,
                borderTop: '1px solid #323234',
                margin: '8px 0',
              }}
            />
            <div className="pt-4">
              <h3
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-hupr-display)',
                  fontWeight: 700,
                  fontSize: 28,
                  color: '#323234',
                  margin: 0,
                }}
              >
                Apply for the next cohort
              </h3>
              <div className="py-4">
                <a
                  href="/auth/signin"
                  className="hupr-btn-square"
                  aria-label="Apply"
                >
                  <span className="arrow" aria-hidden>↗</span>
                  <span
                    className="block uppercase text-center"
                    style={{
                      fontFamily: 'var(--font-hupr-body)',
                      fontSize: 13,
                      color: '#323234',
                      letterSpacing: '0.04em',
                      paddingTop: 56,
                    }}
                  >
                    Apply
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full pt-10">
        <div
          className="flex py-4 justify-between"
          style={{
            fontFamily: 'var(--font-hupr-body)',
            fontSize: 13,
            color: '#323234',
          }}
        >
          <span>© CasePad — built 2026.</span>
          <a
            href="/design-lab"
            style={{ color: '#323234', textDecoration: 'underline' }}
          >
            ↩ Design Lab
          </a>
        </div>
      </div>
    </footer>
  );
}
