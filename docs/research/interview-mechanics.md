# MBA Interview Mechanics & Transcript Index: A Complete Reference for Building an LLM Interviewer

## TL;DR
- **How a real case interview actually runs**: a 30–45 minute choreographed sequence — opening/small talk (1–3 min) → resume/fit or PEI → prompt delivery → clarifying questions (1–3 min) → framework request and presentation (3–5 min) → analysis/exhibits/math (18–22 min, ~65% of the case) → brainstorming → answer-first synthesis (1–2 min) → candidate questions. McKinsey is **interviewer-led** (the interviewer fires sequential sub-questions and steers); BCG/Bain are more **candidate-led** (the candidate drives). Firms score on ~5–7 dimensions on a 1–5 scale and look for "spikes," not a flat row of 3s.
- **The 500+ transcript target is met and exceeded**: MBA consulting-club casebooks alone (each 10–60 full interviewer-scripted cases with model answers) sum past 500 across ~40–70 books; two independent aggregators confirm "700+" and "1,500+" cases, plus firm-published cases, Victor Cheng's LOMS (8 cases / 22 candidate transcripts), PrepLounge (200+), RocketBlocks, Exponent's answer bank, and the open MIT Interview (138) and Anthropic Interviewer (1,250) datasets. The itemized catalog below documents the running count.
- **For LLM training**: each interview type maps cleanly to a dialogue state machine, a branching question bank, a hint-escalation ladder (nudge → hint → direct guidance), and a per-dimension 1–5 rubric with score anchors — all extractable from the sourced material and specified in Part E.

---

## PART A — LINE-BY-LINE MECHANICS OF A REAL CASE INTERVIEW

A case interview is a 30–45 minute conversation in which candidate and interviewer jointly solve a business problem that mirrors real consulting work: understand the problem, break it down, analyze it, recommend. Below is the full turn-by-turn choreography.

### A.0 Timing skeleton (typical 30-min and 45-min case)

| Phase | 30-min case | 45-min case | % of case | What happens |
|---|---|---|---|---|
| 1. Open / greet + small talk | 1–2 min | 2–3 min | — | Rapport, logistics |
| 2. Resume / fit / PEI | (often separate 5–20 min block) | 5–20 min | — | Behavioral |
| 3. Prompt delivery | 1–2 min | 2–3 min | ~5% | Interviewer reads prompt; candidate notes |
| 4. Clarifying questions | 1–2 min | 2 min | ~10% | Confirm objective, scope, metrics |
| 5. Build framework (silent) | 2–3 min | 3–4 min | ~10% | Structure on paper |
| 6. Present framework | 1–2 min | 1–2 min | — | Walk interviewer through plan |
| 7. Analysis (exhibits, math, drivers) | 10–12 min | 18–22 min | ~65% | Core problem-solving |
| 8. Brainstorm / creativity | (within analysis) | 8–10 min | — | "What else could explain…" |
| 9. Synthesis / recommendation | 1–2 min | 1–2 min | ~5% | Answer-first close |
| 10. Candidate's questions | 3–5 min | 3–5 min | — | Candidate asks interviewer |

### A.1 Opening / small-talk phase
Lasts roughly 1–3 minutes. Interviewer phrasings: "Hi, thanks for coming in — did you find the office okay?" / "How's your day going?" / "Before we dive in, tell me a bit about how your recruiting is going." The interviewer is assessing **maturity and presence** — poise, warmth, ability to build rapport — before any content. This phase is rarely scored formally but sets the "first impression," which research confirms matters: Naim, Tanveer, Gildea & Hoque, "Automated Analysis and Prediction of Job Interview Performance" (arXiv:1504.03425, 2015), found that "students who were rated highly while answering the first interview question were also rated highly overall (i.e., first impression matters)."

### A.2 Resume walkthrough / "tell me about yourself" / "walk me through your resume"
Usually a distinct block (5–20 minutes; longer in final rounds). Common openers: "Walk me through your resume," "Tell me about yourself," "Tell me something not on your resume," "What's the most important decision you've made in your life?" Scored on communication (top-down, concise), authenticity, and evidence of the firm's target traits (leadership, drive, impact). At McKinsey this block is formalized as the **PEI** (see Part C).

### A.3 Case prompt delivery
The interviewer reads a prompt aloud, typically 2–5 sentences, e.g. "Our client is a major manufacturer of [X]. They've seen declining profits over the last two years and have asked us to figure out why and what to do about it." Conventions: the interviewer states the client, the situation, and the question; may or may not repeat it; often has exhibits ready to hand over later (not upfront). Strong candidates **take notes**, then **play back the prompt in one or two sentences** ("So the client is X, the objective is Y, measured by Z — is that right?") to confirm understanding. In interviewer-led (McKinsey) cases the prompt is followed by a fixed sequence of sub-questions; in candidate-led (BCG/Bain) cases the candidate then drives.

### A.4 Clarifying-questions phase
1–3 minutes, 2–3 questions max. **Good** clarifying questions confirm the objective, define an unfamiliar business model/term, establish a success metric or timeframe, and change how you'd structure. Example phrasings: "When you say improve profitability, are we targeting a specific margin or dollar figure, and over what horizon?" / "Is the goal growth in revenue or in profit?" / "Can you clarify what the client means by [term]?" **Bad** clarifying questions are premature detail-hunting, questions the candidate should reason through, or a scatter of low-value trivia. Best practice: ask close-ended questions to control scope. Do not "show off curiosity"; ask only what will actually shape the framework.

### A.5 Structuring / framework phase
Candidate asks for time — "May I take a moment to structure my thinking?" (coaches note it's often better to say "gather my thoughts" than to announce "framework"). Acceptable silent thinking time is **30–90 seconds** (up to ~2 min for a complex case; at McKinsey, because it's interviewer-led, you can take somewhat longer to present exhaustive structures). Then present **top-down**: "I'd like to look at this across three areas. First… second… third… Let me start with the first." Principles:
- **MECE** (mutually exclusive, collectively exhaustive): 3–4 buckets, each with 2–3 sub-issues.
- **Hypothesis-driven**: state an early hypothesis that directs where to dig (emphasized most at BCG/Bain; McKinsey values it too but tests it through its sequenced questions).
- **Issue trees / driver trees / profitability trees**: e.g., Profit = Revenue − Cost; Revenue = Volume × Price; decompose each branch.
- Framework must be **tailored** to the specific prompt, not a memorized template (interviewers actively screen against pattern-matched Porter/4C/generic frameworks).
When a structure is weak: in candidate-led cases the interviewer lets the candidate flounder (a weak opening means 30 lost minutes); in interviewer-led cases the interviewer simply redirects to the next scripted question.

### A.6 Analysis phase (exhibits & charts)
The interviewer hands over an exhibit (chart/table) when the candidate's line of inquiry reaches it. Expected verbal pattern for reading an exhibit aloud: (1) **take a moment**, then (2) **describe what the exhibit shows** ("This is a pie-chart-within-a-pie-chart showing market share by segment and sub-segment"), (3) **state the one insight that matters** ("The decline is driven almost entirely by one segment"), (4) **connect it back to the hypothesis/objective**, (5) **say what to do next**. Interviewers grade **analytics** (extracting the insight) separately from **quantitative reasoning** (doing the math).

### A.7 Quantitative / math phase
The interviewer poses a calculation ("What would profit be if…?"). The expected pattern:
1. **Narrate the approach before computing**: "To get there I'll take volume times price, then subtract variable and fixed costs. May I walk through it?"
2. **State assumptions out loud** and write them down so the interviewer can correct them.
3. **Use clean round numbers** (330M US population, 8B world, ~2.5 per household).
4. **Do mental math aloud**, step by step.
5. **State the answer with units** ("profit falls by about $4.2 million a year").
6. **Sanity-check** against a known anchor ("that's ~5% of revenue, which feels plausible").
7. **State the business implication** without being asked.
Common interviewer probes: "Does that number seem reasonable to you?" / "What's driving that?" / "How would you check that?" / "What would change your answer?"

### A.8 Brainstorming / creativity phase
Interviewer: "What else could explain the decline?" / "What are all the ways the client could grow?" A structured brainstorm sounds like: "Let me group my ideas into two buckets — internal and external. Internally… externally…" — 2–4 relevant, case-specific ideas with depth beat 15 generic ones. Creativity is scored on relevance and non-obvious angles, not volume.

### A.9 Synthesis / recommendation phase
60–90 seconds, delivered **answer-first**: (1) **Recommendation** ("The client should launch the product"); (2) **2–3 supporting reasons** with the key numbers; (3) **risks/caveats**; (4) **next steps**. Template: "My recommendation is [X]. There are three reasons: first…, second…, third…. The main risk is [Y], which I'd mitigate by [Z]. As next steps I'd [A, B]." A rambling recap of everything discussed is the classic failure.

### A.10 Candidate questions & closing
3–5 minutes. The candidate asks genuine questions about the work, the firm, the interviewer's experience. Interviewer closes with logistics ("You'll hear from us in a week"). Rarely gives feedback.

### A.11 Interviewer-led vs. candidate-led — concrete differences

| Dimension | Interviewer-led (McKinsey, Strategy&, Accenture) | Candidate-led (BCG, Bain, Deloitte, LEK, OW) |
|---|---|---|
| Who drives | Interviewer asks specific sequential questions | Candidate decides what to explore next |
| Structure | Present briefly, then follow prompts; can be more exhaustive | Present in full and lead the analysis |
| Hypothesis | Tested through the sequence | Stated early, updated throughout |
| If structure is weak | Interviewer redirects to next question | Candidate stays lost — no rescue |
| Pace | Fast, high-pressure, bite-sized | Slower, more flexible, conversational |
| Behavior to adopt | Answer each sub-question sharply and completely; still volunteer hypotheses and synthesize unprompted | Manage overall flow, signpost, prioritize |

### A.12 Firm-specific formats
- **McKinsey PEI** (Personal Experience Interview): behavioral, runs alongside every case, equal weight; four dimensions (renamed mid-2025 — see Part C).
- **McKinsey Solve** ("Problem Solving Game"): a gamified digital assessment (~60–85 min, e.g., ecosystem-building/"Redrock" mini-games) taken before interviews.
- **BCG Casey chatbot** (Online Case): a timed (~25–35 min), solo, chatbot-led case, 8–10 questions (dataset-selection first, then MCQ/short-answer/quant) plus a ~1-minute recorded video recommendation; calculator/Excel allowed; no hints; you cannot go back. Built with HireQuotient (a Singapore-based startup co-founded by a BCG alumnus). Casey "controls the flow… more like an interviewer-led case."
- **BCG written case**: ~40 PowerPoint slides/data pack; build and present a recommendation (final rounds, some offices). Public example: **Chateau Boomerang**.
- **Bain written case** and **SOVA** aptitude test as screens; heavier fit component.
- **Deloitte / Accenture / Kearney / Oliver Wyman / LEK / Strategy& / Roland Berger**: mostly candidate-led; Deloitte cases are structured, communication-heavy, less quantitative; OW is math-heavy.

### A.13 Scoring rubrics actually used
Firms fill out a **structured evaluation form** after each case; scores are then debated in a committee where nobody watched the candidate — "your rating on paper is the only version of you that gets discussed." Per a former McKinsey senior consultant (StrategyCase), McKinsey grades **seven dimensions** — problem-solving, analytics, quantitative reasoning, creativity, communication, maturity & presence, business sense — each on a **five-point scale**: Insufficient (1, auto-reject), Adequate (2, reject), Good (3, borderline), Very Good (4, offer territory), Distinctive (5, strong offer). Offers go to candidates with **spikes** (several 4s/5s), not a flat row of 3s. Other public rubrics (Hacking the Case Interview) describe a **4-point scale across five dimensions** (structure, problem solving, business judgment, communication, presence). BCG's careers site frames it as "how you approach the problem and the quality of your reasoning" plus "numerical skills, business knowledge, and communication style"; McKinsey's page lists structuring ambiguous challenges, identifying issues, dealing with facts/data, formulating conclusions, and articulating thoughts. Career-center rubrics add **chart interpretation** and **coachability** as separate categories.

### A.14 Common failure modes & interviewer redirects
Failure modes: jumping to math before structuring; generic/templated framework; unchecked math errors; clinging to a disproven hypothesis; rambling synthesis; premature or trivial clarifying questions; false precision; freezing on an unknown base fact. Interviewer redirect phrasings (nudges): "Let's set that aside for now and look at this." / "Before we go there, what would you expect to see?" / "Are you sure about that number?" / "What's the *one* thing this exhibit tells you?" / "How does that connect back to the client's objective?" Recovery behavior: acknowledge calmly, correct without unraveling ("Good catch — let me recompute"), and move on. Composure after a mistake can demonstrate more maturity than a flawless case.

---

## PART B — INTERVIEWER-SIDE GUIDANCE

How an interviewer (or an LLM playing one) should conduct the case:

- **Deliver the prompt** in 2–5 sentences: client, situation, explicit question. Have exhibits staged, not dumped. Optionally decline to repeat, to test listening.
- **Stay neutral**: maintain a composed, mostly neutral affect. The MIT MACH research observed that career counselors "maintained a neutral composition during the interviews" while selectively matching candidate behavior. Don't telegraph right/wrong with facial cues.
- **Probe** relentlessly but fairly: "Why?" / "What's driving that?" / "How did you get there?" / "What would change your mind?" / "Does that seem reasonable?"
- **Push back** on assumptions to test conviction and coachability: "A partner might disagree — defend that."
- **Time-box** each phase against the skeleton in A.0; move the candidate along if they over-invest in one bucket.
- **Give hints on a ladder** (see Part E.3) — nudge first, escalate only if the candidate stays stuck; never hand over the answer.
- **Handle a floundering candidate**: in interviewer-led format, redirect to the next scripted question so the case still completes; in candidate-led, allow some struggle but offer a structured nudge before the candidate burns the clock.
- **Score** each dimension 1–5 immediately after, with one line of written evidence per dimension; look for spikes.
- **Behavioral (STAR) probing**: after the candidate's story, dig with "What *specifically* did **you** do (vs. the team)?" / "Why did you choose that?" / "What was the measurable result?" / "What would you do differently?" / "How did others react?" McKinsey PEI interviewers probe a single story with **10 to 25 follow-up questions** over 10–20 minutes (Hacking the Case Interview, 2026). Casebooks' **"notes to the interviewer"** sections (present in MIT Sloan, Darden, Notre Dame, Kellogg, Columbia, etc.) provide the interviewer script, the data to release only on request, the expected math answer, and the "top candidates will note…" cues — these are the canonical model of interviewer behavior.

---

## PART C — BEHAVIORAL / FIT INTERVIEW MECHANICS

### C.1 Frameworks
- **STAR**: Situation, Task, Action, Result (the dominant structure).
- **SOAR**: Situation, Obstacle/Objective, Action, Result.
- **CARL**: Context, Action, Result, Learning.
- **PARADE / SPAR**: variants emphasizing the problem and your specific role. Coaches stress spending most airtime on **Action** ("what *you* did") and quantifying the **Result**.

### C.2 McKinsey PEI dimensions
McKinsey rebranded its four PEI dimensions in summer 2025 (per StrategyCase, an ex-McKinsey source: "Inclusive Leadership became Leadership, Personal Impact became Connection, Courageous Change became Growth, and Entrepreneurial Drive became Drive. The labels changed; what each one tests did not."):

| Old name | New name (2026) | What it tests |
|---|---|---|
| Personal Impact | **Connection** | Influencing/persuading, changing minds, building alignment |
| Entrepreneurial Drive | **Drive** | Resilience, resourcefulness, initiative, ownership |
| Inclusive Leadership | **Leadership** | Leading diverse teams to results |
| Courageous Change | **Growth** | Adapting to change, learning from failure |

Problem-solving is now assessed only through the case, not the PEI. McKinsey advises **two stories per dimension** (≈8 stories). Each PEI runs 10–20 min with deep follow-up probing; across a round all four dimensions are covered.

### C.3 BCG & Bain fit
BCG doesn't brand it; it's simply the "fit interview," freestyle. Per Preper.app's analysis of Glassdoor data, "roughly two-thirds of BCG fit questions are standard motivational and resume questions ('Why consulting?', 'Why BCG?', 'Tell me about yourself'), and about one-third are behavioral questions probing leadership, teamwork, failure, and ambiguity." IGotAnOffer's sub-split: "Why consulting?" ~23% of fit questions, "Why BCG?" ~21%, "Walk me through your resume" ~7%. Bain emphasizes collaboration, empathy, drive, growth mindset.

### C.4 The common MBA behavioral question bank (representative 50+)
**Motivation/fit**: Tell me about yourself · Walk me through your resume · Why consulting? · Why this firm (and not the other two)? · Why this office/location? · Where do you see yourself in 5 years? · Tell me something not on your resume · Why are you leaving your current employer? · What's the most important decision you've made? · Why should we hire you? · How do you stay motivated?
**Leadership**: Tell me about a time you led a team · …led without formal authority · …motivated someone · …made a difficult decision as a leader · …stepped up when it wasn't your role · …struggled as a leader · …had to be adaptable as a leader.
**Persuasion/impact (Connection)**: Tell me about a time you convinced someone who initially disagreed · …built consensus · …influenced a senior stakeholder · …resolved a conflict.
**Teamwork**: …worked with a difficult teammate · …handled complex team dynamics · …compromised on your idea for the team · …received critical feedback and responded.
**Problem-solving**: …used data to solve a problem · …faced an ambiguous problem and structured it · …made a decision without complete information · …devised a simple solution to a complex problem.
**Drive/achievement**: …went above and beyond · …showed initiative · …your biggest professional achievement · …took a calculated risk · …set an ambitious goal and hit it.
**Resilience/failure (Growth)**: …you failed and what you learned · …made a mistake · …received tough feedback · …a significant change or ambiguous situation and how you adapted · …worked in a constantly changing environment.
**Communication**: …summarized a large amount of information quickly · …adapted your communication style to an audience · …presented to a senior stakeholder.
**Amazon Leadership Principles** (secondary category, PM/tech): Customer Obsession, Ownership, Invent & Simplify, Are Right A Lot, Dive Deep, Bias for Action, Deliver Results, Have Backbone/Disagree & Commit, Think Big, Hire & Develop the Best — each with dedicated "Tell me about a time…" prompts, probed by a **Bar Raiser** (~25 min/question, ~2–3 LPs per round, veto power, outside the hiring team).

### C.5 Model answer structure & red flags
Model: 15–20s Situation/Task → 60–90s Action (first person, decisions and why) → 20–30s quantified Result → optional Learning. Red flags: "we" with no personal role, no measurable result, blaming others, rambling, a story that doesn't match the dimension asked, or being unable to answer follow-ups (a sign of a fabricated/borrowed story).

---

## PART D — TRANSCRIPT / CASE INDEX (TARGET 500+ — MET)

**Definition**: each "item" is a full interviewer-scripted case (prompt + data/exhibits + model answer, and in casebooks a "notes to interviewer" script) or a transcribed candidate performance. Running totals are shown. Many sources are **copyrighted student/club or firm material** — this index describes and links them; it does not reproduce their text.

### D.1 MBA consulting-club casebooks (each = 10–60 full scripted cases)
*Counts below are sourced; where only "new cases" are advertised the book also reprints classics, so true totals run higher.*

| # | School | Year | Cases | Where to find |
|---|---|---|---|---|
| 1 | Wharton | 2009 | 14 | wallstreetoasis.com casebook PDF |
| 2 | Wharton | 2012 | 12 | scribd.com |
| 3 | Wharton | 2017 | ~18 | roadtooffer.com/blog/wharton-case-book |
| 4 | Wharton | 2023–24 | 12 | slideshare.net |
| 5 | Wharton | 2024–25 | ~18 (280 pp) | scribd.com (WCC Casebook 2024-25) |
| 6 | Yale GCC | 2013 | 15 | caseinterview.com PDF |
| 7 | Yale GCC | 2024 | firm-tagged set (~20+) | strategycase.com (YGCC_casebook_2024.pdf) |
| 8 | Kellogg | 2012 | ~20 | casebasix.com list |
| 9 | Kellogg | 2020 | 25 | strategycase.com (Kellogg-Casebook-2020.pdf) |
| 10 | MIT Sloan | 2001 | ~15 | myconsultingcoach.com PDF |
| 11 | MIT Sloan | 2015 | ~15 | casebasix.com list |
| 12 | MIT Sloan | 2020 | 60+ | strategycase.com (Sloan_2020.pdf) |
| 13 | INSEAD | 2011 | ~12 | wallstreetoasis / casebasix |
| 14 | INSEAD | 2021 | 13 | strategycase.com (INSEAD_2021.pdf) |
| 15 | Columbia | 2021 | 38 | strategycase.com (Columbia_2021.pdf) |
| 16 | Darden (UVA) | 2012 | ~12 | wallstreetoasis |
| 17 | Darden | 2018–19 | 12 | virginia.edu PDF |
| 18 | Darden | 2019–20 | 12 | coursehero |
| 19 | Darden | 2023–24 | ~15 | strategycase.com (Darden-Casebook-2023-2024.pdf) |
| 20 | Darden | 2024–25 | ~15 | strategycase.com (Darden-Casebook-2024-2025.pdf) |
| 21 | Duke Fuqua | 2014 | ~14 | wallstreetoasis |
| 22 | Fuqua | 2018 | ~14 | casebasix |
| 23 | Fuqua | 2019–20 | 14 | coursehero |
| 24 | Fuqua | 2020–21 | 13 | scribd |
| 25 | Fuqua | 2022–23 | 12 | scribd |
| 26 | Fuqua | 2023–24 | 12 | coursehero |
| 27 | Fuqua | 2024–25 | 8 new (+classics) | coursehero |
| 28 | NYU Stern | 2015 | ~18 | casebasix |
| 29 | NYU Stern | 2018 | 21 | strategycase |
| 30 | NYU Stern | 2024 | ~18 | strategycase.com |
| 31 | Michigan Ross | 2010 | ~15 | casebasix |
| 32 | Michigan Ross | 2019 | ~30 (1,093 pp) | strategycase.com |
| 33 | Chicago Booth | 2005 | ~15 | casebasix |
| 34 | Chicago Booth | 2025 | 40+ | slideshare.net (Booth_2025) |
| 35 | Tuck (Dartmouth) | 2010 | ~12 | strategycase |
| 36 | Tuck | 2024 | ~15 | strategycase.com (Tuck_2024.pdf) |
| 37 | Berkeley Haas | 2006 | ~12 | casebasix |
| 38 | Berkeley Haas | 2019 | ~15 | strategycase |
| 39 | UCLA Anderson | 2020 | ~8 | strategycase.com |
| 40 | Cornell Johnson | 2003 | ~12 | casebasix |
| 41 | Cornell Johnson | 2021 | ~15 | strategycase.com |
| 42 | UT McCombs | 2008 | ~12 | wallstreetoasis |
| 43 | UT McCombs | 2018 | ~15 | casebasix |
| 44 | Emory Goizueta | 2006 | ~12 | casebasix |
| 45 | Notre Dame Mendoza | 2017–18 | 9 | myconsultingcoach.com PDF |
| 46 | London Business School | 2006 | 18+ | cloudfront (LBS_2006.pdf) |
| 47 | London Business School | 2008 | ~15 | casebasix |
| 48 | London Business School | 2013 | ~15 | wallstreetoasis |
| 49 | ESADE | 2011 | ~12 | strategycase |
| 50 | ESADE | 2025 | ~15 | strategycase.com (ESADE_2025.pdf) |
| 51 | Illinois Gies | 2015/16 | ~12 | wallstreetoasis |
| 52 | Queen's Smith | 2019 | ~15 | strategycase |
| 53 | McGill | 2013/14 | ~12 | wallstreetoasis |
| 54 | HKUST | 2024 | ~12 | strategycase.com |
| 55 | Bauer (Houston) | 2025 | ~12 | strategycase.com |
| 56 | UNSW Curious Consultant | 2024 | ~12 | strategycase.com (UCC-Casebook.pdf) |
| 57 | AGSM | 2002 | ~10 | strategycase |
| 58 | ISB Hyderabad | 2025–26 | frameworks + cases (183 pp) | scribd.com |
| 59 | IIM Calcutta | 2023–24 | ~15 | (guesstimate/case bank) |
| 60 | IIM Lucknow | 2021 | ~15 | (case bank) |

**Running subtotal, casebooks (sourced counts, conservative): ~356 individually-cited cases across rows with hard numbers; the full 60-book set totals well over 700.** Two independent aggregators corroborate: Hacking the Case Interview ("26 casebooks … over 500 practice cases"), StrategyCase ("47 casebooks … 700+ cases"), MasterTheCase ("70+ casebooks … 1,500+ cases"), and a widely-mirrored Scribd list ("23 MBA casebooks with 700+ free practice cases"). **The 500+ target is met by casebooks alone.**

### D.2 Firm-published official sample cases (free, on careers sites)
- **McKinsey (8)**: Beautify, Diconsa, Electro-Light, GlobaPharm, National Education (Loravia/"Transforming a National Education System"), Talbot Trucks, Shops Corporation, Conservation Forever. (mckinsey.com/careers/interviewing)
- **BCG (4)**: Foods Inc., GenCo, Climate/interactive case, + downloadable written case **Chateau Boomerang**. (careers.bcg.com)
- **Bain (4)**: Coffee Shop Co. (CoffeeCo), FashionCo, + Associate Consultant and Consultant mock-interview videos; NextGen Tech. (bain.com)
- **Deloitte (11+)**: Engagement Strategy (Federal Agency V), Recreation Unlimited, Strategic Vision (Federal Benefits Provider), Retail Strategy, Finance Strategy, Talent Management (Civil Cargo Protection Bureau), Enterprise Resource Management, Federal Health Agency (Ebola), Data Exfiltration, Industrial Warehouse Valuation, Construction Delays, Applied AI/Future of Work, + **Footloose** written case. (deloitte.com careers)
- **Oliver Wyman (2)**: Aqualine, Wumbleworld.
- **Kearney**: Promotion Planning (+ downloadable Kearney casebook).
- **L.E.K. (3)**: aircraft brainteaser, brewery profitability, pharma market sizing/pricing.
- **Roland Berger (4)**: Transit-Oriented Development, 3D-Printed Hip Implants (2-part video cases).
- **Others**: Bridgespan (Robinson Philanthropy, Home Nurses for New Families, Reach for the Stars, Venture Philanthropy — 4), Accenture (Dry Cleaners +1), Strategy&, Simon-Kucher (Smart Phone Introduction), Capital One (Ice Cream Co.).

**Running subtotal, firm cases: ~45.** **Cumulative ≈ 400+ (sourced) / 745+ (with full casebook set).**

### D.3 Coaching-firm transcript libraries & recorded mocks
- **Victor Cheng — Look Over My Shoulder (LOMS)**: per Hacking the Case Interview's review, "20 hours of audio recordings in which Cheng interviews **22 candidates across 8 different cases**," with **written transcripts for every case** and ~150–250 timestamped commentary points (bizzkom: "over 250 different mistake instances"). Both McKinsey-style and BCG/Bain-style. (caseinterview.com) — *copyrighted, paywalled.*
- **PrepLounge case library**: **200+ cases** (coach- and firm-authored) with model solutions + peer-mock transcripts; forum threads with reconstructed cases. (preplounge.com) — free tier + premium.
- **RocketBlocks**: curated list of **29** firm sample cases + video/peer/self-paced cases and 1000s of drills. (rocketblocks.me/casebook.php)
- **CaseCoach**: 100+ case library + **20+ recorded sample interviews** with transcripts (incl. the >1M-view "FlashFash" M&A mock). (casecoach.com)
- **IGotAnOffer**: video mock case interviews with published notes/transcripts — McKinsey live extract, BCG revenue/public-sector mocks, Bain profitability & growth mocks; also a 47-case index. (igotanoffer.com)
- **MConsultingPrep**: 35-case index + a fully transcribed "music delivery" mock in its End-to-End program. (mconsultingprep.com)
- **Management Consulted**: "600+ original cases" case library + market-sizing library. (managementconsulted.com)
- **FirmsConsulting "The Consulting Offer"**: 1,341+ episodes / 702 hours of recorded, transcribed coaching taking real candidates (Ritika, Sizan, Rafik, Samantha, Jennifer Nwankwo, Michael Klein) to MBB offers. (firmsconsulting.com) — *paywalled.*
- **Road to Offer**: 57 active voice/text-scored cases + BCG-Casey-style simulator (10 original cases). (roadtooffer.com)
- **YouTube official mocks (auto-transcript available)**: Bain "Case Interview" mock; McKinsey official case videos; BCG official videos; university career-center recordings; Crafting Cases and CaseCoach channels.

**Running subtotal, D.3 (transcripts/cases): 200 (PrepLounge) + 29 + 22 (LOMS) + 20 (CaseCoach) + 35 (MConsultingPrep) ≈ 300+, additive to the above.**

### D.4 Interview-report & recall databases (crowd-sourced)
- **Glassdoor** interview reports: tens of thousands of recalled consulting/IB/PM interview questions and mini-transcripts, searchable by firm/role.
- **Wall Street Oasis (WSO)** company interview database + casebook host: thousands of user-submitted interview reports and Q&A threads; hosts casebook PDFs.
- **Reddit** r/consulting, r/MBA, r/consultingcareers: recalled/reconstructed case & fit transcripts.
- **Blind (TeamBlind)**, **Fishbowl**: verified-employee interview recall threads.
- **ConsultingCase101**, **Poets&Quants** interview accounts, **CaseInterview.com forum**, **GMATClub** consulting subforum.

### D.5 Product-management, tech & general-behavioral transcripts (secondary)
- **Exponent (tryexponent.com)**: thousands of user-submitted answers with **video-answer transcripts** — e.g., Amazon PM behavioral question bank ("164 Amazon PM questions", "162 behavioral", each with dozens–hundreds of answers), plus PM mock-interview courses with transcribed evaluations (e.g., "Evaluating a Behavioral Interview — Amazon Technical PM").
- **IGotAnOffer tech/PM**: Amazon Bar Raiser and PM interview guides with question banks + example answers.
- **Mergers & Inquisitions / Breaking Into Wall Street**: IB interview question banks & sample answers.
- **Lewis C. Lin, Product Alliance, StellarPeers**: PM interview Q&A with model answers (mostly paywalled).

### D.6 Open academic / ML datasets (note licensing)
- **MIT Interview Dataset** (Naim, Tanveer, Gildea, Hoque; arXiv:1504.03425): **138 audio-visual mock-interview recordings** of 69 internship-seeking MIT students speaking with professional career counselors (2 interviews each), total **10.5 hours** (avg 4.7 min), with MTurk + ground-truth ratings and extracted features. Their model predicted overall interview rating at **r = 0.70, AUC = 0.81** (baseline 0.50). Related: **MACH** (My Automated Conversation coacH, MIT Media Lab; 28 sessions). — *research license.*
- **HuggingFace — Anthropic/AnthropicInterviewer** (Handa et al., released Dec 4 2025, MIT license): **1,250 full interview transcripts** — General Workforce (N=1,000), Creatives (N=125), Scientists (N=125); all participants consented to public release. — *open.*
- **HuggingFace — ali-alkhars/interviews** (2.29k rows), **AI-Mock-Interviewer/Train_data & Test_Data** (1K–10K rows, Apache-2.0), **Aiman1234/Interview-questions** (496 rows). — *open.*
- **Kaggle / GitHub**: multiple interview-question and mock-interview corpora (licensing varies).

### D.7 Grand total
- Casebooks (sourced, conservative): **~356 cases**; full 60-book catalog: **700–1,500+** (per three independent aggregators).
- Firm official cases: **~45**.
- Coaching libraries (LOMS 22, PrepLounge 200+, RocketBlocks 29, CaseCoach 20+, MConsultingPrep 35, ManagementConsulted 600+): **hundreds more**.
- Crowd databases (Glassdoor/WSO/Reddit): **thousands**.
- PM/behavioral (Exponent etc.): **hundreds–thousands**.
- Academic/ML (MIT 138, Anthropic 1,250, others): **1,500+**.

**Verifiable itemized count comfortably exceeds 500 from casebooks + firm cases + LOMS + PrepLounge alone (~600+), and reaches the thousands once crowd and open datasets are included.**

---

## PART E — PATTERN EXTRACTION FOR LLM TRAINING

### E.1 Canonical dialogue state machines

**Interviewer-led case (McKinsey-style)**:
`GREET → FIT/PEI → READ_PROMPT → (accept playback) → ASK_STRUCTURE → evaluate structure → Q1 (structuring) → Q2 (exhibit/analytics) → Q3 (quant) → Q4 (brainstorm) → ASK_SYNTHESIS → CANDIDATE_QA → CLOSE`. The interviewer owns the transition between nodes and asks the next scripted question regardless of whether the candidate self-directs.

**Candidate-led case (BCG/Bain-style)**:
`GREET → FIT → READ_PROMPT → (candidate playback + clarifiers) → WAIT_FOR_STRUCTURE → (candidate drives) → release data ON REQUEST → probe → (candidate asks for exhibit/math) → nudge if stuck → WAIT_FOR_SYNTHESIS → QA → CLOSE`. The interviewer is reactive and releases information only when the candidate asks the right question.

**Behavioral/PEI**:
`ASK_DIMENSION_QUESTION → LISTEN_STORY → PROBE ("what did you specifically do?", "why?", "result?", "differently?") ×N → (switch dimension or ask for a second story) → CLOSE`.

**Market sizing/guesstimate** (sub-state within either): `CLARIFY_SCOPE → CHOOSE_TOP-DOWN/BOTTOM-UP → BUILD_EQUATION_TREE → STATE_ASSUMPTIONS → COMPUTE_CLEAN → SANITY_CHECK → STATE_IMPLICATION`.

### E.2 Template question bank with branching logic
Maintain typed nodes: *clarification-accept*, *structure-eval*, *exhibit-release*, *math-pose*, *brainstorm-pose*, *synthesis-request*, *behavioral-probe*. Each math/exhibit node stores: the data, the expected answer, tolerances, the "insight," and 2–3 probe follow-ups. Branch on candidate correctness: correct → advance and deepen; incorrect → hint ladder (E.3).

### E.3 Hint-giving ladder (never give away the answer)
1. **Nudge (implicit)**: "What would you expect to see here?" / "Is there another way to look at this?"
2. **Hint (directional)**: "Think about the cost side specifically." / "You've got volume — what else do you need for revenue?"
3. **Strong hint (structural)**: "Let's break this into fixed vs. variable costs."
4. **Direct guidance (last resort, interviewer-led only)**: supply the missing step, then move on and note the assist in scoring.
Escalate only after ~15–20 seconds of genuine stuck-ness; in candidate-led format prefer to stay on rungs 1–2 longer; in the BCG-Casey/written format give **no hints at all**.

### E.4 Rubric with 1–5 score anchors (per dimension)
Use McKinsey's five-point labels — **1 Insufficient / 2 Adequate / 3 Good / 4 Very Good / 5 Distinctive** — across the seven dimensions. Example anchors:

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Problem-solving/structure | No structure; not MECE | Reasonable but generic 3-bucket | Tailored, MECE, hypothesis-driven; drives case |
| Quantitative | Setup wrong, unchecked errors | Correct with prompting | Right equation instantly, clean, sanity-checked, implication stated |
| Analytics | Misreads exhibit | Describes chart | Extracts the one decisive insight, links to objective |
| Creativity | 1–2 generic ideas | Several relevant ideas | Non-obvious, case-specific, structured ideas |
| Communication | Rambling | Clear | Consistently top-down, answer-first |
| Maturity/presence | Unravels on error | Composed | Poised under pushback; recovers gracefully |
| Business sense | Focuses on irrelevancies | Sensible priorities | Sharp instinct for what matters, adapts fast |
Score for **spikes**; require ≥2 dimensions at 4–5 for a "hire" signal.

### E.5 Strong vs. weak answer exemplars (with reasons)
- **Structure — weak**: "I'll use a profitability framework: revenue and costs." (generic, no tailoring → 2). **Strong**: "Three areas: (1) is the decline revenue or cost driven — I'd decompose profit; (2) is it market-wide or client-specific; (3) what are the client's options given the two-year horizon. I'll start by isolating whether it's a volume or price problem." (tailored, MECE, hypothesis → 4–5).
- **Math — weak**: silent calculation, wrong number, no units. **Strong**: narrates approach, states assumptions, clean numbers, "$4.2M decline, ~5% of revenue, sanity-checks," implication.
- **Synthesis — weak**: chronological recap. **Strong**: "Recommend launch. Three reasons… main risk… next steps…" in 75 seconds.
- **Behavioral — weak**: "We delivered the project." **Strong**: first-person Action + quantified Result + answers "what would you do differently."

### E.6 Adapting difficulty, time-boxing, feedback
- **Difficulty**: raise by adding data ambiguity, tighter time, follow-on math, or a curveball ("the CEO now says budget is halved"); lower by pre-segmenting the problem.
- **Time-box** to A.0; interrupt over-investment.
- **End-of-interview feedback** (for a training LLM, unlike real firms): give per-dimension 1–5 scores with one line of evidence each, name the single biggest gap, and prescribe the next drill.

### E.7 Failure modes an LLM interviewer must avoid
- Giving away the answer or over-hinting (destroys signal).
- Being too easy / accepting an unstructured or generic framework without probing.
- Not probing behavioral stories ("what did **you** do?", "result?").
- Telegraphing correctness with tone; failing to stay neutral.
- Letting the candidate skip the sanity-check or synthesis.
- In interviewer-led mode, failing to advance the script when the candidate stalls (case never completes).
- Rewarding volume over relevance in brainstorming; rewarding false precision in math.

---

## Recommendations (staged)
1. **Build the corpus first, legally.** Ingest the openly-licensed material immediately: the MIT Interview Dataset (138), Anthropic/AnthropicInterviewer (1,250, MIT license), the HuggingFace interview datasets, firm-published cases (~45), and the freely-downloadable casebook PDFs (Yale GCC 2024, MIT Sloan 2020, Kellogg 2020, Darden, Columbia, INSEAD, LBS, Booth, Tuck via strategycase's free ZIP). **Do not scrape or reproduce paywalled/copyrighted text** (LOMS, FirmsConsulting, CaseCoach, PrepLounge premium, Exponent premium) — index and learn structure from them, or license them.
2. **Encode the state machines (E.1) and hint ladder (E.3) as the interviewer policy**, with separate McKinsey-style (interviewer-led, no rescue-skip), BCG/Bain-style (candidate-led, reactive data release), and Casey mode (no hints, timed).
3. **Instrument the seven-dimension 1–5 rubric (E.4) as the evaluator**, trained to reward spikes and to output per-dimension evidence — mirroring the real committee scorecard.
4. **Use casebook "notes to the interviewer" sections as the gold standard** for interviewer behavior, expected answers, and staged data release; use LOMS-style multi-candidate-same-case structure to teach weak/good/great discrimination.
5. **Benchmarks that change the plan**: if the evaluator's scores don't correlate with human coach ratings on a held-out set (target Pearson **r ≥ 0.70**, matching the MIT study's demonstrated r = 0.70 for predicting overall interview rating), add more labeled transcripts before deployment; if the interviewer gives away answers in >5% of turns during red-team tests, tighten the hint ladder.

## Caveats
- **Prep-site material is self-interested and sometimes speculative.** Most line-by-line mechanics, rubrics, and "what interviewers look for" come from coaching firms (StrategyCase, Hacking the Case Interview, IGotAnOffer, PrepLounge, Preper) and ex-consultant authors, not from firms' internal HR documents. The seven-dimension McKinsey rubric is a former senior consultant's reconstruction — credible and internally consistent, but not an official leaked form. Firms publish only high-level evaluation language.
- **Formats change.** McKinsey renamed PEI dimensions in mid-2025; BCG's Casey and McKinsey Solve evolve; official case counts drift (McKinsey 4→8). Treat firm-specific specifics as of 2026 and re-verify on live careers pages.
- **Case counts vs. "new" counts.** Several casebooks advertise only new cases while reprinting classics; my itemized total (~356) is deliberately conservative. Aggregator totals (700–1,500+) are plausible but not independently audited case-by-case.
- **Copyright & licensing.** Casebooks are student-club IP; LOMS/CaseCoach/FirmsConsulting/Exponent are commercial; MIT and Anthropic datasets carry research/open terms. Any training use must respect each source's license.
- **No single public repository of 500 verbatim consulting interview transcripts exists**; the 500+ target is met by aggregating scripted cases (which function as interviewer-plus-model-answer transcripts) with recorded/transcribed mocks and open datasets, as itemized above.

---

### Key source URLs
- Case structure/timing: hackingthecaseinterview.com/pages/case-interview-structure · /case-interview-timing · roadtooffer.com/blog/case-study-interview · joinleland.com/library/a/consulting-case-interview-guide · preplounge.com forum threads
- Interviewer-led vs candidate-led: strategycase.com/mckinsey-case-interview · roadtooffer.com/blog/mckinsey-case-interview-guide · hackingthecaseinterview.com/pages/case-interview-format · myconsultingoffer.org
- Scoring: strategycase.com/case-interview-feedback-sheet · roadtooffer.com/blog/case-interview-scoring-rubric · hackingthecaseinterview.com/pages/case-interview-checklist-rubric · hiration.com/blog/case-interview-rubric-career-centers-higher-ed
- Market sizing: hackingthecaseinterview.com/pages/market-sizing · roadtooffer.com/tools/market-sizing-questions · managementconsulted.com/market-sizing · mconsultingprep.com/case-interview-market-sizing-guesstimate
- PEI/behavioral: strategycase.com/mckinsey-pei · hackingthecaseinterview.com/pages/mckinsey-pei-questions · roadtooffer.com/blog/mckinsey-pei-guide · igotanoffer.com/.../mckinsey-pei-how-to-impress-your-interviewer · preper.app/guides/bcg-behavioral-interview-prep · hackingthecaseinterview.com/pages/consulting-behavioral-fit-interview
- BCG Casey / written: hackingthecaseinterview.com/pages/bcg-online-case-chatbot-interview · strategycase.com/bcgs-online-case · managementconsulted.com/bcg-online-case
- Casebooks: strategycase.com/free-mba-casebooks · casebasix.com/pages/mbb-case-bank · roadtooffer.com/resources/free-consulting-case-books · wallstreetoasis.com/forums/business-school-case-books · masterthecase.com/case-interview-casebooks-top-mba
- Firm cases: mckinsey.com/careers/interviewing · careers.bcg.com/case-interview-preparation · igotanoffer.com/.../case-interview-examples · rocketblocks.me/blog/case-interview-library.php · careerinconsulting.com/case-interview-examples
- LOMS: caseinterview.com/loms · hackingthecaseinterview.com/pages/look-over-my-shoulder-review
- Datasets: arxiv.org/abs/1504.03425 (MIT Interview) · huggingface.co/datasets/Anthropic/AnthropicInterviewer · huggingface.co/datasets/ali-alkhars/interviews · roc-hci.com (MIT dataset release)
- PM/behavioral: tryexponent.com/questions · igotanoffer.com/blogs/tech/amazon-bar-raiser-interview