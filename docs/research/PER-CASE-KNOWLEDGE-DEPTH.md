# Per-Case Knowledge Depth — How AI Tutors Get Deep
> Research compiled 2026-05-08 from web + arxiv + production case studies. Time-boxed to 18 min, written for CasePad's 1,165-case Postgres deployment.

---

## 1. The "shallow chatbot" failure mode

**Why most AI tutors feel generic.** They concatenate (a) a generic tutor system prompt + (b) the immediate piece of content (the case prompt, the math problem, the lesson sentence) + (c) the user message, and ship it to a frontier LLM. The model has no per-content depth — it can only riff on the surface text it was handed. When a learner asks anything "off-page," it either hallucinates or — in well-guard-railed systems like CasePad today — bails with "I don't have data on that — what would you assume?".

That's the **knowledge-surface failure**: the tutor knows the *script* but doesn't know the *world the script lives in*. Khan Academy hit this exact wall in Khanmigo's first prototype: the model could give the answer but couldn't reliably reason about *why* a student was wrong, because it didn't have a per-problem mistake catalog. They had to explicitly engineer that as structured per-problem metadata before tutor-mode worked ([How We Built AI Tutoring Tools, Khan Academy](https://blog.khanacademy.org/how-we-built-ai-tutoring-tools/)).

**What "deep" actually means in the user's perception** (synthesized from the StudyFetch and Solvely customer stories on Anthropic, plus Praktika's OpenAI write-up):

1. The tutor seems to **already know** the company / industry / real-world numbers — not visibly look them up.
2. The tutor **anticipates** common wrong turns and addresses them before the candidate falls in.
3. The tutor can **place** the content in a wider context ("this is structurally similar to the airline hub-and-spoke case from 2018").
4. The tutor doesn't dodge factual questions with "what would you assume?" *every* time — that response is right for casebook math, but feels evasive for industry context.
5. The tutor's responses are **specific to this content**, not generic Wikipedia prose. Specificity is the tell.

Sources for §1:
- Khan Academy, "How We Built AI Tutoring Tools" — https://blog.khanacademy.org/how-we-built-ai-tutoring-tools/
- arxiv 2311.17696, "How to Build an Adaptive AI Tutor for Any Course Using KG-RAG" — https://arxiv.org/abs/2311.17696
- arxiv 2509.10697, "Survey on Retrieval And Structuring Augmented Generation" — https://arxiv.org/html/2509.10697v1
- Anthropic StudyFetch case — https://claude.com/customers/studyfetch
- OpenAI Praktika case — https://openai.com/index/praktika/

---

## 2. Production patterns for deep per-content knowledge

### Pattern A — Pre-computed content dossiers (the "knowledge card" pattern)

**What it is.** At build-time, run an LLM over each piece of content to produce a structured JSON enrichment: industry, company, real-world numbers, common mistakes, expected math, analogous content, deeper-dive questions, sources. Store as JSONB. At session start, inject the dossier as a system-prompt addendum. Update on a periodic cadence.

**Production proof points:**
- **Khanmigo** explicitly does per-content metadata — "selecting a content piece around which to build each lesson plan, giving Khanmigo access to ... metadata like standards alignment and linked prerequisite lessons" ([Khan Academy 7-step prompt engineering blog](https://blog.khanacademy.org/khan-academys-7-step-approach-to-prompt-engineering-for-khanmigo/)). Per-problem metadata for tutor-mode is the reason it can guess *why* a student is wrong.
- **Duolingo Max — Roleplay** has *humans write the per-scenario initial prompt and "tell the model where to take the conversation"* ([Duolingo blog, Duolingo Max](https://blog.duolingo.com/duolingo-max/)) — the "dossier" is the human-authored scenario script.
- **"Knowledge Card" framework** (NeurIPS-track paper, OpenReview WbWtOYIzIK) — formalizes plug-in per-domain knowledge attached at inference time, with a content-selector for relevance/brevity/factuality. Cited >100 times.
- **StudyFetch (Spark.E)** ingests user-uploaded lectures and pre-processes them; Claude is then handed structured content rather than raw transcripts ([Anthropic StudyFetch case](https://claude.com/customers/studyfetch)).

**Storage.** Per-case JSONB column or sidecar table. Retrieval at session-start, optionally per-turn for sub-fields.

**Cost shape.** One-time enrichment cost (very small with Groq 8b) + per-session token-injection cost (constant additive overhead). This is the single best ROI pattern for CasePad's setup.

---

### Pattern B — Curated FAQ per content (hypothetical-question retrieval)

**What it is.** For each piece of content, pre-compute "what 30 questions a learner is likely to ask" → answer each. At chat time, embed the user query, vector-match against the pre-computed questions, inject the matched answer.

**This is "Hypothetical Question Embeddings" — a standard advanced-RAG pattern.** Compare a user question to *embedded questions* (not embedded chunks); semantic match is much higher because both sides are the same shape. Each pre-computed Q-A maps 1:N to its source chunk; metadata stores the back-pointer ([glaforge.dev: Advanced RAG — Hypothetical Question Embedding](https://glaforge.dev/posts/2025/07/06/advanced-rag-hypothetical-question-embedding/), [PIXION: RAG Strategies Hypothetical Questions and HyDE](https://pixion.co/blog/rag-strategies-hypothetical-questions-hyde)).

**Production proof:** Duolingo's "Explain My Answer" is essentially this — for each lesson exercise, the system already knows the *common* wrong answers and has structured context to feed GPT-4 ("here's what they got wrong, here's what it should have been"). It's not arbitrary chat — it's pattern-matched against a curated set of failure modes ([Duolingo blog](https://blog.duolingo.com/duolingo-max/)).

**Cost shape.** Higher one-time enrichment (30 Q-A per case ≈ 30× the dossier cost) + small per-turn embedding lookup. Best used *layered on top of* Pattern A.

---

### Pattern C — Multi-source knowledge graph

**What it is.** Per content: company → financials → industry → competitors → analogous content. Graph nodes injected as bullet-list context per turn.

**Production proof:**
- arxiv 2311.17696 (KG-RAG for tutoring) — reports a **+35% increase in assessment scores** vs vanilla RAG on adaptive-tutor benchmark.
- arxiv 2509.10697 names this paradigm "Retrieval And Structuring (RAS)" and argues it is the dominant frontier replacing flat RAG.
- Brilliant.org publicly says "user knowledge modeling" is the unsolved problem they're working on ([Brilliant about](https://brilliant.org/about/), [Hand-crafted, machine-made](https://blog.brilliant.org/hand-crafted-machine-made/)) — a knowledge graph over content is the structural solve.

**For CasePad: high implementation cost, modest marginal payoff over Pattern A.** A graph adds value when content is densely cross-linked (lessons depend on prerequisites). Cases are mostly independent — graph value is mainly for "show me analogous cases," which can be done cheaper with embedding similarity over titles + prompts.

---

### Pattern D — Live web research per turn (Tavily / SerpAPI / Serper)

**What it is.** For factual questions the dossier didn't anticipate, hit a search API at chat time, summarize the top hit, inject as ad-hoc context.

**Free-tier reality (verified May 2026):**
- Tavily free: **1,000 credits/month**; basic search = 1 credit, advanced = 2 credits ([Tavily docs](https://docs.tavily.com/faq/faq), [Tavily pricing 2026](https://costbench.com/software/web-scraping/tavily/)).
- SerpAPI free: **250 calls/month** ([SerpAPI alternatives comparison](https://dev.to/ritza/best-serp-api-comparison-2025-serpapi-vs-exa-vs-tavily-vs-scrapingdog-vs-scrapingbee-2jci)).
- Serper: cheapest at scale — $0.27 per 1,000 queries vs Tavily $8/1k research-tier ([buildmvpfast AI search comparison 2026](https://www.buildmvpfast.com/api-costs/ai-search)).

**Latency hit.** 800–1500 ms per call. Painful in a Socratic chat that should feel sub-second.

**When it makes sense:** *fallback only*. Cover the obvious 80% with Pattern A; let live research handle the long-tail edge questions.

---

### Pattern E — Domain LLM fine-tuning

**Skipped for CasePad.** Groq doesn't expose fine-tuning. MathGPT (Mathpresso/Upstage) shows the upside — a 13B model with their proprietary tutoring data set a SOTA on GSM8K/MATH ([Meta blog: MathGPT](https://ai.meta.com/blog/llama-2-mathgpt-mathpresso-qanda-upstage-open-source-llm/)) — but it required them to license Llama-2 and run their own training infra. Not in scope at zero-budget.

---

### Pattern F — Hybrid (pre-computed + live)

**What it is.** Pattern A as the spine; Pattern B as the recall booster; Pattern D as the safety net.

This is what every mature production tutor converges on. Khanmigo: per-content metadata + pulled-in user/course context + live tools (calculator, exercise data) [(Khan Academy, How We Built)](https://blog.khanacademy.org/how-we-built-ai-tutoring-tools/). Praktika: lesson-context + memory layer + live transcription ([OpenAI Praktika](https://openai.com/index/praktika/)).

**For CasePad: this is the target architecture.** Hybrid (A + selective B + D-as-fallback) is the 12-month destination; A alone is the 1-week win.

---

## 3. What "tackle all the questions of the user" specifically means

Decomposed: candidate questions in CasePad fall into ~5 buckets.

| Bucket | Example | Today's answer | Pattern that fixes it |
|---|---|---|---|
| (a) Clarifications about the prompt | "What's the client's geographic footprint?" | Works — answered via `problem_statement` + `interviewer_notes` reveals | (already solved) |
| (b) Industry context | "What's the typical margin in book publishing?" | FAILS — "I don't have data on that" | **Pattern A (dossier)** |
| (c) Competitive intel | "Who else publishes business-on-China books?" | FAILS | **Pattern A (dossier)** |
| (d) Real-world facts | "How many copies does an average non-fiction sell?" | FAILS | **Pattern A (dossier)**, fallback **D (live)** |
| (e) Framework-specific guidance | "How should I think about pricing here?" | Partial — generic framework prose | **Pattern B (FAQ)** + dossier's `expected_math`/`common_mistakes` |

**Pattern A alone closes b/c/d.** Pattern B closes e and the long tail of a. Pattern D is the safety net when the dossier didn't anticipate something.

---

## 4. Concrete enrichment plan for CasePad

### Dossier schema (locked)

Proposed JSONB shape for new column `cases.dossier` (or sidecar table `case_dossiers` if migrations are expensive):

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-05-08T...",
  "model": "llama-3.3-70b-versatile",  // use 70b for enrichment quality, 8b for inference
  "industry": {
    "name": "Trade book publishing",
    "summary": "150-word industry primer",
    "typical_margins": "Gross margin 40–55%; net margin 5–10%",
    "key_economics": ["unit economics bullet 1", "..."],
    "regulatory_notes": "..."
  },
  "company_or_protagonist": {
    "name": "BizBooks Inc (or 'fictional client')",
    "real_world_analogues": ["Wiley", "HBR Press"],
    "scale_hints": "Mid-market US publisher, ~$50M revenue range"
  },
  "real_world_numbers": [
    {"claim": "Average non-fiction title sells 3,000 copies lifetime", "source": "Bowker 2023", "confidence": "medium"},
    {"claim": "Hardcover wholesale discount is 50–55%", "source": "Industry standard", "confidence": "high"}
  ],
  "expected_math": {
    "key_calculations": ["Annual revenue = price × units × titles", "Break-even at X copies"],
    "ballpark_answer": "$2–4M incremental profit",
    "common_calculation_mistakes": ["forgetting returns reserve (15–25%)", "using retail price instead of wholesale"]
  },
  "common_candidate_mistakes": [
    "Jumping to pricing without segmenting customer types",
    "Ignoring distribution channel economics",
    "Treating books like SaaS units"
  ],
  "analogous_cases": [
    {"case_id": "uuid-of-music-streaming-case", "why": "Both digital-distribution platform plays"}
  ],
  "anticipated_questions": [
    {"q": "What's the typical margin in book publishing?", "a": "Gross 40–55% on hardcovers; trade paperbacks lower."},
    {"q": "Who are the big 5 publishers?", "a": "Penguin Random House, HarperCollins, Simon & Schuster, Hachette, Macmillan."}
    // 20–30 entries
  ],
  "framework_hints": {
    "recommended_structure": "Profitability tree: Revenue (price × volume × mix) – Costs (fixed: editorial, marketing; variable: printing, royalties)",
    "alt_structures": ["3Cs", "Porter's"]
  },
  "sources": [
    "Built-in LLM knowledge (training cutoff)",
    "Tavily query 'book publishing margins' run on 2026-05-08"
  ],
  "ip_notes": "Industry primer is generic; case-specific numbers are LLM-generated, not lifted from copyrighted casebooks"
}
```

### Enrichment script spec

- **Inputs** (per case row): `title`, `problem_statement`, `ideal_structure`, `interviewer_notes`, `ideal_walkthrough`.
- **Model**: `llama-3.3-70b-versatile` for generation, prompted to output strict JSON matching the schema.
- **Validation**: parse JSON, validate against schema, retry once on parse failure, log permanently failed rows.
- **Idempotency**: skip rows where `dossier->>'schema_version' = '1'` and `generated_at` < 30 days old.
- **Storage**: `ALTER TABLE cases ADD COLUMN dossier JSONB`; GIN index on a few hot fields if needed.
- **Concurrency**: 4–8 parallel Groq calls; respect rate limit (Groq llama-3.3-70b free tier = 30 req/min, 6,000 tok/min — enrichment job will need ~10 min for 1,165 cases).

### Retrieval at chat time

- **Session start**: load `dossier.industry.summary`, `expected_math.ballpark_answer`, `common_candidate_mistakes`, `framework_hints` into the system prompt (≈400-600 tokens).
- **Per-turn (selective)**: if user message embeds-similar to any `anticipated_questions[].q` above threshold (e.g. cosine ≥ 0.78), inject the matched `a` as inline ground-truth. Otherwise pass through to current `interviewer_notes` keyword logic.
- **Fallback**: If neither hits and the question looks factual (NER for company / industry / number), call Tavily and append result as "fresh research:".

---

## 5. Implementation roadmap (priority order)

| When | Work | Outcome |
|---|---|---|
| **Day 1** | Dossier schema migration + enrichment script + manual run on 10 cases. Visual review. | Locked schema, validated quality. |
| **Day 2** | Add session-start dossier injection to chat route. Smoke-test: ask each of the 5 question buckets to a starter case. | Buckets b/c/d move from "I don't have data" to grounded answer. |
| **Day 3** | Run full enrichment across 1,165 cases. ~10–20 min wall time. | Coverage. |
| **Week 1** | Add `anticipated_questions` embedding lookup (Pattern B) per turn. | Bucket (e) and long-tail (a) covered. |
| **Week 2** | Add Tavily fallback for factual questions that miss A and B. Cap at 3 calls per session to stay free-tier. | Edge-case safety net. |
| **Week 3+** | Refresh cadence: re-enrich monthly for cases with stale industry numbers. Add `analogous_cases` cross-link via embedding similarity over `problem_statement`. | Quality maintenance. |

---

## 6. Cost analysis

### Build-time enrichment

- **Per case**: ~3,000 input tokens (case fields) + ~2,000 output tokens (dossier JSON) = 5,000 tokens.
- **Groq llama-3.3-70b-versatile free tier**: 30 req/min, 6,000 tokens/min cap. *(Verified from Ash's reference_groq_models memory note; live limits may shift — confirm before run.)*
- **At free-tier cap**: ~12 cases/min → 1,165 cases ≈ **97 min**, $0 cost.
- **If paid Groq tier** (≈ $0.59/M input, $0.79/M output): 1,165 × 5k tok ≈ 5.8M tokens ≈ **$4** total one-time. Negligible.

### Storage

- Per dossier ≈ 4–8 KB JSONB. 1,165 cases ≈ **5–10 MB**. Trivial for Neon/Supabase free tier.

### Per-turn cost increase

- System prompt addendum: ~500 tokens injected per turn, every turn.
- At Groq llama-3.1-8b-instant inference, current free tier handles this easily; cost is in the noise.

### Per-session Tavily fallback (Pattern D)

- Cap at 3 calls/session; at 1,000 free credits/month, supports ~330 sessions/month within free tier. If usage exceeds, Serper at $0.27/1k is the cheapest paid path ([buildmvpfast](https://www.buildmvpfast.com/api-costs/ai-search)).

### Bottom line

**Total one-time cost to get full deep-knowledge on all 1,165 cases: $0 (free Groq tier) to $4 (paid).** Storage trivial. Per-turn delta: ~500 tokens system-prompt overhead. This is the cheapest high-leverage move available.

---

## 7. What NOT to do (anti-patterns)

1. **Don't ship live web research as the *primary* knowledge source.** Latency is fatal in a chat tutor. Live research is a *safety net*, not a default. (Confirmed by Praktika's architecture — memory layer retrieves *after* the learner finishes speaking, never live web mid-turn ([OpenAI Praktika](https://openai.com/index/praktika/)).)
2. **Don't conflate `dossier` with `interviewer_notes`.** `interviewer_notes` are GATED reveals — drip-fed when the candidate asks a specific clarification. The `dossier` is **always-available context** behind the scenes. Different lifecycle, different access pattern, different fields. Keep them separate.
3. **Don't bake copyrighted casebook content into the dossier.** The dossier should be LLM-synthesized industry knowledge + structural hints, *not* lifted prose from Vault/Case-in-Point/Crafting-Cases beyond fair use. Add a `ip_notes` field (see schema) and review on the first 10 cases manually.
4. **Don't generate the dossier with the same model that runs inference.** Use Groq 70b for enrichment (one-time, quality-critical), 8b for chat inference (real-time, cost-critical). This is the same split MathPresso/Mathpresso uses — heavier model for offline, lighter for inference ([Meta MathGPT blog](https://ai.meta.com/blog/llama-2-mathgpt-mathpresso-qanda-upstage-open-source-llm/)).
5. **Don't try to build a full knowledge graph (Pattern C) before validating Pattern A works.** KG-RAG's +35% number ([arxiv 2311.17696](https://arxiv.org/abs/2311.17696)) is real but graph construction is 5–10× the engineering of a flat dossier and the marginal lift over flat-dossier-with-FAQ is unproven at CasePad's scale.
6. **Don't skip JSON schema validation on enrichment output.** Groq + structured output is reliable but not perfect. Pydantic / Zod validation + one retry is mandatory; otherwise corrupt JSONB poisons the chat path.

---

## 8. Edge cases

- **Candidate asks something the dossier doesn't cover.** Graceful fallback: (1) try anticipated_questions embedding match, (2) try Tavily, (3) fall through to current "what would you assume?" — but only as last resort, not default.
- **Dossier is stale (industry numbers shift).** Add `generated_at` field; show a "as of <date>" suffix when injecting numbers in chat. Refresh quarterly for the hot 100 cases (most-attempted), annually for the long tail. Cheap.
- **Case is fictional / non-real-company** (the bulk of CasePad's library). Dossier still works — `company_or_protagonist.real_world_analogues` should list the closest real companies, and `industry` fields use the *industry archetype* not the fictional firm. Validated by Khanmigo's approach to fictional word-problem characters — they treat the fictional context as a "scaffold" and reach for real-world analogues to ground reasoning ([Khan Academy 7-step](https://blog.khanacademy.org/khan-academys-7-step-approach-to-prompt-engineering-for-khanmigo/)).
- **IP / copyright.** The dossier should be:
  - LLM-synthesized industry knowledge → fine, that's the model's training data.
  - LLM-rephrased problem context → fine.
  - **Never** verbatim text from copyrighted casebooks, even in `anticipated_questions[].a` or `framework_hints`. Spot-check the first 10 dossiers manually.
  - For numerical claims, prefer `confidence: "low/medium/high"` flags and surface this to the user when the AI cites a number.
- **Hallucinated numbers in dossier** — the central failure mode. Mitigation: enrichment prompt explicitly says "If you are not sure, write 'unknown' instead of guessing"; audit a sample of 30 dossiers for fabricated stats before going wide. (This aligns with Ash's `feedback_no_assumptions` standing rule.)

---

## 9. Sources

### Production case studies
- Khan Academy, "How We Built AI Tutoring Tools" — https://blog.khanacademy.org/how-we-built-ai-tutoring-tools/
- Khan Academy, "7-Step Approach to Prompt Engineering for Khanmigo" — https://blog.khanacademy.org/khan-academys-7-step-approach-to-prompt-engineering-for-khanmigo/
- Duolingo blog, "Introducing Duolingo Max" — https://blog.duolingo.com/duolingo-max/
- OpenAI customer story, Duolingo — https://openai.com/index/duolingo/
- OpenAI customer story, Praktika — https://openai.com/index/praktika/
- Anthropic customer story, StudyFetch — https://claude.com/customers/studyfetch
- Anthropic customer story, Solvely — https://claude.com/customers/solvely
- Anthropic customer story, Super Teacher — https://claude.com/customers/super-teacher
- Brilliant blog, "Hand-crafted, machine-made" — https://blog.brilliant.org/hand-crafted-machine-made/
- Brilliant about page — https://brilliant.org/about/
- Meta AI blog, "MathGPT: Mathpresso/Qanda + Upstage" — https://ai.meta.com/blog/llama-2-mathgpt-mathpresso-qanda-upstage-open-source-llm/
- Synthesis Tutor — https://www.synthesis.com/tutor

### Case-interview-prep AI products (competitive landscape)
- CaseStudyPrep.AI — https://www.casestudyprep.ai/
- CaseWithAI — https://www.casewithai.com/
- RocketBlocks case library — https://www.rocketblocks.me/case-library.php

### Academic / arxiv
- arxiv 2311.17696, "How to Build an Adaptive AI Tutor for Any Course Using KG-RAG" — https://arxiv.org/abs/2311.17696 (reports +35% assessment-score lift)
- arxiv 2509.10697, "A Survey on Retrieval And Structuring Augmented Generation with LLMs" — https://arxiv.org/html/2509.10697v1
- arxiv 2506.22852, "Knowledge Augmented Finetuning Matters in both RAG and Agent Based Dialog Systems" — https://arxiv.org/html/2506.22852
- arxiv 2502.05467, "Position: LLMs Can be Good Tutors in Foreign Language Education" — https://arxiv.org/html/2502.05467v1
- arxiv 2503.06424, "Training LLM-based Tutors to Improve Student Learning Outcomes in Dialogues" — https://arxiv.org/html/2503.06424v2
- OpenReview WbWtOYIzIK, "Knowledge Card: Filling LLMs' Knowledge Gaps with Plug-in Specialized Language Models" — https://openreview.net/forum?id=WbWtOYIzIK
- LPITutor (RAG + prompt engineering) — https://pmc.ncbi.nlm.nih.gov/articles/PMC12453719/

### Pattern references
- Advanced RAG — Hypothetical Question Embedding (glaforge) — https://glaforge.dev/posts/2025/07/06/advanced-rag-hypothetical-question-embedding/
- PIXION — RAG Strategies: Hypothetical Questions and HyDE — https://pixion.co/blog/rag-strategies-hypothetical-questions-hyde
- GraphRAG — Hypothetical Question Retriever — https://graphrag.com/reference/graphrag/hypothetical-question-retriever/

### Live research / cost references
- Tavily docs / FAQ — https://docs.tavily.com/faq/faq
- buildmvpfast — AI search API costs (April 2026) — https://www.buildmvpfast.com/api-costs/ai-search
- dev.to — Best SERP API Comparison 2025 — https://dev.to/ritza/best-serp-api-comparison-2025-serpapi-vs-exa-vs-tavily-vs-scrapingdog-vs-scrapingbee-2jci
- Tiger Data — LLMs in Postgres with pgai — https://www.tigerdata.com/blog/use-open-source-llms-in-postgresql-with-ollama-and-pgai
- Anyscale — LLM Batch Inference Basics — https://docs.anyscale.com/llm/batch-inference/llm-batch-inference-basics
