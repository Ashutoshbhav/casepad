import { describe, it, expect } from 'vitest';
import {
  detectPhraseRepeat,
  detectBannedPhrases,
  detectPersonaBreak,
  detectHedging,
  detectMarkdown,
  detectMultipleQuestions,
  detectNoProbe,
  detectApology,
  detectNumberedList,
  detectLengthCap,
  detectStaleContext,
  detectMathFlipFlop,
  runAllDetectors,
  type EvalTurn,
} from '@/lib/eval/detectors';

const tx = (...turns: { role: 'user' | 'interviewer'; content: string }[]): EvalTurn[] => turns;

describe('detectBannedPhrases', () => {
  it('catches "Great question!"', () => {
    const r = detectBannedPhrases(tx({ role: 'interviewer', content: 'Great question! What do you think?' }));
    expect(r.passed).toBe(false);
    expect(r.findings[0].severity).toBe('critical');
  });

  it('passes clean Ash response', () => {
    const r = detectBannedPhrases(tx({ role: 'interviewer', content: "That's textbook. What's your hypothesis?" }));
    expect(r.passed).toBe(true);
  });

  it('ignores user turns', () => {
    const r = detectBannedPhrases(tx({ role: 'user', content: 'Great question — let me think.' }));
    expect(r.passed).toBe(true);
  });
});

describe('detectPersonaBreak', () => {
  it('catches "As an AI"', () => {
    const r = detectPersonaBreak(tx({ role: 'interviewer', content: 'As an AI, I cannot give specific advice.' }));
    expect(r.passed).toBe(false);
  });

  it('catches "As Ash from Bain"', () => {
    const r = detectPersonaBreak(tx({ role: 'interviewer', content: 'As Ash from Bain, I would say...' }));
    expect(r.passed).toBe(false);
  });

  it('passes in-character response', () => {
    const r = detectPersonaBreak(tx({ role: 'interviewer', content: "Hmm. What's your hypothesis?" }));
    expect(r.passed).toBe(true);
  });
});

describe('detectHedging', () => {
  it('catches "perhaps"', () => {
    const r = detectHedging(tx({ role: 'interviewer', content: 'Perhaps you should consider revenue first.' }));
    expect(r.passed).toBe(false);
  });

  it('catches "have you considered"', () => {
    const r = detectHedging(tx({ role: 'interviewer', content: 'Have you considered the cost side?' }));
    expect(r.passed).toBe(false);
  });

  it('passes direct EM voice', () => {
    const r = detectHedging(tx({ role: 'interviewer', content: 'Walk me through the cost side.' }));
    expect(r.passed).toBe(true);
  });
});

describe('detectMarkdown', () => {
  it('catches bullet lists', () => {
    const r = detectMarkdown(tx({ role: 'interviewer', content: '- first\n- second' }));
    expect(r.passed).toBe(false);
  });

  it('catches code fences', () => {
    const r = detectMarkdown(tx({ role: 'interviewer', content: '```js\nconst x = 1;\n```' }));
    expect(r.passed).toBe(false);
  });

  it('passes plain prose', () => {
    const r = detectMarkdown(tx({ role: 'interviewer', content: 'Walk me through that.' }));
    expect(r.passed).toBe(true);
  });
});

describe('detectMultipleQuestions', () => {
  it('flags 3+ questions in one turn', () => {
    const r = detectMultipleQuestions(tx({ role: 'interviewer', content: 'What? Why? How?' }));
    expect(r.passed).toBe(false);
  });

  it('allows up to 2 questions', () => {
    const r = detectMultipleQuestions(tx({ role: 'interviewer', content: "What's your hypothesis? Why?" }));
    expect(r.passed).toBe(true);
  });
});

describe('detectNoProbe', () => {
  it('flags turn ending with period (no probe)', () => {
    const r = detectNoProbe(tx({ role: 'interviewer', content: 'That sounds reasonable.' }));
    expect(r.passed).toBe(false);
  });

  it('passes turn ending with question mark', () => {
    const r = detectNoProbe(tx({ role: 'interviewer', content: "What's your hypothesis?" }));
    expect(r.passed).toBe(true);
  });

  it('passes turn ending with imperative "Walk me through that."', () => {
    const r = detectNoProbe(tx({ role: 'interviewer', content: 'Walk me through that.' }));
    expect(r.passed).toBe(true);
  });

  it('passes turn ending with "Go."', () => {
    const r = detectNoProbe(tx({ role: 'interviewer', content: 'Fair — your logic holds. Go.' }));
    expect(r.passed).toBe(true);
  });
});

describe('detectApology', () => {
  it('catches "Sorry, let me"', () => {
    const r = detectApology(tx({ role: 'interviewer', content: 'Sorry, let me clarify that.' }));
    expect(r.passed).toBe(false);
  });

  it('catches "I apologize"', () => {
    const r = detectApology(tx({ role: 'interviewer', content: 'I apologize for the confusion.' }));
    expect(r.passed).toBe(false);
  });

  it('passes correct self-correction without apology', () => {
    const r = detectApology(tx({ role: 'interviewer', content: 'I was wrong earlier — the correct number is 125K.' }));
    expect(r.passed).toBe(true);
  });
});

describe('detectNumberedList', () => {
  it('catches "Here are 3 reasons"', () => {
    const r = detectNumberedList(tx({ role: 'interviewer', content: 'Here are 3 reasons why this matters.' }));
    expect(r.passed).toBe(false);
  });

  it('passes clean response', () => {
    const r = detectNumberedList(tx({ role: 'interviewer', content: 'Why three? Walk me through.' }));
    expect(r.passed).toBe(true);
  });
});

describe('detectLengthCap', () => {
  it('flags >80 word response', () => {
    const long = Array.from({ length: 81 }, (_, i) => `word${i}`).join(' ');
    const r = detectLengthCap(tx({ role: 'interviewer', content: long }));
    expect(r.passed).toBe(false);
  });

  it('passes <=80 words', () => {
    const ok = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ');
    const r = detectLengthCap(tx({ role: 'interviewer', content: ok }));
    expect(r.passed).toBe(true);
  });
});

describe('detectPhraseRepeat', () => {
  it('catches verbatim 4-gram repeat across recent turns', () => {
    const turns = tx(
      { role: 'interviewer', content: "Fine, but you're hand-waving on the math here." },
      { role: 'user', content: 'I disagree, 25% is reasonable.' },
      { role: 'interviewer', content: 'Why? What anchors that?' },
      { role: 'user', content: 'gut feeling.' },
      { role: 'interviewer', content: "Fine, but you're hand-waving on the math now." }
    );
    const r = detectPhraseRepeat(turns);
    expect(r.passed).toBe(false);
    expect(r.findings[0].detector).toBe('B2.1_phrase_repeat');
  });

  it('passes when phrasing varies', () => {
    const turns = tx(
      { role: 'interviewer', content: "Walk me through that. What's the first number?" },
      { role: 'user', content: '125 thousand.' },
      { role: 'interviewer', content: 'Sanity check the multiplication.' },
      { role: 'user', content: 'OK 125K times $1.50 is $188K.' },
      { role: 'interviewer', content: "Good. What's that mean for the recommendation?" }
    );
    const r = detectPhraseRepeat(turns);
    expect(r.passed).toBe(true);
  });
});

describe('detectStaleContext', () => {
  it('flags Ash[N] replaying Ash[N-2] when user[N-1] was substantive', () => {
    const turns = tx(
      { role: 'interviewer', content: "Fine, but you're hand-waving on the math. Walk me through it." },
      { role: 'user', content: 'I think 25% is reasonable because if someone is interested in business in China they would buy a book on it.' },
      { role: 'interviewer', content: "Fine, but you're hand-waving on the math. Walk me through it." }
    );
    const r = detectStaleContext(turns);
    // Need 5+ turns for the loop to trigger; expand
    const turns2 = [
      { role: 'interviewer', content: 'Hi' } as EvalTurn,
      { role: 'user', content: 'hi back' } as EvalTurn,
      ...turns,
    ];
    const r2 = detectStaleContext(turns2);
    expect(r2.passed).toBe(false);
  });
});

describe('detectMathFlipFlop', () => {
  it('catches "125,000 buyers" → "1.25 million buyers" flip', () => {
    const turns = tx(
      { role: 'interviewer', content: 'We estimated 125,000 buyers in total.' },
      { role: 'user', content: 'OK.' },
      { role: 'interviewer', content: 'Actually, 1,250,000 buyers makes more sense.' },
      { role: 'user', content: 'Why?' },
      { role: 'interviewer', content: 'Hmm, back to 125,000 buyers.' }
    );
    const r = detectMathFlipFlop(turns);
    expect(r.passed).toBe(false);
    expect(r.findings.some((f) => f.detector === 'B1.1_math_flipflop')).toBe(true);
  });

  it('passes consistent math', () => {
    const turns = tx(
      { role: 'interviewer', content: 'We have 125,000 buyers.' },
      { role: 'user', content: 'OK.' },
      { role: 'interviewer', content: 'That gives 125,000 buyers × $1.50 each.' }
    );
    const r = detectMathFlipFlop(turns);
    expect(r.passed).toBe(true);
  });
});

describe('runAllDetectors', () => {
  it('aggregates findings across all detectors', () => {
    const turns = tx(
      { role: 'interviewer', content: 'Great question! What is your hypothesis?' },
      { role: 'user', content: 'Cost side.' },
      { role: 'interviewer', content: 'As an AI, I would suggest looking at three things.' }
    );
    const r = runAllDetectors(turns);
    expect(r.passed).toBe(false);
    expect(r.findings.length).toBeGreaterThan(1);
    expect(r.findings_by_severity.critical).toBeGreaterThan(0);
  });

  it('passes a clean Ash transcript', () => {
    const turns = tx(
      { role: 'interviewer', content: "Walk me through how you'd structure this case." },
      { role: 'user', content: "I'd look at revenue and cost." },
      { role: 'interviewer', content: "That's two words from a textbook. What's your hypothesis?" }
    );
    const r = runAllDetectors(turns);
    expect(r.passed).toBe(true);
  });
});
