# Ideal-Answer Playbooks — research provenance

**Built 2026-06-03** from a 21-agent parallel research fan-out, to power `generateIdealWalkthrough` (the "how a top candidate would solve this" section of the debrief).

**Canonical distillation (what the product actually uses):** `src/lib/groq/ideal-answer-playbooks.ts` — per-case-type `Playbook` (framework + anatomy + spike moves + common mistakes + checklist) + an always-on `CROSS_CUTTING` block (L0→L4 depth model, anti-slop bans, India grounding). Injected into the walkthrough prompt by case type. Tests: `tests/unit/groq/ideal-answer-playbooks.test.ts`.

## The 21 research lanes + primary sources
Each agent returned a structured playbook grounded in verified 2026 sources and/or the in-repo real-interview transcripts (`docs/research/case-sources/*.clean.txt`). Numbers labeled ESTIMATE where unverified.

| # | Lane | Key sources |
|---|---|---|
| 1 | Profitability | PrepLounge, MyConsultingCoach; FlashFash mock (`fuys5fWCxJM`) |
| 2 | Market entry | MConsultingPrep, IGotAnOffer; Wi-Fi mock (`bop5xv7FBDM`) |
| 3 | Pricing | Road to Offer, IGotAnOffer, CaseBasix |
| 4 | M&A | Road to Offer, PrepLounge; FlashFash mock (`fuys5fWCxJM`) |
| 5 | Operations | HackingTheCaseInterview, CaseBasix, Umbrex (cost-to-serve) |
| 6 | Consulting market-sizing | MConsultingPrep (`v5eKAmZuQzs`), Crafting Cases (`N5SLtfVoZAM`), Road to Offer |
| 7 | PM product sense | Exponent, ProdPad (CIRCLES), Huryn 2025 |
| 8 | PM metric-drop diagnostic | IGotAnOffer Meta mock (`-TNeIdOc1F8`), Exponent |
| 9 | PM estimation | Exponent, RocketBlocks, MyConsultingCoach |
| 10 | PM strategy | Exponent, Diego Granados (STEP) |
| 11 | IB technical | Wall Street Prep, Mergers & Inquisitions |
| 12 | IB behavioral / resume | M&I, Wall Street Prep |
| 13 | McKinsey PEI / fit | StrategyCase, Road to Offer, HackingTheCaseInterview |
| 14 | General behavioral STAR | Exponent (Amazon), Indeed, MIT CAPD |
| 15 | Marketing case | HackingTheCaseInterview, EagleRock (SaaS benchmarks), Umbrex |
| 16 | Hypothesis-driven solving | Crafting Cases, Victor Cheng; swift-fox mock (`dlozAlvJTls`) |
| 17 | MECE / issue-tree craft | Crafting Cases (5 ways to be MECE), My Consulting Offer; `dlozAlvJTls` |
| 18 | Synthesis & communication | CaseCoach, Victor Cheng, Management Consulted; `dlozAlvJTls`, `M0-c7rXzhwk` |
| 19 | Mental math / sanity-check | Road to Offer, HackingTheCaseInterview, PM Exercises |
| 20 | Expert-vs-textbook + India | IGotAnOffer, SEO.com (AI slop), Cornell/McKinsey India q-commerce; RESEARCH-INDEX + scored transcripts |
| 21 | Interviewer conduct & probing | RocketBlocks (`bop5xv7FBDM`), Cookie Co scored mock (`M0-c7rXzhwk`), `dlozAlvJTls`, `fuys5fWCxJM`, `N5SLtfVoZAM` |

## Cross-cutting findings folded into `CROSS_CUTTING`
- **L0→L4 depth model**: recommendation → drivers → evidence → risks → implementation. Textbook answers die at L1; expert answers reach L3–L4.
- **Answer-first / top-down** always; hypothesis-driven with a stated kill condition.
- **Anti-slop bans**: no ungrounded "synergy/leverage/holistic/robust/it's-not-just-X-it's-Y", no "pros and cons"/"it depends" hedging, no "they should consider"; every number sourced or labeled ESTIMATE; named company + real figure over "a leading player".
- **India grounding**: ₹/lakh/crore, real Indian players, SEBI/RBI; verified q-commerce data ($0.3B 2022 → $7.1B FY25; q-comm negative EBITDA vs offline grocers +5–8%).

> Lanes 11 (IB) and 15 (marketing) are included in the playbook map as extra keys even though they're outside the current `CaseType` enum, so they apply if `case_type` carries those values.
