import { describe, it, expect } from 'vitest';
import { buildTracingMessages, parseTracingResponse } from '@/lib/skills/knowledge-tracing';
import { SKILLS } from '@/lib/skills/taxonomy';

describe('knowledge-tracing: buildTracingMessages', () => {
  it('includes every skill id in the system prompt and truncates a huge transcript', () => {
    const msgs = buildTracingMessages({
      transcript: [{ role: 'candidate', content: 'x'.repeat(50000) }],
      caseTitle: 'InvestCo',
      caseType: 'profitability',
    });
    expect(msgs).toHaveLength(2);
    for (const s of SKILLS) expect(msgs[0].content).toContain(s.id);
    expect(msgs[1].content).toContain('InvestCo');
    expect(msgs[1].content.length).toBeLessThan(25000);
  });
});

describe('knowledge-tracing: parseTracingResponse', () => {
  it('parses the wrapped-object shape', () => {
    const out = parseTracingResponse(
      JSON.stringify({
        observations: [
          { skillId: 'mece_decomposition', demonstrated: true, quality: 0.8, difficulty: 0.4, confidence: 0.9, evidence: 'split into revenue and cost' },
        ],
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].skillId).toBe('mece_decomposition');
    expect(out[0].quality).toBe(0.8);
  });

  it('parses a bare array and strips code fences', () => {
    const out = parseTracingResponse(
      '```json\n[{"skillId":"sanity_checking","quality":0.2,"difficulty":0.5,"confidence":0.7,"evidence":"no check"}]\n```',
    );
    expect(out).toHaveLength(1);
    expect(out[0].skillId).toBe('sanity_checking');
    expect(out[0].demonstrated).toBe(true); // defaults true unless explicitly false
  });

  it('drops rows with unknown skill ids and dedupes on skillId', () => {
    const out = parseTracingResponse(
      JSON.stringify({
        observations: [
          { skillId: 'not_a_real_skill', quality: 1 },
          { skillId: 'concision', quality: 0.9, difficulty: 0.3, confidence: 0.8, evidence: 'a' },
          { skillId: 'concision', quality: 0.1, difficulty: 0.3, confidence: 0.8, evidence: 'b' },
        ],
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].skillId).toBe('concision');
    expect(out[0].quality).toBe(0.9); // first wins
  });

  it('clamps out-of-range numbers and tolerates missing confidence', () => {
    const out = parseTracingResponse(
      '[{"skillId":"prioritization","quality":9,"difficulty":-2,"evidence":"x"}]',
    );
    expect(out[0].quality).toBe(1);
    expect(out[0].difficulty).toBe(0);
    expect(out[0].confidence).toBe(0.6);
  });

  it('returns [] on junk instead of throwing', () => {
    expect(parseTracingResponse('sorry, I cannot do that')).toEqual([]);
    expect(parseTracingResponse('')).toEqual([]);
    // @ts-expect-error deliberate
    expect(parseTracingResponse(null)).toEqual([]);
  });

  it('recovers JSON embedded in surrounding prose', () => {
    const out = parseTracingResponse(
      'Here you go:\n{"observations":[{"skillId":"hypothesis_first","quality":0.5,"difficulty":0.5,"confidence":0.5,"evidence":"maybe"}]}\nHope that helps.',
    );
    expect(out).toHaveLength(1);
    expect(out[0].skillId).toBe('hypothesis_first');
  });
});
