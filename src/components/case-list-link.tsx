'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

// Wrapper around the Next.js Link used by CaseListRowItem. Originally
// fired setAiState('anticipating') on click so the corner asterisk leaned
// toward the camera between case-card click and /solve mount. Removed
// 2026-05-04 — at scale 0.35 in the corner the lean is barely visible,
// but the synchronous Zustand call added latency to every list-row click.
// Kept as a thin client wrapper in case future click telemetry/animations
// hook in here without forcing every callsite to refactor.

export function CaseListLink({
  href,
  children,
  className,
  style,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}
