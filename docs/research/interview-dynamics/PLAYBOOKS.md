# Interview-Dynamics Playbooks (per track)

**Generated:** 2026-06-03 · **Method:** 50-lane parallel research workflow (6 areas × 5 facets + deep source-dives on the 4 weak tracks + guesstimate), then 6 per-area synthesis agents. All findings traced to real sources (mock-interview transcripts, candidate debriefs, named coaching/firm guides). India B-school context captured where found.

> Purpose: ground the interviewer **personas** (`src/lib/interview/personas.ts`) and **stage machine** (`src/lib/interview/stage-machine.ts`) in how real interviewers actually behave — not rubric inference. The distilled, code-consumable form lives in `src/lib/interview/track-playbooks.ts`; this file is the human-readable provenance.

This complements `docs/research/case-sources/RESEARCH-INDEX.md` (consulting-heavy video corpus) by covering the previously thin tracks: **PM, IB/PE/VC, Marketing, Strategy/BizOps**, plus a dedicated **guesstimate** dig.

---

## Consulting (MBB, McKinsey interviewer-led)
- **Tells:** dense context-dump → "are you ready?" handoff; hands a fixed next sub-question regardless of the candidate's structure; releases exhibits cold ("what are your observations?"); neutral low-affect acks ("Fair enough", "Let's move on"); refuses/redirects data requests; pushes "What else?".
- **Stage timing:** ~5 min open+structure, 20-30 min analysis, **60-90s synthesis cap**. Clarify is tight (2-3 Qs; 4+ = unfocused). Interviewer-led: dictates the next bucket from a script; does NOT adopt the candidate's structure as the roadmap.
- **Spikes:** clarify before structuring; 2-3 level MECE tree naming where the answer is buried; insight after EVERY number; math out loud + sanity check; pivot hypothesis when data contradicts; top-down answer-first synthesis.
- **Red flags:** "how am I doing?"; generic same-every-case framework; boiling the ocean; failing to update; failing common-sense sanity check; >45s silent; hedged synthesis. **Scoring is gated, not averaged** — a 1-2 on structuring (~25%) ends it.
- **Sources:** roadtooffer.com/blog/case-interview-scoring-rubric · strategycase.com/mckinsey-case-interview · mconsultingprep.com/case-interview-examples · mckinsey.com/careers/interviewing/diconsa · /beautify · rocketblocks.me/blog/that-candidate.php

## Product Management (big-tech + India APM)
- **Tells:** "I'd rather a candidate over-ask than under-ask"; "Okay, that's enough — no more clues"; "No. Go deeper."; metric-conflict prompts ("MAU up, FB MAU down"); "list 5 KPIs for a product"; India: "Flipkart conversion dipped 10% yesterday — diagnose"; "design a washing machine for blind people".
- **Stage timing:** ~5 min behavioral warm-up, ~35 min case, ~5 min Qs. 5 scored sub-stages (communication → motivation → segmentation → problem ID → solution). Clarify ends verbally ("that's enough"). Pace tightened — rapid interruption now, every idea challenged. ~30s recap is **scored**.
- **Spikes:** own the clock ("here's my plan for our time… sound good?"); segment by MOTIVATION not demographics; problems-as-obstacles-with-a-cause; clarify what a metric MEASURES before diagnosing; stage validation (research → prototype → data → A/B); name the gaming risk of your own metric.
- **Red flags:** only ~25% finish — running out of time is its own fail; jumping to first solution; asking the interviewer for direction; "design for everyone"; needs/problems confusion; defensiveness under follow-up. "If it's not an easy yes, it's an easy no."
- **Sources:** lennysnewsletter.com/p/the-definitive-guide-to-mastering · tryexponent.com/blog/product-sense-interview · jefago (Medium) turn-by-turn rubric · razorpay.com/unfiltered (India) · nvishwanath (Medium) Flipkart APM debrief · rocketblocks.me/guide/pm/product-design-interview.php

## Investment Banking / PE / VC
- **Tells:** "Walk me through a DCF" → "how does it change if the tax rate increases?"; "$10 increase in depreciation — three statements"; paper-LBO live ("estimate IRR and MOIC"); "state your recommendation unequivocally"; VC: "could it reach 100x — $2B?"; TAM attack "isn't 10-20% capture more plausible?".
- **Stage timing:** screen = define fluently in ~90s (follow-ups decide offer); Superday = 3-5 × 30 min independent scorecards, technical/behavioral interleaved, abrupt topic switches; PE round 1 = 5-10 min verbal paper LBO; later = timed Excel test (synthesis LAST); VC = 5-phase (read → gut call → numbers → qualitative → defend).
- **Spikes:** DCF high-level then "want a specific step?"; state tax assumption aloud; LBO narrated in fixed order (S&U → EBITDA → FCF → debt → exit → MOIC/IRR), never silent; unprompted sanity check; on modeling test finish a simple correct model (median pass <50%); VC: realistic penetration + multiple + decisive pass.
- **Red flags:** levered FCF with WACC; terminal growth >3% untied to GDP; memorized answers collapsing by the 3rd follow-up; over-precision in a paper LBO; indecisive recommendation; story inconsistency across Superday interviewers (notes shared).
- **Sources:** mergersandinquisitions.com (LBO test / PE & VC case study / IB Q&A) · 10xebitda.com paper-LBO · wallstreetprep.com walk-me-through-dcf · igotanoffer.com finance technicals.

## Marketing / Brand / GTM (PMM)
- **Tells:** "What is a GTM strategy and all its elements?" (definitional gate); "Uber → grocery, how enter?"; "a senior exec isn't sold — what do you do?"; "your 25% price increase won't kill volume?"; "what good product is marketed poorly?"; "elevator with the CEO?".
- **Stage timing:** definitional gate BEFORE any case; short clarify (2-4 Qs); announce 5C→STP→4P/7P before diving; numbers withheld until asked; creative beat ("what else?" + name missing branch); close forced by pressure cue; **lead with a LEADING metric** (awareness), not lagging revenue. India FMCG (HUL/P&G): GD + fundamentals + creative positioning + segmentation.
- **Spikes:** motive-clarify reshapes the framework; internal-vs-external diagnostic aloud; build/partner/acquire fork; segment on occasion+benefit+WTP; positioning as one single-minded line with reason-to-believe; numbers on the 4Ps; elasticity-defended pricing; one consumer insight threaded throughout.
- **Red flags:** framework before objective; mechanical 5C/STP/4P with no example; waiting to be fed data; tactic before root cause; vanity metrics only; demographic-only segmentation; answer-last recommendation; generic "gyaan" (India-penalized).
- **Sources:** rocketblocks.me/blog/pmm-gtm-strategy-interviews.php · roadtooffer.com/blog/marketing-case-interview · productmarketingalliance.com · casebasix.com marketing guide · insideiim.com HUL · jobtestprep P&G PEAK.

## Corporate Strategy / BizOps
- **Tells:** "CEO in an elevator wants to charge for [free product] — what do you say?"; "delivery time increased — what would you do?"; drops a hard constraint mid-case ("5-year payback"); withholds data + uses the refusal as a steer; "put that aside, I want to look at X"; "keep the recommendation to 30-60s".
- **Stage timing:** recruiter screen = motivation/"how does the company make money"; HM case screen (~45 min) is the core gate; clarify 3-5 / structure 4-6 (30s silent pause OK) / analysis 15-20 / synthesis 5-7 (protected). Data released reactively, one input per question. Take-home dataset defended live.
- **Spikes:** treat as a conversation (never silent-compute); pull baseline metrics before structuring; clarify horizon; challenge the interviewer's assumption as a thought-partner; flag the planted gap; scope to 2nd/3rd-order effects (Hire vs Strong-Hire line); make the number drive the call; volunteer rollout mechanics + stakeholders.
- **Red flags:** contradicting your own opening stance (worst move); silent "exam mode"; description without "why it matters"; **high-level strategy with no execution path (BizOps-specific instant downgrade)**; forgetting stakeholders; faking understanding of a term.
- **Sources:** tryexponent.com/blog/ace-the-bizops-interview · /guides/google-strategy-and-ops-interview · rocketblocks.me/guide/bizops/case-interviews.php · amandaswim (Medium) HM view · andypshi (Medium) tech business interviews.

## Guesstimate / Market-Sizing / Fermi (cross-track, applies at the `quant` stage)
- **Tells:** answers factual clarifiers plainly but withholds assumed inputs; feeds a real data point only when asked; "Seems reasonable"; "try a higher/lower number" (redirect, NOT a fail); "what is the logic to the number you popped out?"; "so what does that mean for the client?".
- **Stage timing:** 3-6 min standalone (2-3 embedded): ~30s clarify (interviewer SILENT — silence is the cue), 60-90s structure BEFORE math, 90-120s calc, ~60s sanity-check + implication. Only corrects an assumption mid-calc if visibly implausible; **candidate self-catching keeps them alive, interviewer catching first = negative**.
- **Spikes:** closed-ended clarify that controls the narrative; pick top-down vs bottom-up by naming the bottleneck; driver-THEN-number; formula with NO numbers first; round aggressively both directions; segment by behaviorally-distinct groups; sanity-check by collapsing to a per-capita/household number; triangulate two paths.
- **Red flags:** jumping to a number without structure (biggest); a lucky-correct number by pure guessing; absurd common-sense errors (100% phone penetration); base/anchor off by an order of magnitude (hard-fail); over-precision ("1,237,500"); silent arithmetic; computing a stock when annual new-sales was asked.
- **Mechanics:** scored on structure / assumption defensibility / math / sanity-check — **final-number proximity is the LOWEST-weighted**; tolerance ≈ correct order of magnitude / ~20%. India: anchor ~1.4B, urban ~30-40%, income tiers, Pareto, rupees, cross-check a published report.
- **Sources:** streetofwalls.com guesstimate cases (Indian Monopoly transcript) · mconsultingprep.com market-sizing · roadtooffer.com/blog/guesstimate-interview-questions · admitstreet.com ISB (India) · insideiim.com guesstimate · rocketblocks.me/blog/market-sizing-case-questions.php · preplounge.com market-sizing.
