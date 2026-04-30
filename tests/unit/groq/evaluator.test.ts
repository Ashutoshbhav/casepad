import { describe, it, expect } from 'vitest';
import { buildEvaluatorMessages } from '@/lib/groq/evaluator';

describe('buildEvaluatorMessages', () => {
  it('asks for JSON with structure/insight/speed scores summing to 100', () => {
    const msgs = buildEvaluatorMessages(
      [
        { role: 'user', content: 'Should we enter?', timestamp: '' },
        { role: 'interviewer', content: 'Tell me how you would approach this.', timestamp: '' },
      ] as any,
      { framework: 'Market Entry', branches: [{ node: 'Market attractiveness' }] } as any,
      { framework: 'Market Entry', hypothesis: 'Yes, attractive market', key_numbers: [], decisions: [], next_steps: [], manual_notes: null, locked_fields: [] } as any,
      8 * 60
    );
    expect(msgs[0].content).toContain('Structure');
    expect(msgs[0].content).toContain('Insight');
    expect(msgs[0].content).toContain('Speed');
    expect(msgs[0].content).toContain('total = structure + insight + speed');
    expect(msgs[0].content).toContain('"gaps"');
    expect(msgs[0].content).toContain('"strengths"');
  });

  it('includes the elapsed time and benchmark window', () => {
    const msgs = buildEvaluatorMessages([], {} as any, {} as any, 25 * 60);
    expect(msgs[1].content).toContain('Elapsed: 25 min');
  });

  it('returns insufficient-data instruction when ideal_structure is empty', () => {
    const msgs = buildEvaluatorMessages([], {} as any, {} as any, 0);
    expect(msgs[0].content).toContain('insufficient_data');
  });
});
