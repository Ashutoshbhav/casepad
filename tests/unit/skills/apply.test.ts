import { describe, it, expect } from 'vitest';
import {
  observationToMatch,
  usableObservation,
  applyObservations,
  getSkillProfile,
} from '@/lib/skills/apply';
import type { SkillObservation } from '@/lib/skills/knowledge-tracing';
import { SKILLS } from '@/lib/skills/taxonomy';

const obs = (o: Partial<SkillObservation>): SkillObservation => ({
  skillId: 'mece_decomposition',
  demonstrated: true,
  quality: 0.7,
  difficulty: 0.5,
  confidence: 0.8,
  evidence: 'e',
  ...o,
});

describe('apply: pure mapping', () => {
  it('maps difficulty to opponent rating (0->1200, 0.5->1500, 1->1800)', () => {
    expect(observationToMatch(obs({ difficulty: 0 })).opponentRating).toBe(1200);
    expect(observationToMatch(obs({ difficulty: 0.5 })).opponentRating).toBe(1500);
    expect(observationToMatch(obs({ difficulty: 1 })).opponentRating).toBe(1800);
  });

  it('low tracer confidence widens the opponent RD', () => {
    expect(observationToMatch(obs({ confidence: 1 })).opponentRd).toBe(100);
    expect(observationToMatch(obs({ confidence: 0 })).opponentRd).toBe(250);
  });

  it('drops not-demonstrated and very-low-confidence observations', () => {
    expect(usableObservation(obs({ demonstrated: false }))).toBe(false);
    expect(usableObservation(obs({ confidence: 0.1 }))).toBe(false);
    expect(usableObservation(obs({ confidence: 0.25 }))).toBe(true);
  });
});

// ---- tiny in-memory fake of the two tables the apply/read side touches ----
function fakeSupabase() {
  const tables: Record<string, any[]> = { skill_state: [], skill_obs: [], cases: [] };
  const api: any = {
    _tables: tables,
    from(name: string) {
      let rows = tables[name] ?? (tables[name] = []);
      let filtered = [...rows];
      const chain: any = {
        select() { return chain; },
        eq(col: string, val: any) { filtered = filtered.filter((r) => r[col] === val); return chain; },
        in(col: string, vals: any[]) { filtered = filtered.filter((r) => vals.includes(r[col])); return chain; },
        limit(n: number) { filtered = filtered.slice(0, n); return Promise.resolve({ data: filtered, error: null }); },
        maybeSingle() { return Promise.resolve({ data: filtered[0] ?? null, error: null }); },
        then(res: any) { return Promise.resolve({ data: filtered, error: null }).then(res); },
        upsert(newRows: any[], opts: { onConflict: string }) {
          const keys = opts.onConflict.split(',');
          for (const nr of newRows) {
            const i = rows.findIndex((r) => keys.every((k) => r[k] === nr[k]));
            if (i >= 0) rows[i] = { ...rows[i], ...nr };
            else rows.push({ ...nr });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
      return chain;
    },
  };
  return api;
}

describe('apply: applyObservations + getSkillProfile (in-memory)', () => {
  it('creates skill_state from default on first observation and updates it', async () => {
    const sb = fakeSupabase();
    await applyObservations(sb, 'u1', 's1', [
      obs({ skillId: 'mece_decomposition', quality: 0.9, difficulty: 0.6, confidence: 0.9 }),
      obs({ skillId: 'sanity_checking', quality: 0.1, difficulty: 0.5, confidence: 0.8 }),
    ]);

    const state = sb._tables.skill_state;
    expect(state).toHaveLength(2);
    const mece = state.find((r: any) => r.skill_id === 'mece_decomposition');
    const sanity = state.find((r: any) => r.skill_id === 'sanity_checking');
    // did well on a hard skill -> rating up from 1500; whiffed -> rating down
    expect(mece.rating).toBeGreaterThan(1500);
    expect(sanity.rating).toBeLessThan(1500);
    expect(mece.obs_count).toBe(1);
    expect(sb._tables.skill_obs).toHaveLength(2);
  });

  it('getSkillProfile returns one entry per taxonomy skill and flags provisional', async () => {
    const sb = fakeSupabase();
    await applyObservations(sb, 'u1', 's1', [obs({ skillId: 'concision', quality: 0.8 })]);
    const p = await getSkillProfile(sb, 'u1');
    expect(p.entries).toHaveLength(SKILLS.length);
    const concision = p.entries.find((e) => e.skillId === 'concision')!;
    expect(concision.obsCount).toBe(1);
    // one observation -> RD still wide -> provisional
    expect(concision.provisional).toBe(true);
    const untouched = p.entries.find((e) => e.skillId === 'creativity')!;
    expect(untouched.obsCount).toBe(0);
    expect(untouched.rating).toBe(1500);
  });
});
