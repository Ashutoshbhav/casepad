@AGENTS.md

# CasePad — Claude Code Context

## Summary
Cohort case-prep app for B-school students. Path A: real cases only — no synthetic / generated cases.

## ⚠️ Non-negotiable protocols — READ BEFORE touching engine / chat / eval / session code
These auto-load every session so they are never "forgotten" again. Each points to its in-repo source of truth.
1. **FORTRESS PROTOCOL (never-fail / defense-in-depth).** The NSM (start-case → complete-turns → debrief-with-score → persist) MUST never fail; degrade gracefully. Spec: **`docs/NEVER-FAIL-AUDIT.md`**. Core: 4-layer LLM router, `with-retry` on Supabase, `static-fallbacks.ts`, error boundaries, idempotency. Any change to chat/eval/session MUST preserve the fortress and be re-checked against that audit. (Memory: `casepad-fortress-protocol`.)
2. **Real cases only** — never generate synthetic cases. (Memory: `casepad-no-synthetic-cases`.)
3. **Solving-engine rebuild is grounded in real-interview research** — `docs/research/case-sources/RESEARCH-INDEX.md` + spec `docs/superpowers/specs/2026-06-02-solving-engine-redesign.md`. New engine logic wires INTO the fortress, never around it. (Memory: `casepad-solving-engine-rebuild`.)
4. **Moat = verified practice + corpus, not AI cleverness.** (Memory: `casepad-moat-strategy`.)
5. **Live resume truth** = git log + `docs/SESSION-STATE.md` (keep it current). Security/launch-readiness layer is separate from the Fortress — both apply.

## Stack
- **Framework**: Next.js 16 (App Router) — see AGENTS.md note above
- **DB**: Supabase
- **AI**: Groq (apply `groq-first` skill)
- Started: 2026-04-30

## Conventions
- **Real cases only** — never generate fake cases for content padding
- Source attribution required for every case (Harvard, Ivey, school cases, etc.)
- Apply `case-method` skill for case structure / framework discipline

## Active state
- Early build — foundations being laid
- Use `vercel:nextjs`, `vercel:next-cache-components`, `vercel:auth` skills as needed
- For React components, `vercel:react-best-practices` runs on TSX edits

## Don't touch
- Supabase RLS policies without explicit confirmation
- The "real cases only" core constraint

## Hard rules
- `no-assumptions` skill applies to all stats / market data shown in cases
- Apply `frontend-design:frontend-design` for UI work
- Read installed Next.js 16 docs before using APIs (training data is stale)
