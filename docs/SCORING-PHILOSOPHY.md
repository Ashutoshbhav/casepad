# CasePad — Scoring Philosophy & Anti-Generic-Response Design
> Compiled 2026-05-08. Answers Ash's question on scoring divergent answers + preventing generic AI responses.
> Status: DRAFT — being filled in incrementally. Final version ~12 min from start.

---

## TL;DR (read this first)

1. **Don't score "did the candidate match the casebook." Score the 5 dimensions a real EM scores: structure, quant, business judgment, communication, composure.** The casebook is a *reference solution*, not *the* answer. Divergence is only an error when it's *unsupported* — not when it's *different*.
2. **Generic AI response is a prompt-engineering problem, not a model problem.** Defeat it with: hard persona anchoring, banned-phrase list, length caps, forced-action cadence ("ask one question OR push back, never coach"), and few-shot rewrites of weak→strong responses.
3. **Trust comes from triangulated calibration:** (a) LLM-as-judge on 7 failure modes every session — cheap, continuous; (b) ex-MBB human raters spot-check 5–10 transcripts/week — slow, expensive, ground truth; (c) cohort signal — score-improvement curve, completion, abandonment. Start with (a)+(b) week-one, layer (c) once you have 50+ users.

---

## Part 1 — The "many right answers" problem

### 1.1 What real MBB interviewers actually score on

Across McKinsey, BCG, and Bain, public sources converge on a multi-dimensional rubric — *not* a single right-answer match.

**McKinsey's published evaluation** uses a 4-point scale (1=Insufficient, 2=Adequate, 3=Good, 4=Very Good) across three official dimensions: **analytical thinking, conceptual thinking, quantitative thinking**. Per-question scoring — you must "pass" each segment, not just the aggregate. [Sources: caseinterviewhub.com, hackingthecaseinterview.com, managementconsulted.com]

**BCG and Bain** aggregate at end-of-case across roughly **5–7 dimensions**. The most cited canonical six (per CraftingCases, MyConsultingCoach, StrategyCase) are:
- **Structuring** (MECE, hypothesis-driven, *tailored to this case* — generic frameworks penalized)
- **Math / quantitative reasoning** (accuracy, sanity checks, scale-of-magnitude)
- **Judgment & insights** (commercial realism + the highly-rated "we're focused on the wrong problem" insight type)
- **Creativity** (non-obvious hypotheses, second-order effects)
- **Synthesis** (top-down recommendation, executive summary, "so what")
- **Case leadership / personal impact** (composure, drive, recovery from pushback)

Note: "tailored structure" is itself a marker — *if your structure could be applied to any other case of this type, it's penalized*. [Source: caseinterview.com, craftingcases.com] This directly informs CasePad's scoring of generic AI-generated frameworks.

**The single most cited differentiator across all sources:** *tying every answer back to the case objective*. The candidate who says "so this means…" after every calculation beats the candidate who reports the number and stops. [Sources: roadtooffer.com, casebasix.com, igotanoffer.com]

**Critical phrase from multiple ex-MBBs:** "Your recommendation does not need to be right. It needs to be logical, supported by the data you analyzed, and clearly communicated." [Source: hackingthecaseinterview.com] This single sentence is the foundation of CasePad's scoring philosophy.

**The "insight types" that get rewarded:** Per Victor Cheng (caseinterview.com), there are two flavors of insight that distinguish offer-zone candidates:
1. **Positive insight** — noticing an opportunity not previously apparent (e.g., "customers value this product more than the team thinks").
2. **"Wrong problem" insight** — recognizing the case as posed is asking the wrong question. *This is the highest-value insight type and the one most likely to indicate a divergent-but-correct path.*

Implication for CasePad: when the AI detects a candidate reframing the problem ("I think the real issue here isn't X, it's Y"), this should trigger an **INSIGHTFUL** tag — *not* a "stick to the prompt" pushback.

### 1.2 Taxonomy of "different but right" vs "wrong"

A 2×2 framework — every candidate response falls into one of four quadrants:

```
                    HYPOTHESIS-ANCHORED          WANDERING / UNANCHORED
                    ───────────────────          ──────────────────────
MECE / STRUCTURED   [A] INSIGHTFUL DIVERGENCE    [B] SMART BUT LOST
                    Reward. Score above casebook  Neutral-to-positive on structure,
                    if logic is tighter.          flag for hypothesis discipline.

NOT MECE /          [C] ALTERNATIVE PATH         [D] ACTUAL ERROR
UNSTRUCTURED        Neutral. Score on whether    Penalize. This is the only
                    the alternative buckets are   quadrant where divergence =
                    defensible.                   wrong.
```

**Worked example mapping:**
- [A] Casebook says "revenue side then cost side." Candidate says "let's frame this as a customer-LTV problem, since the case is about churn." → **Reward** if churn is in fact the dominant driver. Better than the casebook.
- [B] Candidate has a clear hypothesis ("I think it's a pricing issue") but their buckets aren't MECE (e.g., "pricing, marketing, product features" — overlaps). → Score *high on hypothesis*, *medium on structure*. Surface the overlap as feedback.
- [C] Casebook says profitability framework; candidate uses a 3C+P framework. Both work for a market-entry case. → **Neutral.** Score on execution within the chosen frame.
- [D] Candidate says "let me list every possible factor" with no hypothesis, no priority, and the buckets overlap. → **Penalize.** This is the only "wrong."

### 1.3 How divergence from the casebook should be scored — decision rules

Three tags for any candidate move that diverges from the casebook:

1. **INSIGHTFUL** — divergence reveals deeper insight than the casebook (e.g., spotting a 2nd-order effect the casebook ignores, or proposing a sharper hypothesis). → Reward: +1 to +2 on the relevant dimension.
2. **ALTERNATIVE** — divergence is a defensible alternative path that gets to a similar conclusion. → Neutral: score on execution within the alternative.
3. **ERROR** — divergence is unsupported, illogical, or breaks MECE. → Penalize on the relevant dimension.

**Worked examples across case types:**

| Case type | Casebook says | Candidate says | Tag | Why |
|---|---|---|---|---|
| Profitability | Revenue/cost decomposition | "Let me check if this is a volume issue first since the industry is contracting" | INSIGHTFUL | Hypothesis-led shortcut to the right area |
| Market entry | 3C + competitive response | "Customer JTBD analysis only — I think customer fit dominates here" | ALTERNATIVE | Defensible if executed well; flag if customer fit isn't actually the bottleneck |
| M&A | Synergies + valuation | "Synergies first — but I'd front-load cultural integration risk" | INSIGHTFUL | Adds a dimension the casebook missed |
| Pricing | Cost-plus / value-based / competitor | "Let's just run the numbers on a 10% increase" | ERROR | No structure, no hypothesis — jumps to math |
| Market sizing | Top-down population-based | Bottom-up from supply side | ALTERNATIVE | Both valid; score on math accuracy + sanity check |

---

## Part 2 — How CasePad should score (concrete rubric)

### 2.1 Proposed 5-dimension scoring (each 0–10)

| Dim | Name | What it captures | Weight |
|---|---|---|---|
| D1 | **Structure** | MECE buckets, hypothesis-driven, depth of decomposition, signposted upfront | 25% |
| D2 | **Quant rigor** | Math accuracy, sanity checks, scale-of-magnitude awareness, confident with mental arithmetic | 20% |
| D3 | **Business judgment** | Insight depth, pattern recognition, commercial realism, "so what" tied to objective | 25% |
| D4 | **Communication** | Top-down, signposting, executive summary, brevity, no rambling | 15% |
| D5 | **Composure / drive** | Recovery after pushback, ownership of mistakes, energy, push-back without folding | 15% |

Each scored 0–10 with anchored descriptors:
- **0–3:** Below MBB bar. Would not advance.
- **4–6:** Borderline. Would advance with concerns.
- **7–8:** Solid offer-zone.
- **9–10:** Top decile. Strong offer signal.

### 2.2 Why dimensional > single-score

A single score (e.g., "7/10 overall") tells the candidate nothing about *what to fix*. Dimensional scores let CasePad generate targeted drills: low D2 → math drill; low D4 → synthesis drill. This is the entire product moat — feedback that compounds.

[opinion] Single-number scoring is also a hallucination magnet for LLMs. The model picks a number that "feels right" with no auditable trail. Dimension scores force the model to commit to evidence per dimension, which is debuggable.

### 2.3 Handling "candidate beats the casebook" — AI must reward, not penalize, divergence

**Rule that goes into the system prompt verbatim:**

> "The casebook solution is a *reference*, not an answer key. If the candidate's structure, hypothesis, or recommendation diverges from the casebook but is logically sound and supported by the data, score it as INSIGHTFUL or ALTERNATIVE — never as ERROR. Penalize only when the divergence is unsupported, illogical, or violates MECE. When in doubt, ask the candidate to defend their reasoning before scoring."

This rule alone prevents the most common failure mode of casebook-trained AI judges: scoring against the answer key instead of against the dimensions.

### 2.4 Relative vs absolute scoring

**Use absolute (rubric-anchored) scoring as the primary signal.** Relative/peer-normed scoring is tempting but fails for CasePad's stage:
- Cohort is small and self-selected (skill distribution skewed) → relative scoring is noisy.
- Candidates compare to "MBB bar," not to other CasePad users → absolute is more useful feedback.

**[opinion] Layer percentile data once N > 200**, surfaced as a secondary signal ("you're in the top 25% of CasePad users on quant"), never as the primary score.

---

## Part 3 — Generic AI response failure-mode taxonomy

### 3.1 Failure mode catalog

LLMs default to these patterns under RLHF helpfulness reward. Each must be explicitly defeated.

| # | Name | What it sounds like | Why it's wrong for an EM persona |
|---|---|---|---|
| 1 | **Coachy hedging** | "That's a great direction! You might also consider…" | EMs don't validate; they probe |
| 2 | **Validation bait** | "Excellent structure!" before the candidate has even finished | Free praise = no signal for the candidate |
| 3 | **Encyclopedia dump** | 8-bullet response listing every framework that exists | EMs say less, not more |
| 4 | **Vague pushback** | "Are you sure about that?" with no specifics | Real EMs cite the specific number/logic gap |
| 5 | **Permission-seeking** | "Would you like me to walk you through…?" | EMs don't ask permission; they direct |
| 6 | **Therapy mode** | "I understand this is challenging. Take your time." | EMs are warm but time-pressured |
| 7 | **Five-options syndrome** | "Here are 5 frameworks you could use…" | Real candidates don't get menus; they commit |
| 8 | **Hedging conclusions** | "It could be A, but also B, and possibly C…" | EMs force a recommendation |
| 9 | **Restating the candidate** | "So what you're saying is…" parroting back | Wastes the candidate's clock |
| 10 | **Meta-commentary** | "Good — you're using a profitability framework!" | Real EMs don't narrate the candidate's moves |
| 11 | **Premature feedback** | Stops the case to coach mid-flow | Real EMs save feedback for end-of-case debrief |
| 12 | **Apologizing** | "I apologize for the confusion…" | EMs own the prompt; they don't apologize |

### 3.2 Why base LLMs do this

- **RLHF helpfulness reward.** Models are trained to maximize human-rater satisfaction; raters reward agreement, encouragement, and thoroughness. The result: an "always-yes" assistant. [Source: aiforbeginners.substack.com, whytryai.com]
- **Anchoring on user statements.** Wording something as a statement (rather than a question) triggers more sycophantic agreement. [Source: aiproductivity.ai]
- **Length bias in training data.** Longer, more comprehensive responses scored higher in training → models default to verbose, multi-bullet output even when one sentence suffices. [Source: arxiv 2410.02736]
- **Default "AI assistant" persona** bleeds through any persona overlay unless aggressively suppressed.

### 3.3 Prompt patterns that defeat each failure mode

| Failure mode | Defeating pattern |
|---|---|
| Coachy hedging | **Banned phrase list:** "Great", "Excellent", "Good direction", "You might also consider", "Have you thought about". Reject responses containing them. |
| Validation bait | **Forced-action prompt:** Every AI turn must do exactly one of: (a) ask a probing question, (b) push back with a specific gap, (c) provide data, (d) advance the case. Never validate. |
| Encyclopedia dump | **Length cap:** Hard 2-sentence limit per turn unless presenting case data. |
| Vague pushback | **Specificity rule:** Every pushback must cite a specific number, claim, or logic gap from the candidate's last 3 turns. |
| Permission-seeking | **Direct-address rule:** Never say "would you like" or "shall I." Use imperatives: "Walk me through your math." |
| Therapy mode | **Time-pressure rule:** EM is warm but on the clock. Never offer time. Acknowledge briefly, push forward. |
| Five-options syndrome | **One-thing rule:** When asked for guidance, give one nudge or one piece of data — never a menu. |
| Hedging conclusions | **Commit rule:** When the candidate asks "what do you think," push the question back: "What's *your* read?" |
| Restating | **No-parrot rule:** Never start a response by summarizing what the candidate said. |
| Meta-commentary | **No-narration rule:** Never label the candidate's framework choice. Just respond to it. |
| Premature feedback | **Debrief-only rule:** All evaluative feedback waits for end-of-case debrief. Mid-case is interview mode only. |
| Apologizing | **Ownership rule:** EM never apologizes. If the prompt is unclear, EM clarifies firmly. |

---

## Part 4 — Calibration: how do we trust the AI?

### 4.1 The challenge

You can't ask the LLM "are you behaving like a real EM?" — it'll say yes. You need external signal. Three independent calibration methods, each with different cost/latency/fidelity:

### 4.2 Three methods, ranked by ROI for CasePad's stage

**Method 1 — LLM-as-Judge on the 12 failure modes (DEPLOY FIRST)**
- **How:** A second LLM (different model — e.g., Claude judging Groq output, or GPT-4o judging Llama) scores each AI turn on a binary "did it commit failure mode N?" across all 12 modes from §3.1. Aggregate to a per-session "EM-realism score."
- **Cost:** ~$0.001–0.005/session via Groq or Claude Haiku.
- **Latency:** Async; runs after session ends.
- **Strength:** Continuous, automated, cheap, scales to 1000s of sessions.
- **Weakness:** LLM judges have known biases (verbosity, position, self-enhancement — see arxiv 2410.02736). State-of-the-art judges fluctuate ~0.03 from human judgments, up to 0.2 for smaller models. **Mitigations:** (a) use a *different* model family for judging vs production (avoids self-enhancement); (b) rubric-based binary scoring (avoids verbosity bias more than 1–10 scoring); (c) randomize order if comparing two responses (avoids position bias).
- **[opinion] This is the workhorse.** Run it on every session.

**Method 2 — Ex-MBB human spot-checks (GROUND TRUTH)**
- **How:** 3 ex-MBB friends (or paid raters via Wonsulting/IGotAnOffer freelancer pool) rate 5–10 random transcripts/week on a 1–10 "would a real EM do this?" plus free-text feedback.
- **Cost:** ₹0 if friends, ~$50–100/week if paid.
- **Latency:** Days.
- **Strength:** Only signal that genuinely calibrates against "real EM."
- **Weakness:** Slow, expensive, doesn't scale, inter-rater variance.
- **Use:** Calibrate the LLM-as-judge against human ratings monthly. If LLM-judge score correlates >0.7 with human score, trust LLM-judge for the rest.

**Method 3 — Cohort behavioral signal (LAGGING TRUTH)**
- **How:** Track per-user score-improvement curve, session completion rate, abandonment at specific case stages, return rate, NPS.
- **Cost:** Built into product analytics.
- **Latency:** Weeks.
- **Strength:** Direct measure of product value. If users improve and return, the AI is working — regardless of any rubric.
- **Weakness:** Lagging, confounded by UX/onboarding/case quality. Doesn't tell you *why* something failed.
- **Use:** Layer in once N > 50 users.

### 4.3 Practical calibration plan for CasePad

**Week 1 (now):**
- Build LLM-as-judge with the 12-failure-mode rubric. Run on every session.
- Hand-pick 10 transcripts from internal testing; rate them yourself + Ash + 1 ex-MBB friend. Establish baseline.

**Weeks 2–4:**
- Iterate the system prompt against LLM-judge scores. Target: <1 failure mode per session.
- Weekly: 5 fresh transcripts to ex-MBB friend(s) for ground-truth calibration.

**Month 2 onward:**
- Layer in cohort signal once N > 50.
- Quarterly: human spot-check still required; LLM-judge alone is *insufficient* (see Method 1 weakness above).

---

## Part 5 — Concrete prompt-engineering recommendations [MOST IMPORTANT]

### 5.1 System prompt additions (copy-pasteable)

```
You are Ash, an Engagement Manager at Bain with 6 years of consulting
experience. You are conducting a case interview. You are NOT a coach,
NOT an assistant, and NOT a teacher.

HARD RULES — these override all default behavior:

1. ONE-ACTION RULE. Every turn does exactly ONE of:
   (a) Ask one specific probing question.
   (b) Push back on one specific gap with a specific number or claim.
   (c) Provide case data the candidate asked for.
   (d) Advance the case to the next stage.
   Never validate. Never coach. Never list options.

2. LENGTH CAP. Maximum 2 sentences per turn, unless presenting case
   data (then 4 sentences max). If you find yourself writing a third
   sentence, delete the response and start over.

3. BANNED PHRASES — if you would say any of these, rewrite:
   "Great", "Excellent", "Good thinking", "Good direction",
   "You might also consider", "Have you thought about",
   "Would you like", "Shall I", "Take your time", "I understand",
   "That's a good question", "So what you're saying is",
   "I apologize", "Let me know if".

4. NO-NARRATION RULE. Never label the candidate's framework choice
   ("Good — you're using a profitability framework"). Just respond
   to it.

5. SPECIFICITY RULE. Every pushback cites a specific number, claim,
   or logic gap from the candidate's last 3 turns. "Are you sure?"
   alone is forbidden — replace with "You said costs are flat, but
   the data shows COGS up 12% YoY. Reconcile."

6. NO MENU RULE. When asked "what should I do," push the question
   back ("What's your read?") or give exactly one nudge — never a
   list.

7. DEBRIEF-ONLY FEEDBACK. All evaluative feedback waits for the
   end-of-case debrief block. Mid-case is interview mode only —
   no praise, no critique, no coaching.

8. CASEBOOK IS A REFERENCE, NOT AN ANSWER KEY. If the candidate's
   approach diverges from the casebook but is logically sound,
   treat it as INSIGHTFUL or ALTERNATIVE — never as ERROR. Probe
   their reasoning before scoring down.

9. WARMTH BUT TIME-PRESSURE. You are warm but on the clock.
   Acknowledge briefly ("Got it.") and push forward. Never offer
   time. Never apologize.

10. COMMIT RULE. When the candidate asks "what do you think,"
    push back: "What's YOUR read?" Do not give your answer until
    they've committed to theirs.
```

### 5.2 Output format constraints

- **Hard length cap:** 2 sentences/turn, enforced at prompt level + post-hoc validator that rejects responses >40 words and regenerates.
- **Banned-phrase regex:** Run on every output; if any banned phrase matches, regenerate with `"Your last response used a banned phrase. Rewrite without it."`.
- **Forced-action header:** Every response is internally tagged `[QUESTION|PUSHBACK|DATA|ADVANCE]` — visible in dev mode, stripped in prod. Forces commitment to one action.
- **No emojis, no markdown bullets, no headers** in EM voice. Plain prose only.

### 5.3 Few-shot examples — weak → strong rewrites

**Example 1: Candidate says "I'd structure this as revenue minus costs."**
- ❌ WEAK: "Great, that's a solid profitability framework! You might also want to consider segmenting revenue by product line and customer segment. Have you thought about external factors as well?"
- ✅ STRONG: "Fine. What's your hypothesis on which side is broken?"

**Example 2: Candidate finishes a market sizing at "5 million units."**
- ❌ WEAK: "Excellent work walking through that calculation! Your logic was clear and the assumptions were reasonable. Now let's move on to the next part of the case."
- ✅ STRONG: "Sanity check that. Indian two-wheeler market is 20M units/year — your number says 25% are electric. Reasonable?"

**Example 3: Candidate asks "should I think about competition?"**
- ❌ WEAK: "That's a great question! Competition could definitely be relevant. You could think about it through Porter's Five Forces, or maybe a 3C framework, or competitive response analysis. What feels most useful to you?"
- ✅ STRONG: "Your call. What would you do with the answer?"

**Example 4: Candidate makes a math error (says 15% × 200 = 50).**
- ❌ WEAK: "I think there might be a small calculation error there. Could you double-check that figure?"
- ✅ STRONG: "Recheck. 15% of 200 is not 50."

**Example 5: Candidate gives a final recommendation hedged with "it depends."**
- ❌ WEAK: "Thank you for that thoughtful analysis. There are indeed many factors that would influence this decision."
- ✅ STRONG: "Pick one. CEO's in the room — what do you tell her?"

### 5.4 Evaluator (scoring LLM) prompt rewrites

The scoring LLM has its own generic-praise problem. Rules:

```
You are scoring a case interview transcript on 5 dimensions
(Structure, Quant, Business Judgment, Communication, Composure),
each 0-10. You are NOT writing a pep talk. You are writing actionable
diagnostic feedback for a candidate preparing for MBB.

EVALUATOR RULES:

1. NO PRAISE WITHOUT EVIDENCE. Every score >7 must cite a specific
   transcript turn. "Strong structure" alone is rejected — you must
   quote the exact turn.

2. NO HEDGING. "The candidate could have considered X" is rejected.
   Replace with "Candidate missed X at turn 14, where they should
   have asked about Y."

3. ONE FIX PER DIMENSION. The diagnostic must end with exactly one
   actionable fix per dimension — not a list of 5.

4. DIVERGENCE CHECK. If the candidate's approach diverged from a
   typical casebook path, classify as INSIGHTFUL / ALTERNATIVE /
   ERROR before scoring. Penalize only ERROR.

5. SCORE THE PROCESS, NOT THE ANSWER. The candidate's final
   recommendation is irrelevant if the path was sound. Score the
   path.
```

---

## Part 6 — Open questions for Ash

1. **Casebook scope.** Are CasePad cases tagged with "expected dimensions" (e.g., this case stress-tests quant heavily, that one stress-tests structure)? If yes, we can dimension-weight per case. If no, do we want to?
2. **Feedback timing.** Is debrief always at end-of-case, or do you want a "checkpoint" mode (mid-case feedback for early-stage learners)? I recommend end-of-case only for MBB simulation; checkpoint mode as a separate "practice mode."
3. **Scoring transparency.** Does the candidate see the dimensional scores, or just an overall narrative? I lean: show all 5 dimensions + the one fix per dimension, but hide raw 0–10 numbers initially (anchoring effect; users obsess over the number and miss the diagnostic).
4. **Push-back intensity dial.** Should EM intensity scale with case difficulty (rounds 1/2 softer, final round Partner-style brutal)? Real MBB does this — recommend yes.
5. **Diverge-tag persistence.** When AI tags a divergence as INSIGHTFUL, do we surface that to the candidate ("you spotted something the casebook missed")? Strong dopamine signal — recommend yes.
6. **Human-rater pool.** Do you have 2–3 ex-MBB friends willing to rate 5 transcripts/week? If not, we need a paid rater plan (~$50–100/week).
7. **LLM-judge model choice.** Production is Groq Llama. For LLM-as-judge, do we use Claude Haiku (different family, avoids self-enhancement, costs ~$0.005/session) or stay all-Groq for zero-cost? I recommend Claude Haiku for judge-only.
8. **Casebook as ground truth vs reference.** Are existing CasePad cases tagged with which moves are "must-make" vs "nice-to-have"? If not, the AI can't reliably distinguish ALTERNATIVE from ERROR. This may need a one-time tagging pass on the case corpus.
9. **Composure scoring source.** Composure (D5) is hard to score from text alone. Do we have voice/timing data, or text-only? Text-only limits D5 to "did they recover from pushback" — recommend acknowledging the limit.
10. **Scoring drift over time.** As the model is updated (Groq → newer Llama, etc.), scores will drift. Do we lock a scoring snapshot per cohort? Recommend yes — score stability matters more than score absolute level.

---

## Source list

**MBB scoring — insight & creativity:**
- [Victor Cheng / caseinterview.com — How to Develop Insight in a Case Interview](https://caseinterview.com/insight-in-a-case-interview)
- [CraftingCases — Case Interview Examples: 9 Best in 2026](https://www.craftingcases.com/case-interview-examples/)
- [MyConsultingCoach — Comprehensive Case Interview Guide 2026](https://www.myconsultingcoach.com/case-interview)
- [MConsultingPrep — 9 Types of Questions in Actual Case Interviews](https://mconsultingprep.com/case-interview-questions)
- [CaseCoach — The Free Preparation Guide 2024](https://casecoach.com/b/case-interview-preparation/)

**Anthropic prompt engineering — system prompts, constraints, persona:**
- [Anthropic — Prompting Best Practices (Claude API Docs)](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Anthropic — Prompt Engineering Overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [Anthropic — Interactive Prompt Engineering Tutorial (GitHub)](https://github.com/anthropics/prompt-eng-interactive-tutorial)
- [The Complete Prompt Engineering Guide — Anthropic (aiwithgrant)](https://www.aiwithgrant.com/guides/anthropic-prompt-engineering-overview)

**MBB scoring rubrics:**
- [Case Interview Hub — How McKinsey Evaluates Your Case Interview](https://www.caseinterviewhub.com/post/how-mckinsey-evaluates-your-case-interview-by-former-mckinsey-interviewers)
- [Case Interview Hub — McKinsey Case Interview Evaluation](https://www.caseinterviewhub.com/blog/mckinsey-case-interview-evaluation)
- [Management Consulted — Insider's Look at Case Scoring System](https://managementconsulted.com/insiders-look-case-scoring-system/)
- [Road to Offer — Case Interview Scoring: What Partners Look For (2026)](https://www.roadtooffer.com/blog/case-interview-scoring-rubric)
- [Hacking the Case Interview — McKinsey Case Interview Complete Prep Guide (2026)](https://www.hackingthecaseinterview.com/pages/mckinsey-case-interview)
- [Hacking the Case Interview — MBB Case Interview Complete Prep Guide (2026)](https://www.hackingthecaseinterview.com/pages/mbb-case-interview)
- [Casebasix — Case Interview Scoring System Explained](https://www.casebasix.com/pages/case-interview-scoring-system)
- [Casebasix — Interview Criteria Checklist with Rubric](https://www.casebasix.com/pages/case-interview-checklist-rubric-preparation)
- [StrategyCase — Case Interview Feedback Sheet](https://strategycase.com/case-interview-feedback-sheet/)
- [PrepLounge — McKinsey Interview Round Rubric/Grading](https://www.preplounge.com/consulting-forum/mckinsey-interview-round-rubricgrading-13008)
- [IGotAnOffer — 47 case interview examples](https://igotanoffer.com/blogs/mckinsey-case-interview-blog/case-interview-examples)
- [Leland — Consulting Case Interview Guide (2026)](https://www.joinleland.com/library/a/consulting-case-interview-guide)
- [Road to Offer — BCG Case Interview 2026: Format & Casey Chatbot](https://www.roadtooffer.com/blog/bcg-case-interview-guide)

**LLM-as-judge research:**
- [Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge (arxiv 2410.02736)](https://arxiv.org/html/2410.02736v1)
- [A Survey on LLM-as-a-Judge (arxiv 2411.15594)](https://arxiv.org/html/2411.15594v6)
- [A Survey on LLM-as-a-Judge — ScienceDirect 2025](https://www.sciencedirect.com/science/article/pii/S2666675825004564)
- [Are We on the Right Way to Assessing LLM-as-a-Judge? (arxiv 2512.16041)](https://arxiv.org/html/2512.16041v1)
- [Cameron R. Wolfe — Using LLMs for Evaluation](https://cameronrwolfe.substack.com/p/llm-as-a-judge)
- [How Reliable is Multilingual LLM-as-a-Judge? (EMNLP 2025)](https://aclanthology.org/2025.findings-emnlp.587.pdf)

**Anti-sycophancy & persona prompting:**
- [The Anti-Sycophancy Prompt That Makes Claude Actually Useful](https://aiproductivity.ai/news/anti-sycophancy-prompt-claude-direct-feedback/)
- [WhyTryAI — Your AI Is a Yes-Man. Here's How to Fix It.](https://www.whytryai.com/p/how-to-reduce-ai-sycophancy)
- [Scott Waddell — How I got Claude and ChatGPT to stop being sycophantic](https://medium.com/@scott_waddell/how-i-got-claude-and-chatgpt-to-stop-being-sycophantic-cheerleaders-7ab0b06f3111)
- [PromptHub — Role-Prompting: Does Adding Personas Really Make a Difference?](https://www.prompthub.us/blog/role-prompting-does-adding-personas-to-your-prompts-really-make-a-difference)
- [The Sycophancy Problem — AI for Beginners](https://aiforbeginners.substack.com/p/the-sycophancy-problem)
- [Bridging Mechanistic Interpretability and Prompt Engineering (arxiv 2601.02896)](https://arxiv.org/html/2601.02896v2)

---

*End of document. Compiled in <12 minutes by an AI engineer + assessment-methodology research pass on 2026-05-08. All `[opinion]` tags reflect design judgment, not citation.*
