'use client';

import type { TreatmentTokens } from '../../_lib/tokens';

// Casebook page treatment of the arena: serif body, indented paragraphs,
// marginalia notes in oxblood, dialog rendered as transcript.

export function ArenaPreview({ tokens }: { tokens: TreatmentTokens }) {
  return (
    <section
      style={{
        padding: '96px 24px',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          fontFamily: tokens.fontMono,
          fontSize: '11px',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: tokens.accent,
          marginBottom: 14,
        }}
      >
        Chapter II &mdash; The Arena
      </div>
      <h2
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 700,
          color: tokens.textPrimary,
          margin: '0 0 56px',
          maxWidth: 720,
          letterSpacing: '-0.02em',
        }}
      >
        Reads like a casebook. Argues like a partner.
      </h2>

      <div
        style={{
          background: tokens.elevated,
          border: `1px solid ${tokens.border}`,
          padding: 'clamp(28px, 5vw, 64px)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2.4fr) minmax(0, 1fr)',
          gap: 'clamp(20px, 4vw, 56px)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 8px 24px rgba(64,50,28,0.06)',
        }}
      >
        {/* Body */}
        <div
          style={{
            fontFamily: tokens.fontBody,
            fontSize: '17px',
            lineHeight: 1.65,
            color: tokens.textPrimary,
          }}
        >
          <p style={{ margin: '0 0 18px', textIndent: '1.6em' }}>
            DigiBooks Inc., a Toronto-based education-tech firm, faced a quiet
            crisis. The consumer tablet it had positioned as the centerpiece of
            its hardware roadmap was now sitting on $14M of inventory and ten
            weeks of operating runway.
          </p>

          <div
            style={{
              fontFamily: tokens.fontMono,
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: tokens.accent,
              margin: '24px 0 8px',
            }}
          >
            Transcript &mdash; minute 03:14
          </div>

          <Speaker
            who="Ash"
            tokens={tokens}
            text="Where do you start, given the runway?"
          />
          <Speaker
            who="Candidate"
            tokens={tokens}
            text="I'd split it: do we still believe in the category, then do we still believe in this sku."
          />
          <Speaker
            who="Ash"
            tokens={tokens}
            text="Good fork. Defend 'believe in the category' in two moves."
          />

          <p style={{ margin: '24px 0 0', textIndent: '1.6em' }}>
            The candidate held the structure; the structure held the room.
          </p>
        </div>

        {/* Marginalia */}
        <aside
          style={{
            borderLeft: `1px solid ${tokens.border}`,
            paddingLeft: 'clamp(16px, 2vw, 28px)',
            fontFamily: tokens.fontBody,
            fontStyle: 'italic',
            fontSize: '14px',
            lineHeight: 1.55,
            color: tokens.accent,
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <strong style={{ fontWeight: 700, fontStyle: 'normal' }}>
              Note.
            </strong>{' '}
            Candidate forks early. This is the cleanest move &mdash; runway
            problems are almost always &ldquo;keep / kill / pivot.&rdquo;
          </div>
          <div style={{ marginBottom: 18 }}>
            <strong style={{ fontWeight: 700, fontStyle: 'normal' }}>
              Watch.
            </strong>{' '}
            By minute 11, quant slipped: ASP wasn&apos;t segment-adjusted.
          </div>
          <div
            style={{
              fontFamily: tokens.fontMono,
              fontStyle: 'normal',
              fontSize: '11px',
              letterSpacing: '0.08em',
              color: tokens.textSecondary,
              marginTop: 22,
              paddingTop: 14,
              borderTop: `1px solid ${tokens.border}`,
            }}
          >
            Source: Ivey 9B21M058 (2021)
          </div>
        </aside>
      </div>
    </section>
  );
}

function Speaker({
  who,
  text,
  tokens,
}: {
  who: string;
  text: string;
  tokens: TreatmentTokens;
}) {
  return (
    <div style={{ display: 'flex', gap: 16, margin: '12px 0' }}>
      <div
        style={{
          flexShrink: 0,
          width: 92,
          fontFamily: tokens.fontMono,
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: tokens.accent,
          paddingTop: 4,
        }}
      >
        {who}
      </div>
      <div
        style={{
          fontFamily: tokens.fontBody,
          fontSize: '16px',
          lineHeight: 1.55,
          color: tokens.textPrimary,
        }}
      >
        {text}
      </div>
    </div>
  );
}
