# CasePad — Integrated Implementation Plan (2026-05-08)

> Synthesizes 4 research reports into one coherent architecture.
> Source reports:
> - `LLM-MATH-RELIABILITY.md` — fixes flip-flop
> - `LLM-PERSONA-CONSISTENCY.md` — fixes tell repetition + stale-context regen
> - `PER-CASE-KNOWLEDGE-DEPTH.md` — makes the AI deep on every case
> - `COMPETITOR-PLATFORMS.md` — what to copy from Hacking the Case / LOMS / RocketBlocks

---

## 1. The insight that reorders the priorities

The competitor research changes the whole architecture. **Winning case-prep platforms are content-first, not tech-first.** RocketBlocks' praised features are content (ex-MBB-authored structure references). LOMS is a $297 product whose moat is 50+ hours of human-recorded transcripts. Top-3 MBB firms reportedly use CaseCoach to prep their own candidates — content endorsement, not feature endorsement.

**Therefore: CasePad's strategic moat is the 1,165-case corpus + Indian context + cohort signal + free tier.** AI sophistication matters, but it loses to a competitor with better content if our content is weak. The roadmap below leads with content (dossiers + drills + paired walkthroughs) and uses AI engineering to *amplify* the content, not substitute for it.

CasePad's defensible position is the 5-axis intersection: **verified 1,165-case corpus + AI adaptive interviewer + Indian context + cohort signal + free tier.** No competitor has all five.

---

## 2. Five workstreams (ordered by leverage, not linearly)

### Stream 1 — Automated Eval Harness (P0 — must come FIRST)

**Why first:** Without this, every other stream is shipped blind. Ash should not be the QA loop. We caught the math flip-flop AFTER it shipped because we had no synthetic-candidate test.

**What to build:**
- `scripts/qa/eval-interviewer.ts` — synthetic candidate plays N cases via the production chat route end-to-end
- 7 deterministic bug detectors:
  1. Math flip-flop (number registry adherence — see Stream 3)
  2. Tell repetition (n-gram match across last 5 Ash turns)
  3. Banned-phrase prefix check
  4. Probe-end check (every Ash turn ends with `?` or imperative)
  5. Stale-context regen (n-gram overlap of Ash[N] vs Ash[N-2] when user[N-1] was substantive)
  6. Persona drift (banned phrase in body, not just start)
  7. Word-count >80 cap
- 20-case sample (4 each of profitability / market entry / ops / M&A / estimation)
- Output: `docs/eval-runs/RUN-{date}.md` with pass/fail per case + per-bug-class

**LOC estimate:** ~250 LOC (script) + ~80 LOC (bug detectors lib)

**Cost:** ~20 sessions × ~15 turns × ~150 input tokens = ~45K tokens per run. Free on Groq.

**Time:** 3-4 hours.

**Key design choice:** synthetic candidate uses Llama 3.3-70b prompted as "B-school case-prep candidate practicing — give realistic answers including the kinds of mistakes a real candidate would make (soft estimates, math errors, weak hypotheses)." Captures real failure modes.

---

### Stream 2 — Number Registry + Math Discipline (P0 — fixes the bug Ash saw)

**Why second:** the eval harness needs this in place to validate fixes. Number Registry is the core anti-flip-flop pattern; the eval will measure adherence to it.

**What to build:** (per `LLM-MATH-RELIABILITY.md`)
- `src/lib/case-state/registry.ts` (~80 LOC) — typed JSON state of committed numbers
- New JSONB column on `sessions` row: `committed_numbers`
- Inject `registry.toSystemPromptBlock()` at TOP and BOTTOM of every system message (defeats lost-in-the-middle attention drift)
- Auto-extract numbers from Ash's responses via regex; the model commits them by stating
- 8b critic post-pass: "does this draft contradict the registry?"

**Stretch — Calculator tool use (Pattern C):**
- Single `compute(expression, label)` Groq tool call
- ~1s latency overhead per math step
- Doubles as registry auto-populator

**LOC estimate:** ~120 LOC (registry + injection) + ~80 LOC (calculator tool integration)

**Why this works:** [arxiv 2510.03611](https://arxiv.org/abs/2510.03611) shows relational-reasoning memory degrades at 2-2.5K tokens — long before Llama's 128K nominal window. Re-injecting at system-prompt boundaries (top + bottom) keeps committed numbers in high-attention zones. Khanmigo had the *same* flip-flop pathology and fixed it with deterministic backends.

---

### Stream 3 — Persona Consistency Patches (P0 — fixes the OTHER bugs Ash saw)

**Why third:** quick wins, all structural (not parameter-tuning). Each is bounded.

**What to build:** (per `LLM-PERSONA-CONSISTENCY.md`)
- **Recent-turn awareness:** Inject "your last 3 responses were: ..." into system prompt at every turn with explicit "do not repeat any phrase from these" clause. Production case study (Tony Seah) took repetition rate 15% → 0% with this single change. ~30 LOC.
- **Phrase cooldown deterministic guard:** post-process check on draft — if 4-gram from any of last 5 Ash turns appears, regen. ~40 LOC in `guardrails.ts`.
- **Stale-context regen fix:** rewrite the regen prompt — drop the bad draft entirely; put the user's verbatim latest turn at END of system prompt; frame critic feedback as forward-looking constraint. Per [Lost in the Middle, Liu et al. 2023](https://arxiv.org/abs/2307.03172). ~30 LOC change in `route.ts`.
- **Persona reinforcement at END of system prompt:** ~15 LOC. Validated by [Li et al. 2024](https://arxiv.org/abs/2402.10962).

**Total:** ~115 LOC across 3 files. ~2 hours including tests.

---

### Stream 4 — Dossier Enrichment (P0 — Ash's "deep on every case" mandate)

**Why fourth:** unlocks the question buckets currently failing ("what's typical margin?", "who else publishes on China?", "real-world numbers"). Closes the perception that the AI is shallow.

**What to build:** (per `PER-CASE-KNOWLEDGE-DEPTH.md`)
- Migration: `ALTER TABLE cases ADD COLUMN dossier JSONB` (1 LOC)
- New: `scripts/enrich-case-dossiers.ts` (~150 LOC)
- For each case, Groq-70b generates structured JSON: `{industry_primer, real_world_numbers, expected_math, common_mistakes, anticipated_questions, framework_hints, sources, schema_version}`
- Tavily-grounded for real numbers (within 1K/month free tier)
- Hand-curate the top 50 cases (per Duolingo Roleplay pattern — the dossier matters most where engagement is highest); auto-enrich the rest
- Inject `dossier` summary at session start (system prompt addendum) and on-demand when candidate asks domain questions

**Cost:** ~$0 on Groq free tier (~97 min wall-time for all 1,165), ~$4 paid.

**LOC:** 150 (script) + 30 (chat-route injection) + 50 (UX surface in admin) = 230 LOC.

**Effort:** 1 day total — script + manual review of first 10 dossiers + full run.

---

### Stream 5 — RocketBlocks-Style Drills (BIGGEST UX leverage, longer build)

**Why fifth:** structural product change, not a fix. Highest-leverage feature in the entire competitor set per the research. But it's a multi-day build, not a one-commit fix.

**What to build:** (per `COMPETITOR-PLATFORMS.md` Pattern #1)
- 5 atomic drill modes: math / structure / chart / brainstorm / synthesis
- 30-second to 3-minute drills, auto-graded, per-skill ELO
- Drill bank: extract from existing 1,165 cases or generate per case
- New routes: `/drills/[type]`, `/drills/result/[id]`
- New tables: `drill_attempts (user_id, drill_id, score, time_taken, ...)`, `drill_bank`
- Per-skill leaderboard (cohort-shareable)

**LOC:** ~1,000+. This is a 1-week build, not a same-day fix.

**Phase it:**
- **Phase 1 (Day 5-6):** Math drill only — leverages the case math we already have
- **Phase 2 (Week 2):** Structure + chart drills
- **Phase 3 (Week 3):** Brainstorm + synthesis + per-skill ELO

---

### Bonus Stream — Paired Walkthroughs (LOMS pattern)

**Why bonus:** Lower effort, real differentiation. AI generates "strong solver" and "weak solver" narrated transcripts for each case. Replicates Cheng's most-cited LOMS feature at near-zero marginal cost.

**LOC:** ~80 (script) + ~50 (debrief render). 4 hours.

---

## 3. Sequencing (with explicit dependencies)

```
Day 1 (highest priority — must finish first)
  ├── Stream 1: Automated Eval Harness   [blocks everything: we need to measure]
  └── Set up `scripts/qa/eval-interviewer.ts` with synthetic candidate

Day 2 (correctness baseline — fixes Ash's bugs)
  ├── Stream 2: Number Registry + math discipline
  ├── Stream 3: Persona consistency patches (recent-turn, cooldown, stale-context)
  └── Re-run eval harness — must show ZERO regressions on math + tell-repeat

Day 3-5 (content depth — Ash's "deep on every case")
  ├── Stream 4: Dossier schema + enrichment script
  ├── Hand-curate top 50 cases
  ├── Run enrichment on remaining 1,115
  └── Wire dossier injection into chat route

Week 2 (UX moat — RocketBlocks pattern)
  └── Stream 5 Phase 1: Math drill mode (leverage existing case math)

Week 3 (UX moat continued)
  └── Stream 5 Phase 2: Structure + chart drills

Week 4 (UX moat continued)
  └── Stream 5 Phase 3: Brainstorm + synthesis + leaderboard

Bonus / parallel-when-time:
  └── Paired walkthroughs (LOMS pattern)
  └── B2B2C IIM consult-club approach (operational, not codeable)
```

---

## 4. Cost summary

| Stream | One-time cost | Per-session delta |
|---|---|---|
| 1 — Eval harness | Free (Groq) | Doesn't run per session |
| 2 — Number Registry + tool | Free | +1s on math turns (calculator tool) |
| 3 — Persona patches | Free | Negligible (deterministic) |
| 4 — Dossier enrichment | $0 (free) or $4 (paid) | +500 tokens system prompt |
| 5 — Drills | Free | New surface, separate sessions |
| Bonus — Paired walkthroughs | $0 (free) or $2 (paid) | One-time per case |

**Total runtime cost increase per chat session: ~+1500 tokens (Stream 2 + 4) ≈ within Groq free 6K TPM cap.**

---

## 5. Specific decisions that need Ash's approval before code lands

1. **Stream 5 (drills) build sequence:** ship full drill module in week 2-4 OR ship math drill only as proof-point in week 2 then evaluate?
2. **Hand-curate top 50 dossiers OR auto-enrich all 1,165 then refine top 50?** — Duolingo says hand-curate. I lean: auto-enrich all, then human-edit top 50.
3. **Calculator tool use (Stream 2 stretch) — ship in Day 2 batch OR defer?** Worth it for math-heavy cases (estimation, profitability).
4. **B2B2C path** — start IIM consult-club outreach now, or after the product is rock-solid? Earlier = real signal; later = better demo.
5. **Eval harness blocks merges?** — yes/no. If yes, the 7 detectors must hit 100% pass on a known-good case before any commit lands.

---

## 6. The one principle that runs through all 5 streams

**Content > Tech.** Every layer should make the existing 1,165-case corpus shine harder, not substitute LLM cleverness for case-quality. When in doubt, invest in the case data, the dossier richness, the drill content — not in another inference layer.

---

*Plan compiled 2026-05-08. Approval needed before any code lands.*
