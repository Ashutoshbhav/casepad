import { describe, it, expect } from 'vitest';
import { rate, conservativeEstimate, DEFAULT_RATING, type Rating } from '@/lib/skills/glicko2';

describe('glicko2', () => {
  // Glickman's own worked example (glicko2.pdf, section "Step 5"):
  // player (1500, 200, 0.06), tau 0.5, three matches:
  //   (1400, 30) win, (1550, 100) loss, (1700, 300) loss
  // -> rating' 1464.06, RD' 151.52, vol' 0.05999
  it('matches Glickman’s published worked example', () => {
    const player: Rating = { rating: 1500, rd: 200, vol: 0.06 };
    const out = rate(
      player,
      [
        { opponentRating: 1400, opponentRd: 30, score: 1 },
        { opponentRating: 1550, opponentRd: 100, score: 0 },
        { opponentRating: 1700, opponentRd: 300, score: 0 },
      ],
      0.5,
    );
    expect(out.rating).toBeCloseTo(1464.06, 1);
    expect(out.rd).toBeCloseTo(151.52, 1);
    expect(out.vol).toBeCloseTo(0.05999, 4);
  });

  it('with no matches, keeps the rating and grows RD toward the ceiling', () => {
    const player: Rating = { rating: 1600, rd: 80, vol: 0.06 };
    const out = rate(player, []);
    expect(out.rating).toBe(1600);
    expect(out.rd).toBeGreaterThan(80);
    expect(out.rd).toBeLessThanOrEqual(350);
  });

  it('RD never exceeds 350 or drops below 30', () => {
    let r = DEFAULT_RATING;
    for (let i = 0; i < 200; i++) {
      r = rate(r, []); // starve it forever
    }
    expect(r.rd).toBeLessThanOrEqual(350);
    let r2: Rating = { rating: 1500, rd: 35, vol: 0.06 };
    for (let i = 0; i < 50; i++) {
      r2 = rate(r2, [{ opponentRating: 1500, opponentRd: 30, score: 0.5 }]);
    }
    expect(r2.rd).toBeGreaterThanOrEqual(30);
  });

  it('beating a strong opponent raises the rating; losing to a weak one lowers it', () => {
    const base = DEFAULT_RATING;
    const won = rate(base, [{ opponentRating: 1800, opponentRd: 60, score: 1 }]);
    const lost = rate(base, [{ opponentRating: 1200, opponentRd: 60, score: 0 }]);
    expect(won.rating).toBeGreaterThan(base.rating);
    expect(lost.rating).toBeLessThan(base.rating);
  });

  it('consistent evidence tightens RD (confidence grows)', () => {
    let r = DEFAULT_RATING;
    const before = r.rd;
    for (let i = 0; i < 8; i++) {
      r = rate(r, [{ opponentRating: 1500, opponentRd: 50, score: 0.7 }]);
    }
    expect(r.rd).toBeLessThan(before);
  });

  it('conservativeEstimate is rating minus RD', () => {
    expect(conservativeEstimate({ rating: 1600, rd: 120, vol: 0.06 })).toBe(1480);
  });

  it('clamps out-of-range scores instead of throwing', () => {
    const r = rate(DEFAULT_RATING, [
      { opponentRating: 1500, opponentRd: 50, score: 5 },
      { opponentRating: 1500, opponentRd: 50, score: -3 },
    ]);
    expect(Number.isFinite(r.rating)).toBe(true);
    expect(Number.isFinite(r.rd)).toBe(true);
  });
});
