'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LIQUID_TUTOR_VARIANTS,
  type LiquidTutorVariantId,
} from '../../_lib/tokens';
import { HeroSection } from './HeroSection';
import { CaseShowcase } from './CaseShowcase';
import { ArenaPreview } from './ArenaPreview';
import { DebriefPreview } from './DebriefPreview';
import { LiquidTutorPickButton } from './LiquidTutorPickButton';

const VARIANT_ORDER: LiquidTutorVariantId[] = [
  'claude-light',
  'claude-dark',
  'original-sand',
];

export function LiquidTutorView() {
  const [variantId, setVariantId] = useState<LiquidTutorVariantId>('claude-light');
  const tokens = LIQUID_TUTOR_VARIANTS[variantId];

  return (
    <div
      style={{
        background: tokens.bg,
        color: tokens.textPrimary,
        fontFamily: tokens.fontBody,
        minHeight: '100vh',
        transition: 'background 320ms ease, color 320ms ease',
        ['--bg' as string]: tokens.bg,
        ['--elevated' as string]: tokens.elevated,
        ['--text-primary' as string]: tokens.textPrimary,
        ['--text-secondary' as string]: tokens.textSecondary,
        ['--accent' as string]: tokens.accent,
        ['--border' as string]: tokens.border,
      }}
    >
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: `${tokens.bg}dd`,
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${tokens.border}`,
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          fontFamily: tokens.fontMono,
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <Link
          href="/design-lab"
          style={{ color: tokens.textSecondary, textDecoration: 'none' }}
        >
          &larr; back to lab
        </Link>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {VARIANT_ORDER.map((id) => {
            const v = LIQUID_TUTOR_VARIANTS[id];
            const active = id === variantId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setVariantId(id)}
                style={{
                  background: active ? tokens.accent : 'transparent',
                  color: active ? tokens.accentInk : tokens.textSecondary,
                  border: `1px solid ${active ? tokens.accent : tokens.border}`,
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  letterSpacing: 'inherit',
                  textTransform: 'inherit',
                  cursor: 'pointer',
                  transition: 'background 200ms ease, color 200ms ease, border 200ms ease',
                }}
              >
                {v.name}
              </button>
            );
          })}
        </div>
      </nav>

      <HeroSection tokens={tokens} />
      <CaseShowcase tokens={tokens} />
      <ArenaPreview tokens={tokens} />
      <DebriefPreview tokens={tokens} />

      <section
        style={{
          padding: '96px 24px 128px',
          maxWidth: 720,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: tokens.fontDisplay,
            fontStyle: 'italic',
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 400,
            color: tokens.textPrimary,
            margin: '0 0 14px',
            letterSpacing: '-0.01em',
          }}
        >
          One shape. Always with you.
        </h2>
        <p
          style={{
            fontFamily: tokens.fontBody,
            fontSize: '17px',
            lineHeight: 1.55,
            color: tokens.textSecondary,
            margin: '0 0 32px',
          }}
        >
          Ash isn&apos;t a face. He&apos;s a presence that breathes when he listens.
        </p>
        <LiquidTutorPickButton tokens={tokens} variantId={variantId} />
      </section>
    </div>
  );
}
