import { describe, it, expect } from 'vitest';
import { buildInterviewerMessages } from '@/lib/groq/interviewer';
import sampleCase from '../fixtures/sample-case.json';

describe('buildInterviewerMessages', () => {
  it('includes problem statement and gated reveal notes in the system prompt', () => {
    const msgs = buildInterviewerMessages(
      sampleCase as any,
      [],
      [{ role: 'user', content: 'Hello, can I start?', timestamp: '' }]
    );
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('A global cement major');
    expect(msgs[0].content).toContain('REVEAL NOTES');
    expect(msgs[0].content).toContain('India consumes ~380 MT/year');
    expect(msgs[0].content).toContain('do NOT proactively share');
  });

  it('includes the disclosure log so already-revealed items are tracked', () => {
    const msgs = buildInterviewerMessages(
      sampleCase as any,
      ['India consumes ~380 MT/year, growing at ~6%.'],
      []
    );
    expect(msgs[0].content).toContain('ALREADY DISCLOSED');
    expect(msgs[0].content).toContain('India consumes ~380 MT/year');
  });

  it('appends the recent transcript turns as alternating user/assistant messages', () => {
    const msgs = buildInterviewerMessages(
      sampleCase as any,
      [],
      [
        { role: 'user', content: 'What is the market size?', timestamp: '' },
        { role: 'interviewer', content: '~380 MT/year.', timestamp: '' },
        { role: 'user', content: 'Who are the players?', timestamp: '' },
      ]
    );
    expect(msgs.length).toBe(4);
    expect(msgs[1]).toMatchObject({ role: 'user', content: 'What is the market size?' });
    expect(msgs[2]).toMatchObject({ role: 'assistant', content: '~380 MT/year.' });
    expect(msgs[3]).toMatchObject({ role: 'user', content: 'Who are the players?' });
  });

  it('limits transcript to last 10 turns', () => {
    const turns = Array.from({ length: 14 }, (_, i) => ({
      role: (i % 2 === 0 ? ('user' as const) : ('interviewer' as const)),
      content: `turn ${i}`,
      timestamp: '',
    }));
    const msgs = buildInterviewerMessages(sampleCase as any, [], turns);
    expect(msgs.length).toBe(11); // 1 system + 10 turns
  });

  it('lists banned chatbot phrases the model must never produce', () => {
    const msgs = buildInterviewerMessages(sampleCase as any, [], []);
    const sys = msgs[0].content;
    expect(sys).toContain('Great question');
    expect(sys).toContain('Excellent observation');
    expect(sys).toContain('As an AI');
    expect(sys).toContain('Let me walk you through');
  });

  it('enforces the end-with-probe turn-level rule', () => {
    const msgs = buildInterviewerMessages(sampleCase as any, [], []);
    expect(msgs[0].content).toMatch(/End every turn with a probe/i);
  });

  it('includes the falsifiability rule (Ash can yield when wrong)', () => {
    const msgs = buildInterviewerMessages(sampleCase as any, [], []);
    expect(msgs[0].content).toContain('FALSIFIABILITY');
    expect(msgs[0].content).toMatch(/yield/i);
  });

  it('includes the few-shot examples block with bad and Ash labels', () => {
    const msgs = buildInterviewerMessages(sampleCase as any, [], []);
    const sys = msgs[0].content;
    expect(sys).toContain('EXAMPLES');
    expect(sys).toContain('BAD (chatbot)');
    expect(sys).toContain('ASH:');
  });

  it('locks FEED DATA to the trigger-keyword gate (no leak-by-structure)', () => {
    const msgs = buildInterviewerMessages(sampleCase as any, [], []);
    const sys = msgs[0].content;
    expect(sys).toContain('trigger-keyword gate is non-negotiable');
    expect(sys).toMatch(/never share gated facts/i);
  });
});
