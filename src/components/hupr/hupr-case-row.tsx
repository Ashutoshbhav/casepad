// HUPR news-pair row for the cases library — per-case photo placard on the
// left (case-type-themed gradient + mono case-number eyebrow + label overlay),
// title + meta + Moderustic excerpt on the right. Hairline divider between
// rows.
//
// Photo lookup: `caseImageFor(caseId)` returns the per-case Pollinations-
// generated path. If it 404s (generation pending), <img onError> swaps to
// the deterministic fallback from the bundled 147 photos. Either way the
// placard is never empty.

import { CaseListLink } from '../case-list-link';
import { CaseVisual } from './case-visual';

// Case-type → HUPR earth-tone background mapping. Matches the /cases sticky
// browse-by-type cards so the same case_type carries the same color across
// surfaces — strong visual recognition signal.
const CASE_TYPE_BG: Record<string, { bg: string; fg: string }> = {
  profitability:  { bg: 'var(--hupr-sand)',   fg: '#FFFFFF' },
  market_entry:   { bg: 'var(--hupr-terra)',  fg: '#FFFFFF' },
  operations:     { bg: 'var(--hupr-sage)',   fg: '#FFFFFF' },
  estimation:     { bg: 'var(--hupr-slate)',  fg: '#FFFFFF' },
  pricing:        { bg: 'var(--hupr-cognac)', fg: '#FFFFFF' },
  mna:            { bg: 'var(--hupr-cream)',  fg: '#323234' },
  gtm:            { bg: '#7a8f92',            fg: '#FFFFFF' },
  other:          { bg: 'var(--color-bg-sunken)', fg: '#323234' },
};

function bgFor(caseType: string): { bg: string; fg: string } {
  return CASE_TYPE_BG[caseType] ?? CASE_TYPE_BG.other;
}

// FNV-1a 32-bit hash → stable 2-digit case number per UUID. Used as a small
// editorial marker on the placard, NOT for content selection.
function hashCaseIdToNumber(caseId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < caseId.length; i++) {
    hash ^= caseId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 99 + 1;
}

function DifficultyDots({ d, fg }: { d: string; fg: string }) {
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
            background: i < fill ? fg : 'transparent',
            border: i < fill ? 'none' : `1px solid ${fg}`,
            opacity: i < fill ? 1 : 0.5,
          }}
        />
      ))}
    </span>
  );
}

export type HuprCaseRowData = {
  id: string;
  title: string;
  industry: string;
  case_type: string;
  difficulty: string;
  source: string | null;
  problem_statement: string | null;
};

export function HuprCaseRow({
  c,
  completed,
}: {
  c: HuprCaseRowData;
  completed?: boolean;
}) {
  const { bg, fg } = bgFor(c.case_type);
  const caseNumber = hashCaseIdToNumber(c.id);
  const meta = [c.industry, c.case_type.replace('_', ' '), c.source ?? 'unknown']
    .filter(Boolean)
    .join(' · ');
  const excerpt = c.problem_statement
    ? c.problem_statement.length > 200
      ? c.problem_statement.slice(0, 197).trimEnd() + '…'
      : c.problem_statement
    : '';

  return (
    <CaseListLink
      href={`/solve/${c.id}`}
      className="block py-6 group"
      style={{
        borderBottom: '1px solid var(--color-border)',
        opacity: completed ? 0.7 : 1,
      }}
    >
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Left placard — case photo with case-type-themed gradient overlay.
            The image fills the placard; the gradient + eyebrow + case-type
            label sit on top. Matches the hero treatment used on /cases. */}
        <div className="w-full sm:w-3/12 flex-shrink-0">
          <div
            className="relative overflow-hidden p-4"
            style={{
              aspectRatio: '4 / 2.8',
              background: bg, // shows through if image fails entirely
              color: fg,
            }}
          >
            {/* Designed per-case-type visual (deep cinematic gradient + quiet
                motif) — replaces stock photos, which returned irrelevant junk
                for abstract case titles. Deterministic per caseId. */}
            <CaseVisual caseType={c.case_type} caseId={c.id} />
            {/* Soft top→bottom gradient so the eyebrow + label have contrast
                against any photo behind them. Same shape as the /cases hero
                overlay for visual consistency. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.55) 100%)',
              }}
              aria-hidden="true"
            />
            {/* Eyebrow + label sit on top, same positions as before. */}
            <div className="relative h-full flex flex-col justify-between">
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 400,
                  color: '#FFFFFF',
                }}
              >
                N° {String(caseNumber).padStart(2, '0')}
              </div>
              <div
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 700,
                  fontSize: 20,
                  lineHeight: 1.05,
                  letterSpacing: '-0.005em',
                  color: '#FFFFFF',
                }}
              >
                {c.case_type.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        {/* Body — title + meta + excerpt */}
        <div className="w-full sm:w-9/12 flex flex-col">
          <div className="flex items-baseline justify-between gap-4">
            <h3
              className="uppercase"
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: 22,
                lineHeight: 1.15,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              {c.title}
            </h3>
            {completed && (
              <span
                aria-label="Completed"
                title="You've completed this case"
                className="flex-shrink-0"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--color-text-muted)',
                }}
              >
                ✓ done
              </span>
            )}
          </div>
          <div
            className="mt-2 flex items-center gap-3 flex-wrap"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>{meta}</span>
            <span aria-hidden="true">·</span>
            <DifficultyDots d={c.difficulty} fg={'var(--color-text-secondary)'} />
          </div>
          {excerpt && (
            <p
              className="hupr-fade-up mt-3"
              style={{
                fontFamily: 'var(--font-accent)',
                fontSize: 15,
                lineHeight: 1.55,
                color: 'var(--color-text-primary)',
                margin: 0,
                maxWidth: '70ch',
              }}
            >
              {excerpt}
            </p>
          )}
        </div>
      </div>
    </CaseListLink>
  );
}
