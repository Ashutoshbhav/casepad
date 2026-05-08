import { describe, it, expect } from 'vitest';
import { checkResponse, regenHintFor, describeFailure, getGuardrailMode } from '@/lib/groq/guardrails';

describe('checkResponse', () => {
  it('passes a clean Ash-style response', () => {
    const text = "That's the textbook. What's your hypothesis on what's actually broken — revenue or cost?";
    expect(checkResponse(text)).toEqual({ ok: true });
  });

  it('passes empty string (defensive — error paths shouldn\'t crash here)', () => {
    expect(checkResponse('')).toEqual({ ok: true });
    expect(checkResponse('   \n\n   ')).toEqual({ ok: true });
  });

  it('fails on the canonical "Great question!" tell', () => {
    const r = checkResponse('Great question! Let me think about that.');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failure.type).toBe('banned_phrase');
  });

  it('fails on banned-phrase prefix regardless of trailing punctuation', () => {
    expect(checkResponse('Great question.').ok).toBe(false);
    expect(checkResponse('Great question — that.').ok).toBe(false);
    expect(checkResponse('great question').ok).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(checkResponse('GREAT QUESTION!').ok).toBe(false);
    expect(checkResponse('Great Question!').ok).toBe(false);
    expect(checkResponse("AS AN AI, I think...").ok).toBe(false);
  });

  it('catches the lecture-mode "Here are X reasons" pattern', () => {
    expect(checkResponse('Here are 3 reasons why this matters.').ok).toBe(false);
    expect(checkResponse('Here are three reasons.').ok).toBe(false);
    expect(checkResponse('Here are 5 ways to think about it.').ok).toBe(false);
  });

  it('catches "Excellent observation"', () => {
    expect(checkResponse('Excellent observation about pricing.').ok).toBe(false);
  });

  it('catches "Let me walk you through"', () => {
    expect(checkResponse('Let me walk you through the framework.').ok).toBe(false);
  });

  it('catches "As an AI"', () => {
    expect(checkResponse('As an AI, I cannot give specific advice.').ok).toBe(false);
  });

  it('fails on responses over 80 words', () => {
    // Build an 81-word response with no banned phrases
    const long = Array.from({ length: 81 }, (_, i) => `word${i}`).join(' ');
    const r = checkResponse(long);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.failure.type).toBe('too_long');
      if (r.failure.type === 'too_long') expect(r.failure.wordCount).toBe(81);
    }
  });

  it('passes responses at exactly 80 words', () => {
    const exactly80 = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ');
    expect(checkResponse(exactly80)).toEqual({ ok: true });
  });

  it('counts whitespace-separated tokens correctly across newlines and tabs', () => {
    const mixed = 'word\tword\nword  word';
    // 4 words; should pass
    expect(checkResponse(mixed)).toEqual({ ok: true });
  });

  it('flags banned-phrase before length when both fail', () => {
    const long = 'Great question! ' + Array.from({ length: 100 }, (_, i) => `w${i}`).join(' ');
    const r = checkResponse(long);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failure.type).toBe('banned_phrase');
  });
});

describe('regenHintFor', () => {
  it('produces a banned-phrase hint that mentions the offending phrase', () => {
    const hint = regenHintFor({ type: 'banned_phrase', phrase: 'great question' });
    expect(hint).toContain('REGEN HINT');
    expect(hint).toContain('great question');
    expect(hint).toContain('Rewrite');
  });

  it('produces a length hint that mentions the word count', () => {
    const hint = regenHintFor({ type: 'too_long', wordCount: 124 });
    expect(hint).toContain('REGEN HINT');
    expect(hint).toContain('124');
    expect(hint).toContain('80');
  });
});

describe('describeFailure', () => {
  it('formats banned_phrase failures', () => {
    expect(describeFailure({ type: 'banned_phrase', phrase: 'as an ai' })).toBe(
      'banned_phrase:"as an ai"'
    );
  });

  it('formats too_long failures', () => {
    expect(describeFailure({ type: 'too_long', wordCount: 99 })).toBe('too_long:99w');
  });
});

describe('getGuardrailMode', () => {
  it('defaults to "gate" when env var is unset', () => {
    const prev = process.env.GUARDRAIL_MODE;
    delete process.env.GUARDRAIL_MODE;
    expect(getGuardrailMode()).toBe('gate');
    if (prev !== undefined) process.env.GUARDRAIL_MODE = prev;
  });

  it('respects "monitor" and "off" values', () => {
    const prev = process.env.GUARDRAIL_MODE;
    process.env.GUARDRAIL_MODE = 'monitor';
    expect(getGuardrailMode()).toBe('monitor');
    process.env.GUARDRAIL_MODE = 'off';
    expect(getGuardrailMode()).toBe('off');
    process.env.GUARDRAIL_MODE = 'GATE';
    expect(getGuardrailMode()).toBe('gate');
    process.env.GUARDRAIL_MODE = 'nonsense';
    expect(getGuardrailMode()).toBe('gate'); // falls back
    if (prev === undefined) delete process.env.GUARDRAIL_MODE;
    else process.env.GUARDRAIL_MODE = prev;
  });
});
