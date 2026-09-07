# Stage 1 — Per-skill learner model ("the Twin")

PRD v3.1's keystone. Everything after it depends on it: the Stage-2 generator
targets a candidate's weak skills, the Stage-3 "Firm" shows progression along
them, Stage-4 self-improvement calibrates against them.

Ash's constraint (2026-09-07): **the case library stays and keeps growing** —
the twin becomes the differentiator, the 1,165+ real cases are NOT retired.
The Stage-2 generator will append grounded cases into the same `cases` table,
enlarging the library rather than replacing it.

## What's built (`6111de2`, on `main`)

| File | What |
|---|---|
| `src/lib/skills/taxonomy.ts` | 40 micro-skills, 6 groups, each an observable behaviour |
| `src/lib/skills/glicko2.ts` | pure Glicko-2 (Glickman 2013), verified vs the paper's worked example |
| `src/lib/skills/knowledge-tracing.ts` | prompt builder + defensive parser (arXiv:2409.16490 style) |
| `src/lib/skills/apply.ts` | `traceAndApplySkills()` + `getSkillProfile()` |
| `supabase/migrations/0021_skill_model.sql` | `skill_obs` + `skill_state`, RLS user-owns-own — **NOT applied** |
| `src/lib/groq/evaluate-session.ts` | fires `void traceAndApplySkills()` after the score write |

**Flow:** session scored → (fire-and-forget) aux-tier LLM reads the transcript →
per-skill observation `{demonstrated, quality 0..1, difficulty 0..1, confidence}`
→ mapped to a Glicko match (difficulty → opponent rating 1200–1800, low
confidence → wider opponent RD) → `skill_obs` upserted, `skill_state`
recomputed. One session = one rating period per skill.

**Fortress:** best-effort — `traceAndApplySkills` never throws into the NSM,
never blocks the response, runs once per session (upstream idempotency guard).
Score and debrief do not depend on it. 315 tests pass, `next build` OK.

## Inert until

1. **Migration 0021 applied.** Until then the upsert errors → caught → logged →
   no-op. Needs `supabase login` (CLI installed) or a manual paste.
2. **A UI.** `getSkillProfile(supabase, userId)` returns `{entries, byGroup,
   weakest, strongest, provisional flags}` but nothing renders it. Next slice:
   a skills section on `/debrief` (radar by group + "weakest 3 to work on")
   and/or a standing `/skills` page. Needs a read path — server-component read
   or `GET /api/skills/profile`.

## Open calibration question (PRD v3.1)

PRD wants QWK ≥ 0.6 (show scores) / ≥ 0.7 (drive assignment) before the twin's
numbers gate anything. The tracer's `quality`/`difficulty` judgements are
currently unvalidated. Needs a gold set: either human-graded sessions or a
rubric-graded sample to compute QWK against. Until calibrated, present the twin
as directional ("your weakest areas"), not as a hard score.

## Not started

- Stage 2 — adversarial grounded case **generator** (needs the "real cases
  only" → "verified-data-grounded only" reframe signed off explicitly; the
  library still grows, generator output is flagged + fact-check-gated).
- Stage 3 — "The Firm" progression wrapper.
- Stage 4 — self-improvement flywheel (GEPA prompt optimisation + IRT/Elo
  difficulty calibration; never auto-deploy prompts).
- Text-realism mechanics (no-backspace, running clock, ~40s interrupt,
  scroll-away transcript) — independent of the twin, can land any time.
