import { describe, it, expect } from 'vitest';
import {
  detectEstimationThread,
  extractEstimationState,
  renderEstimationStateBlock,
  estimationSignals,
} from '@/lib/case-state/estimation-state';

function u(content: string) {
  return { role: 'user', content, timestamp: '' };
}
function i(content: string) {
  return { role: 'interviewer', content, timestamp: '' };
}

describe('detectEstimationThread', () => {
  it('is true for estimation-typed cases', () => {
    expect(detectEstimationThread([], { caseType: 'estimation' })).toBe(true);
    expect(detectEstimationThread([], { isEstimation: true })).toBe(true);
  });

  it('detects sizing language in recent turns', () => {
    expect(detectEstimationThread([i('opener'), u('How many EV chargers are sold in India per year?')])).toBe(true);
  });

  it('is false for a plain profitability discussion', () => {
    expect(detectEstimationThread([i('opener'), u("I'd look at the revenue and cost sides.")])).toBe(false);
  });
});

describe('extractEstimationState', () => {
  it('returns inactive empty state when no thread', () => {
    const s = extractEstimationState([i('opener'), u('revenue and cost')]);
    expect(s.active).toBe(false);
    expect(s.assumptions).toHaveLength(0);
  });

  it('flags a blurted number (jumped to a figure with no structure)', () => {
    const s = extractEstimationState(
      [i('How many pizzas are sold in Mumbai per day?'), u('Probably around 500,000 pizzas a day.')],
      { isEstimation: true }
    );
    expect(s.active).toBe(true);
    expect(s.blurtedNumber).toBe(true);
    expect(s.structuredFirst).toBe(false);
    expect(s.finalNumber).toBeTruthy();
  });

  it('credits structure-before-numbers and captures assumptions', () => {
    const s = extractEstimationState(
      [
        i('How many pizzas are sold in Mumbai per day?'),
        u("Let me break this down by population. I'll assume Mumbai has 20 million people."),
        u('Assume 30% eat out and 1 in 10 of those has pizza, so 20,000,000 figure feeds in.'),
      ],
      { isEstimation: true }
    );
    expect(s.structuredFirst).toBe(true);
    expect(s.blurtedNumber).toBe(false);
    expect(s.assumptions.length).toBeGreaterThan(0);
  });

  it('detects a sanity check', () => {
    const s = extractEstimationState(
      [
        i('size it'),
        u('Population times penetration gives 1,200,000.'),
        u('Let me sanity check — that\'s about 1 per household, which seems reasonable.'),
      ],
      { isEstimation: true }
    );
    expect(s.sanityChecked).toBe(true);
  });

  it('surfaces candidate arithmetic errors', () => {
    const s = extractEstimationState(
      [i('size it'), u('So 20% × 500 = 200 customers, multiply through.')],
      { isEstimation: true }
    );
    expect(s.arithmeticErrors.length).toBeGreaterThan(0);
  });

  it('never throws on malformed input', () => {
    // @ts-expect-error malformed
    expect(() => extractEstimationState(null, { isEstimation: true })).not.toThrow();
  });
});

describe('renderEstimationStateBlock', () => {
  it('returns empty string when inactive', () => {
    expect(renderEstimationStateBlock(extractEstimationState([], {}))).toBe('');
  });

  it('tells the interviewer to demand logic on a blurted number', () => {
    const s = extractEstimationState(
      [i('how many?'), u('About 750,000.')],
      { isEstimation: true }
    );
    const block = renderEstimationStateBlock(s);
    expect(block).toContain('ESTIMATION STATE');
    expect(block).toMatch(/logic behind that number/i);
    expect(block).toMatch(/NOT how close the final number/i);
  });

  it('pushes for a sanity check when a number exists but none was done', () => {
    const s = extractEstimationState(
      [i('how many?'), u('Breaking it down by segment, population × rate = 1,200,000.')],
      { isEstimation: true }
    );
    const block = renderEstimationStateBlock(s);
    expect(block).toMatch(/sanity|gut check|per-capita/i);
  });
});

describe('estimationSignals', () => {
  it('projects the state into scorer signals', () => {
    const s = extractEstimationState(
      [i('how many?'), u('About 750,000.')],
      { isEstimation: true }
    );
    const sig = estimationSignals(s);
    expect(sig.active).toBe(true);
    expect(sig.blurtedNumber).toBe(true);
    expect(sig.sanityChecked).toBe(false);
  });
});
