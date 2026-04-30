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
});
