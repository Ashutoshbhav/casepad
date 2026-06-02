import { describe, it, expect } from 'vitest';
import { personaForTrack, personaPromptBlock } from '@/lib/interview/personas';
import { TRACK_LIST, TRACKS } from '@/lib/tracks';

describe('personaForTrack', () => {
  it('resolves a persona for every defined track', () => {
    for (const track of TRACK_LIST) {
      const p = personaForTrack(track);
      expect(p.track).toBe(track);
      expect(p.name).toBeTruthy();
      expect(p.role).toBeTruthy();
      expect(p.probesFor.length).toBeGreaterThan(0);
    }
  });

  it('defaults to consulting for unknown/missing track', () => {
    expect(personaForTrack('nonsense').track).toBe('consulting');
    expect(personaForTrack(null).track).toBe('consulting');
    expect(personaForTrack(undefined).track).toBe('consulting');
  });

  it('probesFor is derived from the track rubric (top dimensions by weight)', () => {
    const p = personaForTrack('pm');
    // PM's top-weighted dimension is Product Sense (weight 25)
    expect(p.probesFor[0]).toContain('Product Sense');
    // every probe line should correspond to a real rubric dimension
    const dims = TRACKS.pm.rubric.map((d) => d.dimension);
    for (const probe of p.probesFor) {
      expect(dims.some((d) => probe.startsWith(d))).toBe(true);
    }
  });

  it('gives distinct identities across tracks (not all "Ash from Bain")', () => {
    const firms = new Set(TRACK_LIST.map((t) => personaForTrack(t).firm));
    expect(firms.size).toBeGreaterThan(1);
  });
});

describe('personaPromptBlock', () => {
  it('includes identity, probed dimensions, and the spike bar', () => {
    const block = personaPromptBlock(personaForTrack('ib_pe_vc'));
    expect(block).toContain('Rohan');
    expect(block).toContain('WHAT YOU PROBE FOR');
    expect(block).toContain('Technical Accuracy');
    expect(block).toContain('spike');
  });

  it('surfaces research-grounded tells + red flags for tracks with a playbook', () => {
    const block = personaPromptBlock(personaForTrack('ib_pe_vc'));
    expect(block).toContain('HOW YOU ACTUALLY TALK');
    expect(block).toContain('Walk me through a DCF');
    expect(block).toContain('INSTANT RED FLAGS');
  });
});
