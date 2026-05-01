@AGENTS.md

# CasePad — Claude Code Context

## Summary
Cohort case-prep app for B-school students. Path A: real cases only — no synthetic / generated cases.

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
