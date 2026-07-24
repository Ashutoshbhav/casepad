import type { IdealWalkthrough } from '@/lib/groq/walkthrough';
import { IssueTreeSketch } from './issue-tree-sketch';

export function IdealWalkthroughView({ w }: { w: IdealWalkthrough }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Issue tree</h3>
        <div className="rounded border border-zinc-800 p-4 text-sm">
          <IssueTreeSketch root={w.issue_tree.root_question} branches={w.issue_tree.branches as unknown} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Hypothesis tree</h3>
        <div className="rounded border border-zinc-800 p-4 text-sm space-y-2">
          <div className="text-amber-300">★ {w.hypothesis_tree.primary}</div>
          <ul className="ml-4 space-y-1">
            {w.hypothesis_tree.supporting.map((h, i) => (
              <li key={i} className="text-zinc-400">→ {h}</li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        {/* Deliberately NOT labeled L0–L4: those codes mean the structural
            zoom ladder (root question → buckets → generic drivers →
            case-specific → testable) everywhere else in the app — the live
            issue tree, the interviewer's altitude discipline. This section
            is a different axis (answer-presentation depth, recommendation
            first), and reusing the L-codes here taught the wrong meaning. */}
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Answer depth (top line → next steps)</h3>
        <div className="space-y-2 text-sm">
          <Level label="1" name="Recommendation" content={[w.thinking_levels.L0_recommendation]} colour="emerald" />
          <Level label="2" name="Drivers" content={w.thinking_levels.L1_drivers} colour="sky" />
          <Level label="3" name="Evidence" content={w.thinking_levels.L2_evidence} colour="violet" />
          <Level label="4" name="Risks" content={w.thinking_levels.L3_risks} colour="rose" />
          <Level label="5" name="Next steps" content={w.thinking_levels.L4_implementation} colour="amber" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Step-by-step solve</h3>
        <ol className="space-y-3">
          {w.step_by_step.map((s) => (
            <li key={s.step} className="rounded border border-zinc-800 p-3 text-sm">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs text-zinc-500">Step {s.step}</span>
                <span className="text-zinc-200 font-medium">{s.action}</span>
              </div>
              <div className="text-zinc-400 text-xs leading-relaxed">{s.reasoning}</div>
              {s.expected_questions && s.expected_questions.length > 0 && (
                <div className="mt-2 text-xs text-zinc-500">
                  Ask: {s.expected_questions.join(' · ')}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      {w.sources && w.sources.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Sources</h3>
          <p className="text-xs text-zinc-500 mb-2">Web research used to ground this walkthrough — facts above are anchored in case data + these sources.</p>
          <ol className="space-y-1 text-xs">
            {w.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline">
                  [{i + 1}] {s.title}
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function Level({ label, name, content, colour }: { label: string; name: string; content: string[]; colour: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-300 border-emerald-900/50',
    sky: 'text-sky-300 border-sky-900/50',
    violet: 'text-violet-300 border-violet-900/50',
    rose: 'text-rose-300 border-rose-900/50',
    amber: 'text-amber-300 border-amber-900/50',
  };
  return (
    <div className={`rounded border ${colorMap[colour]} p-3`}>
      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-xs font-mono ${colorMap[colour].split(' ')[0]}`}>{label}</span>
        <span className="text-zinc-300 text-xs">{name}</span>
      </div>
      <ul className="space-y-0.5 text-zinc-400 text-xs">
        {content.filter(Boolean).map((c, i) => <li key={i}>· {c}</li>)}
      </ul>
    </div>
  );
}
