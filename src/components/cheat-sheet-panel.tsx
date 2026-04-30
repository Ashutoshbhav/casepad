'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { updateCheatSheetField } from '@/server-actions/update-cheatsheet';
import type { CheatSheetState } from '@/lib/types/domain';

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
    return (
      <div className="rounded border border-zinc-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase text-zinc-500">{label}</span>
          <button
            onClick={() => updateCheatSheetField(sessionId, name, val, !locked)}
            className={`text-xs ${locked ? 'text-amber-400' : 'text-zinc-500'}`}
          >
            {locked ? '🔒 locked' : 'lock'}
          </button>
        </div>
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => updateCheatSheetField(sessionId, name, val, locked)}
          rows={2}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm resize-none"
        />
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-300">Cheat Sheet</h2>
      <Field name="framework" label="Framework" />
      <Field name="hypothesis" label="Hypothesis" />
      <div className="rounded border border-zinc-800 p-3">
        <div className="text-xs uppercase text-zinc-500 mb-2">Key numbers</div>
        <ul className="text-sm space-y-1">
          {state.key_numbers.map((n, i) => (
            <li key={i} className="text-zinc-300">• {n.label}: <span className="text-zinc-100">{n.value} {n.unit}</span></li>
          ))}
          {state.key_numbers.length === 0 && <li className="text-zinc-600 text-xs italic">none yet</li>}
        </ul>
      </div>
      <div className="rounded border border-zinc-800 p-3">
        <div className="text-xs uppercase text-zinc-500 mb-2">Decisions</div>
        <ul className="text-sm space-y-1">
          {state.decisions.map((d, i) => <li key={i} className="text-zinc-300">• {d}</li>)}
          {state.decisions.length === 0 && <li className="text-zinc-600 text-xs italic">none yet</li>}
        </ul>
      </div>
      <div className="rounded border border-zinc-800 p-3">
        <div className="text-xs uppercase text-zinc-500 mb-2">Next steps</div>
        <ul className="text-sm space-y-1">
          {state.next_steps.map((d, i) => <li key={i} className="text-zinc-300">• {d}</li>)}
          {state.next_steps.length === 0 && <li className="text-zinc-600 text-xs italic">none yet</li>}
        </ul>
      </div>
      <Field name="manual_notes" label="Notes" />
    </div>
  );
}
