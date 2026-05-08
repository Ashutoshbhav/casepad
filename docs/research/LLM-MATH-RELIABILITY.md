# LLM Math Reliability — Production Patterns
> Research compiled 2026-05-08 from arxiv + Anthropic/OpenAI/Groq docs + production case studies.
> Target: CasePad (Groq Llama 3.3-70b free tier) — eliminate flip-flopping on committed numbers across long case-interview turns.

**Failure being addressed:** AI-Bain-EM persona flip-flopped 4 times across 8 turns (Turn 18: $188K → Turn 22: same answer w/ different math → Turn 30: unjustified $1.875M → Turn 32: self-correct → Turn 36: contradicts both). Destroys candidate trust.

---

## 1. Why LLMs flip-flop on numbers

Five compounding root causes, each documented in peer-reviewed work:

### 1.1 Tokenization fragmentation of numbers
Numbers like "125,000" or "$1.875M" get split inconsistently across BPE token boundaries. Llama-family tokenizers split digit groups irregularly, so the model has no stable internal representation of magnitude. Writing "1.875M" one turn and "188K" the next puts these into different embedding regions — the model literally does not "see" them as comparable quantities.
- Source: [IGC: Integrating a Gated Calculator into an LLM (2025)](https://arxiv.org/html/2501.00684v1) — explicitly motivates calculator integration by tokenization-induced numeric instability; achieves near-perfect generalization on BigBench Arithmetic by routing math through a deterministic gate.

### 1.2 Working-memory drift in long contexts ("lost in the middle")
Two converging findings:
- Liu et al. (2023, TACL 2024) — "Lost in the Middle": performance is highest when relevant info is at the **beginning or end** of context; degrades sharply in the middle. Attention is disproportionately allocated to initial tokens regardless of relevance. ([arxiv 2307.03172](https://arxiv.org/abs/2307.03172))
- Oct 2025: relational-reasoning drift starts at **2,000–2,500 tokens**, far below nominal context windows. Edge/relation tasks (which "buyers × price = revenue" structurally is) degrade fastest. ([arxiv 2510.03611](https://arxiv.org/abs/2510.03611))

CasePad turn 30 is comfortably 3K–5K tokens — squarely in the drift zone, with the committed Turn-18 number ($188K) buried in the middle.

### 1.3 Sycophancy bias toward the user's most-recent number
RLHF training rewards agreement; the model is biased to mirror the candidate's last-stated number even when wrong. This is the dominant flip-flop driver in tutoring/interview contexts.
- Source: [Sycophancy in LLMs: Causes and Mitigations (arxiv 2411.15287)](https://arxiv.org/html/2411.15287v1) — "sycophancy is an artifact of RLHF... model rewarded for generating responses preferred by evaluators."
- Source: [When helpfulness backfires — Nature npj Digital Medicine 2025](https://www.nature.com/articles/s41746-025-02008-z) — sycophancy specifically degrades factual numeric accuracy in domain-expert roleplay (directly analogous to CasePad's Bain-EM persona).
- **Concrete prior art:** [Khanmigo flip-flopped on Algebra 2 negative-exponent answers, only agreeing after the user typed the correct answer 3 times](https://www.kqed.org/mindshift/64532/researchers-combat-ai-hallucinations-in-math); also asserted 5479.94173 × 0.557680043 ≈ 33.07 (true answer ≈ 3,056). Same pattern as CasePad.

### 1.4 No verification mechanism
Stock chat completion is one forward pass and commit. No reread, no recompute, no consistency check against earlier turns.
- Source: [HERMES: Towards Efficient and Verifiable Mathematical Reasoning (arxiv 2511.18760)](https://arxiv.org/pdf/2511.18760) — adding a per-step verifier yields **+14% avg, up to +67% on AIME'25 with 80% less compute**.

### 1.5 Chain-of-thought is lossy / unfaithful
Even when CoT is shown, it doesn't reflect the model's actual computation. The model can "show work" that looks correct while the answer drifts.
- Source: [Chain-of-Thought Is Not Explainability (Oxford WhiteBox, 2025)](https://aigi.ox.ac.uk/wp-content/uploads/2025/07/Cot_Is_Not_Explainability.pdf) — CoT is a "selective and often lossy projection of internal computation."
- Source: [The Illusion of Thinking (Apple ML, 2025)](https://ml-site.cdn-apple.com/papers/the-illusion-of-thinking.pdf) — "complete performance collapse" at high complexity even for thinking models.

---

## 2. Production patterns ranked by ROI

For each pattern: how it works, cost, complexity, expected gain, real-world examples, and CasePad-specific implementation.

### Pattern A — Scratchpad / structured CoT before answer
**How it works.** Force the model to emit a `<thinking>` block (or hidden reasoning channel) **before** committing to the visible answer. Anthropic's prompt-engineering guide and the interactive tutorial both make this the canonical first move for math.
- Anthropic recommends three levels: Basic ("think step-by-step"), Guided (outline reasoning steps), **Structured** (XML tags `<thinking>...</thinking><answer>...</answer>` so you can programmatically extract the answer while keeping the trace for debug). ([Anthropic prompt-eng docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-of-thought))
- Adding "Before you finish, verify your answer against [criteria]" is documented to "catch errors reliably, especially for coding and math." ([Anthropic best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices))

**Cost on Groq Llama 3.3-70b.** Negligible. At 305 t/s output speed and $0.79/1M output tokens ([Artificial Analysis](https://artificialanalysis.ai/models/llama-3-3-instruct-70b/providers)), a 300-token thinking block adds ~1s and ~$0.00024 per turn. Free-tier rate-limits, not cost, are the binding constraint.

**Complexity.** Trivial — pure prompt change.

**Expected gain.** Well-established 10–30% absolute accuracy lift on GSM8K-style problems. **Caveat:** does NOT solve flip-flop alone — CoT can be unfaithful and drift across turns the same way prose does. Necessary but insufficient.

**CasePad implementation.** Wrap every math turn with:
```
<thinking>
1. Recall committed numbers from prior turns: ...
2. New input from candidate: ...
3. Recompute: ... = ...
4. Reconcile against committed: matches? if not, flag explicitly.
</thinking>
<answer>...</answer>
```

### Pattern B — Structured math output (JSON-schema-enforced)
**How it works.** Constrained decoding (XGrammar / Outlines / Groq native JSON mode) forces the model to emit a strict JSON object: `{ "operation": "multiply", "operands": [125000, 1.50], "result": 187500, "unit": "USD" }`. Then your server validates `result == operands[0] * operands[1]` and recomputes if mismatched. Constrained decoding masks invalid tokens at every step, mathematically guaranteeing schema conformance. ([XGrammar / vLLM docs](https://docs.vllm.ai/en/latest/features/structured_outputs/), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs))

**When to use.** Whenever a math step is being **committed** (e.g., the AI computes market size, or values a sub-tree). Don't use for free-form coaching prose.

**When overkill.** Open-ended Socratic prompts ("what do you think drives demand here?").

**CasePad implementation.** Two-call pattern:
1. Free-form Bain-EM coaching prose (existing).
2. When the prose contains a numeric commitment, a second small Groq call with `response_format: { type: "json_schema", json_schema: MathStepSchema }` extracts and validates. Server-side: assert `abs(result - eval(operation, operands)) < epsilon` else regenerate. Llama-3.1-8b-instant is fine for this validation pass — $0.06/1M tokens, ~5–10K tps on Groq.

### Pattern C — External tool use (calculator / Python sandbox)
**How it works.** Model emits a tool-call (`calculator(125000 * 1.50)`); tool runs deterministically; result is fed back. All 9 Groq models — including Llama 3.3-70b — support function calling natively. ([Groq tool-use docs](https://console.groq.com/docs/tool-use), [Groq Llama-3-tool-use blog](https://groq.com/blog/introducing-llama-3-groq-tool-use-models))

**Latency cost.** One extra round-trip. On Groq at 305 t/s, the tool-call decision + parameter emission is ~50–100 tokens (~0.3s); local calculator execution is microseconds; the response with tool result is another forward pass (~0.5–1s). **Total ~1–1.5s overhead per math step** — well within UX budget for a "thinking..." indicator.

**Free-tier feasibility.** Yes — Groq free tier supports tool use on Llama 3.3-70b. No additional account/key needed.

**Real-world.** Khanmigo's recent reliability gains came largely from offloading arithmetic to deterministic backends ([Hechinger Report](https://hechingerreport.org/proof-points-combat-ai-hallucinations-math/)).

**CasePad implementation.** Define one tool: `compute(expression: string, label: string) -> { value, unit, expression }`. Server stores label→value in session state (this doubles as Pattern D's registry). Forbid the model from emitting a final number that wasn't returned by `compute()`.

### Pattern D — Working-memory anchors (committed-number registry)
**How it works.** Maintain an explicit JSON state object outside the model — a **number registry** — and inject it into every system message. Examples:
```json
{
  "committed_numbers": {
    "buyers": { "value": 125000, "source_turn": 18, "computed_from": "125M readers × 10% interest × 1% conversion" },
    "price_per_copy": { "value": 1.50, "source_turn": 18, "unit": "USD" },
    "annual_revenue": { "value": 187500, "source_turn": 18, "unit": "USD", "expression": "125000 * 1.50" }
  }
}
```
This addresses the **lost-in-the-middle problem directly**: the registry is re-injected at the *start* of every system prompt (high-attention zone) and at the *end* (also high-attention), bypassing middle-zone drift entirely.

**Production prior art.**
- [StateAct (arxiv 2410.02810)](https://arxiv.org/abs/2410.02810) — chain-of-states framework that tracks state info; +10% Alfworld, +30% Textcraft, +7% Webshop over ReAct.
- [Zep / Mem0 / Nemori](https://www.getzep.com/) — production memory systems that maintain typed fact graphs; old facts are *invalidated* (not just appended) when contradicted, which is exactly the protocol CasePad needs for self-corrections.
- LangChain's "scratchpad" / "agent state" abstraction is the canonical OSS implementation.

**Complexity.** Medium. Requires a server-side store keyed by session, an extraction step (Pattern B does this for free), and a render step that converts registry → system-prompt section.

**Expected gain.** This is the single highest-ROI pattern for CasePad's specific failure. The flip-flop happens because the model *forgot* what was committed. A registry makes forgetting impossible because the value is re-inserted in the high-attention zone of every turn.

### Pattern E — Self-consistency / multi-sample voting
**How it works.** Sample N reasoning paths at temperature > 0; majority-vote the final answers. Wang et al. (2022) — the seminal paper — showed major GSM8K and SVAMP gains. ([arxiv 2203.11171](https://arxiv.org/abs/2203.11171))

**Cost.** N× tokens and latency. With Groq's speed it's tolerable (3 samples × ~1s = ~3s) but **3× the rate-limit consumption** — meaningful on free tier.

**Reliability gain (literature).** [Confidence Improves Self-Consistency (arxiv 2502.06233)](https://arxiv.org/pdf/2502.06233) and [Self-Consistency Boosts Calibration for Math Reasoning (arxiv 2403.09849)](https://arxiv.org/abs/2403.09849) — typical +5–15% on math benchmarks; gain saturates at N=5–10. [Optimal Self-Consistency (arxiv 2511.12309)](https://arxiv.org/pdf/2511.12309) shows N=3 captures ~70% of the lift.

**CasePad recommendation.** Skip for production turns (cost). Use as a **debug/regression harness only** — replay a candidate's session 3× to detect non-deterministic flip-flops in CI.

### Pattern F — Specialized math models (DeepSeek-Math, Llemma, Phi-3, Qwen-Math)
**Free-tier accessibility.** None on Groq currently (Groq's catalog is Llama, Mixtral, Gemma, Qwen-32b but not the math-specialized variants). DeepSeek-Math is open-weights but you'd need self-hosting. Phi-3-mini is small enough to run locally but is weaker than Llama-3.3-70b on case-business reasoning.

**Tradeoff.** Specialized math models help with *competition-style* math (AIME), not *case-interview Fermi math*. The CasePad failure is about state tracking, not arithmetic competence — Llama 3.3-70b can multiply 125K × 1.5 fine; it just forgets it did. **Not worth the switching cost.**

### Pattern G — Two-pass critique (math-specific critic)
**How it works.** Primary model emits answer; a second cheaper model (Llama-3.1-8b-instant on Groq, $0.06/1M) is given just the math claims and the registry, and asked: "Does this answer contradict any committed number? Is the arithmetic correct? Output JSON: { ok: bool, errors: [...] }". If `ok==false`, regenerate with the errors injected.

**Cost.** ~$0.0001 per turn; ~300ms added latency on Groq.

**Why it works for CasePad.** The critic doesn't need case-interview competence — it just needs to do registry-diff and recompute arithmetic. 8b-instant is more than sufficient for that scoped task.

**Prior art.** HERMES (cited above), [Anthropic evaluator-agent pattern](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), OpenAI cookbook "self-critique" pattern.

---

## 3. Specific recommendations for CasePad

Given constraints (Groq Llama 3.3-70b free tier, no fine-tuning, zero-budget):

### Top 3 patterns to implement, ranked by ROI
1. **Pattern D — Number Registry** (highest ROI, directly addresses observed failure). Server-side session state of committed numbers, injected at top AND bottom of every system message. Without this, the other patterns don't compose because there's no canonical "what's committed" anchor.
2. **Pattern C — Calculator tool use** (medium-high ROI, eliminates arithmetic error class entirely). Single `compute()` tool. Forbid raw numeric assertions; require the model to route through the tool. Bonus: tool calls auto-populate the registry.
3. **Pattern G — 8b critic pass** (high ROI, low cost, robust last line of defense). Cheap, fast, scoped. Catches the residual cases where the model fabricates a number despite the tool.

Patterns A (scratchpad CoT) and B (structured output) are **prerequisites** to make D/C/G work, not standalone wins. Implement them as the connective tissue.

### Concrete prompt-engineering changes (copy-paste-ready)

**System prompt addition (top):**
```
COMMITTED NUMBERS (binding — do NOT contradict, do NOT recompute unless explicitly correcting):
{{committed_numbers_json}}

RULES OF MATH DISCIPLINE:
1. You are an EM at Bain. EMs do not flip-flop on numbers.
2. Every numeric claim must come from the `compute(expression, label)` tool. Never assert a number you did not compute this turn or that is not in COMMITTED NUMBERS.
3. If the candidate proposes a number that contradicts COMMITTED NUMBERS, you must explicitly say: "Earlier we committed to {label} = {value}. Are we revising that, or sticking with it?" — NEVER silently adopt their number.
4. If you realize an earlier committed number was wrong, you must explicitly say "I want to correct what I said in turn {N}. The right number is X because Y." This triggers a registry update.
5. Before stating a final number, output <thinking>: list the committed numbers you're using, the operation, the result. Then state the answer.
```

**System prompt addition (bottom — re-anchor against lost-in-the-middle):**
```
REMINDER — committed numbers this case:
{{committed_numbers_json_compact}}
Stay consistent with these.
```

### Concrete code architecture changes (file-level)

Based on typical Next.js 16 + Supabase CasePad layout:

| File | Change |
|---|---|
| `lib/case-state/registry.ts` (new) | `CommittedNumberRegistry` class: `commit(label, value, expr, sourceTurn)`, `revise(label, ...)`, `get(label)`, `toSystemPromptBlock()`. Persist in Supabase row keyed by session_id. |
| `lib/case-state/tools.ts` (new) | Define `compute` tool schema (JSON Schema for Groq). Implementation: parse expression with `mathjs` (deterministic), call `registry.commit()`, return `{ value, label, expression }`. |
| `app/api/chat/route.ts` | Inject registry block at top + compact tail of system message. Pass `tools: [computeTool]` to Groq. On `tool_calls` response, execute server-side, append result, re-call. |
| `lib/critic/math-critic.ts` (new) | Llama-3.1-8b-instant call with strict JSON output: takes assistant message + registry, returns `{ ok, errors[] }`. If `!ok`, regenerate primary with error injected. |
| `app/api/chat/route.ts` (post-stream) | After primary response, run critic. If fails, retry once with critic feedback, then surface. |
| `prompts/case-interview.md` | Add the math-discipline block above. |

LOC estimate: registry ~80, tools ~60, critic ~50, route changes ~40. **~230 LOC total.**

### What NOT to bother with
- **Pattern E (self-consistency)** in production — 3× rate-limit cost; replace with the registry, which addresses the same root cause more cheaply. Use it offline for regression CI only.
- **Pattern F (math-specialized models)** — wrong problem class; CasePad's bug is state tracking, not arithmetic.
- **Switching to a thinking model (o1, Claude Sonnet thinking)** — violates zero-budget; and per the [Apple "Illusion of Thinking" paper](https://ml-site.cdn-apple.com/papers/the-illusion-of-thinking.pdf), thinking models *also* collapse at high complexity. The registry is more reliable than longer reasoning.
- **Long-context tricks (RAG over chat history)** — overkill; the registry IS the salient long-term state. Don't reinvent it as retrieval.

---

## 4. Edge cases the patterns must handle

### 4.1 Candidate proposes a WRONG number
- The system prompt rule above forces explicit acknowledgement: "Earlier we committed to X. Are we revising?" Sycophancy is broken because the registry is in the high-attention zone of the prompt.
- The critic pass also flags any new number that contradicts the registry without going through a `revise()` call.

### 4.2 AI was wrong earlier — explicit-correction protocol
- The model MUST emit `revise(label, new_value, reason)` (a second tool, or a structured block) before stating the corrected number. The registry stores the revision history with `source_turn` and `revised_at_turn` so the dashboard can render an audit trail.
- This converts what is currently a flip-flop into a *first-class committed correction*.

### 4.3 Casebook has a fixed value chain
- Pre-seed the registry from the casebook on session start. E.g., for a publishing case: `{"market_size_readers": 125_000_000, "interest_rate": 0.10, ...}`. The model sees these as already-committed and cannot drift from them without explicit revision.
- This is identical to how [Zep / Mem0](https://www.getzep.com/) handle "facts known about the user" — pre-loading a typed fact graph.

### 4.4 Multi-step problem — committed sub-results
- Each `compute()` call commits its result to the registry under a label. Subsequent steps reference earlier labels by name (`compute("buyers * price_per_copy", "annual_revenue")`), not by re-typing the magic number.
- This pattern is borrowed from [StateAct's chain-of-states](https://arxiv.org/abs/2410.02810): treat the state object as the source of truth, not the prose.

---

## 5. Why chat math fails — what the literature says

### Top 5 papers/articles to read (priority order)
1. **[Lost in the Middle — Liu et al. (TACL 2024, arxiv 2307.03172)](https://arxiv.org/abs/2307.03172).** The foundational long-context attention paper. Explains *why* committed numbers from turn 18 get lost by turn 30. **Mitigation: re-inject at top + bottom.**
2. **[Sycophancy in LLMs: Causes and Mitigations (arxiv 2411.15287)](https://arxiv.org/html/2411.15287v1).** The RLHF-induced flip-flop driver. **Mitigation: explicit "challenge candidate's number" rule + registry as anchor.**
3. **[Self-Consistency Improves CoT — Wang et al. (arxiv 2203.11171)](https://arxiv.org/abs/2203.11171).** The original multi-sample voting paper; useful even if you skip it for prod, because it characterizes how *unstable* single-sample CoT is.
4. **[HERMES: Verifiable Math Reasoning (arxiv 2511.18760)](https://arxiv.org/pdf/2511.18760).** Strongest empirical case for verifier-augmented LLMs (+14% to +67% with 80% less compute). Direct justification for Pattern G.
5. **[StateAct: Self-prompting and State-tracking (arxiv 2410.02810)](https://arxiv.org/abs/2410.02810).** Closest published analog to the registry pattern. Read for the chain-of-states formalism.

### Key mechanisms named
- **Attention dilution in long contexts** — [Lost in the Middle](https://arxiv.org/abs/2307.03172) & [Found in the Middle (arxiv 2403.04797)](https://arxiv.org/html/2403.04797v1) (proposes a positional-encoding fix; not available on Groq Llama 3.3).
- **Number-token-position effects** — initial tokens get disproportionate attention regardless of relevance ([Lost in the Middle, §6](https://arxiv.org/abs/2307.03172)). This is **why** placing the registry at the very top of the system prompt works.
- **Memory drift onset at 2–2.5K tokens** — [Can an LLM Induce a Graph (arxiv 2510.03611)](https://arxiv.org/abs/2510.03611). Direct empirical bound on when state-tracking fails for relational tasks.
- **Lossy CoT** — [Chain-of-Thought Is Not Explainability (Oxford 2025)](https://aigi.ox.ac.uk/wp-content/uploads/2025/07/Cot_Is_Not_Explainability.pdf). Justifies why CoT alone is insufficient and external state is necessary.

---

## 6. Sources

### Primary papers
- Liu et al., *Lost in the Middle: How Language Models Use Long Contexts*, TACL 2024. https://arxiv.org/abs/2307.03172
- Wang et al., *Self-Consistency Improves Chain of Thought Reasoning*, ICLR 2023. https://arxiv.org/abs/2203.11171
- *Sycophancy in LLMs: Causes and Mitigations*, 2024. https://arxiv.org/html/2411.15287v1
- *StateAct: Enhancing LLM Base Agents via Self-prompting and State-tracking*, 2024. https://arxiv.org/abs/2410.02810
- *Can an LLM Induce a Graph? Memory Drift and Context Length*, Oct 2025. https://arxiv.org/abs/2510.03611
- *HERMES: Towards Efficient and Verifiable Mathematical Reasoning*, 2025. https://arxiv.org/pdf/2511.18760
- *IGC: Integrating a Gated Calculator into an LLM*, 2025. https://arxiv.org/html/2501.00684v1
- *Chain-of-Thought Is Not Explainability*, Oxford WhiteBox 2025. https://aigi.ox.ac.uk/wp-content/uploads/2025/07/Cot_Is_Not_Explainability.pdf
- *The Illusion of Thinking*, Apple ML 2025. https://ml-site.cdn-apple.com/papers/the-illusion-of-thinking.pdf
- *Confidence Improves Self-Consistency in LLMs*, 2025. https://arxiv.org/pdf/2502.06233
- *Self-Consistency Boosts Calibration for Math Reasoning*, 2024. https://arxiv.org/abs/2403.09849
- *Optimal Self-Consistency for Efficient Reasoning*, 2025. https://arxiv.org/pdf/2511.12309
- *When helpfulness backfires* (sycophancy in medicine), npj Digital Medicine 2025. https://www.nature.com/articles/s41746-025-02008-z

### Production docs
- Anthropic — Chain-of-Thought prompting. https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-of-thought
- Anthropic — Prompting best practices. https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Groq — Tool Use. https://console.groq.com/docs/tool-use
- Groq — Llama-3.3-70b-versatile model card. https://console.groq.com/docs/model/llama-3.3-70b-versatile
- Groq — Llama-3 tool-use blog. https://groq.com/blog/introducing-llama-3-groq-tool-use-models
- Artificial Analysis — Llama 3.3 70B provider benchmarks (Groq 305 t/s). https://artificialanalysis.ai/models/llama-3-3-instruct-70b/providers
- OpenAI — Structured Outputs guide. https://developers.openai.com/api/docs/guides/structured-outputs
- vLLM — Structured Outputs / XGrammar. https://docs.vllm.ai/en/latest/features/structured_outputs/

### Production case studies
- Khanmigo math hallucinations — KQED MindShift. https://www.kqed.org/mindshift/64532/researchers-combat-ai-hallucinations-in-math
- Khanmigo combat report — Hechinger Report. https://hechingerreport.org/proof-points-combat-ai-hallucinations-math/
- Replit Agent state-tracking incident — postmortem analysis. https://medium.com/@neerupujari5/inside-the-replit-ai-catastrophe-438e0f63b21c
- Zep memory platform (production registry analog). https://www.getzep.com/
- Memory & State in LLM Apps — Arize. https://arize.com/blog/memory-and-state-in-llm-applications/
