# Skill-tracer calibration rubric

How a human scores a completed case transcript, per micro-skill, so we can
measure the knowledge-tracer against it (QWK, `scripts/qa/calibrate-tracer.ts`).

## Procedure

1. Read the whole transcript. Consider **only the candidate's turns**.
2. For each of the ~40 skills in `src/lib/skills/taxonomy.ts`, decide first:
   **did the case give the candidate a genuine chance to show this skill?**
   - No → skip it (leave it out of `labels`).
   - Yes → score `quality` on the 0.0–1.0 anchors below.
3. Put the results in `docs/calibration/gold-labels.json` as
   `{ "sessionId": "...", "labels": { "<skill_id>": <0..1>, ... } }`.

Target sample: **15–20 sessions**, spread across case types (profitability,
market entry, pricing, estimation, ops) and across strong / middling / weak
candidates. Two people scoring the same 5 first, to check we agree with each
other before trusting the number.

## Quality anchors (same scale the tracer is told to use)

| Score | Meaning |
|---|---|
| **0.9–1.0** | Did it well and **consistently** across the case. A trained interviewer would note it as a strength. |
| **0.65–0.85** | Did it, competently, with a wobble or two. Solid, not standout. |
| **0.4–0.6** | Uneven. Showed it once, missed it once; or did a weak version. |
| **0.15–0.35** | Mostly missed it despite clear opportunities. One token attempt at most. |
| **0.0–0.1** | Did the opposite / clear failure (e.g. asserted a number with no check when the case hinged on it). |

Calibration notes:
- Most real candidates are **uneven** — expect the bulk of scores in 0.3–0.7.
- Reserve ≥ 0.85 and ≤ 0.15 for genuinely clear cases.
- Judge the skill, not the outcome. A candidate can reach a wrong answer with
  excellent `mece_decomposition`, or the right answer with poor `signposting`.
- "Difficulty" (how hard the case made the skill) is scored separately by the
  tracer; the human only scores `quality`. The calibrate script pairs them by
  `skillId`.

## A few skill-specific reminders

- `hypothesis_first` — did they commit to a view early, or just list buckets?
  Listing without a stance is ≤ 0.4 even if the buckets are good.
- `sanity_checking` — a number stated and moved past, with no "does that feel
  right?", is ≤ 0.2 regardless of whether the number was correct.
- `so_what_synthesis` vs `recommendation_clarity` — the first is rolling
  findings into a "therefore" mid-case; the second is the final decisive
  answer. Score them independently.
- `poise_under_pressure` — only score if the interviewer actually pushed back
  or challenged. No challenge in the transcript → skip.
- `incorporating_new_info` — only score if the interviewer introduced a new
  fact/constraint mid-case.

## Reading the result

`scripts/qa/calibrate-tracer.ts --gold docs/calibration/gold-labels.json` prints:
- **overall QWK** — the headline. ≥ 0.60 → the Twin can show bands/scores;
  ≥ 0.70 → it can drive case assignment.
- **per-skill QWK** — where the tracer is reliable vs. not. Low-agreement
  skills get prompt work (sharper `observable` text, an anchor example) before
  re-running.
- **CSV dump** — every (tracer, gold) pair, for eyeballing systematic bias
  (e.g. tracer runs 0.15 high everywhere → a single offset fix).

If overall QWK < 0.6: tighten the tracer prompt on the worst per-skill rows,
re-run against the same gold set. Do not touch the gold labels to chase a
number.
