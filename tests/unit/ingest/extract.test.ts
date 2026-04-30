import { describe, it, expect } from 'vitest';
import { buildExtractionMessages } from '../../../scripts/ingest/extract';

describe('buildExtractionMessages', () => {
  it('emits a system prompt that instructs JSON-only with the cases schema', () => {
    const msgs = buildExtractionMessages('Case 1: ...');
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('JSON only');
    expect(msgs[0].content).toContain('"title"');
    expect(msgs[0].content).toContain('"industry"');
    expect(msgs[0].content).toContain('"case_type"');
    expect(msgs[0].content).toContain('"difficulty"');
    expect(msgs[0].content).toContain('"problem_statement"');
    expect(msgs[0].content).toContain('"interviewer_notes"');
    expect(msgs[0].content).toContain('"ideal_structure"');
  });

  it('forbids fabrication when fields are missing', () => {
    const msgs = buildExtractionMessages('Case 1: ...');
    expect(msgs[0].content.toLowerCase()).toContain('do not invent');
  });
});
