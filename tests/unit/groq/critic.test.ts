import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseCriticVerdict,
  regenHintForCritic,
  shouldCritique,
} from '@/lib/groq/critic';

describe('parseCriticVerdict', () => {
  it('returns ok when all 3 criteria pass', () => {
    const r = parseCriticVerdict(
      '{"on_persona": true, "not_generic": true, "ends_with_probe": true, "fail_reason": ""}'
    );
    expect(r.ok).toBe(true);
    expect(r.failures).toEqual([]);
  });

  it('flags on_persona failure', () => {
    const r = parseCriticVerdict(
      '{"on_persona": false, "not_generic": true, "ends_with_probe": true, "fail_reason": "sounds like a coach"}'
    );
    expect(r.ok).toBe(false);
    expect(r.failures).toContain('on_persona');
  });

  it('flags multiple failures', () => {
    const r = parseCriticVerdict(
      '{"on_persona": false, "not_generic": false, "ends_with_probe": true, "fail_reason": "generic chatbot"}'
    );
    expect(r.ok).toBe(false);
    expect(r.failures).toEqual(['on_persona', 'not_generic']);
  });

  it('extracts JSON from response wrapped in code fences', () => {
    const r = parseCriticVerdict(
      '```json\n{"on_persona": true, "not_generic": true, "ends_with_probe": true, "fail_reason": ""}\n```'
    );
    expect(r.ok).toBe(true);
  });

  it('extracts JSON from response with prose preamble', () => {
    const r = parseCriticVerdict(
      'Here is my evaluation: {"on_persona": false, "not_generic": true, "ends_with_probe": true, "fail_reason": "generic"}'
    );
    expect(r.ok).toBe(false);
    expect(r.failures).toContain('on_persona');
  });

  it('fails open on no JSON found (NSM > critic-quality)', () => {
    const r = parseCriticVerdict('I cannot evaluate this draft.');
    expect(r.ok).toBe(true);
    expect(r.failures).toEqual([]);
  });

  it('fails open on malformed JSON', () => {
    const r = parseCriticVerdict('{this is not valid json');
    expect(r.ok).toBe(true);
  });

  it('fails open on empty string', () => {
    const r = parseCriticVerdict('');
    expect(r.ok).toBe(true);
  });
});

describe('regenHintForCritic', () => {
  it('produces no hint when verdict is ok', () => {
    const hint = regenHintForCritic({ ok: true, failures: [], raw: '' });
    expect(hint).toBe('');
  });

  it('produces a hint citing the persona failure', () => {
    const hint = regenHintForCritic({
      ok: false,
      failures: ['on_persona'],
      raw: '',
    });
    expect(hint).toContain('CRITIC FEEDBACK');
    expect(hint).toMatch(/Ash|EM|chatbot/i);
  });

  it('produces a hint citing the generic failure', () => {
    const hint = regenHintForCritic({
      ok: false,
      failures: ['not_generic'],
      raw: '',
    });
    expect(hint).toMatch(/specific|boilerplate/i);
  });

  it('produces a hint citing the probe failure', () => {
    const hint = regenHintForCritic({
      ok: false,
      failures: ['ends_with_probe'],
      raw: '',
    });
    expect(hint).toMatch(/probe|question|directive/i);
  });

  it('aggregates multiple failures into one hint', () => {
    const hint = regenHintForCritic({
      ok: false,
      failures: ['on_persona', 'ends_with_probe'],
      raw: '',
    });
    expect(hint.length).toBeGreaterThan(50);
    expect(hint).toMatch(/Ash|EM/i);
    expect(hint).toMatch(/probe|question/i);
  });
});

describe('shouldCritique', () => {
  let prevEnable: string | undefined;
  let prevInterval: string | undefined;

  beforeEach(() => {
    prevEnable = process.env.ENABLE_SELF_CRITIQUE;
    prevInterval = process.env.CRITIC_TURN_INTERVAL;
    delete process.env.ENABLE_SELF_CRITIQUE;
    delete process.env.CRITIC_TURN_INTERVAL;
  });

  afterEach(() => {
    if (prevEnable === undefined) delete process.env.ENABLE_SELF_CRITIQUE;
    else process.env.ENABLE_SELF_CRITIQUE = prevEnable;
    if (prevInterval === undefined) delete process.env.CRITIC_TURN_INTERVAL;
    else process.env.CRITIC_TURN_INTERVAL = prevInterval;
  });

  it('runs at default interval=2 (every other turn)', () => {
    expect(shouldCritique(0)).toBe(true);
    expect(shouldCritique(1)).toBe(false);
    expect(shouldCritique(2)).toBe(true);
    expect(shouldCritique(3)).toBe(false);
    expect(shouldCritique(4)).toBe(true);
  });

  it('respects CRITIC_TURN_INTERVAL env var', () => {
    process.env.CRITIC_TURN_INTERVAL = '3';
    expect(shouldCritique(0)).toBe(true);
    expect(shouldCritique(1)).toBe(false);
    expect(shouldCritique(2)).toBe(false);
    expect(shouldCritique(3)).toBe(true);
  });

  it('disables when ENABLE_SELF_CRITIQUE=false', () => {
    process.env.ENABLE_SELF_CRITIQUE = 'false';
    expect(shouldCritique(0)).toBe(false);
    expect(shouldCritique(2)).toBe(false);
    expect(shouldCritique(4)).toBe(false);
  });

  it('falls back to default on invalid CRITIC_TURN_INTERVAL', () => {
    process.env.CRITIC_TURN_INTERVAL = 'nonsense';
    expect(shouldCritique(2)).toBe(true);
    expect(shouldCritique(3)).toBe(false);
  });

  it('falls back to default on zero CRITIC_TURN_INTERVAL', () => {
    process.env.CRITIC_TURN_INTERVAL = '0';
    expect(shouldCritique(2)).toBe(true);
  });
});
