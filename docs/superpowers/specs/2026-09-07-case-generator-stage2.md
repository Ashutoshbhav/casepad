# Stage 2 — Adversarial grounded case generator (v0)

PRD v3.1. Builds a **full** new case from a real seed + its dossier, engineered
to stress one target micro-skill, gated by a **second LLM fact-check pass**, and
held in a **staging state a human approves** before it is ever served.

Ash's calls (2026-09-07): full case · second-LLM fact-check · staging I approve first.
Constraint change that unblocked this: `CLAUDE.md` rule #2 → "verified-data-grounded only" (`432caaf`).

## Pipeline

```
seed case (cases row) + dossier (data/dossiers/<id>.json)
  └─ GENERATE pass   (router primary tier, temp 0.5, JSON)
       → full case: title, industry, case_type, difficulty, problem_statement,
         interviewer_notes[], ideal_structure, exhibits[], fictionalEntities[]
  └─ FACT-CHECK pass (router aux tier, temp 0, JSON)
       → every quant claim + named real-world entity classified
         source / fictional / ungrounded;  verdict = fail if ANY ungrounded
  └─ code number-sweep cross-check → advisory flags (regex, noisy, NOT a gate)
  └─ INSERT generated_case (status 'draft')     ← never served
```

Approval (`scripts/qa/review-generated.ts --approve <id>`) refuses anything whose
`factcheck.verdict != 'pass'`, then copies the row into `cases` with
`provenance.generated = true`, `source = 'CasePad generated'`, `tags = ['generated']`,
and sets `generated_case.published_case_id`. The 1,165 real cases and every
case-serving query are untouched.

## Files

| File | Role |
|---|---|
| `supabase/migrations/0022_generated_case.sql` | `generated_case` table, RLS deny-all (ops) — **applied** 2026-09-07 |
| `src/lib/generator/prompt.ts` | pure: `buildGenerateMessages` / `parseGeneratedCase` / `buildFactCheckMessages` / `parseFactCheck` / `numberSweep` / `crossCheckNumbers` |
| `src/lib/generator/generate.ts` | `generateAndStage()`, `approveGenerated()`, `rejectGenerated()` |
| `scripts/qa/generate-cases.ts` | CLI: `--seed <id> --skill <id> [--n]` or `--skill <id> --seed-type <type>` |
| `scripts/qa/review-generated.ts` | CLI: `--list` / `--show <id>` / `--approve <id>` / `--reject <id>` |

## v0 smoke run (2026-09-07)

`--seed InvestCo --skill sanity_checking` → generated "AuraWealth" (invented
client, correct). Fact-check: **10 claims `source`** (with reasoning:
"2 PM × $1.5M + 6 RA × $0.25M = $4.5M, matches source"), 1 `fictional`
(AuraWealth), 1 `source` entity (InvestCo), **1 `ungrounded`** — the model
invented a "$2 billion market size … 60% share by Year 4" not in the dossier.
Verdict `fail`, approval correctly refused. One prompt fix away from passable.

## Known v0 limitations / next pass

- **Grounding depth is seed-dependent.** Starter cases have thin dossiers, so
  generated P&L numbers get flagged. Best seeds = cases with a rich
  `data/dossiers/<id>.json`. Tighten the GENERATE prompt to never state a
  market size / share not in the dossier.
- **Exhibits** are generated onto the `generated_case` row but there is no
  live serving path for exhibits on `cases` yet (no column) — carried in
  `provenance.generation` on approval; wiring is a follow-up.
- **No auto seed↔skill matching.** v0 takes an explicit seed + skill (or a
  random seed of a type). Stage 3/4 will pick the seed from a user's weakest
  skill + a fitting case type.
- **`ideal_walkthrough`** is not generated (left null; the debrief walkthrough
  loader regenerates it on demand, same as for real cases).
- Review is a CLI. A small admin UI is a nice-to-have.
