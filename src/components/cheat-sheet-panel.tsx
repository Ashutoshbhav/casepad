'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { updateCheatSheetField } from '@/server-actions/update-cheatsheet';
import type { CheatSheetState } from '@/lib/types/domain';

// War Room cheat sheet — pure JetBrains Mono. Numbers right-aligned in a
// fixed-width tabular layout. Locked fields show a brass ▣ glyph.

export function CheatSheetPanel({ sessionId, initial }: { sessionId: string; initial: CheatSheetState }) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`cs-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'cheat_sheets',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => setState(payload.new as any))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const Field = ({ name, label }: { name: 'framework' | 'hypothesis' | 'manual_notes'; label: string }) => {
    const locked = state.locked_fields.includes(name);
    const [val, setVal] = useState((state[name] as string) || '');
    const tooltip = locked
      ? 'Locked — auto-fill stops touching this. Click to unlock and let the AI update it again.'
      : 'Click to lock — pin your version so the AI auto-fill stops overwriting this.';
    return (
      <div
        className="rounded p-3"
        style={{
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-elevated)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="meta-label">
            {label}
          </span>
          <button
            onClick={() => updateCheatSheetField(sessionId, name, val, !locked)}
            title={tooltip}
            aria-label={tooltip}
            className="font-mono text-[10px] uppercase tracking-[0.14em] flex items-center gap-1"
            style={{
              // Locked state used coral; per one-job rule, locked uses primary
              // text + the filled glyph carries the signal. Coral reserved for
              // CTAs + asterisk character only.
              color: locked
                ? 'var(--color-text-primary)'
                : 'var(--color-text-muted)',
            }}
          >
            <span aria-hidden="true">{locked ? '▣' : '▢'}</span>
            <span>{locked ? 'locked' : 'lock'}</span>
          </button>
        </div>
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => updateCheatSheetField(sessionId, name, val, locked)}
          rows={3}
          className="w-full font-mono rounded px-2 py-1 text-[13px] resize-none min-h-[60px] sm:min-h-[40px]"
          style={{
            background: 'var(--color-bg-sunken)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <h2
        className="font-mono text-[11px] uppercase tracking-[0.22em]"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Cheat Sheet
      </h2>
      <Field name="framework" label="Framework" />
      <Field name="hypothesis" label="Hypothesis" />

      {/* KEY NUMBERS — right-aligned tabular block. */}
      <div
        className="rounded p-3"
        style={{
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-elevated)',
        }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Key numbers
        </div>
        {state.key_numbers.length === 0 ? (
          <div
            className="font-mono text-[11px] italic"
            style={{ color: 'var(--color-text-muted)' }}
          >
            none yet
          </div>
        ) : (
          <ul className="font-mono text-[12px] space-y-1">
            {state.key_numbers.map((n, i) => (
              <li
                key={i}
                className="flex items-baseline gap-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span className="flex-1 truncate">{n.label}</span>
                <span
                  className="text-right tabular-nums"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {n.value}
                  {n.unit ? ` ${n.unit}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="rounded p-3"
        style={{
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-elevated)',
        }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Decisions
        </div>
        {state.decisions.length === 0 ? (
          <div
            className="font-mono text-[11px] italic"
            style={{ color: 'var(--color-text-muted)' }}
          >
            none yet
          </div>
        ) : (
          <ul className="font-mono text-[12px] space-y-1">
            {state.decisions.map((d, i) => (
              <li key={i} style={{ color: 'var(--color-text-primary)' }}>
                · {d}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="rounded p-3"
        style={{
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg-elevated)',
        }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Next steps
        </div>
        {state.next_steps.length === 0 ? (
          <div
            className="font-mono text-[11px] italic"
            style={{ color: 'var(--color-text-muted)' }}
          >
            none yet
          </div>
        ) : (
          <ul className="font-mono text-[12px] space-y-1">
            {state.next_steps.map((d, i) => (
              <li key={i} style={{ color: 'var(--color-text-primary)' }}>
                · {d}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Field name="manual_notes" label="Notes" />
    </div>
  );
}
