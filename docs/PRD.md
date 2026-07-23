# CasePad — Product Requirements Document (PRD)

> **Status:** Living document · **Version:** 1.0 · **Compiled:** 2026-07-13
> **Author:** Reverse-engineered from the codebase, migrations, and in-repo research/spec docs (this reflects what CasePad *is* today plus its documented direction — it is a description of the built product, not a from-scratch proposal).
> **Product:** CasePad — cohort case-interview practice for B-school students.
> **Production:** https://casepad.vercel.app · **Repo branch of record:** `main` · **Region:** Supabase + Vercel Mumbai (`bom1`).
> **Owner / Admin:** Ash (Ashutosh Bhavale) — `ashutosh.25011@ssb.scaler.com`.

Source material for this PRD (all in-repo): `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE-AND-JOURNEY.md`, `docs/SESSION-STATE.md`, `docs/SCORING-PHILOSOPHY.md`, `docs/NEVER-FAIL-AUDIT.md`, `docs/AI-INTERVIEWER-TRAINING-PLAN.md`, `docs/INGESTION.md`, `docs/DEPLOY-CHECKLIST.md`, `docs/B2B2C-OUTREACH-TEMPLATE.md`, `docs/research/*` (COMPETITOR-PLATFORMS, INTEGRATED-PLAN, SUMMARY, FAILURE-MODE-CATALOG, LLM-*, PER-CASE-KNOWLEDGE-DEPTH), `docs/superpowers/{specs,plans}/*`, `docs/playbook/*`, plus a full read of `src/`, `supabase/migrations/`, and `scripts/`.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Problem & opportunity](#2-problem--opportunity)
3. [Vision, mission & strategy](#3-vision-mission--strategy)
4. [The moat (why this is defensible)](#4-the-moat-why-this-is-defensible)
5. [Target users & personas](#5-target-users--personas)
6. [Competitive landscape & positioning](#6-competitive-landscape--positioning)
7. [Product principles & non-negotiables](#7-product-principles--non-negotiables)
8. [The core product loop](#8-the-core-product-loop)
9. [Feature requirements](#9-feature-requirements)
10. [The AI interviewer engine](#10-the-ai-interviewer-engine)
11. [Scoring & evaluation](#11-scoring--evaluation)
12. [Content & corpus](#12-content--corpus)
13. [System architecture](#13-system-architecture)
14. [Data model & schema](#14-data-model--schema)
15. [Reliability — the Fortress / never-fail protocol](#15-reliability--the-fortress--never-fail-protocol)
16. [Security, privacy & compliance](#16-security-privacy--compliance)
17. [Cost & abuse controls](#17-cost--abuse-controls)
18. [Design system & brand](#18-design-system--brand)
19. [Tech stack & infrastructure](#19-tech-stack--infrastructure)
20. [Analytics, telemetry & calibration](#20-analytics-telemetry--calibration)
21. [Non-functional requirements](#21-non-functional-requirements)
22. [Roadmap](#22-roadmap)
23. [Risks, open questions & known debt](#23-risks-open-questions--known-debt)
24. [Appendices](#24-appendices)

---

## 1. Executive summary

**CasePad is a free, cohort-gated web app that turns real B-school casebooks into an adaptive, AI-driven mock-interview experience.** A student picks a real case, converses turn-by-turn with an AI "engagement manager" (persona: *Ash, EM at Bain*) who behaves like a real interviewer — gating data behind the right questions, pushing back on weak structure, demanding sanity-checked math, and driving to a synthesis — then receives a research-grounded, code-validated score on a multi-dimension rubric plus an "ideal walkthrough" of how a top candidate would have solved it.

The product's defensibility is **content + context + cohort + free tier**, not "we have an AI." It ships with a corpus of **~1,165 real cases** extracted from ~131 verified casebook PDFs (Indian IIM/ISB/XLRI books at the core, plus US M7 and consulting-firm-published cases), enriched with per-case "dossiers" of real-world Indian numbers, and distributed at zero cost through B-school consulting-club channels.

CasePad is **live in production** and has shipped through two major engine "waves":
- **Wave 1** (2026-06-02): launch hardening — Google-only auth, cost caps, RLS verification, failure telemetry.
- **Wave 2** (2026-06-03): the solving-engine rebuild — code-validated scoring, dossier-grounded ideal answers, a deterministic interviewer stage machine with track-aware personas, and a first-class guesstimate/estimation engine.

Six job tracks are supported: **consulting, IB/PE/VC, PM, marketing, strategy/bizops, and behavioral**, each with its own persona, rubric, frameworks, math, and industry primers.

---

## 2. Problem & opportunity

### 2.1 The user problem
B-school students preparing for consulting/finance/PM recruiting need **volume + quality + feedback** on case interviews:
- **Volume:** you need 20–40 practiced cases to be interview-ready.
- **A partner:** cases are conversational; you can't practice them alone from a PDF. Peer mocks are the default, but partner liquidity is unreliable (schedules, no-shows, uneven skill).
- **Feedback that compounds:** a single "7/10" tells you nothing about *what to fix*. Students need dimensional, actionable diagnosis.
- **Context:** global platforms are US-MBA-centric ($, US industries). Indian students do crore-rupee math over Indian industries and need India-grounded cases and numbers.

### 2.2 Why now
- **Free frontier-class inference** (Groq/Cerebras/NVIDIA free tiers of Llama-3.3-70b) makes an always-available, adaptive AI interviewer economically feasible at zero marginal cost — impossible 24 months ago.
- **Casebooks are abundant but inert.** IIM-A/B/C consult-club casebooks are the trusted, freely-circulated prep artifact in India; nobody has turned them into interactive, drillable, AI-graded mocks.
- **Incumbent AI tools are shallow.** Existing AI case tools are mostly GPT-wrappers with thin prompts, no verified corpus, and static scripts (see §6).

### 2.3 Market sizing signal (from competitor research)
The case-prep market spans $15/case → $297 lifetime (LOMS) → $500+ full coaching. The largest verified corpus among competitors is PrepLounge's ~700 cases; the deepest content (LOMS) has 8. CasePad's ~1,165 verified cases is **larger than any competitor's**, and the free-tier + cohort-distribution model is structurally impossible for VC-backed incumbents to match.

---

## 3. Vision, mission & strategy

**Vision.** Every B-school student in India (and beyond) can practice unlimited, interview-realistic case reps against a corpus of real cases, get feedback as sharp as an ex-MBB coach's, and walk into the room already having "been in the room."
*(Product tagline, from the landing hero: "The room before the room.")*

**Mission.** Turn the world's real casebooks into an adaptive, verified, free practice engine — and use cohort signal + verified outcomes to make the feedback provably good.

**Strategy — "Content > Tech."** This is the single principle running through every design doc (`docs/research/INTEGRATED-PLAN.md §6`): invest in the corpus, the dossier depth, and the drill content first; use AI engineering to *amplify* the content, never to substitute LLM cleverness for case quality. When in doubt, make the existing corpus shine harder.

**Distribution — B2B2C via consulting clubs.** Permanent free tier for individual students; land credibility and distribution by getting consulting clubs (IIM-A/B/C, ISB, NMIMS, MDI, XLRI, SPJIMR) to adopt CasePad as internal prep, with optional club-branded private instances + leaderboards. Monetization (if ever) is club/college licensing or a job-board/placement model — never a student paywall.

---

## 4. The moat (why this is defensible)

CasePad's defensibility is a **5-axis intersection no competitor holds simultaneously** (`docs/research/COMPETITOR-PLATFORMS.md`):

1. **Verified real-case corpus** — ~1,165 classified cases from real casebooks (vs PrepLounge ~700, RocketBlocks ~300, CaseCoach <100, LOMS 8). "Real cases only" is an absolute, enforced constraint.
2. **AI interviewer that adapts mid-case** — a stage-aware engine grounded in real MBB/PM/IB interview transcripts, not a static script.
3. **Indian context** — India-grounded cases, INR/lakh/crore math, India industry primers, and a WebSearch-verified India number-bank.
4. **Cohort signal** — CasePad knows a user's school/cohort and can rank, curate, and surface peer performance; global platforms can't.
5. **Free tier** — permanent, in a $99–$500 market; no ARR pressure because distribution is cohort-based.

**A sixth, forward moat: verified outcomes.** The `interview_outcomes` feature captures *real* interview results (offers **and** rejections) with "what did they actually ask" — a proprietary ground-truth loop that "ChatGPT will never have."

The explicit anti-moat guidance: defensibility **cannot** be "we have an AI interviewer" — generic GPT case practice is free. The CapEx-style moats GPT-wrappers can't cheaply replicate are the **verified corpus** and **persistent per-student state + cohort/outcome signal**.

---

## 5. Target users & personas

### 5.1 End users (the cohort)
- **Primary:** Indian B-school students (IIM-A/B/C, ISB, XLRI, MDI, FMS, NMIMS, SPJIMR, SSB/Scaler) recruiting for consulting, IB/PE/VC, PM, marketing, or strategy/bizops roles.
- **Secondary (via tracks):** anyone prepping behavioral/fit interviews; PM/IB candidates who need track-specific practice.
- **Access model:** invite-only via email allowlist (or a global "open" launch flag). No anonymous access — every route requires an authenticated allowlisted Google account.

### 5.2 Product-internal personas (from the architecture doc)
| Persona | Who | What they do |
|---|---|---|
| **Solver** | Cohort students | Browse cases, solve them conversationally, get scored, drill, log outcomes. |
| **Admin** | Ash only (single `ADMIN_EMAIL`) | Manage the allowlist, view cohort-wide activity and transcripts. |
| **Operator** | Ash only | Run the ingestion pipeline to grow the corpus, enrich dossiers, generate images. |

### 5.3 The AI persona
The interviewer is a first-class product character: **"Ash," an Engagement Manager at Bain** (for consulting). Warm but time-pressured; probes rather than validates; never coaches mid-case. Per track the identity changes (see §10.4): *Rohan* (bulge-bracket VP, IB), *Maya* (consumer-tech Senior PM), *Neha* (brand Marketing Director), *Arjun* (Head of Strategy & BizOps).

---

## 6. Competitive landscape & positioning

Full analysis in `docs/research/COMPETITOR-PLATFORMS.md` (18 competitors). Condensed:

| Tier | Players | Moat | CasePad's edge |
|---|---|---|---|
| **Content-first** | Hacking the Case ($99–$400), LOMS ($297, 8 cases), RocketBlocks (~$89/mo drills) | Ex-MBB-authored content | Larger corpus; free; conversational not static |
| **Community-first** | PrepLounge ($39/mo, 700 cases), CaseCoach ($49/mo), IGotAnOffer ($110–225/hr coaching) | Peer liquidity / coach roster | AI-as-partner sidesteps two-sided liquidity; free |
| **AI-native** | CaseStudyPrep.AI ($15/case), CaseWithAI, MBB.AI, PrepLounge "Preppie", PrepPartner.ai | Distribution | Verified corpus + adaptive interviewer + persistent state + India context |
| **ChatGPT custom GPTs** | Off-the-shelf GPT-4/5 prompts | Free/ubiquitous | Verified corpus + persistent progress + cohort/outcome signal |
| **Indian dark-matter** | IIM-A/B/C casebook PDFs + WhatsApp/Telegram cohort groups | Trust + free | Turns those exact casebooks into interactive AI mocks; *integrates* into the group rather than fighting it |

**Things CasePad deliberately steals:** RocketBlocks-style atomic timed drills; LOMS-style "how a strong candidate solves this" walkthroughs; the 6-building-block / 7-question-type case taxonomy; live "interviewer notes" rubric transparency.

**Things CasePad deliberately avoids:** peer-matching marketplace (liquidity trap), coaching marketplace (supply QC), subscription gating from day 1 (cohort resentment), pay-per-case pricing, generic AI without persistent state, US-MBA-centric content.

---

## 7. Product principles & non-negotiables

These are hard rules encoded in `CLAUDE.md` and enforced in code:

1. **Real cases only.** Never generate synthetic cases for content padding. Source attribution required for every case (`provenance` JSON). Explicit user-authored cases are allowed *only* when honestly tagged as such (never mixed into the real corpus).
2. **The Fortress must never fail.** The North Star Metric flow — **start-case → complete-all-turns → debrief-with-score → persist** — must *never* hard-fail; it degrades gracefully at every layer (see §15).
3. **No fabrication of facts or numbers.** The interviewer says "I don't have data on that — what would you assume and why?" rather than inventing. Stats/market data shown to users must be sourced (the `no-assumptions` discipline; the India number-bank omits data with no credible free source).
4. **Content > Tech.** Invest in corpus/dossier/drill quality before more AI layers.
5. **Zero-budget.** Free tiers only (Groq/Cerebras/NVIDIA + Supabase + Vercel). No paid services required to run.
6. **Only touch existing design if it's a clear improvement** — "different ≠ better" (a reverted landing redesign is the cautionary tale).
7. **Score the process, not the answer.** The casebook is a *reference*, not an answer key; divergence is only an error when unsupported.

---

## 8. The core product loop

```
Sign in (Google + allowlist)
      │
      ▼
Pick track (first run) ──► Dashboard (daily assigned case, streak, weak-spots, leaderboard)
      │                          │
      ▼                          ▼
Browse /cases  ───────────►  Solve arena  ──►  End session
(library, filters,          (chat with Ash +      │
 case-type cards,            live issue tree,      ▼
 BYOC)                       voice, hints)     Debrief
                                                 (score reveal, per-dimension
                                                  rubric, strengths/gaps,
                                                  ideal walkthrough, feedback)
                                                     │
                        ┌────────────────────────────┼───────────────────────────┐
                        ▼                            ▼                             ▼
                  Drills (math /              Study hub (cheat sheet,        Log real interview
                  behavioral / recovery)      crammer, company pack,          outcome (moat data)
                                              cohort notes)
```

The loop is designed for **daily, spaced practice**: a daily assigned case + streaks + cohort leaderboard drive return visits; drills fill 5-minute windows; the debrief always ends by teeing up "tomorrow's case."

---

## 9. Feature requirements

Each feature below lists **What / Why / How it works today / Notable rules**. "Shipped" = live in the app; "Scaffolded" = code exists but not wired to a surface.

### 9.1 Authentication & cohort gating — *Shipped*
- **What:** Google-only OAuth sign-in, gated by an email allowlist.
- **Why:** cohort-only access; account-takeover-proof (Wave-1 audit C1 removed the old instant-email path which allowed signing in as any allowlisted email with no ownership proof).
- **How:** `/auth/signin` → Google OAuth → `/auth/callback` exchanges the code, extracts the verified email, and checks `isEmailAllowed()` against `email_allowlist` via the **service-role** client (double-gate; the allowlist is not RLS-readable). Non-allowlisted users are signed out → `/auth/no-access`. First-run users (no `preferred_track`) route to `/onboarding/track`.
- **Rules:** `ALLOWLIST_MODE=open` env flag flips to public launch without wiping the allowlist. A **device cap** RPC (`prune_user_sessions`) keeps only the 2 most-recent auth sessions per user. Single admin identified purely by `ADMIN_EMAIL` env (no DB role). `direct-signin.ts` is a hard-refusing disabled stub.

### 9.2 Onboarding & track selection — *Shipped*
- **What:** first-run track picker across the 6 tracks; writes `preferred_track` to Supabase Auth `user_metadata`.
- **Why:** the chosen track tailors persona, rubric, frameworks, cheat sheet, daily-case selection, and every study surface.
- **Rules:** track is read everywhere from auth metadata (the `users.preferred_track` column from migration 0005 is vestigial — a documented schema/runtime divergence). Users can switch tracks later (top-nav "Switch track").

### 9.3 Case library & discovery — *Shipped*
- **What:** `/cases` browser over the corpus.
- **How:** cognac hero band with a featured case (full-bleed per-case photo); sticky **track-pill nav** (Consulting ◆ / IB $ / PM ▲ / Marketing ✱ / Strategy ◇); **"Browse by case type"** = 6 sticky stacking cards (Profitability, Market entry, Operations, Estimation, Pricing, M&A) linking to `?type=X`; collapsible filters (industry / case type / difficulty / free-text search); paginated library rows (`HuprCaseRow` + load-more).
- **Rules:** filters to `is_user_case=false` (BYOC never leaks into the shared library); short-prompt cases (<80 chars) hidden behind a "show all" toggle; sparse non-consulting tracks (<50 cases) show a consulting fallback band; **static fallback to 4 starter cases if Supabase is down** (never-fail). Per-case images via Supabase Storage CDN with a deterministic fallback to one of 147 bundled photos.

### 9.4 Bring Your Own Case (BYOC) — *Shipped*
- **What:** `/cases/new` — paste a custom prompt and practice it.
- **How:** creates a private `cases` row (`is_user_case=true`, tied to `user_id`, RLS-enforced private). The interviewer runs free-form; the evaluator still scores structure/math/synthesis.
- **Rules:** manual validation (title ≤120 chars; problem 100–5000 chars; control chars stripped; enum-checked). Fails-open with a "not ready" message if migration 0015 columns are absent.

### 9.5 The Solve Arena — *Shipped* (see §10 for the engine)
- **What:** the live interview surface at `/solve/[caseId]`.
- **Layout:** full-height "notebook paper" arena (hand-drawn rough.js ruled parchment + red margin rule). Header: brand asterisk (`AshMark`) + difficulty dots + source + case title (hand-drawn underline) + live **XP ticker** + **Submit for scoring** button. A pinned problem-statement banner auto-collapses to a one-line teaser after the first turn.
  - **Desktop:** 2-column — **chat left | live issue tree right**.
  - **Mobile:** single panel with a chat|tree tab toggle + cross-fade.
- **Chat:** streaming token-by-token dialogue. The opening interviewer message renders as a "hero moment" (large, typewriter). Empty-state shows suggested opener moves. Streaming has an AbortController + 30s stall watchdog, a typing indicator, a **Stop** button mid-stream, and a **"↻ Retry that turn"** banner for hung turns (deduped via `clientTurnId`). Optional per-turn playbook **citations** ("Real EMs probe like this") render as quiet footnotes.
- **Voice input:** `MicButton` → MediaRecorder → `/api/voice/transcribe` (Groq Whisper `whisper-large-v3-turbo`). Never auto-sends — drops text into the input for the user to fix Indian-English transcription errors. 2-min cap, live timer, iOS/webm MIME negotiation.
- **Hints:** floating ⚡ button (never auto-pops) opening track-specific tabs: recovery scripts / frameworks / math / spike phrases.
- **Submit for scoring:** gated (disabled until ≥2 messages); confirmation modal; calls `endSession` → debrief. Flips to "Already scored — see debrief" when the session is ended.
- **Resilience:** a collapsible **"Session stuck or broken? Reset."** (`resetSession` wipes chat/tree/sheet, keeps the session id).
- **Note (debt):** the in-solve **cheat-sheet drawer was removed 2026-05-29** (cohort said the side-drawer broke conversation flow; the issue tree now carries live reasoning). The `cheat_sheets` table still runs in the background feeding the evaluator; `/how-it-works` and the solve tour still reference the removed drawer (stale copy).

### 9.6 Live issue tree — *Shipped*
- **What:** the middle/right panel — an AI-inferred structure of the candidate's thinking, refetched after every turn.
- **How:** `/api/issue-tree` (modes: cheap DB `get`, LLM `extract`, user-edited `save`). Hand-drawn "war room" cards (rough.js `RoughRect`). Nodes carry **L0–L5 level badges**; interactions: click L0 to commit a root branch, double-click to rename, drag to re-parent, × to delete (cascades), ↻ to rebuild from chat. Top rubric bars: **MECE / depth balance / hypotheses-attached / root-driven** (0–100 each).
- **Critical rule:** the live tree reflects **only what the candidate/interviewer explicitly said** — the problem statement is deliberately excluded so branches the candidate hasn't discovered aren't pre-populated (no spoilers).

### 9.7 Debrief & scoring reveal — *Shipped* (see §11 for scoring)
- **What:** `/debrief/[sessionId]` — the post-interview payoff.
- **Sequence:** (1) **Completion banner** — XP this session, streak days, total cases, Ash-voice headline; (2) **Score reveal** — cinematic count-up 0→N over ~900ms, giant "/100"; (3) **Verdict pill** — strong (offer-level) / pass / below-bar (+ "below the bar on:" flags); (4) **Per-dimension rubric bars** (real per-track dimensions) + **Strengths** and **Gaps** lists; (5) **"How a top candidate would solve this"** — the ideal walkthrough (generated client-side; see §9.8); (6) **"Tomorrow's case"** anticipation band; (7) **feedback capture** (auto-opens 8s after mount unless already given: 3 emoji sentiments + optional free text → `/api/session-feedback`).
- **Rule:** if the scoring or walkthrough service was down, a ⚠ banner marks the result a placeholder and invites a re-run (never a blank page).

### 9.8 Ideal answer / walkthrough — *Shipped*
- **What:** a research-grounded model solution rendered in the debrief.
- **How:** `POST /api/walkthrough` (client-side after paint so a 30–95s generation never blocks the page). Generates and caches (service-role) a rich JSON: recursive **issue tree** (~12–20 MECE nodes, each with a ≤12-word reasoning note), **hypothesis tree**, **thinking levels L0–L4** (Recommendation → Drivers → Evidence → Risks → Implementation), and a **5–8 step** solve. Grounded in: the case-type playbook (21-agent research synthesis), the India number-bank, per-case clarifier bank, the per-case dossier, and **live Tavily web research**. `WALKTHROUGH_GENERATOR_VERSION` invalidates stale caches on upgrade.
- **Anti-generic rules:** CASE-TYPE ANCHOR (ignore a stale `ideal_structure` that names, e.g., Porter's 5 Forces on a profitability case); ANTI-SLOP (every evidence point must cite a specific number/fact or a web finding).

### 9.9 Drills — *Shipped* (3 modes)
Index at `/drills` (3 sticky stacking cards). All are client components with in-memory state (no persistence yet).
- **Math drill** (`/math-drill`): track selector + level L1–L4 over a **100-question pool** (fallback bank of 21). Numeric input with ±tolerance; shows ✓/✗ + shortcut + common trap; running accuracy; "last 10" log. Topics scale percentages → CAGR → NPV/WACC → IRR/MOIC/EV-bridge.
- **Behavioral drill** (`/behavioral-drill`): **30 questions** filterable by dimension; optional STAR scaffold + spike move + common mistake; a **"See ideal answer (90+)"** reveal (31 model answers with "why it scores 90+"); type a STAR response → `/api/behavioral-feedback` scores on 6 dimensions + returns a **rewritten excerpt** of the weakest section.
- **Recovery drill** (`/drill`): 6 curveballs (silent stretch, abrupt redirect, contradictory data, pace pressure, aggressive challenge, blank-on-numbers); user responds, self-rates (clean/wobbly/froze), then sees the ideal recovery script. No LLM.

### 9.10 Study hub — cheat sheet, crammer, company pack — *Shipped*
- **Cheat sheet** (`/cheatsheet`): track-specific 8-tab study hub — **weakness focus** (dims sorted by performance vs weight, from last 10 sessions), frameworks, math drills, industry primers, recovery scripts, spike phrases, 30 behavioral Qs, and **"Ask anything"** (free Q → `/api/ask-cheatsheet` answered against track frameworks + weak areas). Framework cards embed **cohort notes** (a shared "spike library" thread scoped by framework/case/track).
- **Pre-case crammer** (`pre-case-crammer-panel` / `/api/crammer`): a "30-second read" before a case — industry primer, likely frameworks, math shortcuts, watch-outs (personalized to the user's weak spots), recovery script, spike phrase, sources. Cached on `cases.pre_case_crammer`.
- **Company/firm pack** (`/company-pack`): a 24-hour-before crammer per recruiter — interview archetypes, behavioral focus, case types to drill, math warm-up, spike phrases, tonight/morning checklists. Live via 3 Tavily queries + Groq, with **pre-authored fallback packs** for top firms (McKinsey/BCG/Bain/…) reflecting 2024-25 India process intelligence.

### 9.11 Interview outcome capture (moat data) — *Shipped*
- **What:** `/outcomes` — log real interviews (firm, role, date, round, outcome, **"what did they actually ask? (the gold)"**, topics, verification snippet, "prepped on CasePad").
- **Why:** proprietary ground-truth for calibration and the "verified practice → placement" moat.
- **Rules:** captures **rejections too** (deliberately — avoids survivorship bias); every outcome including rejection is styled identically (no red). Dashboard `OutcomeNudgeCard` prompts logging after ≥1 completed session and no outcome in 14 days (7-day dismiss cooldown). Fails-open if migration 0014 is absent.

### 9.12 Gamification & the return loop — *Shipped*
- **Daily assigned case:** `assignDailyCase` (LLM-free, idempotent per IST day) picks one case: next starter (while <10 starters done) → weakest case-type (avg <65 over ≥2 sessions) → any un-attempted track case; prefers cases with cached crammer.
- **Streaks:** IST-aware streak math; a Duolingo-style flame that greys at 0 (loss-aversion cue).
- **Cohort leaderboard:** top scores over the last 7 days ("You" / anonymized "Member N"), hidden if empty.
- **Live XP ticker:** deterministic, non-persisted per-turn XP (+10 base, +5 length, +10 structure markers, +10 quant, +5 hypothesis, capped +30) — an explicit *feel-alive* mechanic; the LLM evaluate score is the real one.
- **"The Week" rhythm grid** on the dashboard; **score curve** trajectory; **weak-spots pills**.

### 9.13 Admin — *Shipped*
- `/admin`: hub (gated on `ADMIN_EMAIL`) with live counts (cohort members / cases / sessions) and tool links.
- `/admin/allowlist`: add/remove cohort emails (service-role; `assertAdmin()` re-checks on every mutating action).
- `/admin/activity` + `/[userId]`: service-role view of all cohort activity — per-user stats (track, sessions, completed, avg score, minutes, last active), recent sessions, engagement by case type, recent feedback, and drill-down to a user's **full transcripts + score breakdowns + issue trees**.

### 9.14 Legal & PWA — *Shipped*
- `/privacy` (DPDP rights, Supabase Mumbai region, LLM providers, Whisper voice, Tavily) and `/terms`.
- **PWA:** installable (`manifest.ts`), `start_url: /cases`, standalone display, app shortcuts (Cases/Dashboard/Cheat sheet). **Private tool:** `robots.ts` disallows all crawlers; `metadata.robots = noindex`.

### 9.15 Scaffolded / not-yet-wired (documented debt)
- **Exhibits** (`src/lib/exhibits/*`): a chart/table-reveal scaffold (interviewer "hands over" an exhibit gated by keywords). **0 imports, not on any surface** — pending a confirmed user need.
- **Mini-cases** (`lib/mini-cases.ts`): a 3-turn / ~4-min daily micro-drill picker — not wired to a route.
- **In-solve cheat-sheet panel / drawer** (`cheat-sheet-panel`, `sheet-drawer`): still exist but unmounted since 2026-05-29.
- **3D WebGL "persistent asterisk"**: removed 2026-05-06; its store/hooks (`setAiState('thinking'/'celebrating')`) remain as dormant no-ops across solve/chat/mic/score-reveal.

---

## 10. The AI interviewer engine

This is the heart of the product. It is a **track-aware, stage-driven interviewer** grounded in real-interview research (14 transcribed real interviews + a 50-lane interview-dynamics research run + ~1,100 MBB-interviewer findings), designed to move from "a chatbot that role-plays an interviewer" to "an interview engine that knows what stage it's in and conducts like a real EM."

### 10.1 One turn, end to end (`src/app/api/chat/route.ts`)
1. **Validate** input (`sessionId` ≤100 chars; `userTurn` non-empty ≤10,000 chars → else 413; control chars stripped).
2. **Auth + ownership** (401 if none; session fetched scoped to `user_id`).
3. **Rate limit** two axes: 30/min per user, 10/min per session (sliding 60s windows).
4. **Idempotency replay:** if the incoming `clientTurnId` matches the prior user turn and an interviewer turn already follows it, **replay the stored response** (no LLM call; `X-CasePad-Replay: 1`).
5. **Daily LLM budget** check (after replay, before any LLM call).
6. **Assemble context** (each block fail-open): per-case dossier (from `data/dossiers/{id}.json`), capped disclosed-history (≤8 items / 2,000 chars), estimation state, canned-template directive, playbook RAG findings, number registry + recent-turn awareness.
7. **Infer stage + persona** deterministically → stage directive appended at the *end* of the system prompt (highest-attention zone).
8. **Generate → gate → stream** (see §10.5).
9. **Persist** the transcript (with citations) via `withRetry`; never throws.

### 10.2 The opener (`src/lib/groq/opener.ts`)
Generated synchronously inside `startSession` so a fresh session is never a blank box. 2–3 sentences: greeting + persona identity + paraphrased prompt + one open kickoff question; no hints, no frameworks, no invented facts, never sees `ideal_structure`/`interviewer_notes`. **3-tier fallback:** Groq SDK direct 8B → 4-layer router → deterministic static opener from the raw problem statement. Optional prior-session continuity clause ("Last time we did profitability…").

### 10.3 The 7-stage stage machine (`src/lib/interview/stage-machine.ts`)
Pure, deterministic, recomputed every turn from the transcript (no DB column → no drift; fail-open to null):

`scoping → structure → analysis → quant → synthesis → recommendation → wrap`

`inferStage` computes regex signals (hasStructure, mathActive, hasSynthesis, hasRecommendation, nearEnd). Precedence: recommendation → `wrap`; synthesis → `recommendation`; **drive-to-close** (≥9 candidate turns with no synthesis) → force `synthesis`; active math → `quant`; structure present → `analysis`; else `scoping`/`structure`. `quant` is the explicit hook for the guesstimate engine. "Drive-to-close" replaces the old prose ("force synthesis at 8+ turns") that nothing actually enforced.

### 10.4 Track-aware personas (`src/lib/interview/personas.ts` + `track-playbooks.ts`)
Six identities, tone-matched, each probing **exactly the graded dimensions** (pulled live from `tracks.ts` so persona and rubric can't drift apart):

| Track | Persona | Tone |
|---|---|---|
| consulting | Ash — Bain EM | warm-but-rigorous |
| ib_pe_vc | Rohan — bulge-bracket VP | technical-direct |
| pm | Maya — consumer-tech Senior PM | friendly-startup |
| marketing | Neha — brand Marketing Director | warm-but-rigorous |
| strategy_bizops | Arjun — Head of Strategy & BizOps | blunt-MBB |
| behavioral | Ash — Bain EM | warm-but-rigorous |

Each persona carries research-distilled **tells** (verbatim-style lines — "the single biggest realism lever"), **spike moves**, **red flags**, and per-stage notes (e.g. consulting scoping = "2–3 clarifiers max"; IB quant = paper LBO in fixed order S&U → EBITDA → FCF → debt paydown → exit → MOIC/IRR; PM structure = "segment by motivation/JTBD, not demographics"). A cross-track `GUESSTIMATE_PLAYBOOK` applies at the quant stage.

### 10.5 The gate stack (`GUARDRAIL_MODE=gate` default)
The draft is buffered and validated through a sequential gate stack, capped by a shared **`regenBudget = 2`** (max 2 extra 70B generations/turn — a cost guard):
- **Gate 1 — deterministic guardrail:** banned-phrase prefixes + 80-word cap → 1 regen.
- **Gate 1.5 — number registry + phrase-repeat:** flip-flop + verbatim 5-gram repeats → 1 regen.
- **Gate 1.6 — arithmetic verification:** catches "125,000 × $1.50 = $200K"-type errors → 1 regen.
- **Gate 2 — semantic critic (LLM-as-judge):** from turn ≥2, every 2 turns, if budget remains — checks `on_persona`, `not_generic`, `ends_with_probe` (fail-open).
- **Watermark:** an invisible per-account steganographic watermark before shipping (leak attribution).
- **Catch path:** on total provider failure, ship `staticChatTurnFallback(turnCount)` — a plausible interviewer probe, **never** an error string (so the transcript is never poisoned).

### 10.6 The interviewer craft (system prompt, `src/lib/groq/interviewer.ts`)
Persona block + a fixed craft body: "NOT a tutor, NOT a coach, NOT a chatbot." Data-sharing rules (problem statement in-bounds; reveal notes gated behind `trigger_keywords`; "I don't have data on that — what would you assume and why?" when neither covers the ask). Cadence: 1–3 sentences, **hard cap 80 words**. Banned AI-chatbot tells ("Great question", "Let me walk you through", "As an AI"…). **Math discipline (5 non-negotiable rules):** commit numbers, never silently change them, anchor candidate numbers before computing, sanity-check before stating. Seven few-shot BAD-vs-YOU examples. The 12-failure-mode anti-generic taxonomy from `SCORING-PHILOSOPHY.md` informs this prompt.

### 10.7 Case-state & math reliability (`src/lib/case-state/*`)
- **Number registry** (`number-registry.ts`): anti-flip-flop. Extracts committed numbers, re-injects the top-12 at the *end* of the prompt (highest-attention zone) with a "MUST honor — no silent changes" instruction; flags contradictions (5% tolerance) unless the draft acknowledges a correction. Rationale: Llama-3.3-70b drifts on relational memory around 2–2.5K tokens, well before its 128K window.
- **Arithmetic verifier** (`arithmetic-verifier.ts`): deterministic `A op B = C` check across `+ − × ÷ %`, 5% tolerance; feeds the chat gate, the scorer, and the estimation engine.
- **Estimation/guesstimate engine** (`estimation-state.ts`, Wave-2 lever B): first-class market-sizing state — assumption ledger, structured-first?, sanity-checked?, blurted-number? (the canonical guesstimate fail), arithmetic errors, final number. Grades **structure + assumptions + sanity-check, NOT how close the final number is** (tolerance ≈ right order of magnitude / ~20%).

---

## 11. Scoring & evaluation

### 11.1 Philosophy (`docs/SCORING-PHILOSOPHY.md`)
Score the **dimensions a real EM scores**, not "did the candidate match the casebook." The casebook is a reference, not an answer key. A 2×2 taxonomy (MECE × hypothesis-anchored) yields three divergence tags — **INSIGHTFUL** (reward, can beat the casebook), **ALTERNATIVE** (neutral, score execution), **ERROR** (the only "wrong" quadrant). Burned into prompts: *"Your recommendation does not need to be right. It needs to be logical, supported by the data, and clearly communicated."*

### 11.2 Per-track rubrics (`src/lib/tracks.ts`)
Each track scores on a weighted rubric summing to 100:

| Track | Dimensions (weight) |
|---|---|
| **consulting** | Structure 25 · Quant Reasoning 20 · Business Judgment 15 · Communication 15 · Hypothesis Mgmt 10 · Creativity 10 · Synthesis 5 |
| **ib_pe_vc** | Technical Accuracy 30 · Valuation Judgment 20 · Accounting Linkages 15 · Deal Sense 15 · Communication 10 · Brain Teasers 10 |
| **pm** | Product Sense 25 · Estimation 15 · Strategy 15 · Metrics 15 · Communication 15 · Design Sense 10 · Prioritization 5 |
| **marketing** | Customer Insight 25 · Brand Positioning 20 · 4P Coherence 15 · Quant Marketing 15 · Communication 15 · Channel Strategy 10 |
| **strategy_bizops** | Strategic Framing 25 · Analytics 20 · Business Judgment 15 · Communication 15 · Stakeholder Sense 10 · Quant Rigor 10 · Synthesis 5 |
| **behavioral** | STAR Structure 25 · Specificity 20 · Self-Awareness 15 · Relevance 15 · Authenticity 15 · Impact 10 |

### 11.3 Code-validated verdict (`src/lib/eval/score-validator.ts`, Wave-2 lever 1 — the key trust primitive)
**The LLM only *proposes* per-dimension scores + evidence; CODE computes the verdict** — the LLM's `total` is never trusted verbatim:
- Recompute `total` = sum of dimensions, each **clamped to [0, weight]**.
- **Deterministic quant grounding:** a real candidate arithmetic error (detected in code) caps the track's quant dimension at 50% of weight; a blurted estimation number caps it at 60%.
- **Verdict in code** (`strong | pass | reject | insufficient`): `insufficient` if <2 candidate turns; `reject` if any dimension is below 60% of weight ("below-3 auto-reject"); `strong` if total ≥75 **and** ≥1 spike moment; else `pass`.
- Output is a **superset** of the legacy `score_breakdown` (`scheme: 'track-v2'`) so existing readers keep working.

### 11.4 The end-session evaluator (`src/lib/groq/evaluate-session.ts`)
Shared entry from `/api/evaluate` and the `endSession` action. Idempotent (early-returns an existing completed breakdown to prevent score volatility). Fetches transcript + case + cheat sheet → builds per-track messages → `completeChat` (JSON) → static fallback on any failure → **code validation** → `withRetry` write of `score`/`score_breakdown`/`ended_at`/`status`. On persistence failure returns 503 with the breakdown so `/debrief` still renders.

### 11.5 Offline eval harness (QA, not the live scorer)
- **Tier-1 deterministic detectors** (`src/lib/eval/detectors.ts`): ~13 pure functions over a transcript (math flip-flop, phrase-repeat 5-gram, banned-phrase, persona-break, hedging, markdown/emoji, multi-question, no-probe, apology, numbered-list, length-cap, stale-context).
- **Tier-2 LLM-judge** (`tier2-judge.ts`): gives-answer, fabricated-data (sampled), jailbreak — each a small fail-open judge call, gated behind `TIER2_JUDGE=on`.
- **Synthetic-candidate eval** (`scripts/qa/eval-interviewer.ts`): a synthetic candidate plays N cases end-to-end through the production chat route; output logged to `docs/eval-runs/RUN-{date}.md`. This is the QA yardstick ("Ash should not be the QA loop").
- **Calibration plan:** (1) LLM-as-judge on every session (workhorse), (2) ex-MBB human spot-checks (ground truth, correlate monthly), (3) cohort behavioral signal once N>50.

---

## 12. Content & corpus

### 12.1 Corpus scale & composition
- **Working corpus: ~1,165 real cases** (the number cited across the codebase — the moat).
- Built from **131 HTTP-verified casebook PDFs** (of 156 master URLs, 84% OK). Reachable estimate: 1,500–2,000 unique cases after dedup.
- **Source mix:** GitHub community repos (42, the backbone — Indian IIM/ISB + US M7), case-prep aggregator sites (35), S3/CDN (16), US/EU B-school direct (13), consulting-firm-published (12 — 100% IP-clean McKinsey/BCG/Bain/etc.), Indian B-school direct (5), case competitions (5). **Indian B-schools dominate** the corpus.
- **~50 dossiers + 147 bundled case photos** present in-repo; **116 of 1,165 cases have enriched dossiers** (partial — the remainder is a deferred, ~$0-on-free-tier batch job).

### 12.2 Ingestion pipeline (`scripts/ingest/*`, `docs/INGESTION.md`)
Standalone Node/tsx scripts, fully decoupled from the app, writing via the service-role admin client. Two modes: **crawl open sources** (`ingest:run`) and **from-disk** (`ingest:run:disk`); both idempotent, resumable, dry-runnable. Stages: **discover** (cheerio scrape, blocks auth/pay URLs) → **download** (idempotent, `%PDF` + content-type + size gates) → **parse** (pdf-parse; `splitIntoCaseChunks` on a `Case N:` regex tuned to the corpus; OCR-defer flag) → **extract** (LLM → strict JSON schema with DO-NOT-INVENT + ZERO-MISS rules) → **insert** (idempotent on `(casebook_id, title)`). A **second pass** (`extract-multi`) handles header-less books by sending 18K-char slabs to the LLM for self-boundary-detection. Throttled ~35 req/min, concurrency ~12.

### 12.3 "Real cases only" enforcement
- Sourcing crawls only openly-published PDFs (auth/login/pay URLs blocked).
- DO-NOT-INVENT rule in every extraction prompt.
- Source attribution: every case carries `source` + `provenance {school, casebook_title, source_url, pass}`.
- `classify-imports.py` deletes deliverables/non-cases; `filter-bad-cases.mjs` flags broken/thin/illicit/non-case extractions.
- Synthetic-case deletion tooling exists; user-authored exceptions must be honestly tagged (`source: 'ash-custom-prompt'`, `provenance.not_from_real_casebook: true`) and never mixed into the real corpus.
- **Steganographic watermark + leak-ID tool** (`identify-leaker.ts`) attributes any leaked transcript to an account.

### 12.4 Per-case dossiers (`data/dossiers/*.json`, schema v1.0.0)
Pre-computed per-case knowledge so the AI is deep on every case (closes the "shallow chatbot" failure mode). Each dossier: `industry_primer`, `real_world_numbers[]` (8–15, as ranges with source hints), `expected_math[]`, `common_mistakes[]`, `anticipated_questions[]` (15–25 Q&A the casebook doesn't cover, categorized), `framework_hints[]`, `sources[]`, `case_type_notes`. **India-grounded** (INR/crore, Indian regulatory context; ranges not point estimates). Stored on the filesystem (a dropped JSONB migration; PR-reviewable, <5ms cold read), injected into the chat prompt only when the candidate asks off-page questions (never proactively dumped). Enrichment cost ≈ $0 on Groq free tier for all 1,165 (~97 min) or ~$4 paid.

### 12.5 Estimation/guesstimate content
Estimation is a first-class case type. A dedicated extractor (`extract-guesstimate.ts`, built on the SRCC 180DC / Soumya-Gupta 3-step rubric) forces `case_type='estimation'`, a required umbrella framework, and the round-number "beautiful numbers" as load-bearing fields for offline grading. Guesstimate content is India-specific (Mumbai petrol pumps, India movie screens, SRCC 180DC Vol 1).

### 12.6 India number-bank & clarifier banks (`src/lib/india-reference.ts`, `case-clarifiers.ts`)
~63 India macro/income/digital/sector anchors, **each WebSearch-verified** with `sourceName` + `sourceUrl` + `asOf` + confidence flag ([V]erified vs [E]stimate). Data with no credible free source (e.g. NCCS class shares) is **deliberately omitted** (the no-assumptions discipline). Per-case-type clarifier banks feed the walkthrough/crammer generators (generation paths only — never the live chat loop, to protect Groq TPM and the Fortress).

---

## 13. System architecture

| Layer | Pieces |
|---|---|
| **Edge / proxy** | `proxy.ts` (Next 16's renamed middleware) — checks the Supabase session cookie and enforces auth before route handlers run. |
| **UI — Server Components** | Pages render server-side, query Supabase directly via cookies (RLS applies): `/cases`, `/solve`, `/debrief`, `/dashboard`, `/admin/*`. |
| **UI — Client Components** | Interactive surfaces: chat panel, issue tree, mic, filters, tours. |
| **Server Actions** | Mutations: start/end/reset session, assign daily case, create user case, log outcome, manage allowlist, update cheat-sheet field, sign out. |
| **API routes (Node runtime)** | `/api/chat` (streaming interviewer), `/api/cheatsheet`, `/api/evaluate`, `/api/walkthrough`, `/api/issue-tree`, `/api/crammer`, `/api/company-pack`, `/api/behavioral-feedback`, `/api/ask-cheatsheet`, `/api/cohort-notes`, `/api/session-feedback`, `/api/voice/transcribe`. |
| **LLM layer** | The 4-layer router (`llm-router.ts`) — all engine code calls `streamChat()` / `completeChat()`. |
| **Data clients** | Three Supabase clients: server (cookie-aware, RLS), browser (realtime), admin (service-role, bypasses RLS — ingestion + allowlist + shared-row cache writes). |
| **Data** | Postgres on Supabase (Mumbai) with RLS; transcripts and trees stored as JSONB on `sessions`. |
| **Content dossiers** | Filesystem (`data/dossiers/*.json`), cold-read per chat turn. |
| **Ingestion** | Standalone tsx/Python scripts, decoupled from the app. |

The **shared API gate** (`src/lib/api/gate.ts`) centralizes auth + rate-limiting for every expensive route (every authenticated route is per-user rate-limited; every expensive route requires auth).

---

## 14. Data model & schema

Postgres on Supabase; migrations in `supabase/migrations/` (0001–0018, no 0017; hand-managed — **no migration runner**, applied via the Supabase SQL editor).

### 14.1 Core tables
- **`casebooks`** — source collections: `id, school, year, title, source_url, local_path, case_count, ingested_at`.
- **`cases`** — the content hub: `id, title, industry (enum), case_type (enum), difficulty (enum), source, casebook_id→casebooks, problem_statement, interviewer_notes (jsonb, gated reveal notes), ideal_structure (jsonb), tags[], provenance (jsonb)`, plus added over time: `ideal_walkthrough (jsonb, cached)`, `tracks track_kind[]` (multi-track), `user_id + is_user_case` (BYOC), and off-migration `pre_case_crammer (jsonb, cached)`. Indexed on industry/case_type/difficulty, a GIN trigram on title, a GIN on tracks, and a unique `(casebook_id, lower(title))`.
- **`sessions`** — one attempt: `id, user_id→auth.users, case_id→cases, started_at, ended_at, transcript (jsonb — the turns, embedded not a separate table), score, score_breakdown (jsonb), status (enum)`, plus `track` and `issue_tree (jsonb)`. **Turns/messages are embedded JSONB**, not a table.
- **`cheat_sheets`** — 1:1 with sessions: framework, hypothesis, key_numbers, decisions[], next_steps[], manual_notes, `locked_fields[]` (user-pinned). Still written in the background even though the UI drawer is removed.
- **`email_allowlist`** — the invite gate (RLS-on, no policy → service-role only).

### 14.2 Track / assignment / outcome tables
- **`daily_assignments`** — one case/user/IST-day (PK `(user_id, assigned_for)`, idempotent).
- **`interview_outcomes`** — verified real interviews incl. rejections (moat data).
- **`cohort_notes`** — shared spike-library annotations scoped by framework/case/track (dashboard-created; owner-scoped RLS).
- **`session_feedback`** — sentiment + free text (dashboard-created).

### 14.3 Ops / guardrail tables (all RLS-on, no policy → service-role only)
- **`tavily_quota`** — monthly research-API counter (free-tier cap).
- **`llm_usage`** — global + per-user daily LLM-turn cap, with an atomic `bump_llm_usage` RPC.
- **`nsm_failures`** — production failure telemetry (backs `logFailure`).

### 14.4 Enums
`case_industry`, `case_type_enum`, `case_difficulty`, `session_status`, `track_kind (consulting, ib_pe_vc, pm, marketing, strategy_bizops, behavioral)`.

### 14.5 Security model
Two deliberate postures: **owner-scoped RLS** for user data (sessions, cheat_sheets via join, cohort_notes, interview_outcomes, user cases) and **service-role-only** (RLS-on-no-policy) for server-managed state (allowlist, quotas, telemetry, daily assignments). `cases`/`casebooks` are world-readable to authenticated users (except private BYOC cases). **`scripts/lint-rls.mjs`** is a CI guard that fails the build if any created table lacks an RLS-enable (it exists because `tavily_quota` once shipped without RLS — a Supabase Security Advisor finding, fixed in 0012).

---

## 15. Reliability — the Fortress / never-fail protocol

**Mandate:** the NSM (start-case → complete-all-turns → debrief-with-score → persist) must never hard-fail. Audit: `docs/NEVER-FAIL-AUDIT.md`.

- **4-layer LLM router** (`llm-router.ts`): Groq (`llama-3.3-70b-versatile`) → NVIDIA NIM (`meta/llama-3.3-70b-instruct`) → Cerebras (`llama3.1-70b`) → OpenRouter (`…llama-3.3-70b-instruct:free`). Any subset of keys works; on 429/5xx it falls through to the next provider. *(Known caveat: if only `GROQ_API_KEY` is set in prod, "the 4-layer fortress is a 1-layer shack" — verify all keys.)*
- **Retry wrapper** (`with-retry.ts`): exponential backoff 200/600/1500ms on transient 5xx/429/408/network; never retries other 4xx.
- **Static fallbacks** (`static-fallbacks.ts`): valid-shape responses (`fallback_used: true`) for evaluator, issue tree, crammer, walkthrough, and — critically — a rotating **static chat-turn fallback** so a total outage never poisons the transcript with error text.
- **Idempotency:** chat-turn replay via `clientTurnId`; evaluator early-return on completed sessions; daily-assignment compound-PK idempotency.
- **Write durability:** transcript + evaluator writes wrapped in `withRetry`; on residual failure, log loudly (`nsm_failures`) but never throw.
- **Platform config:** `vercel.json` sets `maxDuration` per LLM route (60s for chat/evaluate/crammer/company-pack/walkthrough/ask-cheatsheet; 30s for cheatsheet/issue-tree/voice/behavioral-feedback) — closing the audit's most dangerous gap (Vercel's default 10s cap would truncate every stream). Region pinned to `bom1`.
- **Error boundaries:** `error.tsx`, `global-error.tsx`, `AuthWatchdog`, `ConnectionBanner`.

---

## 16. Security, privacy & compliance

- **Auth:** Google-only OAuth + server-side allowlist double-gate; single env-var admin; device cap (2 sessions).
- **RLS:** owner-scoped + service-role-only postures; CI-enforced RLS-on-every-table.
- **Security headers** (`next.config.ts`): 2-year HSTS (preload), `X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin` referrer, a locked-down `Permissions-Policy` (mic/camera self-only, everything else denied). `poweredByHeader: false`; no production browser source maps.
- **Abuse defenses:** per-route auth + rate limits; global + per-user daily LLM caps (circuit breaker); Tavily quota cap; steganographic per-account watermark + leak-ID tool; input validation (length caps, control-char stripping) on every user input.
- **Privacy:** Supabase data in Mumbai (`bom1`); `/privacy` documents DPDP rights, LLM providers (Groq/NVIDIA/Cerebras), Whisper voice, and Tavily. Private tool — noindex, robots-disallow-all.
- **Content licensing:** "real cases only" with source attribution; consulting-firm cases are IP-clean published materials; case images use license-clean stock (Pixabay Content License).

---

## 17. Cost & abuse controls

Zero-budget mandate → aggressive cost hardening for a public launch:
- **Multi-provider free tiers** with automatic failover; local-model routing (`LLM_BASE_URL`/`LLM_LOCAL_MODEL`) for free bulk ingestion.
- **Daily LLM budget** (`llm_usage`): defaults `GLOBAL_CAP = 4000/day`, `PER_USER_CAP = 120/day` (tunable via Vercel env without redeploy); atomic RPC, race-safe, fails open.
- **Rate limiter** (`rate-limit.ts`): in-memory sliding window per lambda, upgrading to **Upstash Redis** (cross-instance) when configured; fails open to in-memory.
- **Chat cost guards:** `regenBudget = 2` per turn; disclosed-history cap (8 items / 2,000 chars — the primary late-case TPM blowup fix); model routing intent (small vs large — partially wired).
- **Tavily quota** (`tavily_quota`): soft cap 900 / hard cap 1,000 per month, fails open.

---

## 18. Design system & brand

- **Identity — "HUPR" (2026-05-06 makeover):** light canvas (`#FFFFFF`), warm-dark ink (`#323234`), hairline dividers, no chromatic accent (CTAs are dark-fill rectangles), and six named earth-tone section bands (sand, terracotta, sage, slate, cognac, cream). Fonts: **Montserrat** (700/900 display), **IBM Plex Mono** (body/UI/eyebrows), **Moderustic** (long-form prose).
- **Hand-drawn (rough.js) aesthetic:** the brand asterisk logo (8-petal, hover-flips), sketchy `RoughRect` issue-tree cards, `RoughUnderline`, and the `NotebookPaper` ruled-parchment solve background. `AshMark` is the symmetric brand asterisk used as the chat avatar and score-reveal mark.
- **Motion** (`lib/motion-tokens.ts`): single source of truth (springs, eases, durations); only transform/opacity/filter/color are animated; every consumer respects `useReducedMotion()`. React `<ViewTransition>` cross-fades on route nav.
- **Theme:** light is canonical; dark mode via `data-theme` + a pre-paint script + a top-right toggle.
- **Design debt (documented):** two design languages coexist — several secondary surfaces (company-pack, tutorial, how-it-works, no-access, onboarding, hint panel, crammer, ideal-walkthrough) remain in a legacy dark zinc/emerald idiom; the PWA manifest still carries stale dark/emerald theme colors; the original design spec (`docs/superpowers/specs/2026-04-30-casepad-design.md`) describes the pre-HUPR dark aesthetic and a 3-panel cheat-sheet arena and is stale for UI (still valid for data-model/interviewer logic).

---

## 19. Tech stack & infrastructure

- **Framework:** Next.js 16 (App Router, RSC + Server Actions), React 19, TypeScript 5. *(AGENTS.md: this Next.js has breaking changes vs training data — read installed `node_modules/next/dist/docs` before using APIs.)*
- **Styling:** Tailwind CSS 4; `motion` (Framer Motion); `three` + `@react-three/fiber` (3D hero on signin); `roughjs` + `react-rough-fiber` (hand-drawn UI).
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime), `@supabase/ssr`.
- **LLM:** Groq SDK + a custom OpenAI-compatible 4-provider router; Whisper for voice; Tavily for web research; `zod` for validation; `zustand` for client state.
- **Testing:** Vitest (unit — ~30 suites incl. detectors, guardrails, personas, stage machine, arithmetic, allowlist, RLS-lint), Playwright (e2e solve flow).
- **Ops scripts:** ingestion (tsx/Python), dossier enrichment, image generation (Pixabay + Supabase Storage), cohort metrics, `pm-gate.mjs` (pre-commit gate), `lint-rls.mjs`.
- **Hosting:** Vercel (Mumbai `bom1`, `maxDuration` per route). **Env:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` (+ optional NVIDIA/CEREBRAS/OPENROUTER/UPSTASH/TAVILY/PIXABAY), `ADMIN_EMAIL`, `ALLOWLIST_MODE`, `NEXT_PUBLIC_SITE_URL`.
- **Caveat:** the corpus/ingestion pipeline was built on Windows (hardcoded Windows paths in `ocr-scanned.py`, `build.py`).

---

## 20. Analytics, telemetry & calibration

- **Failure telemetry:** `nsm_failures` + `logFailure(route, err, ctx)` fire-and-forget on every catch path.
- **Cohort analytics:** `/admin/activity` computes per-user and aggregate engagement (sessions, completion, avg score, minutes, last active, engagement by case type); `scripts/cohort-metrics*.mjs` for offline analysis.
- **Session feedback:** in-debrief emoji sentiment + free text (`session_feedback`).
- **Quality calibration:** offline synthetic-candidate eval runs (`docs/eval-runs/`), Tier-1 detectors + Tier-2 judges, and the planned human ex-MBB spot-check loop; verified `interview_outcomes` as ground truth.
- **Product signal to watch:** per-user score-improvement curve, completion rate, abandonment stage, return rate, streak retention.

---

## 21. Non-functional requirements

| Attribute | Requirement / current behavior |
|---|---|
| **Availability of NSM** | Must never hard-fail; degrade gracefully at every layer. |
| **Chat latency** | First token before stall watchdog (30s); gate mode buffers ~1–2s. Chat latency is "sacred" — background features (cheat-sheet fill) are fire-and-forget. |
| **Route timeouts** | 60s (heavy LLM) / 30s (lighter LLM) via `maxDuration`. |
| **Cost** | $0 baseline (free tiers); hard daily caps (4000 global / 120 per-user). |
| **Data residency** | Mumbai (`bom1`). |
| **Accessibility** | Reduced-motion respected everywhere; modal focus-traps; keyboard dismissal. |
| **Mobile** | Responsive; solve arena collapses to a chat|tree tab toggle. |
| **Privacy** | noindex; private cohort tool; DPDP-aware. |
| **Idempotency** | Chat turns, evaluation, and daily assignments are idempotent. |

---

## 22. Roadmap

### 22.1 Shipped (chronological highlights)
- **Foundations (2026-04-30 →):** Next 16 app, Supabase schema + RLS, Google auth + allowlist, case browser, streaming interviewer, evaluator, dashboard, ingestion pipeline.
- **Reliability & trust:** 4-layer router, guardrails, self-critique critic, playbook RAG + per-turn citations, never-fail audit fixes.
- **5-stream research build:** eval harness (Stream 1), number registry + math discipline (Stream 2), persona-consistency patches (Stream 3), dossier enrichment (Stream 4, partial 116/1,165), drills (Stream 5 — math/behavioral/recovery live).
- **Wave 1 (2026-06-02):** Google-only auth, chat cost caps, `nsm_failures` telemetry, Mumbai region, RLS verified.
- **Wave 2 (2026-06-03):** code-validated scoring, dossier-grounded ideal answers + hand-drawn recursive issue tree, interviewer stage machine + track personas, first-class guesstimate engine.
- **Launch:** Google OAuth app published; cohort invitable; India number-bank + clarifier banks (2026-06-12).

### 22.2 Near-term (deferred / in flight)
- Finish dossier enrichment (116 → 1,165 cases) — offline, ~$0 on Groq.
- Wire real small/large **model routing** (critic/tier-2 currently call 70B).
- Decompose `api/chat/route.ts` (~680 LOC) into turn-context assembler / gate pipeline / persistence.
- Improve no-probe rate on the regen path; calculator tool-use for math reliability.
- Decide on **exhibits** (unwired scaffold) and **mini-cases** (unwired) — confirm user pull before building.
- Fix stale copy (how-it-works / solve tour reference the removed cheat-sheet drawer); reconcile PWA manifest theme colors with HUPR.

### 22.3 Medium-term (from competitor research)
- **RocketBlocks-style drill depth:** chart/exhibit-reading + brainstorming + synthesis drills; per-skill ELO; persisted drill attempts + cohort drill leaderboards.
- **Paired "strong vs weak solver" walkthroughs** (LOMS pattern) per case.
- **Audio mode** ("play case as a podcast").
- **Full interview arc** stages (rapport/fit/behavioral/PEI/candidate-Qs/close) around the case.
- **B2B2C:** club-branded private instances + weekly cohort challenges; land 1 consulting-club pilot as a credential.
- SEO content funnel; free "case in 15 minutes" lead magnet.

### 22.4 Long-term / monetization
- Club/college licensing (Option A) at scale; job-board/placement model (Option C) once N is large. **Never** a student paywall.

---

## 23. Risks, open questions & known debt

**Product/strategy risks**
- **Corpus quality variance** — extraction yields some thin/garbled cases; ongoing `filter-bad-cases` + dedup + dossier enrichment needed. Content quality *is* the moat, so this is the top investment.
- **AI realism ceiling** — larger LLMs drift *more* on persona; fixes are structural (registry, recent-turn, cooldown, stage machine), not "bigger model." Trust accrues over sessions, not first impressions.
- **Distribution** — B2B2C club adoption is unproven; fallback is organic individual growth.
- **Single-operator bus factor** — one admin, one operator, Windows-built pipeline.

**Known technical debt (documented in-code)**
- Two coexisting design languages; several legacy-dark surfaces; stale PWA theme colors; stale how-it-works/solve-tour copy.
- Dormant no-op code from the removed 3D asterisk (`setAiState` wiring) and the removed in-solve cheat-sheet drawer.
- Schema divergences: `users.preferred_track` vestigial (real value in auth metadata); off-migration tables (`users`, `cohort_notes`, `session_feedback`) and column (`cases.pre_case_crammer`); hand-managed migrations (no runner, gap at 0017).
- Reliability caveats: verify all 4 LLM provider keys in prod; voice transcription is Groq-direct only (no router fallback).
- Dossier enrichment partial (116/1,165).

**Open questions (from the specs, awaiting decisions)**
- Scoring scale anchor (1–4 McKinsey vs 1–5 CaseBasix)?
- Full-arc scope for v1 — build bookend stages now, or case+guesstimate first?
- Feedback timing — end-of-case only, or a checkpoint "practice mode"?
- Push-back intensity dial by round/difficulty?
- Surface divergence-tags (INSIGHTFUL) to the candidate as a dopamine signal?
- LLM-judge model choice (all-Groq free vs Claude Haiku for judge-only)?

---

## 24. Appendices

### 24.1 Model & token-budget table
| Feature | Model | max_tokens | temp | JSON |
|---|---|---|---|---|
| Chat turn (stream) | llama-3.3-70b-versatile → NVIDIA/Cerebras/OpenRouter | 300 | 0.4 | no |
| Opener | llama-3.1-8b-instant (Groq direct) → router | 220 | 0.5 | no |
| End-session evaluator | router 70B | 800 | 0.2 | yes |
| Ideal walkthrough | router 70B | 2500 | 0.2 | yes |
| Live issue tree | router 70B | 1400 | 0.2 | yes |
| Cheat-sheet extract | router 70B | 600 | 0.1 | yes |
| Live critic | router 70B (ideally 8B) | 120 | 0.1 | yes |
| Company pack | router 70B | 1500 | 0.2 | yes |
| Behavioral feedback | router 70B | 1200 | 0.2 | yes |
| Ask-cheatsheet | router 70B | 600 | 0.3 | no |
| Voice transcribe | whisper-large-v3-turbo (Groq direct) | — | 0 | — |

### 24.2 Key numeric limits
- Chat input: sessionId ≤100 chars, userTurn ≤10,000 chars.
- Rate limits: chat 30/min user + 10/min session; other routes 10–60/min.
- Daily LLM budget: 4,000 global / 120 per-user.
- Retry backoff: 200 / 600 / 1500 ms.
- Chat: `regenBudget` 2/turn; disclosed context 8 items / 2,000 chars; drive-to-close at 9 candidate turns; word cap 80; critic every 2 turns.
- Number registry: 12 metrics; arithmetic/registry tolerance 5%.
- Verdict: pass-fraction 0.6 (below-3 reject), strong-total 75, too-short <2 candidate turns.
- Voice: 25 MB / 2-min cap. Region: `bom1`.

### 24.3 The 6 tracks (frameworks/math/primers)
Each track (`src/lib/tracks.ts` + `tracks-deep*.ts`) ships: a weighted rubric (summing to 100), ~15–20 frameworks (with when-to-use + structure), ~15 leveled math drills (formula + mnemonic), industry primers (margins/KPIs/cost & revenue drivers/disruption), recovery scripts, and killer/"spike" phrases. PM additionally ships an app-KPI table (Instagram/Spotify/Uber/…); IB ships LBO/DCF/comps depth; consulting ships 12 industry primers + 30 behavioral Qs.

### 24.4 Glossary
- **NSM** — North Star Metric flow (start-case → complete-turns → debrief-with-score → persist), the never-fail contract.
- **Fortress** — the defense-in-depth reliability architecture guaranteeing the NSM.
- **Dossier** — pre-computed per-case knowledge JSON (industry primer, real numbers, anticipated Qs).
- **Reveal notes / `interviewer_notes`** — gated answer-key facts released only when the candidate's question matches trigger keywords.
- **Track** — a job-family lane (consulting/IB/PM/marketing/strategy/behavioral) with its own persona, rubric, and content.
- **Spike move** — an L4 "elevating" candidate move that signals offer-zone performance.
- **Verdict** — the code-computed grade (strong / pass / reject / insufficient).
- **HUPR** — the current light, editorial, hand-drawn design language.
- **Stage machine** — the deterministic 7-stage interview arc driver.
- **Guesstimate/estimation engine** — first-class market-sizing state that grades structure + sanity-check, not final-number proximity.

---

*End of PRD. This document reverse-engineers the built product and its in-repo research/specs as of 2026-07-13. It should be kept in sync with `docs/SESSION-STATE.md` (live resume truth) and the `docs/superpowers/specs/*` (design intent).*
