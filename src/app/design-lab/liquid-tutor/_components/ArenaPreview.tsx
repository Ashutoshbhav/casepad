'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { BreathingOrb } from '../../_components/BreathingOrb';
import type { TreatmentTokens } from '../../_lib/tokens';

type Tab = 'chat' | 'tree' | 'sheet';

// Mini arena. Tabs animate scale 0.96 + blur(4) on outgoing and scale 1.04 -> 1
// + blur(4) -> 0 on incoming, 320ms.
//
// Disperse moment: clicking "Send" turns the user message into 6 small dots
// that fly toward the orb avatar position.

export function ArenaPreview({ tokens }: { tokens: TreatmentTokens }) {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<Tab>('chat');
  const [dispersing, setDispersing] = useState(false);

  function trigger() {
    if (reduced) return;
    setDispersing(true);
    setTimeout(() => setDispersing(false), 1100);
  }

  return (
    <section
      style={{
        padding: '96px 24px',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      <h2
        style={{
          fontFamily: tokens.fontDisplay,
          fontStyle: 'italic',
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 400,
          color: tokens.textPrimary,
          margin: '0 0 32px',
          maxWidth: 720,
          letterSpacing: '-0.01em',
        }}
      >
        Three views. One presence.
      </h2>

      <div
        style={{
          background: tokens.elevated,
          border: `1px solid ${tokens.border}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Tab strip */}
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${tokens.border}`,
            padding: '0 12px',
          }}
        >
          {(['chat', 'tree', 'sheet'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '14px 18px',
                fontFamily: tokens.fontMono,
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: tab === t ? tokens.accent : tokens.textSecondary,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {t}
              {tab === t && (
                <motion.div
                  layoutId="lt-tab-underline"
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    left: 12,
                    right: 12,
                    height: 1,
                    background: tokens.accent,
                  }}
                />
              )}
            </button>
          ))}
        </div>

        <div style={{ minHeight: 380, position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={
                reduced
                  ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
                  : { opacity: 0, scale: 1.04, filter: 'blur(4px)' }
              }
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={
                reduced
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.96, filter: 'blur(4px)' }
              }
              transition={{ duration: 0.32, ease: 'easeOut' }}
              style={{ padding: '24px 28px' }}
            >
              {tab === 'chat' && (
                <ChatPanel
                  tokens={tokens}
                  dispersing={dispersing}
                  onSend={trigger}
                />
              )}
              {tab === 'tree' && <TreePanel tokens={tokens} />}
              {tab === 'sheet' && <SheetPanel tokens={tokens} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function ChatPanel({
  tokens,
  dispersing,
  onSend,
}: {
  tokens: TreatmentTokens;
  dispersing: boolean;
  onSend: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div style={{ position: 'relative' }}>
      {/* Ash msg */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          <BreathingOrb
            size={20}
            color={tokens.accent}
            glow={tokens.accentGlow ?? 'rgba(232,201,160,0.3)'}
          />
        </div>
        <div
          style={{
            fontFamily: tokens.fontBody,
            fontSize: '15px',
            lineHeight: 1.55,
            color: tokens.textPrimary,
            maxWidth: 540,
          }}
        >
          DigiBooks is sitting on $14M in tablet inventory and ten weeks of
          runway. Where do you start?
        </div>
      </div>

      {/* User msg with disperse */}
      <div
        style={{
          marginLeft: 32,
          marginBottom: 18,
          minHeight: 28,
          position: 'relative',
        }}
      >
        <motion.div
          animate={
            dispersing
              ? { opacity: 0, filter: 'blur(2px)' }
              : { opacity: 1, filter: 'blur(0px)' }
          }
          transition={{ duration: 0.4 }}
          style={{
            fontFamily: tokens.fontBody,
            fontSize: '15px',
            lineHeight: 1.55,
            color: tokens.textPrimary,
            background: `${tokens.accent}14`,
            border: `1px solid ${tokens.accent}33`,
            padding: '10px 14px',
            borderRadius: 10,
            display: 'inline-block',
            maxWidth: 480,
          }}
        >
          I&apos;d split it: do we still believe in the category, then do we
          still believe in this sku.
        </motion.div>

        {/* Disperse particles */}
        {dispersing && !reduced && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: 80 + i * 18,
                  y: 8,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  x: -32,
                  y: -120,
                  opacity: 0,
                  scale: 0.4,
                }}
                transition={{
                  duration: 0.9,
                  delay: i * 0.04,
                  ease: 'easeIn',
                }}
                style={{
                  position: 'absolute',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: tokens.accent,
                  boxShadow: `0 0 8px ${tokens.accentGlow}`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ash follow-up */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          <BreathingOrb
            size={20}
            color={tokens.accent}
            glow={tokens.accentGlow ?? 'rgba(232,201,160,0.3)'}
          />
        </div>
        <div
          style={{
            fontFamily: tokens.fontBody,
            fontSize: '15px',
            lineHeight: 1.55,
            color: tokens.textPrimary,
            maxWidth: 540,
          }}
        >
          Good fork. Defend &lsquo;believe in the category&rsquo; in two moves.
        </div>
      </div>

      <button
        type="button"
        onClick={onSend}
        style={{
          background: tokens.accent,
          color: tokens.accentInk,
          border: 'none',
          padding: '10px 18px',
          borderRadius: 999,
          fontFamily: tokens.fontBody,
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          marginLeft: 32,
        }}
      >
        Send (replay disperse)
      </button>
    </div>
  );
}

function TreePanel({ tokens }: { tokens: TreatmentTokens }) {
  return (
    <div
      style={{
        fontFamily: tokens.fontMono,
        fontSize: '12px',
        color: tokens.textSecondary,
        lineHeight: 1.9,
      }}
    >
      <div style={{ color: tokens.textPrimary }}>+ Profitability</div>
      <div style={{ paddingLeft: 14 }}>+ Revenue</div>
      <div style={{ paddingLeft: 28 }}>- Volume (sku, channel)</div>
      <div style={{ paddingLeft: 28, color: tokens.accent }}>
        - Price (segment)
      </div>
      <div style={{ paddingLeft: 14 }}>- Cost</div>
      <div style={{ paddingLeft: 28 }}>- Variable</div>
      <div style={{ paddingLeft: 28 }}>- Fixed</div>
    </div>
  );
}

function SheetPanel({ tokens }: { tokens: TreatmentTokens }) {
  return (
    <div
      style={{
        fontFamily: tokens.fontMono,
        fontSize: '12px',
        color: tokens.textSecondary,
        lineHeight: 1.9,
      }}
    >
      <div style={{ color: tokens.textPrimary }}>TAM India tablet (2024)</div>
      <div>= 12M units &times; $180 ASP</div>
      <div style={{ color: tokens.accent }}>~ $2.16B</div>
      <div style={{ marginTop: 14, color: tokens.textPrimary }}>
        DigiBooks share target
      </div>
      <div>= 1.5% of $2.16B</div>
      <div style={{ color: tokens.accent }}>~ $32M Y1</div>
    </div>
  );
}
