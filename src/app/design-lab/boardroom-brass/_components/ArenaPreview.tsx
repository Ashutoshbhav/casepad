'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Typewriter } from '../../_components/Typewriter';
import { BrassRule } from '../../_components/BrassRule';
import type { TreatmentTokens } from '../../_lib/tokens';

// Mini 3-panel arena preview. Brass progress bar at the top (filled to ~60%)
// plus a boardroom-clock that ticks via a colon scale-pulse once per second.

function BoardroomClock({ tokens }: { tokens: TreatmentTokens }) {
  const reduced = useReducedMotion();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 60);
    }, 1000);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <span
      style={{
        fontFamily: tokens.fontMono,
        fontSize: '11px',
        letterSpacing: '0.12em',
        color: tokens.textSecondary,
        display: 'inline-flex',
        alignItems: 'baseline',
      }}
    >
      00
      <span
        style={{
          display: 'inline-block',
          transform: pulse ? 'scale(1.4)' : 'scale(1)',
          transition: 'transform 60ms ease',
          color: tokens.accent,
          padding: '0 1px',
        }}
      >
        :
      </span>
      14
      <span
        style={{
          display: 'inline-block',
          transform: pulse ? 'scale(1.4)' : 'scale(1)',
          transition: 'transform 60ms ease',
          color: tokens.accent,
          padding: '0 1px',
        }}
      >
        :
      </span>
      32
    </span>
  );
}

export function ArenaPreview({ tokens }: { tokens: TreatmentTokens }) {
  return (
    <section
      style={{
        padding: '96px 24px',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          fontFamily: tokens.fontMono,
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: tokens.textSecondary,
          marginBottom: 14,
        }}
      >
        // Arena
      </div>
      <h2
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: tokens.textPrimary,
          margin: '0 0 32px',
          maxWidth: 720,
        }}
      >
        Three panels. One conversation.
      </h2>

      <div
        style={{
          background: tokens.elevated,
          border: `1px solid ${tokens.border}`,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {/* Top toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: `1px solid ${tokens.border}`,
            fontFamily: tokens.fontMono,
            fontSize: '11px',
            letterSpacing: '0.08em',
            color: tokens.textSecondary,
            textTransform: 'uppercase',
          }}
        >
          <span>DigiBooks Tablet Launch &middot; Ivey 2021</span>
          <BoardroomClock tokens={tokens} />
        </div>

        {/* Brass progress bar at ~60% */}
        <div
          style={{
            height: 1,
            background: tokens.border,
            position: 'relative',
          }}
        >
          <BrassRule
            color={tokens.accent}
            height={1}
            progressTo={0.6}
            duration={1.2}
            whileInView
          />
        </div>

        {/* 3-panel grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr',
            minHeight: 360,
          }}
        >
          {/* Chat */}
          <div
            style={{
              padding: '20px 22px',
              borderRight: `1px solid ${tokens.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <ChatRow
              who="ASH"
              tokens={tokens}
              accent
            >
              <Typewriter
                text="DigiBooks is sitting on $14M in tablet inventory and ten weeks of runway. Where do you start?"
                speed={28}
                startOnView
              />
            </ChatRow>
            <ChatRow who="YOU" tokens={tokens}>
              I&apos;d split it: do we still believe in the category, then do we still believe in this sku.
            </ChatRow>
            <ChatRow who="ASH" tokens={tokens} accent>
              <Typewriter
                text="Good fork. Defend &lsquo;believe in the category&rsquo; in two moves."
                speed={28}
                startOnView
                startDelay={1200}
              />
            </ChatRow>
          </div>

          {/* Tree placeholder */}
          <div
            style={{
              padding: '20px 22px',
              borderRight: `1px solid ${tokens.border}`,
              fontFamily: tokens.fontMono,
              fontSize: '11px',
              color: tokens.textSecondary,
              lineHeight: 1.8,
            }}
          >
            <div
              style={{
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: tokens.accent,
                marginBottom: 14,
              }}
            >
              Decision tree
            </div>
            <div style={{ color: tokens.textPrimary }}>+ Profitability</div>
            <div style={{ paddingLeft: 14 }}>+ Revenue side</div>
            <div style={{ paddingLeft: 28 }}>- Volume (sku, channel)</div>
            <div style={{ paddingLeft: 28, color: tokens.accent }}>- Price (segment)</div>
            <div style={{ paddingLeft: 14 }}>- Cost side</div>
            <div style={{ paddingLeft: 28 }}>- Variable</div>
            <div style={{ paddingLeft: 28 }}>- Fixed</div>
          </div>

          {/* Sheet placeholder */}
          <div
            style={{
              padding: '20px 22px',
              fontFamily: tokens.fontMono,
              fontSize: '11px',
              color: tokens.textSecondary,
              lineHeight: 1.8,
            }}
          >
            <div
              style={{
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: tokens.accent,
                marginBottom: 14,
              }}
            >
              Scratch sheet
            </div>
            <div style={{ color: tokens.textPrimary }}>TAM India tablet (2024)</div>
            <div>= 12M units &times; $180 ASP</div>
            <div style={{ color: tokens.accent }}>~ $2.16B</div>
            <div style={{ marginTop: 14, color: tokens.textPrimary }}>DigiBooks share target</div>
            <div>= 1.5% of $2.16B</div>
            <div style={{ color: tokens.accent }}>~ $32M Y1</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatRow({
  who,
  children,
  tokens,
  accent,
}: {
  who: string;
  children: React.ReactNode;
  tokens: TreatmentTokens;
  accent?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.4 }}
    >
      <div
        style={{
          fontFamily: tokens.fontMono,
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: accent ? tokens.accent : tokens.textSecondary,
          marginBottom: 4,
        }}
      >
        {who}
      </div>
      <div
        style={{
          fontFamily: tokens.fontBody,
          fontSize: '15px',
          lineHeight: 1.55,
          color: tokens.textPrimary,
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}
