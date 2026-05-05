import Link from 'next/link';
import type { CaseRow } from '@/lib/types/domain';
import { IndustryPrimerButton } from './industry-primer-button';

// War Room list-mode card. Used by any legacy caller still rendering a
// CaseCard. The /cases page now uses an inline list-row component, but
// other surfaces (e.g. tutorial picker, search results) may still hit
// this. `featured` keeps a brass top border for emphasis.

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
            background: i < fill ? 'var(--color-accent)' : 'transparent',
            border: i < fill ? 'none' : '1px solid var(--color-text-muted)',
          }}
        />
      ))}
    </span>
  );
}

export function CaseCard({ c, featured = false }: { c: CaseRow; featured?: boolean }) {
  return (
    <div
      className="rounded-md relative transition-colors"
      style={{
        background: 'var(--color-bg-elevated)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: featured ? 'var(--color-accent)' : 'var(--color-border)',
      }}
    >
      <Link href={`/solve/${c.id}`} className="block p-4">
        <div className="meta-label flex items-center justify-between mb-2">
          <span>{c.case_type.replace('_', ' ')}</span>
          <DifficultyDots d={c.difficulty} />
        </div>
        <h3
          className="font-headline text-base leading-snug line-clamp-2 pr-12"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {c.title}
        </h3>
        <div className="meta-label mt-1.5">
          {(c.source ?? 'unknown')} · {c.industry}
        </div>
      </Link>
      <div className="absolute right-3 bottom-3">
        <IndustryPrimerButton caseId={c.id} />
      </div>
    </div>
  );
}
