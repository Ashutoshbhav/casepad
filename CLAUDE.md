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

## Design supervision (locked 2026-05-06)
**Every design decision in CasePad MUST go through the
`design-supervisor` agent first.** No exceptions. The agent lives at
`~/.claude/agents/design/design-supervisor.md` and reads/writes its
accumulated learnings to
`~/.claude/projects/C--Users-Ashutosh-Bhavale/memory/design_supervisor_log.md`.

Trigger words that auto-route through design-supervisor before any
work begins:
- palette / color / hex / accent
- typography / font / type / weight / tracking
- shadow / radius / spacing / margin / gap
- redesign / restyle / reskin / refresh / polish
- "make it look like" / "make it match" / "make it pop"
- new visual component (card / button / hero / banner / chart / etc.)

Workflow when any of those triggers fires:
1. Main Claude invokes design-supervisor with a self-contained prompt
2. Agent reads its log + the project's globals.css + the Refero cache
3. Agent returns the surgical edit table + delegation hint
4. Main Claude executes; agent appends a new entry to the log

Skip the agent ONLY for: trivial single-token edits (`#aaa → #bbb`)
the user explicitly requested, or when Ash explicitly says "skip the
design agent, just code it." Never skip on your own initiative.
