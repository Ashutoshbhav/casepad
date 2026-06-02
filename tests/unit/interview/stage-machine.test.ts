import { describe, it, expect } from 'vitest';
import {
  inferStage,
  stageDirective,
  candidateTurnCount,
  type StageContext,
} from '@/lib/interview/stage-machine';

const ctx: StageContext = { track: 'consulting', caseType: 'profitability', isEstimation: false };

function u(content: string) {
  return { role: 'user', content, timestamp: '' };
}
function i(content: string) {
  return { role: 'interviewer', content, timestamp: '' };
}

describe('inferStage', () => {
  it('starts in scoping with an empty transcript', () => {
    expect(inferStage([], ctx).stage).toBe('scoping');
  });

  it('stays in scoping when the candidate has barely spoken', () => {
    const t = [i('Here is the case. How would you approach it?'), u('Can I take a moment to think?')];
    expect(inferStage(t, ctx).stage).toBe('scoping');
  });

  it('moves to analysis once a structure is laid out', () => {
    const t = [
      i('opener'),
      u('I would not think yet'),
      u("I'd break this into a profitability framework — revenue and cost, and prioritize the cost side first."),
    ];
    const s = inferStage(t, ctx);
    expect(s.signals.hasStructure).toBe(true);
    expect(s.stage).toBe('analysis');
  });

  it('routes to quant when a live math thread is active', () => {
    const t = [
      i('opener'),
      u('My structure is revenue and cost.'),
      u('Let me assume 2 million users times $30 per user, roughly $60 million.'),
    ];
    const s = inferStage(t, ctx);
    expect(s.signals.mathActive).toBe(true);
    expect(s.stage).toBe('quant');
  });

  it('drives the close: 9+ candidate turns with no synthesis forces synthesis', () => {
    const turns: { role: string; content: string; timestamp: string }[] = [i('opener')];
    for (let n = 0; n < 9; n++) turns.push(u(`exploring branch ${n} with some detail`));
    const s = inferStage(turns, ctx);
    expect(s.candidateTurns).toBe(9);
    expect(s.signals.hasSynthesis).toBe(false);
    expect(s.stage).toBe('synthesis');
  });

  it('moves to recommendation once the candidate synthesizes', () => {
    const t = [
      i('opener'),
      u('I structured it.'),
      u('To synthesize: the bottom line is the issue sits on the revenue side, driven by price.'),
    ];
    const s = inferStage(t, ctx);
    expect(s.signals.hasSynthesis).toBe(true);
    expect(s.stage).toBe('recommendation');
  });

  it('moves to wrap once a recommendation is committed', () => {
    const t = [
      i('opener'),
      u('I recommend we should not enter the market because the economics do not clear the hurdle rate, and the main risk is regulation.'),
    ];
    const s = inferStage(t, ctx);
    expect(s.signals.hasRecommendation).toBe(true);
    expect(s.stage).toBe('wrap');
  });

  it('is total — never throws on malformed input', () => {
    // @ts-expect-error intentionally malformed
    expect(() => inferStage(null, ctx)).not.toThrow();
    // @ts-expect-error intentionally malformed
    expect(inferStage([{ role: 'user' }, 'junk', null], ctx).stage).toBeDefined();
  });
});

describe('candidateTurnCount', () => {
  it('counts only user turns', () => {
    expect(candidateTurnCount([i('a'), u('b'), i('c'), u('d')])).toBe(2);
    // @ts-expect-error malformed
    expect(candidateTurnCount(undefined)).toBe(0);
  });
});

describe('stageDirective', () => {
  it('produces a labelled directive for every stage', () => {
    for (const stage of [
      'scoping',
      'structure',
      'analysis',
      'quant',
      'synthesis',
      'recommendation',
      'wrap',
    ] as const) {
      const d = stageDirective(stage, ctx);
      expect(d).toContain(`CURRENT STAGE: ${stage.toUpperCase()}`);
      expect(d.length).toBeGreaterThan(20);
    }
  });

  it('mentions estimation in the quant directive when isEstimation is true', () => {
    const est = stageDirective('quant', { ...ctx, isEstimation: true });
    expect(est.toLowerCase()).toContain('estimation');
  });

  it('appends track-specific research notes (e.g. McKinsey interviewer-led in scoping)', () => {
    const d = stageDirective('scoping', ctx); // consulting
    expect(d).toMatch(/interviewer-led/i);
  });

  it('uses the guesstimate discipline at the quant stage for estimation cases', () => {
    const d = stageDirective('quant', { track: 'pm', caseType: 'estimation', isEstimation: true });
    expect(d.toLowerCase()).toMatch(/lowest-weighted|sanity|order of magnitude/);
  });
});
