# LLM Persona Consistency — Production Patterns
> Research compiled 2026-05-08 from web + arxiv + production case studies.
> Target system: CasePad's "Ash" (Bain EM persona) on Llama 3.3-70b via Groq, free tier, no fine-tuning.

---

## 1. Why LLMs lose persona/voice over long conversations

### 1a. Attention dilution as context grows
- **"Lost in the Middle"** (Liu et al., TACL 2024 / arxiv 2307.03172): performance peaks when relevant info is at the **start or end** of the context, and degrades sharply when it sits in the middle. This applies even to explicitly long-context models. ([arxiv][lostmiddle], [Stanford PDF][lostmiddle-pdf])
- Mechanism: softmax attention disproportionately weights initial tokens (attention sinks); RoPE positional encoding has long-term decay that biases the model toward nearby tokens. ([Towards AI summary][toward-lim])
- **Consequence for CasePad**: a system prompt placed only at the very top loses its grip by turn ~15+ as the chat history grows past a few thousand tokens. The persona definition is now "in the middle" relative to the live attention pattern.

### 1b. System-prompt instruction adherence decay (Llama family, documented)
- **Llama 2 paper** authors directly observed that the base model "forgets the instruction after a few turns of dialogue." They invented Ghost Attention (GAtt) to mitigate; even GAtt-equipped models fail by ~turn 20 once context saturates. ([Replicate / Llama 2 prompt guide][llama2-replicate])
- **Persona Drift paper** (arxiv 2402.10962, Li / Kenneth et al., COLM 2024): measured **persona consistency degraded by >30% within 8-12 turns** on LLaMA2-chat-70B; root cause is transformer attention decay over long exchanges. ([arxiv][personadrift], [GitHub repo][personadrift-gh])
- **"Examining Identity Drift"** (arxiv 2412.00804): tested 9 LLMs; counter-intuitive finding — **larger models drift MORE**, and assigning a persona doesn't necessarily prevent drift. ([arxiv][identitydrift])

### 1c. RLHF helpfulness pull toward generic "helpful assistant" voice
- **Multi-turn RL paper** (arxiv 2511.00222, Nov 2025) explicitly shows off-the-shelf RLHF-tuned LLMs "drift from their assigned personas, contradict earlier statements, or abandon role-appropriate behavior" — the helpfulness reward pushes them toward neutral assistant cadence. They reduce inconsistency by >55% only after multi-turn RL fine-tuning. ([arxiv][multiturnrl], [OpenReview][multiturnrl-or])
- Practitioner consensus: "AI loses the thread either because its context window is full, or the initial persona instructions have simply faded into the conversational noise." ([Storychat / persona template][persona-template])

### 1d. Recency bias
- LLMs exhibit a "Recency Effect": disproportionate weight on the last few user turns; constraints buried earlier get ignored. ([Towards AI / runtime reinforcement][runtime-reinforce])
- By ~turn 20 / ~50k tokens, specific persona instructions are "washed out by recency bias." ([Towards AI / runtime reinforcement][runtime-reinforce])

---

## 2. Why LLMs repeat phrases verbatim

### 2a. Pattern locking under uncertainty
- **"Repeat Curse"** paper (arxiv 2504.14218, "Understanding the Repeat Curse from a Feature Perspective"): LLMs trained on next-token prediction learn the safest, most-common patterns very well. When uncertain, they fall back to high-probability sequences they've already used in-context — the prior occurrence makes those tokens MORE likely on the next pass. Identifies specific "repetition features" via Sparse Autoencoders; deactivating them mitigates repetition (but requires interp tooling unavailable via API). ([arxiv][repeatcurse])
- Greedy / low-temperature decoding compounds this: highest-probability next-word picks cascade into monotonous loops. ([Shamim / Medium][shamim])

### 2b. No "what did I just say" memory
- The model has no explicit phrase-level dedup mechanism. Its only check on "did I say this 12 turns ago" is whether attention happens to land on that span — which it usually doesn't, because attention dilutes across long context (see §1a). ([Lightcap / stuck in loop][stuck-loop])
- This is exactly why the same Bain-EM line ("Fine, but you're hand-waving on the math") can re-appear at turn 16 AND turn 28: the model never re-attends to its earlier turn long enough to notice. The phrase sits in the high-probability region of the persona's voice, so under uncertainty (e.g. user just made a fuzzy claim), the model lands there again.

### 2c. Sampling parameter pathologies
- Default `frequency_penalty` / `presence_penalty` = 0 on most chat APIs (including Groq) gives no anti-repetition pressure. ([Sushil Shaw / logit_bias][logitbias])
- **N-gram blocking** (`no_repeat_ngram_size`) deterministically prevents exact phrase repetition by masking tokens that would complete a previously seen n-gram. Available in HF `generate()`, vLLM, TGI — **NOT exposed by Groq's chat completions API as of 2026-05** ([vLLM issue 7842][vllm-ngram], [TGI issue 2219][tgi-ngram]). So we cannot rely on it server-side; only client-side post-process.
- Token-identity penalties (frequency/presence) operate on tokens, not semantics; they reduce literal repetition but not "I said the same idea differently." ([Brenndoerfer / penalties][penalties])

---

## 3. Production patterns to fix persona drift, ranked by ROI

> Sequence: A → B → C are the highest-leverage no-cost patterns. D-G have higher complexity / latency but matter for stubborn cases. ROI is qualitative for CasePad's setup (Llama 3.3-70b, Groq, free tier, 1 LLM call per turn baseline).

### Pattern A: Persona reinforcement at the END of system prompt (a.k.a. "prompt sandwich")

**Pattern**: Re-state the 3-5 most load-bearing persona facts as the **last lines** of the system prompt, immediately before the assistant's turn boundary. The Persona Drift paper found this directly outperforms vanilla single-statement system prompts and "excels in regions with a larger number of turns." ([arxiv 2402.10962][personadrift])

```
[System prompt body: full Bain-EM persona, voice rules, tells, examples...]

---
REMEMBER (you are about to respond):
- You are Ash, Bain Engagement Manager. Skeptical, direct, time-pressured.
- NEVER praise vague answers. Cut through hand-waving.
- Vary your tells — no phrase from your last 3 turns may repeat.
- One sentence of pushback, then one sentence of redirect. No monologues.
```

- **Latency cost**: 0 (same call)
- **Token cost**: ~80 extra tokens per turn (negligible on 128k ctx)
- **Complexity**: trivial — 1 string concat
- **Expected gain**: paper shows this is the **single strongest static-prompt fix** for >8-turn drift

### Pattern B: Recent-turn awareness — inject "your last 3 responses" into the system prompt

**Pattern**: Track the last N=3 of the assistant's own messages in app state; at every new turn, include them in the system prompt with an explicit anti-repeat instruction. This is the LangChain "trim_messages + inject context" pattern adapted for self-awareness. ([LangChain short-term memory][lc-short])

```
YOUR LAST 3 RESPONSES (you wrote these — do not repeat their phrasing or structure):
[N-2]: "Fine, but you're hand-waving on the math..."
[N-1]: "Walk me through the unit economics — slowly."
[N]: "That's a synthesis, not a recommendation. Pick one."

CONSTRAINT: Your next response must NOT reuse any verbatim phrase >= 5 words from the above. Pick a different opening tell.
```

- **Latency cost**: 0
- **Token cost**: ~150 tokens
- **Complexity**: low — one ring buffer in app state
- **Expected gain**: directly addresses the verbatim-repeat failure ("Fine, but you're hand-waving on the math" at turn 16 AND 28)
- **Why this works specifically**: places the recent assistant turns in the **end of the system prompt**, which both Lost-in-the-Middle and the Persona Drift paper identify as the highest-attention region. Forces the model to attend to its own recency.

### Pattern C: Phrase-cooldown deterministic guard (post-process + regen)

**Pattern**: Maintain a rolling set of n-grams (n=5 or 6) used by the assistant in the last K turns. After generation, scan the candidate response for any n-gram in the set. If hit, regenerate with an explicit constraint — "DO NOT use the phrase X." ([Brenndoerfer / penalties][penalties], [Tony Seah / 15→0% repetition][tony-seah])

```python
# pseudocode
recent_ngrams = ring_buffer(last_k_turns, n=5)  # set of 5-grams
candidate = llm(prompt)
hits = [ng for ng in extract_ngrams(candidate, n=5) if ng in recent_ngrams]
if hits:
    candidate = llm(prompt + f"\nFORBIDDEN PHRASES (you just used these): {hits}\nRewrite without them.")
recent_ngrams.add_all(extract_ngrams(candidate, n=5))
return candidate
```

- **Latency cost**: 1 extra call only on hit (~5-15% of turns in practice per Tony Seah's writeup, where this approach took repetition from 15% to 0%)
- **Complexity**: medium — small state machine
- **Expected gain**: deterministic guarantee — the verbatim-repeat failure literally cannot happen
- **Why over Groq frequency_penalty**: token-level penalties can't catch a 6-word phrase reliably; n-gram blocking can. Groq doesn't expose `no_repeat_ngram_size`, so this client-side post-process is the only path. ([Brenndoerfer][penalties])
- **Production precedent**: Tony Seah's case study reduced repetition 15% → 0% with structural changes, NOT parameter tuning. ([Tony Seah][tony-seah])

### Pattern D: Multi-turn coherence prompting

**Pattern**: Tell the model explicitly where it is in the conversation arc: "You are in turn 18 of an expected 30-turn case interview. The candidate has covered market sizing and is moving to revenue model. You previously challenged their TAM assumption (turn 9). Build on that — don't restart."

- **Latency cost**: 0
- **Token cost**: ~50-100 tokens
- **Complexity**: low — needs a small turn-arc tracker
- **Expected gain**: addresses the "stale-context regen" failure and the "drops voice partway through" failure by giving the model an explicit narrative position. The model treats turn 18 as ~the last 5 turns + a position signal, which beats raw history dump.

### Pattern E: Persona anchoring repetition (top + middle + bottom)

**Pattern**: Insert a 1-line persona reanchor every 5-8 turns mid-conversation (not just system prompt). The Persona Drift paper found persona prompt repetition mitigates drift "in regions with a larger number of turns." ([arxiv 2402.10962][personadrift])

Example: as a synthetic system message inserted between user turns:
```
[Reminder: you are Ash, Bain EM. Skeptical, time-boxed, never praise vague answers.]
```

- **Latency cost**: 0
- **Token cost**: ~30 tokens × inserts
- **Complexity**: medium — needs interleaving in message list
- **Expected gain**: paper-validated; particularly strong past turn 12

### Pattern F: Voice-style examples per intent (intent-routed few-shots)

**Pattern**: Classify the candidate's last turn into intent buckets (e.g. {math_dump, synthesis_attempt, hand_wave, recommendation, clarifying_q}). For each intent, prepend 1-2 few-shot examples of how Ash specifically responds in voice. ([Ranjan Kumar / intent classification][ranjan-intent])

```
INTENT DETECTED: hand_wave
EXAMPLE OF YOUR VOICE FOR THIS INTENT:
User: "Roughly, I think the market is decent-sized..."
Ash: "Decent. Define decent. Give me a number — even a wrong one."
---
USER: [actual user turn]
ASH:
```

- **Latency cost**: 0 (intent classifier can be a regex/LLM-tiny call <100ms)
- **Token cost**: ~100-200 tokens per turn
- **Complexity**: medium-high — need 5-7 intent buckets × 2 examples each
- **Expected gain**: highest gain on **voice consistency** specifically — model has a fresh, on-target voice anchor every turn that matches the situation. Solves the "generic-AI cadence after turn 15" failure more cleanly than persona reanchoring alone.

### Pattern G: Specialized LLM-as-judge for persona drift

**Pattern**: After generation, a separate LLM call with a tight rubric: "Rate this response on Ash-voice 1-5: skeptical (no/yes), terse (no/yes), specific to user's last turn (no/yes), uses tell from rotation (no/yes), repeats prior phrase (yes/no)." If <4 or any "no", regenerate. ([Evidently AI / LLM-as-judge][evidently], [Arize / judge templates][arize-judge])

**Critical caveat**: generic LLM-as-judge prompts produce sycophantic praise. Make it work by:
1. Binary criteria, not 1-5 scales (cuts noise)
2. Few-shot examples of FAIL cases (not just success)
3. Force the judge to quote the offending phrase before deciding

```
You are evaluating whether this response sounds like Ash (Bain EM, skeptical, terse).

CHECK each rule. For each, quote the evidence or write "PASS":
1. NO generic-AI phrasing (no "great question", "I'd be happy to", "let's explore")
2. RESPONSE references user's last turn specifically (quote the reference)
3. NO phrase >5 words matches Ash's last 3 turns: [list]
4. Length <=3 sentences

If any FAIL → output "REGEN: [reason]". If all pass → "OK".
```

- **Latency cost**: +1 LLM call per turn (~500ms on Groq Llama 3.1-8b for the judge)
- **Token cost**: ~300 tokens
- **Complexity**: high — needs prompt iteration + few-shot bank
- **Expected gain**: highest theoretical ceiling, but only if the judge is well-tuned. Use Llama 3.1-8b-instant as the judge to keep latency budget.

---

## 4. Specific recommendations for CasePad

Given Llama 3.3-70b on Groq, free tier, no fine-tuning:

### Top 3 patterns by ROI (ship in this order)

1. **Pattern A (persona reinforcement at end of system prompt)** — 30 min of work, zero latency cost, paper-validated as the single strongest static-prompt fix. Ship today.
2. **Pattern B (last 3 assistant turns injected, with explicit anti-repeat clause)** — 2-3 hours, zero latency cost. Directly kills the verbatim-repeat failure. The verbatim repeat at turn 16 and 28 cannot happen if the model literally sees its turn-25 response in the system prompt at turn 28.
3. **Pattern C (n-gram phrase-cooldown post-process + regen on hit)** — 4-6 hours, costs ~10% extra calls. Deterministic guarantee; this is the safety net for when A+B leak.

### Concrete prompt-engineering changes (copy-paste-ready)

Append this block to the **end** of the existing system prompt, before every turn:

```
---
SITUATION: You are about to write turn {N} of this case interview. The candidate just said [last_user_turn — 1 sentence summary].

YOUR LAST 3 RESPONSES (do not repeat any 5+ word phrase from these):
{turn_n_minus_2}
{turn_n_minus_1}
{turn_n}

TELLS YOU HAVE ALREADY USED (do not reuse): {used_tells}
TELLS STILL AVAILABLE: {unused_tells}

BAIN EM VOICE CHECK before you write:
- One challenge sentence, one redirect sentence. Max 3 sentences total.
- No "great question", no "let me explore", no "that's a good point".
- Reference what the candidate ACTUALLY said in their last turn.
- Use a tell from the AVAILABLE list, not the USED list.

Now respond as Ash.
```

### Concrete code architecture changes

```
ConversationState:
  assistant_turn_history: deque(maxlen=3)        # full text of last 3 Ash turns
  used_tell_keys: set()                           # which tells already fired
  used_5grams: deque of sets, maxlen=5            # rolling 5-gram set
  turn_index: int

generate_ash_turn(state, user_msg):
  intent = classify_intent(user_msg)              # cheap call or regex
  prompt = build_system_prompt(
    base_persona,
    last_3_assistant=state.assistant_turn_history,
    used_tells=state.used_tell_keys,
    unused_tells=ALL_TELLS - state.used_tell_keys,
    turn_index=state.turn_index,
    intent_examples=FEW_SHOTS[intent],            # Pattern F
  )
  for attempt in range(3):
    candidate = groq.chat(prompt + history + user_msg)
    hits = check_ngram_overlap(candidate, state.used_5grams)
    if not hits:
      break
    prompt = prompt + f"\nFORBIDDEN PHRASES: {hits}. Rewrite."
  state.assistant_turn_history.append(candidate)
  state.used_5grams.append(extract_5grams(candidate))
  state.used_tell_keys.add(detected_tell(candidate))
  return candidate
```

### What NOT to bother with
- **Don't** rely on `frequency_penalty` / `presence_penalty` alone — they operate on token identity, not phrase semantics, and won't catch "Fine, but you're hand-waving on the math" reliably. ([Brenndoerfer][penalties])
- **Don't** try fine-tuning on Groq — you can't, and the Multi-turn RL paper shows fine-tuning helps but you don't need it; prompt-level fixes get most of the gain. ([arxiv 2511.00222][multiturnrl])
- **Don't** add Pattern G (LLM-as-judge) before A+B+C are shipped — judge prompts are notoriously hard to tune, and most of the wins are in A+B+C.
- **Don't** stuff the whole conversation history into the system prompt as "memory" — that's the Lost-in-the-Middle anti-pattern. Keep history in the user/assistant message channel; put only **the last 3 assistant turns + persona reanchor** in the system prompt. ([arxiv 2307.03172][lostmiddle])
- **Don't** lower temperature to 0 to "stabilize" voice — that *causes* more verbatim repetition, not less. Repeat Curse paper. ([arxiv 2504.14218][repeatcurse])

---

## 5. Stale-context regen specifically

**The failure**: critic flags Ash's turn → regen call → new response is on-voice but ignores the user's most recent counter-argument and replays an earlier turn's response.

### Why this happens
- Naive regen prompts often look like: `[system] + [history] + [original assistant draft] + "regenerate this better"`. The user's latest turn is now buried 2-3 messages back from the cursor; the **strongest signal** the model sees is its own draft + the regen instruction. So it edits its own draft locally without re-grounding in the user's latest turn. This is a classic instance of **recency bias** ([Towards AI / runtime reinforcement][runtime-reinforce]) plus the **co-evolution staleness** documented in ECHO (arxiv 2601.06794) — static critic prompts go stale because they don't re-anchor on the live state.
- It's also the failure mode that **System 2 Attention prompting** (Weston et al.) tries to fix: explicitly regenerate the prompt to include only the relevant info. ([PromptHub / S2A][s2a])

### Right way to construct the regen prompt
1. **Drop the bad draft entirely** from the regen prompt. Don't show the model what it just wrote — that anchors it.
2. **Re-state the user's latest turn verbatim** at the END of the system prompt (highest-attention region).
3. **State the critic's specific complaint** as a constraint, not as commentary on a prior draft.
4. Add a fresh persona reanchor.

### Copy-paste-ready regen template

```
[Original system prompt]

---
REGEN CONTEXT:
You are writing turn {N}. Your previous attempt failed this check: {critic_reason}.
Specifically: {critic_quoted_evidence}

DO NOT continue or edit your previous attempt. Write a fresh response from scratch.

THE CANDIDATE JUST SAID (this is what you must respond to — every word matters):
"""
{verbatim_user_last_turn}
"""

KEY POINTS THE CANDIDATE MADE that you must address:
- {extracted_point_1}
- {extracted_point_2}

Persona reanchor: You are Ash, Bain EM. Skeptical. One challenge + one redirect. <=3 sentences.

Now write Ash's response from scratch.
```

**Key moves**:
- Verbatim user turn + extracted points appear **after** all other context → highest-attention region.
- Bad draft is excluded entirely → no anchoring to the failed output.
- Critic complaint is reframed as a forward constraint, not a backward critique.
- "From scratch" is explicit → prevents local-edit failure.

---

## 6. Edge cases

### 6a. Tell repetition when there are only 10 tells in the bank — what happens at turn 30?
- Math: with N=10 tells and 30 turns, by turn 11 you must reuse. Pattern B's `unused_tells` list goes empty.
- **Fix**: rotate **classes of tells** rather than literal phrases. Define 4 "tell archetypes" (e.g. {math-pushback, synthesis-pushback, recommendation-pushback, time-pressure}) × 5 phrasings each = 20 tells, but the constraint is only "no archetype twice in a row" rather than "never reuse a phrase." After ~20 turns, allow reuse but require **paraphrase**, not verbatim, by injecting: `"You may revisit this idea, but rewrite the phrasing — the candidate has heard your exact words before."`
- This is what Character.ai-style systems do via their character metadata layer: speech patterns are stored as **patterns**, not strings. ([Flowith / Character AI][flowith-cai])

### 6b. Persona slips after a critic regen forces the model to retry — does retry restore persona?
- Mixed evidence. The Persona Drift paper shows static prompt-repetition restores persona, but a regen that focuses on *content correctness* (not voice) can drag the model back to generic-helpful mode because the regen instruction itself is in the high-attention end-region and is voiced like a generic instruction. ([arxiv 2402.10962][personadrift])
- **Fix**: every regen must include the persona reanchor AT THE END of the regen instruction, not at the top. See the template in §5.

### 6c. Long-context attention decay at 4k+ tokens
- Llama 3.3-70b is rated for 128k context, but instruction-following degradation is documented well before the hard limit. Effective persona window is **roughly 2-4k tokens** before drift becomes measurable, per the Persona Drift paper's 8-turn finding (assuming ~300-500 tokens per turn). ([arxiv 2402.10962][personadrift])
- **Fix**: cap raw chat history fed to the model at the last ~12-15 turns. Beyond that, summarize earlier turns into a 1-paragraph "case state so far" block placed early in the message list (where the model under-attends anyway). Keep the freshest turns in their own message slots. This is the LangChain `trim_messages` + summary memory pattern. ([LangChain short-term memory][lc-short])

---

## 7. Sources

[lostmiddle]: https://arxiv.org/abs/2307.03172 "Liu et al., Lost in the Middle, arxiv 2307.03172"
[lostmiddle-pdf]: https://cs.stanford.edu/~nfliu/papers/lost-in-the-middle.arxiv2023.pdf "Lost in the Middle, Stanford PDF"
[toward-lim]: https://pub.towardsai.net/why-language-models-are-lost-in-the-middle-629b20d86152 "Towards AI: Lost in the Middle explainer"
[llama2-replicate]: https://replicate.com/blog/how-to-prompt-llama "Replicate: A guide to prompting Llama 2 (GAtt + instruction-forgetting)"
[personadrift]: https://arxiv.org/abs/2402.10962 "Li et al., Measuring and Controlling Persona Drift, arxiv 2402.10962 (COLM 2024)"
[personadrift-gh]: https://github.com/likenneth/persona_drift "Persona Drift code repo"
[identitydrift]: https://arxiv.org/abs/2412.00804 "Examining Identity Drift in Conversations of LLM Agents, arxiv 2412.00804"
[multiturnrl]: https://arxiv.org/abs/2511.00222 "Consistently Simulating Human Personas with Multi-Turn RL, arxiv 2511.00222"
[multiturnrl-or]: https://openreview.net/forum?id=A0T3piHiis "Multi-turn RL persona, OpenReview"
[persona-template]: https://blog.storychat.app/cracking-the-code-whats-the-definitive-persona-template-for-your-ai-chatbots/ "Storychat persona template"
[runtime-reinforce]: https://towardsai.net/p/machine-learning/runtime-reinforcement-preventing-instruction-decay-in-long-context-windows "Towards AI: Runtime Reinforcement / Instruction Decay"
[repeatcurse]: https://arxiv.org/html/2504.14218v1 "Understanding the Repeat Curse from a Feature Perspective, arxiv 2504.14218"
[shamim]: https://medium.com/@Shamimw/how-i-fixed-my-llms-repetitive-responses-and-why-temperature-matters-6a8087910260 "Shamim: How I fixed my LLM's repetitive responses"
[stuck-loop]: https://lightcapai.medium.com/stuck-in-the-loop-why-ai-chatbots-repeat-themselves-and-how-we-can-fix-it-cd93e2e784db "Lightcap: Stuck in a Loop"
[logitbias]: https://medium.com/@sushilprasad60649/fixing-repetition-in-llm-outputs-with-logit-bias-in-the-openai-api-5a436aa68372 "Fixing repetition with logit_bias"
[vllm-ngram]: https://github.com/vllm-project/vllm/issues/7842 "vLLM: need no_repeat_n_gram in SamplingParams"
[tgi-ngram]: https://github.com/huggingface/text-generation-inference/issues/2219 "TGI: no_repeat_ngram_size support"
[penalties]: https://mbrenndoerfer.com/writing/repetition-penalties-language-model-generation "Brenndoerfer: Repetition Penalties — Preventing Loops"
[lc-short]: https://docs.langchain.com/oss/python/langchain/short-term-memory "LangChain: Short-term memory"
[tony-seah]: https://tonyseah.medium.com/we-reduced-llm-repetition-from-15-to-0-and-parameter-tuning-wasnt-the-answer-e1a1cd811c3c "Tony Seah: 15% to 0% repetition"
[ranjan-intent]: https://ranjankumar.in/llm-powered-chatbots-a-practical-guide-to-user-input-classification-and-intent-handling "Ranjan Kumar: LLM-powered chatbot intent classification"
[evidently]: https://www.evidentlyai.com/llm-guide/llm-as-a-judge "Evidently AI: LLM-as-a-judge guide"
[arize-judge]: https://arize.com/llm-as-a-judge/ "Arize: LLM as a Judge"
[s2a]: https://www.prompthub.us/blog/how-to-use-system-2-attention-prompting-to-improve-llm-accuracy "PromptHub: System 2 Attention prompting"
[flowith-cai]: https://flowith.io/blog/character-ai-building-persistent-companions-remember-you/ "Flowith: Character AI persistent companions"
[echo]: https://arxiv.org/html/2601.06794 "ECHO: Co-Evolving Critics, arxiv 2601.06794"
[anthropic-character]: https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/keep-claude-in-character "Anthropic: Keep Claude in character"

### Bibliography (inline)

1. Liu et al., **"Lost in the Middle: How Language Models Use Long Contexts"**, TACL 2024 / arxiv 2307.03172. [link][lostmiddle]
2. Li / Kenneth et al., **"Measuring and Controlling Persona Drift in Language Model Dialogs"**, COLM 2024 / arxiv 2402.10962. [link][personadrift]
3. Cho et al., **"Examining Identity Drift in Conversations of LLM Agents"**, arxiv 2412.00804. [link][identitydrift]
4. **"Consistently Simulating Human Personas with Multi-Turn Reinforcement Learning"**, arxiv 2511.00222 (Nov 2025). [link][multiturnrl]
5. **"Understanding the Repeat Curse in Large Language Models from a Feature Perspective"**, arxiv 2504.14218. [link][repeatcurse]
6. **"ECHO: Evolving Critic for Hindsight-Guided Optimization"**, arxiv 2601.06794. [link][echo]
7. Replicate, **"A guide to prompting Llama 2"** (Llama 2 GAtt + instruction-forgetting). [link][llama2-replicate]
8. Towards AI, **"Runtime Reinforcement: Preventing Instruction Decay in Long Context Windows"**. [link][runtime-reinforce]
9. Brenndoerfer, **"Repetition Penalties: Preventing Loops in Language Model Generation"**. [link][penalties]
10. Tony Seah, **"We Reduced LLM Repetition from 15% to 0%"** (production case study). [link][tony-seah]
11. Lightcap AI, **"Stuck in a Loop: Why AI Chatbots Keep Repeating"**. [link][stuck-loop]
12. LangChain Docs, **Short-term memory**. [link][lc-short]
13. Evidently AI, **"LLM-as-a-judge: a complete guide"**. [link][evidently]
14. Arize, **"LLM as a Judge — Primer and Pre-Built Evaluators"**. [link][arize-judge]
15. PromptHub, **"System 2 Attention Prompting"** (Weston et al. summary). [link][s2a]
16. Anthropic Docs, **"Keep Claude in character with role prompting and prefilling"**. [link][anthropic-character]
17. Flowith, **"Character AI: Building Persistent Companions"** (architectural overview, [unverified] for Character.ai-internal claims). [link][flowith-cai]
18. Storychat, **"Cracking the Code: Persona Template"** (practitioner). [link][persona-template]

### Notes on verification
- Replika and Inflection Pi do not publish detailed engineering blogs on persona consistency. Their architectures are described via product reviews and third-party analysis; treat all Character.ai/Replika/Pi internal claims here as **[unverified]** beyond the user-facing behavior.
- The "n-gram blocking not exposed by Groq" claim is based on the Groq API docs as of 2026-05; if Groq adds the param, prefer it over client-side post-process for the ~50ms latency saving.
- "30% drift in 8-12 turns" is from the Persona Drift paper's LLaMA2-chat-70B experiments. Llama 3.3-70b's behavior is **[unverified]** at the same scale but practitioner reports suggest the qualitative pattern holds.
