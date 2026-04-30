import type { IdealStructure } from '@/lib/types/domain';

export function IdealStructureTree({ s }: { s: IdealStructure }) {
  if (!s || (!s.framework && !(s.branches?.length))) {
    return <div className="text-sm text-zinc-500 italic">No ideal structure available for this case.</div>;
  }
  return (
    <div className="text-sm space-y-3">
      {s.framework && <div className="font-semibold text-zinc-200">Framework: {s.framework}</div>}
      <ul className="space-y-1">
        {(s.branches ?? []).map((b, i) => (
          <li key={i}>
            <span className="text-zinc-200">▸ {b.node}</span>
            {b.subnodes && b.subnodes.length > 0 && (
              <ul className="ml-5 text-zinc-400 text-xs mt-1">
                {b.subnodes.map((n, j) => <li key={j}>· {n}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {(s.key_insights ?? []).length > 0 && (
        <div>
          <div className="font-semibold text-zinc-300 mt-3">Key insights</div>
          <ul className="ml-3 text-zinc-400 text-xs space-y-1 mt-1">
            {s.key_insights!.map((k, i) => <li key={i}>• {k}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
