// HUPR news-pair row for the cases library. Image on left + title + mono
// metadata + Moderustic excerpt on right. Hairline divider between rows.
//
// Image strategy: 147 curated Unsplash photos saved locally in
// /public/case-photos/case-NNN.jpg. Each case is hash-mapped from its UUID
// to one of the photos so:
//   1. The same case always shows the same photo (stable across renders)
//   2. Consecutive cases on the page show different photos (varied)
//   3. No live Unsplash dependency at runtime — all served from /public

import { CaseListLink } from '../case-list-link';

const PHOTO_COUNT = 147; // matches scripts/download-case-photos.sh output

// FNV-1a 32-bit hash — fast, deterministic, no crypto dep needed. Used to
// turn a UUID string into a stable integer 0..PHOTO_COUNT-1.
function hashCaseIdToPhotoIndex(caseId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < caseId.length; i++) {
    hash ^= caseId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Force unsigned 32-bit
  return (hash >>> 0) % PHOTO_COUNT;
}

function photoFor(caseId: string): string {
  const idx = hashCaseIdToPhotoIndex(caseId);
  return `/case-photos/case-${String(idx).padStart(3, '0')}.jpg`;
}

function DifficultyDots({ d }: { d: string }) {
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
            background: i < fill ? 'var(--color-text-primary)' : 'transparent',
            border: i < fill ? 'none' : '1px solid var(--color-text-muted)',
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
        {/* Image — HUPR's image-zoom reveal on intersect, served local from
            /public/case-photos/. */}
        <div className="w-full sm:w-3/12 flex-shrink-0">
          <div
            className="overflow-hidden"
            style={{ aspectRatio: '4 / 2.8' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoFor(c.id)}
              alt=""
              loading="lazy"
              className="hupr-image-zoom w-full h-full object-cover"
              style={{ filter: 'saturate(0.92)' }}
            />
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
            <DifficultyDots d={c.difficulty} />
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
