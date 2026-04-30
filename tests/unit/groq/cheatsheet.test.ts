import { describe, it, expect } from 'vitest';
import { buildCheatSheetExtractionMessages } from '@/lib/groq/cheatsheet';

describe('buildCheatSheetExtractionMessages', () => {
  it('returns a system prompt instructing JSON-only output with the expected schema', () => {
    const msgs = buildCheatSheetExtractionMessages(
      'How big is the market?',
      'India consumes ~380 MT/year, growing at ~6%.',
      { framework: null, hypothesis: null, key_numbers: [], decisions: [], next_steps: [], manual_notes: null, locked_fields: [] }
    );
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('JSON only');
    expect(msgs[0].content).toContain('framework');
    expect(msgs[0].content).toContain('hypothesis');
    expect(msgs[0].content).toContain('key_numbers');
    expect(msgs[0].content).toContain('locked_fields');
  });

  it('includes the latest exchange in the user message', () => {
    const msgs = buildCheatSheetExtractionMessages(
      'How big is the market?',
      'India consumes ~380 MT/year.',
      { framework: null, hypothesis: null, key_numbers: [], decisions: [], next_steps: [], manual_notes: null, locked_fields: [] }
    );
    expect(msgs[1].role).toBe('user');
    expect(msgs[1].content).toContain('How big is the market?');
    expect(msgs[1].content).toContain('India consumes ~380 MT/year.');
  });

  it('includes locked field names in the system prompt so the model preserves them', () => {
    const msgs = buildCheatSheetExtractionMessages(
      'q',
      'a',
      { framework: 'Profit Tree', hypothesis: null, key_numbers: [], decisions: [], next_steps: [], manual_notes: null, locked_fields: ['framework'] }
    );
    expect(msgs[0].content).toContain('LOCKED FIELDS');
    expect(msgs[0].content).toContain('framework');
  });
});
