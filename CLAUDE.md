@AGENTS.md

# CasePad — Claude Code Context

## Summary
Cohort case-prep app for B-school students. Content rule (changed 2026-09-07, Ash): **verified-data-grounded only** — the real-case corpus is the seed and stays; generated cases are allowed only when every fact/number is grounded in a verified source (or clearly flagged as illustrative) and the case passes a fact-check gate. See `docs/superpowers/specs/2026-09-07-learner-model-stage1.md` and rule #2 below.

## ⚠️ Non-negotiable protocols — READ BEFORE touching engine / chat / eval / session code
These auto-load every session so they are never "forgotten" again. Each points to its in-repo source of truth.
1. **FORTRESS PROTOCOL (never-fail / defense-in-depth).** The NSM (start-case → complete-turns → debrief-with-score → persist) MUST never fail; degrade gracefully. Spec: **`docs/NEVER-FAIL-AUDIT.md`**. Core: 4-layer LLM router, `with-retry` on Supabase, `static-fallbacks.ts`, error boundaries, idempotency. Any change to chat/eval/session MUST preserve the fortress and be re-checked against that audit. (Memory: `casepad-fortress-protocol`.)
2. **Verified-data-grounded only** (changed 2026-09-07 from "real cases only" — Ash signed off). Generated cases ARE allowed now, under these conditions, all enforced: (a) every company/market/number in a generated case is either grounded in a verified source (dossier, cited research, the seed case) OR explicitly flagged as illustrative/fictionalised — never presented as a real company's real figure; (b) a generated case passes a fact-check gate before it can be served; (c) `provenance` JSON records how it was made (seed case id, grounding sources, generator params); (d) generated cases are tagged `generated` and never counted into or silently mixed with the real-corpus count. The ~1,165 real cases stay as the seed and keep being added to. `no-assumptions` still applies to every stat shown. (Memory: `casepad-no-synthetic-cases` — updated.)
3. **Solving-engine rebuild is grounded in real-interview research** — `docs/research/case-sources/RESEARCH-INDEX.md` + spec `docs/superpowers/specs/2026-06-02-solving-engine-redesign.md`. New engine logic wires INTO the fortress, never around it. (Memory: `casepad-solving-engine-rebuild`.)
4. **Moat = verified practice + corpus, not AI cleverness.** (Memory: `casepad-moat-strategy`.)
5. **Live resume truth** = git log + `docs/SESSION-STATE.md` (keep it current). Security/launch-readiness layer is separate from the Fortress — both apply.

## Stack
- **Framework**: Next.js 16 (App Router) — see AGENTS.md note above
- **DB**: Supabase
- **AI**: Groq (apply `groq-first` skill)
- Started: 2026-04-30

## Conventions
- **Verified-data-grounded only** (see protocol #2) — no ungrounded/hallucinated cases or figures; generated cases must be grounded + fact-check-gated + tagged
- Provenance required for every case: real = the casebook source (Harvard, Ivey, IIM, etc.); generated = seed id + grounding sources + generator params
- Apply `case-method` skill for case structure / framework discipline

## Active state
- Early build — foundations being laid
- Use `vercel:nextjs`, `vercel:next-cache-components`, `vercel:auth` skills as needed
- For React components, `vercel:react-best-practices` runs on TSX edits

## Don't touch
- Supabase RLS policies without explicit confirmation
- The "verified-data-grounded only" constraint (protocol #2) — do not loosen it further (e.g. to allow ungrounded generated figures) without explicit sign-off

## Hard rules
- `no-assumptions` skill applies to all stats / market data shown in cases
- Apply `frontend-design:frontend-design` for UI work
- Read installed Next.js 16 docs before using APIs (training data is stale)
