import { describe, it, expect } from 'vitest';
import {
  inferStage,
  stageDirective,
  candidateTurnCount,
  inferInterviewFormat,
  formatDirective,
  assessStuck,
  hintDirective,
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

  it('drives the close: 9+ candidate turns with no synthesis forces synthesis (no clock)', () => {
    const turns: { role: string; content: string; timestamp: string }[] = [i('opener')];
    for (let n = 0; n < 9; n++) turns.push(u(`exploring branch ${n} with some detail`));
    const s = inferStage(turns, ctx);
    expect(s.candidateTurns).toBe(9);
    expect(s.signals.hasSynthesis).toBe(false);
    expect(s.stage).toBe('synthesis');
  });

  it('with a clock: 9 fast turns but only 5 minutes in does NOT force the close', () => {
    const turns: { role: string; content: string; timestamp: string }[] = [i('opener')];
    for (let n = 0; n < 9; n++) turns.push(u(`exploring branch ${n} with some detail`));
    const s = inferStage(turns, { ...ctx, elapsedMin: 5, limitMin: 25 });
    expect(s.candidateTurns).toBe(9);
    expect(s.signals.nearEnd).toBe(false);
    expect(s.stage).not.toBe('synthesis');
  });

  it('with a clock: past 80% of the case with no synthesis forces the close', () => {
    const turns = [i('opener'), u('my structure is revenue and cost'), u('still working the branches')];
    // 21 / 25 = 0.84 — past the 0.8 close fraction
    const s = inferStage(turns, { ...ctx, elapsedMin: 21, limitMin: 25 });
    expect(s.signals.nearEnd).toBe(true);
    expect(s.stage).toBe('synthesis');
  });

  it('with a clock: at ~70% of the case it does NOT yet force the close', () => {
    const turns = [
      i('opener'),
      u('my structure is revenue and cost'),
      i('what else could be going on here?'), // brainstorm beat already run
      u('still working the branches'),
    ];
    // 18 / 25 = 0.72 — analysis is ~65% of a real case, synthesis is the last ~5%
    const s = inferStage(turns, { ...ctx, elapsedMin: 18, limitMin: 25 });
    expect(s.signals.nearEnd).toBe(false);
    expect(s.stage).toBe('analysis');
  });

  it('with a clock: a runaway turn count still forces the close as a backstop', () => {
    const turns: { role: string; content: string; timestamp: string }[] = [i('opener')];
    for (let n = 0; n < 18; n++) turns.push(u(`turn ${n}`));
    const s = inferStage(turns, { ...ctx, elapsedMin: 6, limitMin: 25 });
    expect(s.signals.nearEnd).toBe(true);
    expect(s.stage).toBe('synthesis');
  });

  it('stays in scoping while the candidate is still asking clarifying questions', () => {
    const turns = [
      i('Here is the case. How would you approach it?'),
      u('Just to make sure I understand — what is the objective here?'),
      u('And what timeframe are we working with?'),
    ];
    const s = inferStage(turns, ctx);
    expect(s.candidateTurns).toBe(2);
    expect(s.signals.stillClarifying).toBe(true);
    expect(s.stage).toBe('scoping');
  });

  it('evicts scoping once the clarifying window is spent (no clock: 3 turns)', () => {
    const turns = [
      i('opener'),
      u('what is the objective?'),
      u('what is the timeframe?'),
      u('what about the budget?'),
    ];
    const s = inferStage(turns, ctx);
    expect(s.candidateTurns).toBe(3);
    expect(s.stage).toBe('structure');
  });

  it('evicts scoping once the clarifying window is spent (clock: past ~4 min)', () => {
    const turns = [i('opener'), u('what is the objective?'), u('and the timeframe?')];
    const s = inferStage(turns, { ...ctx, elapsedMin: 5, limitMin: 25 });
    expect(s.stage).toBe('structure');
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
      'brainstorm',
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

describe('inferInterviewFormat', () => {
  it('maps McKinsey-family sources to interviewer-led', () => {
    expect(inferInterviewFormat('McKinsey & Company')).toBe('interviewer_led');
    expect(inferInterviewFormat('McKinsey & Company, Round I')).toBe('interviewer_led');
    expect(inferInterviewFormat('Strategy& (PwC)')).toBe('interviewer_led');
  });
  it('maps BCG/Bain/casebooks/unknown to candidate-led', () => {
    expect(inferInterviewFormat('BCG')).toBe('candidate_led');
    expect(inferInterviewFormat('Bain & Co., Round I')).toBe('candidate_led');
    expect(inferInterviewFormat('Wharton Casebook 2017')).toBe('candidate_led');
    expect(inferInterviewFormat('manual')).toBe('candidate_led');
    expect(inferInterviewFormat(null)).toBe('candidate_led');
    expect(inferInterviewFormat(undefined)).toBe('candidate_led');
  });
});

describe('formatDirective', () => {
  it('states who drives for each format', () => {
    expect(formatDirective('candidate_led')).toMatch(/CANDIDATE-LED/);
    expect(formatDirective('candidate_led').toLowerCase()).toMatch(/candidate drives|reactive/);
    expect(formatDirective('interviewer_led')).toMatch(/INTERVIEWER-LED/);
    expect(formatDirective('interviewer_led').toLowerCase()).toMatch(/you drive|redirect/);
  });
});

describe('brainstorm stage', () => {
  const structured = 'my framework is revenue and cost, and I would start on the revenue side';
  it('routes one brainstorm beat mid-late when the interviewer has not asked "what else"', () => {
    const turns = [i('opener'), u(structured), i('ok, revenue is down 10%'), u('so volume must be the driver')];
    const s = inferStage(turns, { ...ctx, elapsedMin: 15, limitMin: 25 });
    expect(s.signals.readyForBrainstorm).toBe(true);
    expect(s.stage).toBe('brainstorm');
  });
  it('falls back to analysis once the interviewer has run the creativity beat', () => {
    const turns = [
      i('opener'),
      u(structured),
      i('what else could explain the decline?'),
      u('could also be competitor entry or a price change'),
    ];
    const s = inferStage(turns, { ...ctx, elapsedMin: 15, limitMin: 25 });
    expect(s.signals.readyForBrainstorm).toBe(false);
    expect(s.stage).toBe('analysis');
  });
  it('does not brainstorm early (first third of the case)', () => {
    const turns = [i('opener'), u(structured), u('starting the analysis')];
    const s = inferStage(turns, { ...ctx, elapsedMin: 4, limitMin: 25 });
    expect(s.stage).not.toBe('brainstorm');
  });
});

describe('assessStuck / hintDirective', () => {
  it('counts a run of no-progress turns and caps at level 3', () => {
    const turns = [
      i('opener'),
      u('I have a structure: revenue and cost'),
      u("I'm not sure where to go from here"),
      u('I really don\'t know'),
      u('hmm'),
      u('can you give me a hint'),
    ];
    expect(assessStuck(turns).level).toBe(3);
  });
  it('resets when the candidate makes progress', () => {
    const turns = [
      i('opener'),
      u("I'm not sure"),
      u('actually — I would break cost into fixed and variable because the fixed base looks heavy'),
    ];
    expect(assessStuck(turns).level).toBe(0);
  });
  it('is total on malformed input', () => {
    // @ts-expect-error malformed
    expect(() => assessStuck(null)).not.toThrow();
    expect(assessStuck([]).level).toBe(0);
  });
  it('hintDirective is empty when not stuck', () => {
    expect(hintDirective(0, 'candidate_led')).toBe('');
  });
  it('candidate-led caps the ladder at rung 2; interviewer-led allows rung 3', () => {
    expect(hintDirective(3, 'candidate_led')).toMatch(/rung 2 of 2/);
    expect(hintDirective(3, 'candidate_led').toUpperCase()).toContain('DIRECTIONAL');
    expect(hintDirective(3, 'interviewer_led')).toMatch(/rung 3 of 3/);
    expect(hintDirective(3, 'interviewer_led').toUpperCase()).toContain('STRUCTURAL');
  });
});
