// Static-template fallbacks for when ALL LLM providers (Groq, NVIDIA, Cerebras,
// OpenRouter) are simultaneously down. Returns degraded-but-valid responses
// so the user always sees something useful instead of a 500.
//
// Each export here matches the JSON shape the upstream consumer expects, so
// callers can substitute without conditional handling.

import { TRACKS, type Track } from '../tracks';
import type { IssueTree } from './issue-tree';

// ---------- Evaluator ----------
// Used when evaluate-session can't reach any LLM. Returns a generic 50/100
// scoring with a clear "degraded" message so the user knows it isn't a real
// score. They'll see this as: 50/100 + a banner saying scoring service was
// unavailable + suggestion to retry.
export function staticEvaluatorBreakdown(track: Track | null): any {
  const def = track ? TRACKS[track] : null;
  const dimensions = def
    ? Object.fromEntries(def.rubric.map((r) => [r.dimension.toLowerCase().replace(/\s+/g, '_'), Math.round(r.weight * 0.5)]))
    : {
        structure: 12,
        quant_reasoning: 10,
        business_judgment: 8,
        communication: 8,
        hypothesis_management: 5,
        creativity: 5,
        synthesis: 2,
      };
  return {
    total: 50,
    dimensions,
    strengths: ['(scoring service unavailable — generic placeholder shown)'],
    gaps: ['Re-run end-session in a minute to get a real score from the evaluator.'],
    fallback_used: true,
  };
}

// ---------- Issue tree ----------
// Empty-but-valid tree shape. The panel renders this with a hint that the
// extractor is offline and the user can retry.
export function staticIssueTreeFallback(): IssueTree {
  return {
    nodes: [
      {
        id: 'root-fallback',
        label: '⚠ Tree extractor offline — click ↻ rebuild to retry',
        parent_id: null,
        level: 0,
      },
    ],
    rubric: { mece: 0, depth_balance: 0, hypothesis_attached: 0, driven_from_issue: 0 },
    last_updated_turn: -1,
  };
}

// ---------- Pre-case crammer ----------
// Track + case_type aware static primer. Pulls from in-code track data
// (already shipped) so we have something useful even when Tavily + LLM are
// both down. No web research, no personalization — but never fails.
export function staticCrammerFallback(track: Track | null): any {
  const def = track ? TRACKS[track] : TRACKS['consulting'];
  const topFrameworks = def.frameworks.slice(0, 3).map((f) => ({
    name: f.name,
    why_this_one: f.when_to_use,
  }));
  const topMath = def.math.slice(0, 4).map((m) => ({
    name: m.name,
    formula: m.formula,
    when: '',
  }));
  return {
    industry_primer: {
      sector: '(industry research unavailable)',
      typical_margins: 'verify in case data',
      key_kpis: [],
      recent_disruption: '',
      top_players: [],
    },
    likely_frameworks: topFrameworks,
    math_shortcuts: topMath,
    watch_outs: [
      'Industry primer service is offline — solve with the case data only.',
      def.killer_phrases[0] ?? 'Lead with hypothesis, then test with data.',
    ],
    recovery_script: def.recovery_scripts[0] ?? 'Take a breath, restate the question, propose a structure.',
    spike_phrase: def.killer_phrases[0] ?? '',
    sources: [],
    fallback_used: true,
  };
}

// ---------- Ideal walkthrough ----------
// Generic step-by-step that applies to any case. Used when walkthrough
// generator (Tavily + LLM) is down. Shows the user a structure scaffold
// they can read while the real one is unavailable.
export function staticWalkthroughFallback(): any {
  return {
    headline: '(Detailed walkthrough unavailable — generic case-solve scaffold shown)',
    issue_tree: [
      'Root question (restated from prompt)',
      '  L1: Driver A',
      '  L1: Driver B',
      '  L1: Driver C',
    ],
    hypotheses: [
      'Most likely driver is X based on (general business pattern). Verify with quantitative data.',
    ],
    levels: [
      { level: 'L0', topic: 'Recommendation', reasoning: 'Pending detailed analysis once service returns.' },
    ],
    steps: [
      { title: 'Clarify the prompt', prompt: 'Restate objective + constraints + time horizon.' },
      { title: 'Decompose into branches', prompt: 'MECE structure with 3-4 L1 branches.' },
      { title: 'Hypothesise', prompt: 'Lead with the most-likely driver; commit to a position.' },
      { title: 'Test with data', prompt: 'Math through the case data; pivot if hypothesis is wrong.' },
      { title: 'Recommend', prompt: 'Bottom-line first; X because Y, with Z risk.' },
    ],
    sources: [],
    fallback_used: true,
  };
}
