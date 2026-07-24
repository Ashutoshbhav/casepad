import { describe, it, expect } from 'vitest';
import { assessAnswerDepth, followUpDirective } from '@/lib/interview/behavioral-stage-machine';

const WE_ONLY_MEDIUM =
  'So the team got together and looked at the process end to end, and after a lot of discussion ' +
  'the group decided to redesign the workflow, and eventually the whole thing improved quite a bit ' +
  'and everyone was happy with how the project turned out in the end for the organization overall.';

const STAR_WITH_I =
  'When our vendor onboarding was stalling, I pulled the data for the last two quarters and found ' +
  'the bottleneck was legal review. I proposed a pre-approved contract template, got sign-off from ' +
  'our counsel, and rolled it out across three regions. Onboarding time dropped from ten days to six.';

describe('assessAnswerDepth', () => {
  it('is total: non-strings return null instead of throwing', () => {
    expect(assessAnswerDepth(undefined)).toBeNull();
    expect(assessAnswerDepth(null)).toBeNull();
    expect(assessAnswerDepth(42)).toBeNull();
  });

  it('flags empty and very short answers as brief', () => {
    expect(assessAnswerDepth('')).toBe('brief');
    expect(assessAnswerDepth('   ')).toBe('brief');
    expect(assessAnswerDepth('I handled it and we moved on.')).toBe('brief');
  });

  it('does not force a story follow-up onto a clarification question', () => {
    expect(assessAnswerDepth('Sorry, could you repeat the question?')).toBeNull();
    expect(assessAnswerDepth('Do you mean a conflict with a teammate or with a manager?')).toBeNull();
  });

  it('flags medium-length answers with zero first-person markers', () => {
    expect(assessAnswerDepth(WE_ONLY_MEDIUM)).toBe('no_individual_action');
  });

  it('passes a real first-person story with situation, action, and outcome', () => {
    expect(assessAnswerDepth(STAR_WITH_I)).toBeNull();
  });

  it('gives long answers the benefit of the doubt even without first-person markers', () => {
    const long = `${WE_ONLY_MEDIUM} ${WE_ONLY_MEDIUM}`;
    expect(assessAnswerDepth(long)).toBeNull();
  });

  it('matches first-person contractions, not just bare "I"', () => {
    const contractions =
      "when the launch slipped there was a lot of pressure on the group and honestly it was a mess " +
      "for a while, but i'd already mapped the dependencies so the recovery plan came together over " +
      'that weekend and the release went out only four days late in the end, which the client accepted.';
    expect(assessAnswerDepth(contractions)).toBeNull();
  });
});

describe('followUpDirective', () => {
  it('renders a distinct directive per issue, both forbidding a new question', () => {
    const brief = followUpDirective('brief');
    const noAction = followUpDirective('no_individual_action');
    expect(brief).toContain('Do NOT move to a new question');
    expect(noAction).toContain('Do NOT move to a new question');
    expect(brief).not.toEqual(noAction);
  });
});
