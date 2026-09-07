import { describe, it, expect } from 'vitest';
import {
  buildGenerateMessages,
  parseGeneratedCase,
  buildFactCheckMessages,
  parseFactCheck,
  numberSweep,
  crossCheckNumbers,
  type GeneratedCaseDraft,
} from '@/lib/generator/prompt';

const validDraftJson = JSON.stringify({
  title: 'PayZen Wallet Profitability',
  industry: 'fintech',
  caseType: 'profitability',
  difficulty: 'hard',
  problemStatement: 'PayZen, a mobile wallet, has seen profit fall 30% this year. Why?',
  interviewerNotes: [
    { trigger_keywords: ['revenue', 'take rate'], reveal_text: 'Take rate is fixed at 0.8%.' },
    { trigger_keywords: ['cost', 'cashback'], reveal_text: 'Cashback spend doubled.' },
  ],
  idealStructure: { root: 'Profit = Rev - Cost', branches: [{ label: 'Cost', note: 'cashback led' }] },
  exhibits: [{ title: 'Cost split', kind: 'table', data: [['cashback', 60]], caption: 'FY24' }],
  fictionalEntities: ['PayZen'],
  numberSources: [
    { value: '0.8%', source: 'seed' },
    { value: '30%', source: 'seed' },
    { value: '60', source: 'illustrative: invented client cost split' },
  ],
});

describe('buildGenerateMessages', () => {
  it('embeds the target skill observable and the seed grounding', () => {
    const msgs = buildGenerateMessages({
      seedTitle: 'InvestCo',
      seedProblemStatement: 'InvestCo profit fell.',
      seedCaseType: 'profitability',
      seedIndustry: 'financial_services',
      seedInterviewerNotes: [{ trigger_keywords: ['x'], reveal_text: 'y' }],
      dossierText: 'wallet take rates in India run 0.5-1%',
      targetSkillId: 'sanity_checking',
    });
    expect(msgs).toHaveLength(2);
    expect(msgs[0].content).toMatch(/Sanity-checking|sanity/i);
    expect(msgs[1].content).toContain('InvestCo');
    expect(msgs[1].content).toContain('wallet take rates');
  });
});

describe('parseGeneratedCase', () => {
  it('parses a valid draft', () => {
    const d = parseGeneratedCase(validDraftJson)!;
    expect(d.title).toBe('PayZen Wallet Profitability');
    expect(d.interviewerNotes).toHaveLength(2);
    expect(d.exhibits).toHaveLength(1);
    expect(d.fictionalEntities).toEqual(['PayZen']);
    expect(d.numberSources).toHaveLength(3);
    expect(d.numberSources[0]).toEqual({ value: '0.8%', source: 'seed' });
  });

  it('tolerates a missing / malformed numberSources', () => {
    const d = parseGeneratedCase(JSON.stringify({ title: 't', problemStatement: 'p' }))!;
    expect(d.numberSources).toEqual([]);
    const d2 = parseGeneratedCase(
      JSON.stringify({ title: 't', problemStatement: 'p', numberSources: [{ value: '5%' }, 'junk', { source: 'seed' }] }),
    )!;
    expect(d2.numberSources).toEqual([]);
  });

  it('strips fences and recovers embedded json', () => {
    expect(parseGeneratedCase('```json\n' + validDraftJson + '\n```')).not.toBeNull();
    expect(parseGeneratedCase('here:\n' + validDraftJson + '\ndone')).not.toBeNull();
  });

  it('returns null without a title or problem statement', () => {
    expect(parseGeneratedCase('{"title":"x"}')).toBeNull();
    expect(parseGeneratedCase('{"problemStatement":"x"}')).toBeNull();
    expect(parseGeneratedCase('not json')).toBeNull();
  });

  it('drops malformed interviewer notes and caps counts', () => {
    const d = parseGeneratedCase(
      JSON.stringify({
        title: 't',
        problemStatement: 'p',
        interviewerNotes: [
          { trigger_keywords: [], reveal_text: 'no keywords' },
          { trigger_keywords: ['a'], reveal_text: '' },
          { trigger_keywords: ['ok'], reveal_text: 'kept' },
        ],
        exhibits: Array.from({ length: 9 }, (_, i) => ({ title: `e${i}`, kind: 'text', data: i })),
      }),
    )!;
    expect(d.interviewerNotes).toHaveLength(1);
    expect(d.exhibits).toHaveLength(3);
  });
});

describe('numberSweep + crossCheckNumbers', () => {
  it('pulls money/percent/multiplier tokens, ignores small bare ints', () => {
    const got = numberSweep('Revenue ₹40M at a 0.8% take rate, 3 reasons, 12x multiple, 2024');
    expect(got).toContain('₹40m');
    expect(got).toContain('0.8%');
    expect(got).toContain('12x');
    expect(got).not.toContain('3');
  });

  it('flags draft numbers absent from the grounding text', () => {
    const flags = crossCheckNumbers(
      'Client has ₹500Cr revenue and 22% margin.',
      'The market is worth ₹500Cr. Typical margin 10-15%.',
    );
    expect(flags).toContain('22%');
    expect(flags).not.toContain('₹500cr');
  });
});

describe('buildFactCheckMessages + parseFactCheck', () => {
  const draft = parseGeneratedCase(validDraftJson) as GeneratedCaseDraft;

  it('builds a 2-message prompt carrying grounding + draft + invented list', () => {
    const msgs = buildFactCheckMessages({ draft, groundingText: 'seed facts here' });
    expect(msgs[1].content).toContain('PayZen');
    expect(msgs[1].content).toContain('seed facts here');
  });

  it('verdict fails on any ungrounded claim regardless of the model verdict', () => {
    const r = parseFactCheck(
      JSON.stringify({
        verdict: 'pass',
        claims: [{ text: 'PhonePe has 46% UPI share', kind: 'entity', grounded: 'ungrounded' }],
      }),
    );
    expect(r.verdict).toBe('fail');
  });

  it('code flags are recorded for the reviewer but do NOT by themselves force a fail', () => {
    const r = parseFactCheck(
      JSON.stringify({ verdict: 'pass', claims: [{ text: '0.8% take rate', kind: 'quant', grounded: 'source' }] }),
      ['number "22%" not in grounding'],
    );
    expect(r.verdict).toBe('pass');
    expect(r.codeFlags).toHaveLength(1);
  });

  it('passes when everything is source/fictional and no code flags', () => {
    const r = parseFactCheck(
      JSON.stringify({
        verdict: 'pass',
        claims: [
          { text: '0.8% take rate', kind: 'quant', grounded: 'source' },
          { text: 'PayZen', kind: 'entity', grounded: 'fictional' },
        ],
      }),
      [],
    );
    expect(r.verdict).toBe('pass');
  });

  it('unknown grounded value is treated as ungrounded (fails safe)', () => {
    const r = parseFactCheck(JSON.stringify({ claims: [{ text: 'x', kind: 'quant', grounded: 'maybe' }] }));
    expect(r.verdict).toBe('fail');
  });
});
