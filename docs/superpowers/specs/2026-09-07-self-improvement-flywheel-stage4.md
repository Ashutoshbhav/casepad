# Stage 4 — self-improvement flywheel

PRD v3.1's last stage. CasePad gets better over time **without fine-tuning**:
prompts are optimised against a metric, and case difficulty calibrates itself
from real play. **Prompts are never auto-deployed — a human promotes each
proposal.**

## Two halves

### A. Case difficulty calibration (IRT/Elo) — LIVE

`src/lib/calibration/case-elo.ts` (pure, 10 tests) + `case_calibration` table
(`0024`, applied). After every scored session `calibrateCaseFromSession()` runs
fire-and-forget alongside the twin + the firm:

- treats the session as a match between the candidate's implied rating (mean of
  their observed skill-Glicko ratings, 1500 if untracked) and the case's
  difficulty rating
- `score/100` is the outcome; if strong candidates keep scoring low, the case
  rating rises; if weak candidates ace it, it falls
- K-factor decays with play count (40 → 24 → 14)

It writes a **side table only** — never the `cases` corpus, never the shown
easy/medium/hard label. `scripts/qa/case-drift.ts` shows where the empirical
band disagrees with the label so an admin can decide whether to re-label
(a content call) or feed it into engagement assignment (Stage 3.3).

Fortress-safe: best-effort, never throws/blocks, once per session.

### B. GEPA prompt optimisation — HARNESS ONLY

`scripts/qa/optimize-tracer-prompt.ts` (GEPA, arXiv:2507.19457): reflective
mutation + Pareto selection, targeting the **knowledge-tracer** prompt (it has
a metric — QWK — and a gold set already, from Stage 1 calibration).

```
npx tsx --env-file=.env.local scripts/qa/optimize-tracer-prompt.ts \
  --gold docs/calibration/gold-labels.json --n 4
```

1. Score the current prompt against the gold set → baseline QWK + per-skill QWK.
2. Show an LLM the worst per-skill (tracer, human) rows; ask for a targeted
   rewrite of those skills' `observable` wording + optionally one extra rule.
   (`buildTracingMessages` gained an optional `opts.observableOverrides` /
   `opts.extraRules` — used ONLY by this script.)
3. Re-score each proposal against the gold set.
4. Keep the Pareto frontier (QWK vs. prompt size).
5. Write `docs/calibration/proposals/tracer-prompt-<ts>.md` — the table, the
   recommended candidate, and its override JSON.

**It never edits `knowledge-tracing.ts`.** To promote a proposal: eyeball the
wording, hand-apply the overrides into the taxonomy's `observable` fields (or
the Rules block), re-run `calibrate-tracer.ts` to confirm the gain holds, then
commit.

## Making it a flywheel (not yet wired)

A monthly GitHub Actions job (same pattern as the canary) that runs
`calibrate-tracer.ts` + `optimize-tracer-prompt.ts` + `case-drift.ts` and files
the reports as an issue/PR comment for review. Deliberately not automatic
beyond "produce the proposal" — the promote step stays human.

## Not done

- The flywheel scheduler (above).
- GEPA on the **interviewer** prompt (no clean automatic metric — needs a
  human-rated engagement quality signal first).
- Feeding calibrated case difficulty into Stage 3 engagement assignment (3.3).
