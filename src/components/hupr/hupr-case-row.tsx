// HUPR news-pair row for the cases library. Image on left + title + mono
// metadata + Moderustic excerpt on right. Hairline divider between rows.
//
// Replaces the previous compact `CaseListRowItem` which was a single-line
// truncated row. The news-pair gives every case a full editorial line —
// matches HUPR's news section on the live site.

import { CaseListLink } from '../case-list-link';

// Industry → Unsplash URL map. Free-for-commercial photos picked for thematic
// fit. Industries not in the map fall back to the boardroom-default.
const INDUSTRY_PHOTO: Record<string, string> = {
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  software: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  retail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
  consumer: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
  ecommerce: 'https://images.unsplash.com/photo-1556742393-d75f468bfcb0?auto=format&fit=crop&w=1200&q=80',
  healthcare: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
  pharma: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
  finance: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
  banking: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
  insurance: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
  energy: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=80',
  oilgas: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=80',
  automotive: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
  airline: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
  travel: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
  manufacturing: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
  industrial: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
  agriculture: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=80',
  food: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
  hospitality: 'https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=1200&q=80',
  media: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  entertainment: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  education: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=1200&q=80',
  realestate: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
  telecom: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=1200&q=80',
};

const DEFAULT_PHOTO =
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80';

function photoFor(industry: string | null | undefined): string {
  if (!industry) return DEFAULT_PHOTO;
  const key = industry.toLowerCase().replace(/[^a-z]/g, '');
  return INDUSTRY_PHOTO[key] ?? DEFAULT_PHOTO;
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
        {/* Image — HUPR's image-zoom reveal on intersect */}
        <div className="w-full sm:w-3/12 flex-shrink-0">
          <div
            className="overflow-hidden"
            style={{ aspectRatio: '4 / 2.8' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoFor(c.industry)}
              alt=""
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
