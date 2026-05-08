# CasePad — Session State Snapshot

**Saved:** 2026-05-08 evening (post-Stream-4 ship)
**Trigger word:** `PAD` — say it in any new session to surface this state
**Project root:** `C:\Users\Ashutosh Bhavale\Documents\casepad`
**Production URL:** https://casepad.vercel.app
**Latest commit on main:** `86e4bcc` (feat(stream-4): per-case knowledge dossiers)

---

## 🎯 Today's mandate (2026-05-08)

Ash flagged that CasePad's interviewer had real bugs (math flip-flop, tell repetition, stale-context regen, walkthrough-vs-user perception) and demanded a deep-research fix, not local patches. Plus: never-fail in NSM. Plus: each case studied so deeply the AI can answer any question.

## ✅ What shipped today (in order, all on `main`)

| Commit | Stream | Description |
|---|---|---|
| `ef0ad4e` | Day-1 | System prompt rewrite (deeper persona, banned-phrase prefixes, end-with-probe, falsifiability, 3 inline few-shots) |
| `3388a10` | Day-2-3 | Banned-phrase guardrail (regex + 80-word cap + GUARDRAIL_MODE=gate/monitor/off) |
| `fea2a1b` | Week-1 | Self-critique loop (LLM-as-judge every Nth turn, 3 semantic criteria) |
| `27f7a17` | NEVER-FAIL | 8 P0 audit issues — vercel maxDuration, transcript retry, static-fallback turn, idempotency, evaluator retry+idempotency |
| `8ea13fd` | Week-2-3 | Keyword RAG over 1,111 playbook findings |
| `9795867` | P1 | Auth ownership check + /cases static fallback |
| `70b21eb` | Week-3-4 | Few-shot bank 3 → 7 examples |
| `aba70c3` | Week-4 | Trust UX citations on Ash turns |
| `65f66c0` | Bug fix | DA-flagged wire corruption + race-window doc |
| `253a1af` | **Stream 1+2+3** | **Eval harness + Number Registry + recent-turn awareness + math discipline + Cerebras model fix + static-fallback rotation** |
| `86e4bcc` | **Stream 4** | **Per-case dossier system + migration 0012** |

## 📊 Eval bug rate (5-case smoke test)

| Run | Total | Critical | High | Top finding |
|---|---|---|---|---|
| Baseline (pre-fix) | 30 | 1 | 29 | 28 phrase repeats + 1 math flip-flop |
| After Stream 1+2+3 (initial) | 33 | 0 | 33 | static-fallback was repeating |
| **After Stream 1+2+3 + rotation fix + Stream 4** | **16** | **0** | **16** | 10 phrase repeats + 6 no-probe |

~50% reduction. Headline math flip-flop bug FIXED. 0 critical findings.

## 📚 Research artifacts (foundational reading for resumption)

- `docs/research/INTEGRATED-PLAN.md` — 5-stream architecture
- `docs/research/FAILURE-MODE-CATALOG.md` — 80 detectors across 7 categories
- `docs/research/LLM-MATH-RELIABILITY.md` — Number Registry pattern + calculator tool
- `docs/research/LLM-PERSONA-CONSISTENCY.md` — recent-turn + phrase cooldown + stale-context regen fix
- `docs/research/PER-CASE-KNOWLEDGE-DEPTH.md` — dossier schema + enrichment cost
- `docs/research/COMPETITOR-PLATFORMS.md` — Hacking the Case / LOMS / RocketBlocks deep dive
- `docs/playbook/01-05.md` — 1,119 MBB-interviewer findings
- `docs/AI-INTERVIEWER-TRAINING-PLAN.md` — Day-1 training plan
- `docs/SCORING-PHILOSOPHY.md` — anti-generic-response design
- `docs/NEVER-FAIL-AUDIT.md` — 8 P0 + 6 P1 + 4 P2 reliability gaps
- `docs/eval-runs/RUN-*.md` — eval reports per run

## 🔧 New code surfaces (today's stream work)

- `src/lib/eval/detectors.ts` — 13 deterministic Tier-1 detectors
- `src/lib/case-state/number-registry.ts` — extract committed numbers, render system-prompt block, detect contradictions
- `src/lib/groq/recent-turn-context.ts` — render recent Ash turns, find repeated phrases, regen-hint helper
- `src/lib/groq/dossier-context.ts` — render per-case dossier block
- `scripts/qa/eval-interviewer.ts` — synthetic-candidate eval
- `scripts/qa/enrich-case-dossiers.ts` — per-case dossier enrichment
- `scripts/qa/show-my-recent-session.ts` — admin transcript viewer
- `scripts/qa/inspect-walkthrough.mjs` — walkthrough debug
- `supabase/migrations/0012_dossier.sql` — adds JSONB dossier column

## ⚠️ Outstanding for Ash (action required)

1. **Apply migration 0012_dossier.sql in Supabase Studio.** Until applied, dossier injection is a no-op (chat falls back gracefully).
   - URL: https://supabase.com/dashboard/project/cjanrluuqzyrpjtmuilc/sql/new
   - Paste contents of `supabase/migrations/0012_dossier.sql`, run.
2. **After migration:** run dossier enrichment on starter cases:
   - `npx tsx --env-file=.env.local scripts/qa/enrich-case-dossiers.ts --starter`
   - ~12 min wall-time, free on Groq.
3. **Smoke-test live:** start a session at `casepad.vercel.app/solve/[caseId]` for the Book on China case (the one with the bug Ash flagged earlier today). Verify:
   - No math flip-flop on numbers
   - No verbatim phrase repetition across turns
   - Citations row shows under each Ash turn

## 🟡 Outstanding for me (deferred)

| # | Task | Estimate |
|---|---|---|
| 1 | Stream 5 Phase 1: math drill MVP (RocketBlocks pattern) | 1-2 hours |
| 2 | Improve no-probe rate (regen path doesn't always end with probe) | 30 min |
| 3 | Calculator tool use via Groq native tool API (math reliability stretch) | 1-2 hours |
| 4 | Hand-curate top 50 dossiers (after auto-enrichment seeds the schema) | offline / Ash-driven |
| 5 | B2B2C IIM consult-club outreach (operational, not codeable) | Ash-driven |
| 6 | Tier-2 LLM-judge detectors in eval (pedagogy + adversarial coverage) | 2-3 hours |
| 7 | Move some Tier-1 phrase-repeat noise to softer detection (avoid false positives on legitimate fallback rotations) | 1 hour |

## 🚦 How to resume

1. Say `PAD` in a new Claude Code session — this file gets surfaced
2. Read `docs/research/INTEGRATED-PLAN.md` for the architecture
3. Run `git log --since="2026-05-08 00:00" --oneline` for the day's commits
4. Run the eval to baseline current state: `npx tsx --env-file=.env.local scripts/qa/eval-interviewer.ts`
5. Pick from "Outstanding for me" above

## 💡 Key insights to NOT lose

1. **Content > Tech.** Per the competitor research, winning case-prep platforms are content-first. CasePad's moat is the 1,165-case corpus + Indian context + cohort signal + free tier — NOT the AI cleverness. Invest in dossier quality before more AI layers.

2. **Ash's mental anchor on LOMS pricing was wrong.** It's $297, not $500. Market ceiling for lifetime case content is ~$300.

3. **Larger LLMs drift MORE on persona, not less.** Scaling to a 405b model wouldn't fix the bugs. The fix has to be structural (Number Registry, recent-turn awareness, phrase cooldown), not "bigger hammer."

4. **Memory drift kicks in at 2,000-2,500 tokens, not 128K.** That's why the registry is re-injected at TOP and BOTTOM of the system prompt — to keep committed numbers in high-attention zones.

5. **Khanmigo had the EXACT same flip-flop pathology.** Their fix: deterministic backends (calculator tool use). Groq supports tool use natively on Llama 3.3-70b — pending Stream 5 stretch.

6. **Eval blocks merges = testing is the system's job.** Set this as a pre-merge CI gate (TODO: hook integration).

7. **Cerebras model name `llama-3.3-70b` was 404'ing in production.** The eval caught a bug the never-fail audit missed (it only fires on fortress fall-through, which production rarely hits 1-at-a-time but the eval hammered it).
