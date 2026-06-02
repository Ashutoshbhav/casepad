# CasePad Solving-Engine Redesign — Before / After

**Date:** 2026-06-02 · **Status:** DESIGN (awaiting Ash approval) · **Evidence base:** `docs/research/case-sources/RESEARCH-INDEX.md` (14 transcribed videos + 5-agent source fan-out) · **Audit base:** read-only code audit of current engine (this doc's "BEFORE" column is cited to file:line).

> Goal: move the engine from *"a chatbot that role-plays an interviewer and emits a vibe-score"* to *"a stage-aware interviewer grounded in how real MBB/PM/IB interviewers actually conduct and score — with deterministic case-state and a validated rubric."* It's not just the case study: the engine models the whole interview arc, and guesstimates are first-class.

---

## The one-line verdict

| | BEFORE (today) | AFTER (target) |
|---|---|---|
| **What it is** | A single Bain-EM chatbot + an end-of-case LLM that self-reports a score | A track-aware, stage-driven interviewer + deterministic case-state + a validated, research-grounded rubric |
| **Grounding** | Hand-written prompt from intuition | Real interviewer conduct + scoring rubric extracted from 14 real-interview transcripts |
| **Trust model** | "Trust the LLM" (score, data-gate, math, synthesis all model-judged) | "Verify, then trust" — deterministic signals gate behavior and feed the grade |

---

## Layer 1 — Interviewer turn engine

| Aspect | BEFORE | AFTER | Why (source) |
|---|---|---|---|
| Persona | Single hardcoded "Ash, Bain EM" for **every** track incl. PM/IB/marketing (`opener.ts:42`, `interviewer.ts:18`) | **Track-aware persona** (consulting EM / PM / IB / marketing / strategy), tone + examples + tells matched to the track | Research: PM/IB/consulting interviews differ structurally; live experience must match the rubric it's graded against |
| Interview arc | **Case-only.** No rapport, resume/fit, behavioral/PEI, technical, or candidate-Q phases. No stage concept at all — only `transcript.length` as a turn counter (`route.ts:323`) | **Explicit stage machine:** greeting/rapport → resume/fit (opt) → structure → analysis → **guesstimate (if applicable)** → synthesis → recommendation → candidate-Qs → close. Engine knows its stage and drives toward close | "It's not just case study." Research "anatomy of a full interview" (RESEARCH-INDEX §2 Facet 4) |
| Driving to a close | "Force a synthesis at 8+ turns" is **prose only** — nothing counts turns or detects missing synthesis (`interviewer.ts:69`) | Stage machine **enforces** the synthesis + recommendation stages; interviewer reliably lands the close | MC "Solved by Candidate" — interviewer interrupts overlong structure, drives the close |
| Data-reveal gate | **Non-deterministic** — the LLM itself decides if `trigger_keywords` matched; can leak or withhold (`interviewer.ts:35,65`) | **Deterministic server-side gate** — keyword/intent match in code decides release; LLM only phrases it | Audit gap #4; fabrication risk |
| Probe / push-math / redirect | Prose instructions, enforced only by a weak runtime critic (3 checks) | Same prose **plus** the full detector suite wired in (see Layer 3); behaviors verified, regenerated if violated | Real mocks show specific probe/redirect/math-push patterns to encode |
| Context bloat | `alreadyDisclosed` = every prior Ash turn concatenated (probes+tells, unbounded) dumped each turn (`route.ts:175`) | Disclosed-**facts** ledger only (structured), not raw turns | Audit Layer-1 gap |

## Layer 2 — Case-state & math / estimation

| Aspect | BEFORE | AFTER | Why (source) |
|---|---|---|---|
| **Estimation / guesstimate** | **None.** Generic chat path; number-registry **explicitly discards %s and multipliers** (`number-registry.ts:64`) — the exact building blocks of a guesstimate | **Dedicated estimation engine:** assumption ledger, top-down vs bottom-up tracking, segmentation tree, **sanity-check / ±25% pass**, unit-economics build-up. Tracks %s + multipliers | Research 11-item **estimation inventory** (RESEARCH-INDEX §2 Facet 2); Ash flagged guesstimates twice |
| Arithmetic check | `arithmetic-verifier` only handles **× and ÷** — silently skips **+ and −** (`:37,70`); additive cost-bucket errors uncaught | Full `+ − × ÷` + chained expressions; estimation arithmetic validated | Audit Layer-2 gap |
| Number tracking | 3 **divergent** regex extractors (`number-registry`, `detectors.ts:379`, `arithmetic-verifier`); brittle metric-key collisions; 12-metric cap silently drops old commits | **One shared extractor**; semantic metric matching; no silent drops | Audit cross-cutting |
| Issue tree | Separate async LLM call; turn engine **never consumes it** — Ash can't push on a non-MECE branch (`issue-tree.ts`) | Turn engine **reads the tree** → probes weak/missing branches live; tree rubric feeds scoring | Research: structure/MECE is the top-weighted dimension |

## Layer 3 — Evaluation & scoring

| Aspect | BEFORE | AFTER | Why (source) |
|---|---|---|---|
| **Final score** | **Single LLM call self-reports `total`; code trusts it verbatim** — no recompute, no per-dimension cap, "below-3 auto-reject" described to the model but **never enforced** (`evaluate-session.ts:101`) | **Programmatic, validated score:** recompute `sum(dimensions)`, enforce per-dim caps, enforce **pass≈3 + ≥1 spike + hard-fail** logic in code | Research scoring rubric (RESEARCH-INDEX §2 Facet 5); audit gap #3 |
| Rubric | Two **drifting** rubrics writing to one column: legacy 3-dim (Structure/Insight/Speed) vs per-track 6–7 dim; **Speed silently vanishes** for track sessions (`evaluator.ts` vs `tracks.ts`) | **One rubric backbone = the real 8 dimensions** (structure · hypothesis · quant · judgment · comms · leadership · poise · creativity), anchored 1–4 (consulting) / 1–5, with track overlays | Research: the actual MBB/PM scoring dimensions |
| Deterministic signals | **DEAD at runtime.** `detectors.ts` (13 detectors) + `tier2-judge.ts` (gives-answer, fabrication, jailbreak) run **only in the offline eval harness** — never touch a real grade | **Wired into scoring:** math-flipflop, fabrication, no-structure, passivity, etc. become **hard penalties/flags** on the candidate's grade | Audit "single most important finding" |
| Estimation-aware | No structured signal on decomposition/arithmetic | Layer-2 estimation signals (assumption soundness, sanity-check, arithmetic) feed the Estimation dimension | Research: estimation judged on assumptions+structure, not the number |
| Track coverage | Scorer is track-aware but interviewer isn't → graded against a rubric the live experience never matched | Interviewer **and** scorer both track-aware → coherent | Audit gap #5 |

## Cross-cutting fixes

| Aspect | BEFORE | AFTER |
|---|---|---|
| Model routing | "Fast 8b judges" (critic, tier2) **actually call 70b** — `llm-router` has no size routing (`critic.ts:68 TODO`) | Real small/large routing → faster + cheaper judges (matters for zero-budget) |
| `route.ts` | 547 lines doing auth + rate-limit + idempotency + 5 context injectors + 4 regen gates + watermark + persistence inline | Decomposed into focused units (turn-context assembler, gate pipeline, persistence) |
| Watermark | Not applied to streamed copy in monitor mode (`route.ts:497`) | Applied to streamed bytes too |

---

## How good does this make it? (the "tier" jump)

- **Today:** an interview *simulator* — convincing role-play, but the grade is a vibe and the smartest checks are switched off. A strong candidate and a lucky rambler can get similar scores.
- **After:** an interview *engine* — it knows what stage it's in, conducts like a real EM across the whole arc, tracks your numbers and assumptions deterministically, and grades you on the same 8 dimensions a real McKinsey/Bain/PM interviewer uses, with the deterministic signals (math errors, no structure, passivity, fabrication) actually counting against the score. **This is the moat** — verified practice that matches reality, not AI cleverness ([[project_casepad_moat_strategy]]).

## Proposed build order (each = its own spec→plan→build)
1. **Scoring layer first** — wire the dead detectors + judge into a validated rubric. *Rationale: it's the measurement yardstick; once scoring is real, we can prove every later change actually improves outcomes.*
2. **Estimation engine** — the biggest capability gap + Ash's explicit priority.
3. **Interviewer stage machine + track personas** — the felt experience and the full arc.
4. **Cross-cutting** — model routing, shared number extraction, `route.ts` refactor (folded into the above as touched).

## Open questions for Ash
1. Build order above OK, or estimation first?
2. Full-arc scope for v1 — do we build rapport/fit/behavioral/candidate-Q stages now, or ship case+guesstimate first and add the bookend stages next?
3. Scoring scale — anchored **1–4** (McKinsey/CaseCoach) or **1–5** (CaseBasix)? (Affects every rubric.)
