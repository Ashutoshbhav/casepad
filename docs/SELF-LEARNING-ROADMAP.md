# CasePad — Self-Learning Roadmap

> Compiled 2026-09-08. How CasePad becomes a system that keeps getting better at
> interviewing the more interviews it runs, stays current without a human editing
> it, and feels personal enough that a student opens it every day.
>
> **Supersedes** the "fine-tuning is off the table" stance in
> `docs/AI-INTERVIEWER-TRAINING-PLAN.md` §2.1 — Ash has explicitly asked for model
> training as part of the plan (2026-09-08). Fine-tuning is now **Phase 2+**, not
> forbidden, under the guardrails in §6.
>
> Companion docs: `docs/PRD.md` (v3.1 route), `docs/AI-INTERVIEWER-TRAINING-PLAN.md`
> (the prompt/RAG training base), `docs/superpowers/specs/2026-09-07-learner-model-stage1.md`
> (the Twin), `docs/superpowers/specs/2026-09-07-self-improvement-flywheel-stage4.md`
> (GEPA + Elo calibration v0).

---

## 0. What "self-learning" means here

Three things Ash wants, in his words:

1. **Accumulated experience.** The interviewer has run a case hundreds of times and
   *knows* where candidates stumble on it — "like a human as time passes."
2. **Web currency.** It periodically goes to the web and updates itself — new
   company data, new market numbers, how MBB interviews are actually changing.
3. **Personalization.** It carries each user's context (skill trajectory, target
   firms, recurring failure modes, session history) and adapts to it, so the tool
   feels made-for-them and earns a daily habit.

None of this is a single technique. It is **four memory layers the model reads
from** (§3), **a set of improvement loops that close with decreasing human
involvement** (§4), and **targeted model training on top** once the data exists
(§5). The spine under all of it is instrumentation (§2).

### The honest framing

- **Retrieval adds knowledge and context. Training changes behaviour.** "The
  interviewer knows this case" is retrieval. "The interviewer holds persona
  without a 4,000-token prompt" is training. Don't use one for the other's job.
- **Training on your current outputs distills your current interviewer, flaws
  included.** Training only makes it *better* if the training targets are labelled
  good (§5.2). Garbage in, garbage out — at scale.
- **Fine-tuning ends the $0 config.** A custom model can't run on Gemini/Groq free
  tiers. This is the single biggest strategic cost (§7), not the GPU bill.
- **A learning loop that isn't gated is a degradation loop.** CasePad has already
  lived 34 days of undetected degradation and a 97-minute batch job that never
  ran. Every loop below ships *with* a frozen eval set, a canary, and
  auto-rollback, or it doesn't ship.

---

## 1. Current state — what already exists as seeds

| Capability | Where | State |
|---|---|---|
| Per-skill learner model (Twin) — ~40 micro-skills, Glicko-2, LLMKT extraction | `src/lib/skills/*` | Live. Feeds `/debrief` only. |
| Prior-session memory in the opener | `src/lib/groq/opener.ts` | Live but thin — one line ("weakest dimension last time"). |
| Playbook RAG retriever + per-turn citations | `docs/playbook/*`, retriever in the chat route | Live. Methodology-memory seed. |
| Per-case web research for pre-case prep | `src/lib/groq/pre-case-crammer.ts` | Live but ad-hoc (per case, on demand). |
| Web search capability | `TAVILY_API_KEY` in prod env | Wired, used only by the crammer. |
| Case difficulty calibration (Elo) | `src/lib/calibration/case-elo.ts`, `0024_case_calibration.sql` | Live. Human reviews the drift report before any label change. |
| GEPA prompt optimiser (skill-tracer only) | `scripts/qa/optimize-tracer-prompt.ts` | Offline harness. Proposes; a human applies. Never the interviewer or grader prompt. |
| Generated-case engine + fact-check gate | `src/lib/generator/*`, `0022_generated_case.sql` | Live. Fail-closed on any ungrounded claim. |
| Monthly flywheel scheduler | `.github/workflows/flywheel.yml` | Live. Drift report + opt-in optimiser run. |
| Session traces, cheat-sheets | `cheat_sheets` table, `/api/cheatsheet` | Raw material for per-case memory. Not yet structured for it. |

**Gap that matters most:** none of the per-user context flows *into the interview
itself*. The Twin is a report card, not an input. The interviewer runs the same
for everyone.

---

## 2. The spine — instrumentation (build first, always)

Everything downstream needs this. It is also the eval/regression harness, so it
pays for itself even if training never happens.

Every turn emits a structured trace row:

```
session_trace(
  session_id, turn_index, ts,
  stage,                     -- from the stage machine
  format,                    -- interviewer_led | candidate_led
  candidate_turn_text,
  interviewer_turn_text,
  candidate_state_snapshot,  -- Twin bands at this point, committed numbers, hypothesis on the table
  tier1_detectors,           -- {not_generic, ends_with_probe, on_persona, no_praise_twice, ...} pass/fail
  provider, served_by_idx, fallback_used,
  latency_ms,
  version_sha
)
```

Per session:

```
session_outcome(
  session_id, user_id,
  final_score, per_dimension_scores,
  grade_fair_vote,           -- one-tap thumbs, optional
  completed | abandoned, abandon_turn,
  real_interview_outcome     -- self-reported later: callback / offer / "went well", nullable, slow
)
```

The PRD v3.1 data model (`session_trace`, `grade_fair`) specs some of this. It is
not fully wired. **Do this before anything else in §4 or §5.**

---

## 3. The four memory layers

Read at inference. No training required for any of this.

### 3.1 Per-user memory — the personalization spine

Stored per user, retrieved into every session's system prompt (tight: summarised,
top-k, injected at the prompt END with "MUST honour"):

- **Skill trajectory** — the Twin's bands, plus deltas ("synthesis improving,
  arithmetic flat").
- **Recurring failure modes in plain language** — "blurts the number before
  structuring the math", "over-clarifies for 4 minutes", "synthesis is always a
  chronological recap". Extracted by an LLM pass over the last N sessions.
- **Target firms + timeline** — "Bain, ~2 weeks out" → drives case selection,
  firm-style (interviewer-led vs candidate-led), difficulty ramp, crammer content.
- **Session-history summaries** — last ~5 sessions as retrieval context so the
  interviewer can say *"last week you cut cost before confirming revenue was the
  bigger lever, and it cost you. Watch that."*

**Build:** `user_memory(user_id, skill_summary, failure_modes[], target_firms[],
timeline, session_summaries[])`, refreshed after each session; a retrieval step in
the chat route that injects a compact block into `buildInterviewerMessages` opts
(same pattern as the new `formatBlock` / `elapsedNote` / `hintDirective`).

### 3.2 Per-case memory — "the interviewer has run this 100 times"

Every completed session writes structured artifacts back, keyed by `case_id`:

- Where candidates stumble on *this* case (turn ranges, common wrong branches).
- Which reveal-note fired when, and whether it helped.
- Which probes landed vs bounced.
- Timing distribution (when do people usually reach synthesis).

Retrieved when that case runs again → the interviewer pre-loads pressure at the
known trip points. Pure retrieval.

**Build:** `case_memory(case_id, stumble_points[], probe_effectiveness[],
timing_stats, updated_at)`; an extraction job on session completion; a retrieval
step keyed by `caseRow.id` in the chat route.

### 3.3 Methodology memory — "goes to the web to stay current"

A **scheduled, gated** ingestion job (not "let the AI browse"):

- Rotates through topics: company financials & market data for grounded
  generation; how MBB interviews are changing (PEI dimension renames, BCG Casey
  updates, new firm formats).
- Every fetched fact runs the **same gate as a generated case**: cited source +
  `asOf` + Verified/Estimate flag, 5% economic reconciliation, LLM fact-check
  fail-closed.
- Writes into the 63-anchor number-bank and `docs/playbook/*`.

**Build:** `.github/workflows/methodology-refresh.yml` (weekly), a
`scripts/ingest/methodology-refresh.ts` that uses `TAVILY_API_KEY`, and the
existing fact-check gate from `src/lib/generator/`. Reuse the crammer's research
prompt as the base.

### 3.4 Distillation — "gets better at the craft over months"

The offline optimiser periodically reads layers 3.1 and 3.2, finds patterns that
recur across *many* users ("candidates from this cohort consistently fail altitude
discipline on market-entry cases"), and folds them into the interviewer playbooks
as new stage notes / spike-move / red-flag entries.

**Build:** extend `scripts/qa/optimize-tracer-prompt.ts` (or a sibling) to read
`session_trace` + `user_memory` and propose playbook diffs. Human-applied at first
(§4 Tier C); auto-applied later only past the frozen-eval gate.

---

## 4. The improvement loops — a staged autonomy ladder

Not a switch. Five loops, closing with decreasing human involvement as the
reward signal gets trustworthy.

### Tier A — automate fully now (objective reward, low blast radius)

| Loop | Reward signal | Action |
|---|---|---|
| **Case difficulty (Elo/IRT)** | predicted difficulty vs observed pass rate | Flip the drift report to a direct write on the `case_calibration` side table. Worst case: one case mislabelled one band, self-corrects next session. |
| **Curriculum / assignment (FSRS-6)** | pure algorithm | Wire `ts-fsrs`; `fsrs_card(user_id, skill_id, stability, difficulty, due)`; decaying weak skills resurface as the daily assignment. No human ever needed. **Not built yet.** |

### Tier B — automate behind a frozen gate (objective reward, one-time human labelling)

| Loop | Reward signal | Gate |
|---|---|---|
| **Grader prompt** | QWK vs human gold | Have 2–3 coaches score ~100 sessions **once**. Freeze as a held-out set, never optimised against. GEPA runs on a schedule → a variant auto-promotes **only if** it beats the incumbent's QWK by a margin on the frozen set **and** survives a 48h canary at ~10% of traffic with no live-QWK regression. Auto-rollback on regression. |
| **Skill-tracer prompt** | QWK vs human gold (same set) | Same gate. Already has the GEPA harness; needs the frozen set + the promotion service. |

Human cost: the one-time labelling. Then zero per iteration.

### Tier C — the interviewer prompt: build the reward before removing the human

No objective reward exists ("no clean metric" — PRD). Build an **automatic
evaluator**:

- **LLM-as-judge, pairwise (~60%)** — a frontier model scores two interview
  transcripts on a rubric: grilled structure, released data only on request,
  forced synthesis at the right time, stayed in persona, avoided chatbot tells.
  Cheap, reproducible on a frozen transcript set.
- **Tier-1 detector pass rate (~30%)** — the ~13 rule checks. Hygiene, not
  quality. Necessary, not sufficient.
- **"Grade fair?" rate (~10%)** — real but noisy and biased (students who scored
  badly rate it unfair).

Run GEPA against that composite. Auto-promote only past the frozen-set margin +
canary. **Anchor:** the one signal you can't fake is `real_interview_outcome` — do
students who practised on variant B get more callbacks. 2–6 week lag, small N; use
it as a slow validator that can veto a promotion the judge approved.

**Keep a 5-session/month human spot-check as a canary on the judge itself.** That
is the smallest human footprint worth shipping — genuinely zero-human on the
interviewer is a liability posture for a product that shapes how students prepare.

### Generated cases — can go near-autonomous now

Nightly job: detect a cohort-wide skill gap with no library case → generate a
targeted one → fact-check gate (already fail-closed) → LLM non-triviality check
(does it actually exercise the target skill) → auto-publish tagged `generated` →
serve to 5% first → auto-retire if abandon / completion / Elo stats look
pathological.

### The guardrail that makes any of this safe

- **Frozen held-out eval set** per component, versioned, never optimised against.
- **Promotion service**: proposer → beats incumbent by a margin on the frozen set
  → canary at N% → monitor live metrics → auto-promote or auto-rollback.
- **Live-metric alarms wired to the rollback**, not just to email: QWK, fallback
  rate, grade-fair rate, abandon rate. A bad promotion undoes itself in minutes.

---

## 5. Model training — phased

### 5.1 What fine-tuning actually buys an interviewer

- **Good at:** locking in persona, cadence, and craft so they never drift. Today a
  ~4,000-token craft body fights persona drift every turn and still loses
  sometimes. A fine-tuned model holds "NOT a tutor, ends every turn with a probe,
  skeptical register" in weights → cut that prompt ~70%, harder consistency,
  lower latency. **Highest-ROI training move.**
- **Does not:** add knowledge (retrieval's job), or automatically make the
  interviewer "read a candidate better" — that needs the training examples to be
  *good moves given a candidate state*, labelled.

### 5.2 The data problem is the whole game

Need tuples: **(candidate state + transcript so far) → (a good next interviewer
turn)**, with a label. Label sources: human ratings, "grade fair?" votes, the
LLM-judge (§4 Tier C), real-interview outcomes.

Volume comes fast — a 20-student cohort at 3 sessions/week × 15 turns ≈ 3,600
interviewer turns/week. Quality labels don't. Bootstrap with the LLM-judge to
score turns and build preference pairs; accept the ceiling is the judge's taste;
correct it with human spot-checks + outcome data.

### 5.3 Phases

| Phase | What | Trigger |
|---|---|---|
| **1 — now** | Retrieval + per-user memory (§3.1) + gated web currency (§3.3). Instrument every turn (§2). You are building the training set regardless. | Ship now, $0 |
| **2 — SFT** | Supervised fine-tune a small open model (Qwen-2.5-7B / Llama-3.1-8B class) on the **top-quartile** interviewer turns by judge + grade-fair. Goal: distill persona/craft, shrink the prompt, cut cost/latency. Ship behind a canary vs the frozen eval. | ~5–10k rated turns |
| **3 — DPO/KTO** | Preference-tune on pairs (better vs worse turn, same context) from judge + grade-fair + outcome. This is what pushes "interviews better", not just "sounds consistent". | SFT stable + real preference pairs |
| **4 — personalization via training** | Per-**segment** LoRA adapters (e.g. one tuned on how IIM-A finance-track students fail). **Not per-user** — too little data per person, would overfit. Per-user stays retrieval (§3.1). | Segments show distinct, stable failure patterns |

The deterministic scaffolding (number registry, stage machine, arithmetic
verifier, format/hint/clock directives) never goes away. The fine-tune is a
better actor inside the same cage.

---

## 6. Guardrails (non-negotiable, apply to §4 and §5)

1. **Frozen eval set per component**, versioned, never trained or optimised
   against. Every retrain/promotion must beat the incumbent on it or it does not
   ship.
2. **Canary + auto-rollback.** New version serves N% of traffic; any regression in
   QWK / grade-fair / abandon / detector pass rate rolls it back automatically and
   pages.
3. **Rotate the LLM judge model**; keep a 5-session/month human spot-check on the
   judge. Anchor on `real_interview_outcome` once N allows — it can veto a
   judge-approved promotion.
4. **Consent + retention.** Training on student transcripts is a higher bar than
   inference. Explicit opt-in, a data-retention/deletion policy, and — while any
   free-tier LLM that trains on inputs is in the chain — a disclosure that
   transcripts may be used to improve the product.
5. **The pipeline is a system that must be kept alive.** Automate the regression
   gate and the alarms, or do not build the loop. A silently-stale training loop
   is the 34-day-degradation failure mode with weights instead of config.
6. **Personal, not surveilled.** Memory is rich for the student, invisible to the
   placement coordinator and to recruiters (PRD D15 / LL144 / EU AI Act).
7. **Retrieval stays tight.** Dumping past sessions into the prompt recreates the
   multi-turn-degradation problem the engine is built to resist. Top-k,
   summarised, injected at the prompt end.

---

## 7. Cost

| Item | Cost | Note |
|---|---|---|
| Training run (managed: Together / Fireworks / OpenAI) | ~$5–50 / run | A few thousand examples. |
| Training run (self-hosted LoRA, 7–8B, RunPod/Modal) | ~$10–30 / run | One H100, a few hours. |
| **Serving a custom model** | **~$20–100 / mo at current scale** | The real cost. Ends the $0 config — a fine-tune cannot run on Gemini/Groq free tiers. On top of Supabase Pro. |
| Web-currency job (Tavily + LLM fact-check) | within free tiers at weekly cadence | Gate every fact. |
| Judge calls for preference data | aux-tier LLM, bounded | Batch offline. |
| **The largest cost is not money** | weeks of solo-dev + permanent upkeep | Eval harness, frozen sets, labelling pipeline, retraining cadence + regression gate. |

---

## 8. Sequenced roadmap

**Now → next (no new spend, no training):**
1. Wire `session_trace` + `session_outcome` fully (§2).
2. Per-user memory store + retrieval into the interview (§3.1). Biggest
   "feels personal" win.
3. Wire FSRS-6 for the assignment loop (§4 Tier A).
4. Flip Elo calibration to auto-write (§4 Tier A).

**Then (one-time human labelling, still $0 serving):**
5. Collect the ~100-session human gold set (2–3 raters). Freeze it.
6. Build the promotion service (frozen-set gate → canary → auto-rollback) (§4).
7. Put grader + tracer prompts on the auto-promotion loop (§4 Tier B).
8. Per-case memory store + retrieval (§3.2).
9. Scheduled gated web-currency job (§3.3).

**Then (build the interviewer reward):**
10. LLM-judge pairwise evaluator + frozen transcript set (§4 Tier C).
11. Extend GEPA to the interviewer prompt, human-applied, then auto behind the
    gate.
12. Distillation job reading the memory stores (§3.4).

**Then (training — the $0 config ends here):**
13. Phase 2 SFT once ~5–10k top-quartile rated turns exist (§5.3).
14. Phase 3 DPO once SFT is stable.
15. Phase 4 per-segment LoRA adapters when segments show stable patterns.

---

## 9. Open decisions for Ash

- **Consent model** for training on transcripts — opt-in default, or opt-out with
  disclosure? Blocks Phase 2.
- **When the $0 config is allowed to end.** Phase 2 requires paying to serve a
  custom model (~$20–100/mo). Is a distilled, cheaper-per-turn, harder-persona
  interviewer worth that line item, and at what cohort size?
- **Judge model** for the interviewer evaluator (§4 Tier C) — which frontier
  model, and the budget for pairwise scoring at volume.
- **How autonomous is too autonomous for the interviewer prompt?** Recommendation:
  never fully — keep the 5-session/month human spot-check. Confirm.
- **Per-segment adapters** — is the cohort structured enough (IIM-A finance vs ISB
  consulting vs …) that segment-level training beats one model + retrieval?
