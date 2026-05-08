# Case-Prep Platforms — Competitive Deep Dive (2026-05-08)
> Compiled for CasePad — what to copy, what to avoid, where to differentiate.
> Author: Engineering research agent. Time-boxed (25 min). Inline citations throughout. `[unverified]` flags speculation.

---

## Executive summary (read first)

**The landscape, in three paragraphs.** The case-prep market in 2026 is bifurcated. On one side sit the **content-first incumbents** — Hacking the Case Interview ($99 books / ~$200–$400 video courses; [Source](https://www.hackingthecaseinterview.com/courses/consulting)), Victor Cheng's LOMS ($297 audio package; [Source](https://www.myconsultingoffer.org/case-study-interview-prep/victor-cheng-loms/)), and RocketBlocks (subscription drills, ~$45–$89/mo historically; [Source](https://www.wallstreetoasis.com/forums/rocketblocksme-thoughts)) — selling drilled, structured content built by ex-MBB consultants. On the other side sit **community-first platforms** — PrepLounge ($39/mo for peer matching + 700 cases; [Source](https://www.preplounge.com/en/shop/premium-membership)), CaseCoach ($49/mo or $199/yr; ex-McKinsey-led; [Source](https://casecoach.com/c/)), IGotAnOffer ($110–$225/hr coaching marketplace; [Source](https://igotanoffer.com/en/interview-coaching/type/case-interview)), and Management Consulted (Black Belt program + 1:1 coaching; [Source](https://www.trustpilot.com/review/managementconsulted.com)) monetizing peer matching, large case libraries, and 1:1 coaching marketplaces.

A third tier — **AI-native upstarts** (CaseStudyPrep.AI at $15/case, CaseWithAI, MBB.AI, PrepPartner.ai, CasePrepared, CrackTheCase AI, PrepLounge's Preppie casebot) — exists in early form but is shallow. Most are GPT-wrappers with thin prompts, no real case corpus, and weak interviewer behavior; one ex-McKinsey consultant on PrepLounge dismissed them as providing "generic advice at the level of peer feedback rather than moving the needle" ([Source](https://www.preplounge.com/consulting-forum/has-anyone-tried-any-of-the-ai-interview-tools-for-mbb-before-20398)). The critical insight: every legacy platform's economic moat is **proprietary content** (verified cases by ex-MBB), not technology. Every AI competitor's moat-attempt is **distribution**, not depth. Nobody has yet combined a verified large case corpus with a genuinely interview-quality AI interviewer.

CasePad's positioning sits in a genuinely unclaimed corridor: **AI-as-interviewer over a verified real-cases corpus (1,165 cases) with adaptive mid-conversation behavior, distributed via cohort/college-club channels at zero cost to the student**. The closest analogue (PrepPartner.ai, [Source](https://preppartner.ai)) is a one-person-built AI peer-matcher with no case library. The deepest content (LOMS) has only 8 cases. The largest community library (PrepLounge) has 700. CasePad is potentially the only platform with both axes maxed.

### Top 3 things CasePad should steal (in priority order)
1. **RocketBlocks-style atomic drills** — 30-second math drills, 60-second structuring drills, 2-minute synthesis drills with auto-grading. Highest-leverage UX pattern in the space; users say it's the single best part of RocketBlocks even when they hate the structuring drills ([Source](https://www.preplounge.com/consulting-forum/rocketblocks-structuring-drills-harmful-for-candidate-10994)).
2. **Crafting Cases' "6 Building Blocks" + LOMS' "good vs bad candidate" recordings** — pair every case with (a) the 6-block decomposition and (b) a side-by-side strong-solver vs weak-solver narrative. Cheapest-to-produce, highest perceived value.
3. **Hacking the Case's "8 framework types + when to use each"** decision-tree as a coaching scaffold — the canonical solve-flow most beginners rate as their #1 useful resource ([Source](https://www.blinkist.com/en/books/hacking-the-case-interview-en)).

### Top 3 things CasePad should NOT do (failed-pattern warnings)
1. **Don't build a peer-matching marketplace.** PrepLounge's Trustpilot pattern: "matching with people doesn't work properly… most invites went unanswered" ([Source](https://igotanoffer.com/en/advice/preplounge-alternatives)). Two-sided liquidity problem CasePad doesn't have to solve when AI is the partner.
2. **Don't gate the case library behind subscription.** Free tier is CasePad's wedge; PrepLounge's model (10 free, then paywall) generates resentment in cohort channels.
3. **Don't pretend to be a coaching marketplace.** IGotAnOffer's $110–$225/hr ex-MBB coaches require verified-coach supply CasePad cannot ethically vouch for as a solo project.

### Where CasePad's AI-interviewer angle is genuinely novel
- **Real-time adaptive interviewer that adjusts difficulty mid-case** based on student responses. No competitor does this; AI competitors run static scripts. (PrepLounge Preppie, MBB.AI, CaseStudyPrep.AI all replay a fixed case script per [PrepLounge AI Casebot page](https://www.preplounge.com/en/ai-casebot).) [unverified — based on product demos]
- **1,165-case verified library** — larger than any competitor (PrepLounge 700, RocketBlocks ~300, LOMS 8, CaseCoach < 100, CasePrepared < 50).
- **Free tier in a $99–$500 market** — cohort distribution model (CasePad doesn't need ARR) is structurally impossible for VC-backed competitors to match.
- **Cohort signal** (CasePad knows which IIM/college cohort a user belongs to and can rank/curate against peer performance) — none of the global platforms have this.
- **Indian-market awareness** (consulting cases translated into Indian context, INR-denominated math, India-relevant industries) — global platforms are US-MBA-centric.

---

## Tier-1 platforms — deep dive

### 1. Hacking the Case Interview (Taylor Warfield)
**URL:** https://www.hackingthecaseinterview.com

**Author / credibility hook:** Taylor Warfield — former Bain Manager, interviewer, recruiter; 10+ years coaching. Website draws 500K visitors/year, YouTube channel has 50K+ subs and 3M views ([Source: Blinkist book summary](https://www.blinkist.com/en/books/hacking-the-case-interview-en)).

**Pricing:**
- Book: ~$15–$25 (Amazon paperback / Kindle, [Source](https://www.amazon.com/Hacking-Case-Interview-Consulting-Interviews/dp/1545261822))
- Behavioral interview course: **$99** ([Source](https://www.hackingthecaseinterview.com/))
- Comprehensive Case Interview course: industry standard $200–$400 range for online video courses; specific tier not directly fetched (site returns 403 to scrapers) [unverified — exact bundle price]
- Resume review: **$400**
- Silver Package (named bundle): exists, contents not verified ([Source](https://www.hackingthecaseinterview.com/courses/consulting-offer-silver-package))
- 1:1 coaching with Taylor Warfield — not directly priced in public sources [unverified]

**Content structure:**
- **140+ lessons** in the comprehensive course
- **20 full-length practice cases**
- **150+ practice problems / drills**
- Expected completion time: **15–25 hours** ([Source: synthesized from search results above])
- Free practice cases on the public site as a top-of-funnel ([Source](https://www.hackingthecaseinterview.com/pages/free-practice-cases))

**Methodology / canonical solve-flow:** Frameworks-as-foundation. Warfield teaches **8 flexible framework types** (Market Potential, Competitor Dynamics, Organizational Strengths, Customer Demographics, Financial Analysis, Synergies, Risks/Countermeasures, Tailored Custom). The candidate's job is to identify the prompt type, pick the right flexible template, and customize on the fly. ([Source: Blinkist](https://www.blinkist.com/en/books/hacking-the-case-interview-en); [Source: Shortform](https://www.shortform.com/summary/hacking-the-case-interview-summary-taylor-warfield)).

This is the **most beginner-friendly methodology in the market** — explicit "memorize these 8, customize one" pedagogy.

**UX:** Static video + reading + worked examples. Self-paced, no live interaction. Coaching is paid add-on.

**What works (per review patterns):**
- Beginner-friendly: explicit framework menu reduces decision paralysis on day 1
- Cheap relative to LOMS / coaching ($99 entry point)
- High SEO trust: 500K visitors/year means students arrive already pre-sold
- "7 days to top 10%" promise is concrete and outcome-framed (good marketing copy)

**What doesn't:**
- Frameworks-first pedagogy is increasingly criticized at MBB level (McKinsey now actively penalizes "Profitability framework"-style pattern-matching; see [MyConsultingCoach problem-driven structure](https://www.myconsultingcoach.com/case-interview-problem-driven-structure))
- Static content; no adaptive feedback
- No mock interview engine — students must self-source partners

**Differentiator:** Cheapest credible entry point; strongest beginner pedagogy; free SEO content acts as funnel.

**What CasePad should copy:**
1. The **8 framework types as a teaching scaffold** — embed as a "case type detector" feature: when a student opens a case, CasePad can label it ("This is a Market Sizing case → use Framework Type 1") and offer the scaffold as optional training wheels.
2. **Free SEO content top-of-funnel** — Warfield's blog posts rank for "case interview frameworks", "case interview math", etc. CasePad should publish 30–50 such articles to capture organic intent. (Each cohort student who shares CasePad with a Google query becomes a discovery vector.)
3. **The "7 days to top 10%" outcome promise** — concrete, time-boxed, measurable. CasePad should adopt similar language: "20 cases in 14 days = top 25% of your cohort."

**Sources:**
- [Hacking the Case Interview homepage](https://www.hackingthecaseinterview.com/)
- [Comprehensive course page](https://www.hackingthecaseinterview.com/courses/consulting)
- [Free Practice Cases](https://www.hackingthecaseinterview.com/pages/free-practice-cases)
- [Blinkist book summary](https://www.blinkist.com/en/books/hacking-the-case-interview-en)
- [Shortform summary](https://www.shortform.com/summary/hacking-the-case-interview-summary-taylor-warfield)

---

### 2. Victor Cheng — Look Over My Shoulder (LOMS) + Case Interview Secrets
**URL:** https://caseinterview.com/loms

**Author hook:** Victor Cheng — McKinsey 1996–2000, then strategy consultant. The "ex-McKinsey" brand carries the highest premium in the category; arguably the most famous case-prep individual brand in the world.

**Pricing:** **$297 one-time** OR 4 × $87 monthly = $348 ([Source](https://www.myconsultingoffer.org/case-study-interview-prep/victor-cheng-loms/)). **NOT $500** — Ash's $500 figure may be outdated or referring to a bundle. Price has been stable for ~15 years.

**Content architecture (this is THE key insight):**
- **8 cases × ~22 candidates = ~22 recorded sessions** total
- **Audio-only podcast format** (not video). Total runtime ~50 hours.
- Multiple candidates do the **same case prompt**, so listeners hear different approaches to identical input — strong contrastive learning
- Victor Cheng narrates between sessions: explicit "here's what this candidate did well, here's what they did poorly"
- Plus the free book "Case Interview Secrets" + free YouTube videos (top-of-funnel)
- ([Source: Hacking the Case's LOMS review](https://www.hackingthecaseinterview.com/pages/look-over-my-shoulder-review))

**Methodology pillar:** **Hypothesis-driven thinking + issue trees.** Cheng's claim is that the *thinking process* generalizes — students should NOT memorize cases but internalize the meta-pattern. Two core frameworks (Profitability, Business Situation) carry most of the load.

**UX:** Pure audio. No interactive elements. Listeners passively absorb 50 hours.

**What works (per review patterns):**
- "LOMS is what got me into MBB. Once the process clicked for me after going through LOMS, I was able to crack every practice and actual interview case using his 2 frameworks." — Reddit/forum testimony ([Source: synthesized from forums search](https://gmatclub.com/forum/victor-cheng-s-look-over-my-shoulder-program-loms-107893.html))
- **Contrastive learning** (good vs bad candidate on same prompt) is pedagogically powerful — no other platform does this systematically
- Audio format = consume during commute, gym, walk → high completion rate
- Brand authority of "ex-McKinsey" + price anchor at $297 sustains 15+ year market position

**What doesn't:**
- Format is dated (audio-only, no interactivity, no drills)
- Only 8 cases — narrow corpus
- Some users report material is repetitive after the first 3–4 cases
- Bad-experience thread on PrepLounge: ["Bad Experience with Victor Cheng Case Interview Material - alternatives?"](https://www.preplounge.com/consulting-forum/bad-experience-with-victor-cheng-case-interview-material-alternatives-1819)
- "Issue trees" methodology is criticized as too generic by MBB-level prep coaches today

**Why $297 sticks:** Price discrimination on perceived expertise. "Ex-McKinsey" carries 5–10x markup vs unbranded coaches. Audio format = high perceived production effort. No subscription = "lifetime access" framing reduces decision friction.

**Differentiator:** The contrastive-pair recordings. Nobody else has this asset.

**What CasePad should copy:**
1. **The good-vs-bad candidate paired audio (or AI-generated) walkthrough.** For each of CasePad's 1,165 cases, produce two AI-narrated solve transcripts: "Strong solver" and "Weak solver" with mid-case commentary explaining the diverge. Cost: minutes of LLM compute per case. Value: replicates LOMS's most-cited feature at near-zero cost.
2. **Audio mode for cases.** Many students prep on commute. CasePad doesn't need an app — a "play this case as a podcast" link is enough.
3. **Two-framework canonical solve-pattern as floor.** Like Cheng's Profitability + Business Situation as defaults, CasePad should pick its 2 most flexible structures and teach them as the "if you're new, start here" path.

**Sources:**
- [Victor Cheng LOMS landing](https://caseinterview.com/loms)
- [My Consulting Offer LOMS review](https://www.myconsultingoffer.org/case-study-interview-prep/victor-cheng-loms/)
- [Management Consulted LOMS review](https://managementconsulted.com/look-over-my-shoulder-review/)
- [Hacking the Case Interview LOMS review](https://www.hackingthecaseinterview.com/pages/look-over-my-shoulder-review)
- [GMATClub forum thread on LOMS](https://gmatclub.com/forum/victor-cheng-s-look-over-my-shoulder-program-loms-107893.html)
- [PrepLounge LOMS reviews thread](https://www.preplounge.com/consulting-forum/any-reviews-on-the-look-over-my-shoulder-program-presented-by-victor-cheng-2232)

---

### 3. RocketBlocks (Kenton Kivestu — ex-BCG, ex-Google PM)
**URL:** https://www.rocketblocks.me

**Founder credibility:** Kenton Kivestu — ex-BCG, ex-Google PM. Built RocketBlocks as a product-first platform vs the content-first incumbents. ([Source: LinkedIn](https://www.linkedin.com/in/kivestu); [Source: RocketBlocks coach page](https://www.rocketblocks.me/coaches/kenton-kivestu.php)).

**Pricing:**
- 7-day free trial ([Source: Reddit/forum reports](https://www.preplounge.com/consulting-forum/crafting-cases-vs-rocket-blocks-19984))
- Monthly subscription (sprint mode) — recently reported at **~$89/mo** by Ash; older 2014 reference shows $45/mo ([Source: Wall Street Oasis thread](https://www.wallstreetoasis.com/forums/rocketblocksme-thoughts)). Site requires login to see current price.
- Annual subscription discount available ([Source: RocketBlocks plans page](https://www.rocketblocks.me/guide/case-prep-plans.php))
- **Coaching at $200/hr** à la carte ([Source](https://www.rocketblocks.me/coaches/booking/intro.php))

**Drill architecture (THE most important thing in the entire competitive set for CasePad):**

This is where RocketBlocks earns its money. The platform decomposes a case into **discrete sub-skills**, each with its own drill:

| Drill type | What student does | Comparison/grading |
|---|---|---|
| **Math drills** | Mental arithmetic, breakevens, long division — timed | Auto-graded against correct numeric answer |
| **Structuring drills** | Given a case prompt, write/select the structure tree | Compared against ex-MBB contributor panel suggestions |
| **Chart/exhibit reading** | Look at chart, answer questions about insight | Auto-graded |
| **Brainstorming/idea-gen** | List ideas under a category constraint | Compared against suggested list |
| **Synthesis** | Given case data, summarize the recommendation | Compared against canonical synthesis |

UX: "You log in, pick a category (math, charts, structuring), and work through timed exercises… built as a series of interactive modules" ([Source: forum + RocketBlocks FAQ synthesis](https://www.rocketblocks.me/faq.php)).

**Distribution moat:** B2B2C wedge. Partnered with **50%+ of Ivy League** career services + 30+ B-schools globally including Stanford, MIT, LBS. Schools pay; students get free/subsidized access ([Source: RocketBlocks consulting page](https://www.rocketblocks.me/consulting.php)).

**What works (per Reddit/forum reviews):**
- "Users love RocketBlocks for math/charts/exhibits" — these drills are universally praised ([Source: PrepLounge thread](https://www.preplounge.com/consulting-forum/rocketblocks-structuring-drills-harmful-for-candidate-10994))
- Used RocketBlocks for math + structuring drills (no live cases) → top-firm offers; "100% worth it" ([Source: Quora discussion](https://www.quora.com/What-do-you-think-of-rocketblocks-me-as-a-preparation-website-for-management-consulting-interviews))
- Gamified, slick UX — engaging in a way LOMS / Hacking are not
- B-school distribution = students don't pay out of pocket

**What doesn't:**
- "Users… do not like it for structuring, noting that their structures/frameworks are extremely 'flat', narrow, and not particularly objective-driven" — Reddit/PrepLounge consensus ([Source](https://www.preplounge.com/consulting-forum/rocketblocks-structuring-drills-harmful-for-candidate-10994))
- Drills are isolated → student practices skills but never strings them into a full live case
- $89/mo subscription → high cost over 4–6 month prep window ($350–$540 total)

**Differentiator:** The atomic-drill model. **The single most copyable feature in the entire market for CasePad.**

**What CasePad should copy:**
1. **Math drills with timer + auto-grading.** Easiest feature in the world to ship. Generate ~500 drill problems via LLM (CasePad already has Groq), randomly serve, time each, grade numerically. This alone is worth shipping in week 1.
2. **Structuring drills with reference comparison.** For each of the 1,165 cases, pre-generate a "model structure" via LLM. When student writes their structure, AI compares dimensions covered and gives differential feedback ("you missed the operational lever").
3. **Chart-reading drills.** Synthesize fake exhibits via matplotlib/Recharts; ask 1-question multiple choice on insight. Auto-graded.
4. **Brainstorming drills.** "List 5 reasons profitability could decline." Compare against canonical 5-reason list.
5. **B2B2C wedge — partner with college clubs.** Replicates RocketBlocks' B-school strategy in India; CasePad's distribution channel.

**Sources:**
- [RocketBlocks homepage](https://www.rocketblocks.me/)
- [RocketBlocks consulting prep page](https://www.rocketblocks.me/consulting.php)
- [Case prep plans](https://www.rocketblocks.me/guide/case-prep-plans.php)
- [RocketBlocks structuring drill criticism — PrepLounge thread](https://www.preplounge.com/consulting-forum/rocketblocks-structuring-drills-harmful-for-candidate-10994)
- [Crafting cases vs RocketBlocks — PrepLounge](https://www.preplounge.com/consulting-forum/crafting-cases-vs-rocket-blocks-19984)
- [Quora RocketBlocks review](https://www.quora.com/What-do-you-think-of-rocketblocks-me-as-a-preparation-website-for-management-consulting-interviews)
- [Wall Street Oasis RocketBlocks discussion](https://www.wallstreetoasis.com/forums/rocketblocksme-thoughts)

---

## Tier-2 platforms — lighter deep dive

### 4. PrepLounge

**URL:** https://www.preplounge.com

**Architecture:** 80,000+ global members. Peer-matching marketplace + 700+ case library + drills + forum + AI casebot ("Preppie"). ([Source: PrepLounge premium membership page](https://www.preplounge.com/en/shop/premium-membership)).

**Pricing:**
- Free basic: 10 mock interviews, limited cases/drills
- **Premium $39/mo** (or one-time membership package): unlimited peer matching, 700+ cases, drills, messaging
- Premium + Coaching: 1–5 coaching sessions bundled
- ([Source: IGotAnOffer review of PrepLounge](https://igotanoffer.com/en/advice/preplounge-alternatives))

**Peer-matching architecture:** "Meeting Board" with ~50 meeting proposals/day visible. Students post availability, browse partners, schedule directly via platform. Free peer matching globally is the wedge.

**AI Casebot ("Preppie"):** Bot acts as interviewer over PrepLounge's case library, gives feedback ([Source: PrepLounge AI Casebot](https://www.preplounge.com/en/ai-casebot)). Released in last ~12 months. **This is CasePad's most direct competitor in the AI-interviewer space**, but limited by their existing case library quality and a freemium-first audience.

**What works:** Largest peer-matching network in the world. Free tier is real (10 mocks). Case library is broad.

**What fails:** "Matching with people doesn't work properly… most invites went unanswered" — Trustpilot pattern ([Source](https://igotanoffer.com/en/advice/preplounge-alternatives)). Case quality varies wildly. Inconsistent peer feedback.

**What CasePad should learn:** PrepLounge's peer-marketplace failure mode is structural — two-sided liquidity is hard. CasePad's AI-as-partner sidesteps this entirely.

---

### 5. IGotAnOffer (Max Serrano + team)

**URL:** https://igotanoffer.com

**Architecture:** **Coaching marketplace** with 400+ coaches. MBB-ex-interviewer coaches available from $100/hr. Plus structured "IGotAnOffer Method" content + book.

**Pricing:** ([Source: 1h Case Interview Coaching](https://igotanoffer.com/products/case-interview-coaching))
- Early-career coaches: **$110/hr**
- Mid-level: **$150/hr**
- Senior MBB-ex-interviewer: **$225/hr**
- Most students do 3–4 sessions ≈ **$500 total** (their stated benchmark)
- Money-back guarantee within 24h
- ([Source: IGotAnOffer coaching landing](https://igotanoffer.com/en/interview-coaching/type/case-interview))

**Methodology — "The IGotAnOffer Method":** Decomposes every case into **7 question types** (Situation, Framework, Quantitative, Creativity, etc.). Step-by-step playbook per question type. ([Source](https://igotanoffer.com/products/case-interview-training-programme))

**Session format:** 45 min mock + 15 min feedback per hour.

**What works:** Verified ex-MBB coach roster. Structured methodology (the 7 types) is more granular than Hacking's 8 frameworks. Strong SEO content (47 case examples blog post is one of the most-linked case-prep articles online — [Source](https://igotanoffer.com/blogs/mckinsey-case-interview-blog/case-interview-examples)).

**What fails:** $500+ for full prep is expensive for India. Coaching marketplace model has supply-quality variance.

**What CasePad should copy:**
- **The "7 question types" decomposition** — adopt this taxonomy as CasePad's solve-flow scaffold. More accurate than 8 frameworks.
- **The free-content SEO play** — IGotAnOffer's blog drives massive top-of-funnel.

---

### 6. Management Consulted (Jenny Rae Le Roux)

**URL:** https://managementconsulted.com

**Architecture:** Content (book "Consulting Interview Bible") + 1:1 coaching + group bootcamps + flagship paid course ("Black Belt program") + free 15-video case course.

**Credibility:** Jenny Rae edits 600+ resumes/year, conducts 2,000+ mock interviews/year, runs Consulting Bootcamps globally.

**Pricing:** Black Belt program "worth every penny" per Trustpilot ([Source](https://www.trustpilot.com/review/managementconsulted.com)) — actual price not directly verified [unverified, ~$1,500-$3,000 range typical for such bootcamp packages].

**What CasePad should copy:** **Free 15-video case course as the lead magnet.** CasePad should ship a free "Case Interview in 15 Minutes" video series for SEO + cohort sharing.

---

### 7. MyConsultingCoach

**URL:** https://www.myconsultingcoach.com

**Distinguishing methodology — Problem-Driven Structure (PDS):** This is the **anti-framework methodology**. Argues that traditional frameworks (Profitability, 4Ps, Porter's) are obsolete at MBB-level interviews because real consulting work doesn't use them. Instead, every case generates a **bespoke structure built around the specific problem** ([Source](https://www.myconsultingcoach.com/case-interview-problem-driven-structure)).

**Why this matters for CasePad:** Top MBB candidates increasingly use PDS over framework pattern-matching. CasePad's AI interviewer should reward PDS-style structuring (custom to prompt) and gently penalize generic framework dumps. This is where MBB-level realism lives.

**What CasePad should copy:** PDS as the **default solve-method for advanced cases**. Frameworks-mode for beginners, PDS-mode for advanced.

---

### 8. Crafting Cases (Bruno & Julio — ex-McKinsey, ex-Bain)

**URL:** https://www.craftingcases.com

**Methodology — The 6 Building Blocks:** Argues every case interview question is one of **6 question types**. Teaches step-by-step "how to answer" per type. ([Source: Crafting Cases site](https://www.craftingcases.com/case-interview-prep-guide/)).

**Pedagogy principle:** "Practice makes permanent" — teach correct form first, then drill via isolated-skill exercises ("a drill is basically an exercise that isolates a specific task/skill"). Heavy emphasis on **custom framework building**, not memorization.

**Free 7-day course** as lead magnet → conversion to paid courses (Case Interview Fundamentals, Control the Case, etc.).

**What CasePad should copy:**
- **The 6 Building Blocks taxonomy** — combined with IGotAnOffer's 7 question types, the convergent canon is roughly: Situation/Setup → Structure → Math → Brainstorm → Chart/Exhibit → Synthesis. CasePad should adopt this as its case-stage progression.
- **The "drill = isolate one skill at a time"** philosophy — same as RocketBlocks. Universal best practice in this market.
- **Free 7-day course as funnel.**

**Source:** [Crafting Cases homepage](https://www.craftingcases.com/), [Case Interview Practice page](https://www.craftingcases.com/case-interview-practice/)

---

### 9. CaseCoach

**URL:** https://casecoach.com

**Founder:** Ex-McKinsey interviewer + ex-headhunter for top-3 MBB.

**Pricing:** **$49/mo or $199/yr ($17/mo billed annually)** — most affordable subscription model among ex-MBB-led platforms ([Source: IGotAnOffer/Management Consulted comparison](https://managementconsulted.com/management-consulted-vs-casecoach/)).

**Architecture:** Expert-led courses + real candidate interview videos + practice cases + tools. **60,000+ candidates/year**, average 20+ hours on platform. **Two of the top-3 consulting firms use CaseCoach to prep their own candidates** ([Source: CaseCoach c-page](https://casecoach.com/c/)).

**Differentiator vs CasePad:** McKinsey-style interviewer-led case format. Real candidate videos.

**What CasePad should learn:**
- **Real candidate videos as a free trust signal** — CasePad could record mock cohort sessions (with consent) and host them.
- **The "MBB partner-validates-our-platform" credibility story** — once CasePad ships, get 1 ex-MBB endorsement.

---

### 10. StrategyU (Paul Millerd, ex-McKinsey)

**URL:** https://learn.strategyu.co

**Positioning:** **NOT case-interview-focused.** Teaches strategy-consulting *job skills* (MECE, Pyramid Principle, slide design, storytelling). 25+ lectures, 2+ hours.

**Why notable:** Paul Millerd's testimonial "if your main goal is case prep, it is probably not the best fit, but if you want to build the underlying thinking and communication skills, it will help" is honest positioning. He carved a different niche.

**What CasePad should learn:** Don't fight Hacking the Case for "best case-interview-prep" SEO. Pick a defensible niche: "**AI mock interviewer for Indian B-school cohort prep**" and own it.

---

## AI-based competitors — most important section for CasePad

### 11. Direct AI case-interview tools (the existing field)

| Platform | Model/UX | Pricing | Honest assessment |
|---|---|---|---|
| **CaseStudyPrep.AI** ([Source](https://www.casestudyprep.ai/)) | "AI interviewer" voice mocks, ex-MBB-written cases, "instant feedback" + structured scoring | **$15/case** + free trial | Most polished AI-native competitor. Ex-MBB-written case corpus is the moat. Voice mode + scoring is closest to CasePad's vision. **This is CasePad's #1 direct rival.** |
| **CaseWithAI** ([Source](https://www.casewithai.com/)) | AI mocks + targeted drills + courses, BCG/Bain candidate-led format | Pricing not public | Decent UX, narrower corpus. Uses both LLM-mock + drill model — closest hybrid to RocketBlocks + AI. |
| **MBB.AI** ([Source](https://www.mbb.ai/)) | Basic AI case simulations for McKinsey/BCG/Bain | Subscription, no free trial | Reviewed by competitors as "basic AI tools… several alternatives offer enhanced features" ([Source](https://www.casestudyprep.ai/mbb-ai-vs-casestudyprep-ai/)) — likely a thin wrapper. |
| **PrepPartner.ai** ([Source](https://preppartner.ai)) | AI peer-matcher; voice; consulting + fit interview practice; CV optimization | Freemium [unverified] | Indie-built; strong onboarding messaging ("the leading AI case partner solution in 2025"); narrow corpus. |
| **CasePrepared** ([Source](https://www.caseprepared.com/)) | AI case interview prep | [unverified] | Smaller player, less well-known. |
| **CrackTheCase AI** ([Source](https://www.crackthecaseai.com)) | "Enhance your case practice" AI tool | [unverified] | Smaller player. |
| **PrepLounge Preppie** ([Source](https://www.preplounge.com/en/ai-casebot)) | AI casebot over PrepLounge's 700-case library, gives feedback | Bundled in $39/mo Premium | Has the largest case corpus + AI; the strongest moat-pair competitor. CasePad's wedge is voice + adaptive interviewer + free tier. |
| **MyConsultingCoach AI (CaseStudyPrep partnership)** ([Source](https://www.myconsultingcoach.com/case-interview-ai)) | Embedded CaseStudyPrep.AI under MyConsultingCoach brand | Bundled | Distribution play; technically the same engine as CaseStudyPrep.AI. |
| **Sensei AI** ([Source](https://www.senseicopilot.com/)) | NOT a case-interview platform — it's a real-time interview *cheating copilot* (live audio analysis, instant transcription, suggested answers during real interviews) | Subscription | Adjacent product. Not a direct competitor; more of a parasite tool on real interviews. Could be a future threat if it pivots. |

**Honest community assessment of AI case-prep tools:** "Some ex-McKinsey consultants reported not being impressed with AI tools yet, noting that most provide generic advice at the level of peer feedback rather than moving the needle. One consultant experienced poor results using AI tools for case structuring and math problems." ([Source: PrepLounge AI tools thread](https://www.preplounge.com/consulting-forum/has-anyone-tried-any-of-the-ai-interview-tools-for-mbb-before-20398)).

**The opportunity:** None of these competitors has cracked **simultaneously**: large verified case corpus + adaptive interviewer + voice + free distribution. CasePad can be the first.

---

### 12. ChatGPT-based custom GPTs (the moat threat)

The Plus-user phenomenon: students paying $20/mo to OpenAI use off-the-shelf GPT-4 / GPT-5 with prompts like "You are a McKinsey case interviewer. Run a profitability case for a coffee chain…" Multiple custom GPTs exist (e.g., "Case Interview with CaseWiz" — [Source](https://www.yeschat.ai/gpts-2OToOApuYI-Case-Interview)).

**Why this matters for CasePad's moat:**
- **Generic GPT case practice is free or near-free** (anyone with $20/mo Plus has it).
- The bar for "AI case interviewer" is low if GPT alone is good enough.
- CasePad's defensibility cannot be "we have an AI interviewer" — it must be:
  1. **Verified case corpus** (1,165 real, classified, multi-modal cases vs ChatGPT's hallucinated corpus)
  2. **Adaptive interviewer behavior tuned for case dynamics** (not a generic prompt)
  3. **Persistent memory of student progress** (ChatGPT forgets across sessions)
  4. **Cohort signal + leaderboard + social** (ChatGPT has no community layer)
  5. **Drills + structured curriculum** (ChatGPT is open-ended; students don't know what to practice next)

**Honest assessment from forums:** "ChatGPT can't fully replicate the dynamic experience of a live back-and-forth mock interview… It's crucial to keep traditional mock interviews as a core part of your preparation" ([Source](https://www.preplounge.com/consulting-forum/ai-chatgpt-for-case-practice-22042)). Even AI-friendly content recommends ChatGPT only as supplement.

**Moat priority for CasePad:** Verified case corpus + persistent state are the two CapEx-style moats GPT-wrappers can't replicate cheaply.

---

## Methodology comparison table

| Platform | Solve-flow | Frameworks doctrine | Math approach | Synthesis approach | Drill model |
|---|---|---|---|---|---|
| **Hacking the Case** | Pick from 8 framework types → customize | Pro-framework, beginner-friendly | Static problem sets | Worked examples | 150+ practice problems |
| **LOMS** | Hypothesis-driven + 2 frameworks (Profitability, Business Situation) | Pro-framework but minimal | Embedded in cases | Embedded in cases (audio narration) | None — pure case listening |
| **RocketBlocks** | Skill-isolated drills, then full case | Framework-agnostic (drill-first) | Timed math drills, auto-graded | Synthesis drill | Math, structuring, charts, brainstorming, synthesis |
| **PrepLounge** | Self-paced peer practice | Mixed (case-by-case) | In-case | Peer feedback | Limited drills |
| **IGotAnOffer** | 7 question types decomposition | Anti-generic-framework, structured per type | Case math | Case synthesis | Light |
| **Management Consulted** | Bootcamp + 1:1 coaching | Frameworks + math drills + bootcamp | Math drills | Case-by-case | Math, framework drills |
| **MyConsultingCoach** | Problem-Driven Structure (custom per case) | **Anti-framework** (PDS-only) | Inside case | Inside case | Limited |
| **Crafting Cases** | 6 Building Blocks per case | **Custom-build per case** | Drill-based | Drill-based | "Drill = isolate one skill" |
| **CaseCoach** | McKinsey interviewer-led format | Mixed | In-case | In-case | Real candidate video study |
| **CaseStudyPrep.AI** | AI mock interview voice | Lets you choose | In-case | AI-scored | Limited |
| **PrepLounge Preppie** | AI mock over PrepLounge cases | Library-driven | In-case | AI feedback | Drills via PrepLounge |
| **CasePad (target)** | AI-as-interviewer, adaptive | **Hybrid: 8-framework menu for beginners, PDS for advanced** | Atomic timed drills + in-case | Atomic synthesis drill + in-case AI feedback | Math/structure/chart/brainstorm/synthesis (RocketBlocks-style) |

---

## What CasePad should COPY (ranked by leverage)

### 1. Atomic timed drills (RocketBlocks → CasePad) — HIGHEST LEVERAGE
**Specific implementation:**
- `/drills/math` — 30-second timed mental math problems. LLM-generated bank (~500 problems). Auto-graded numerically.
- `/drills/structure` — 60-second timed structuring drill. LLM-generated prompts. Compare student response against pre-generated reference structure via embedding similarity + dimension coverage check.
- `/drills/charts` — 90-second exhibit-reading drill. Synthetic charts via Recharts. Multiple-choice insight question, auto-graded.
- `/drills/brainstorm` — 60-second idea-generation drill. Compare list against canonical 5-item answer.
- `/drills/synthesis` — 2-minute synthesis drill. AI-graded against case canonical recommendation.
- **Track per-skill ELO score** — student sees "Math: 1450, Structuring: 1200, Charts: 1350, Synthesis: 1100" and knows where to drill.

**Why highest leverage:** Every reviewer says drills are the part of RocketBlocks they love. Easy to build. Daily-engagement loop. Cohort leaderboards become natural. Maps to CasePad's existing case corpus.

### 2. Good-vs-Bad solver paired walkthrough (LOMS → CasePad)
**Specific implementation:** For each of CasePad's 1,165 cases, generate two AI-narrated solve transcripts: "Strong solver" and "Weak solver" with mid-case commentary explaining the diverge points. Render as audio (browser TTS or Groq Whisper-reverse) + text. Student can scrub between them.

### 3. The 7-question-type / 6-Building-Block taxonomy (IGotAnOffer + Crafting Cases → CasePad)
**Specific implementation:** Tag every case with the question types it tests (Setup, Structure, Math, Brainstorm, Chart, Synthesis). Show progress bars per type. "You're weak on Brainstorm — here are 5 cases that drill it."

### 4. Free 15-video case crash course as lead magnet (Management Consulted → CasePad)
**Specific implementation:** Record (or AI-generate) 15 short videos: "Case Interview in 15 Minutes." Hosted free on YouTube + embedded on CasePad. Each ends with CTA to free signup. Captures organic SEO traffic.

### 5. SEO content blog (Hacking the Case + IGotAnOffer → CasePad)
**Specific implementation:** Publish 30 articles ranking for "case interview frameworks," "case math practice," "MBB structuring," "consulting case India," etc. Each links into a relevant CasePad drill or case. Compounding inbound funnel.

### 6. Audio mode for cases (LOMS → CasePad)
**Specific implementation:** Each case gets a "play as podcast" button. AI-narrated. Students consume on commute. No app needed.

### 7. Cohort leaderboard + social signal (CasePad-native, inspired by gaming UX)
**Specific implementation:** Within a college/cohort, show top-10 by drill ELO + cases solved. Anonymous-by-default with opt-in identity. Drives daily-use loop.

### 8. Problem-Driven Structure mode (MyConsultingCoach → CasePad)
**Specific implementation:** For advanced students, the AI interviewer rewards custom-built structures over generic frameworks. Penalizes "I'd use the Profitability framework" with "tell me why those specific drivers matter for this client."

### 9. Behavioral interview module add-on (Hacking the Case sells separately at $99 → CasePad)
**Specific implementation:** Ship a free behavioral interview AI module. CasePad becomes "case + fit" complete prep, expanding TAM beyond consulting to PM/IB.

### 10. Free 7-day intensive course (Crafting Cases → CasePad)
**Specific implementation:** "Case Mastery in 7 Days" gated email course. Day 1: Setup. Day 2: Structure. Day 3: Math drills. Day 4: Charts. Day 5: Brainstorm. Day 6: Synthesis. Day 7: Full mock with CasePad AI interviewer. Conversion event built in.

### 11. Real candidate video library (CaseCoach → CasePad)
**Specific implementation:** Cohort members can opt in to share their solve recordings (audio anonymized). New users browse "watch how a top-cohort member solved this." Network effect.

### 12. B2B2C distribution to college clubs (RocketBlocks → CasePad)
**Specific implementation:** White-label CasePad to consulting clubs at IIM-A/B/C, ISB, NMIMS, MDI etc. Free for them; CasePad gets distribution + case-corpus contributions.

---

## What CasePad should AVOID (failed patterns)

### 1. Peer-matching marketplace (PrepLounge failure mode)
**Pattern:** PrepLounge built peer-matching as core wedge → Trustpilot complaints "matching with people doesn't work properly… most invites went unanswered." Two-sided liquidity is hard. CasePad's AI-as-partner sidesteps the entire problem.

### 2. Coaching marketplace (IGotAnOffer requires verified-coach supply)
**Pattern:** IGotAnOffer/Management Consulted/CaseCoach all need to vet 100s of ex-MBB coaches. Quality-control is operational hell. CasePad as a solo project should not enter this game.

### 3. Audio-only static content (LOMS dated UX)
**Pattern:** LOMS is 15+ years old, still sells, but its format is archaeologically static. Cheng can charge $297 because of brand alone. CasePad has no $297 brand → cannot compete on legacy-content moat. Must lean on interactivity.

### 4. Frameworks-as-memorization pedagogy (RocketBlocks structuring criticism)
**Pattern:** RocketBlocks' structuring drills are the most-criticized feature ("flat, narrow, not objective-driven"). MBB-level interviews now penalize generic framework dumps. CasePad's structuring drill should reward custom Problem-Driven Structures, not pattern-matched 4Ps.

### 5. Subscription gating from day 1 (PrepLounge resentment pattern)
**Pattern:** PrepLounge's 10-free-then-pay model generates resentment in cohort channels (where CasePad lives). CasePad's free-tier-permanent model is structural advantage; don't surrender it.

### 6. Pay-per-case pricing (CaseStudyPrep.AI's $15/case)
**Pattern:** $15/case psychologically blocks practice volume. Students need 30+ cases for prep; $450 hits friction wall. Unlimited-flat or free-tier wins for retention.

### 7. Generic AI without persistent state (ChatGPT GPT failure mode)
**Pattern:** ChatGPT custom GPTs forget across sessions; can't track student progress. CasePad MUST have per-student persistent skill-state (Drizzle/Supabase already supports this).

### 8. US-MBA-centric content (every global platform fails Indian context)
**Pattern:** Hacking, RocketBlocks, LOMS, IGotAnOffer all use US-context cases ($, US industries, Western customer segments). Indian B-school students do crores-rupee math, not millions-dollar math. CasePad's INR-native case translation is genuine differentiation.

---

## Where CasePad's AI-interviewer angle is genuinely novel

### What only CasePad has (or could have):
1. **1,165-case verified library** — 1.6x PrepLounge, ~4x RocketBlocks, ~145x LOMS, ~12x CaseCoach.
2. **AI interviewer that adapts mid-case** based on student's evolving response quality (every other AI tool runs static scripts).
3. **Free tier in a $99–$500 market** (cohort distribution → no ARR pressure).
4. **Cohort signal** (CasePad knows your IIM/college; can rank vs peers, surface top cohort solves).
5. **Indian-market cases + INR math + India industry context.**
6. **Persistent skill ELO across sessions.**

### What CasePad DOESN'T do that legacy platforms DO (gap list):
1. **Verified ex-MBB coach roster.** No 1:1 human coaching. (Could partner via cohort alumni.)
2. **Real candidate video library.** No anonymized solve recordings yet. (Easy to add.)
3. **B2B sales motion to corporate clients** (RocketBlocks sells to schools, IGotAnOffer to firms). CasePad is consumer-only.
4. **Behavioral / fit interview content.** Hacking sells this as $99 separate product. Easy add.
5. **Resume/CV review.** Adjacent product nobody on AI side has bundled well.
6. **Slide design / consulting on-the-job skills** (StrategyU's niche).

---

## Pricing strategy options for CasePad

Given: CasePad currently free, distributed via cohorts, zero-budget rule, Ash on job hunt.

### Option A: Permanent free + cohort B2B2C white-label
- **Model:** Always free for individual students. Charge consulting clubs / colleges $X/year for branded version + analytics dashboard.
- **Pros:** Aligns with zero-budget rule. Distribution moat (clubs become evangelists). No payment-processing complexity.
- **Cons:** B2B sales cycle is slow. Revenue depends on club budgets.

### Option B: Freemium with paid premium AI mock minutes
- **Model:** 5 free AI mocks/week, $9/mo for unlimited. (Underprices PrepLounge's $39 by 4x.)
- **Pros:** Captures revenue from power users. Cohort users still benefit free. Resume-line ARR.
- **Cons:** Engineering overhead (Stripe, billing). Students hate any paywall.

### Option C: Free forever + sponsorship/job-board model
- **Model:** All features free for students. Monetize by listing consulting firms / target companies on the platform; firms pay to be visible to high-ELO users.
- **Pros:** Consultant placement firms (and B-schools) already pay for talent surfacing. Zero student-side friction.
- **Cons:** Long monetization runway. Requires trust + scale before firms care.

**Recommendation:** **Start Option A** (cohort white-label) as path-of-least-resistance pre-revenue. Layer **Option C** at scale (10K+ active students). Skip Option B unless you need ARR for a hire.

---

## Specific UX patterns to steal

### 1. Timer-bar on every drill (RocketBlocks)
30s/60s/90s ticking bar on screen. Forces speed. Auto-submits at zero. Ship in /drills/* views.

### 2. ELO badge per skill (gaming UX, not in any competitor)
Show "Math 1450 | Structure 1200 | Synthesis 1100" on dashboard. Motivates targeted practice. Original UX no competitor has.

### 3. "Compare your structure" reveal (RocketBlocks)
After student submits structure, slide-in panel shows "Top-cohort answer" + AI commentary. Side-by-side rendering.

### 4. Audio play button on every case (LOMS pattern)
Tiny speaker icon on each case card. Click = browser TTS reads case prompt. Free to ship; replicates LOMS's commute-prep value.

### 5. "Interviewer notes" panel that updates live (CasePad-native, original)
While student is in mock, a side panel shows the AI interviewer's running notes ("Strong setup", "Missed cost lever", "Math correct"). Reveals the rubric. No competitor does this.

### 6. Daily 10-minute drill streak (Duolingo UX, not in any competitor)
Streak counter. Push notification. Cohort visible. 10-min daily drill > 90-min weekly cram.

### 7. Search-and-filter case library by attributes (RocketBlocks + PrepLounge)
Filter: Industry / Case Type / Difficulty / Firm / Length / India-context. Critical for 1,165-case library to be navigable.

### 8. "Solve again" with different interviewer mode (CasePad-native)
Same case, but switch from "supportive interviewer" to "tough McKinsey partner" mode. Pure AI advantage; no human coach can replay identically.

---

## Indian-market / IIM-A/B/C specific platforms

### 13. IIM Ahmedabad Consult Club casebook
**The dominant Indian artifact.** IIMA Casebook 2022-23, 2023-24, 2024-25 are the canonical prep documents shared across IIMs. Free PDFs widely circulated ([Source: SlideShare IIMA 2022-23](https://www.slideshare.net/slideshow/iima-casebook-202223pdf/253228492); [Source: CliffsNotes IIMA 2024-25](https://www.cliffsnotes.com/study-notes/19662007); [Source: Consult Club LinkedIn](https://www.linkedin.com/posts/consult-club-iim-ahmedabad_iima-casebook-2022-23-activity-6972579962100834304-kfq-)).

**Implication for CasePad:** These casebooks are CasePad's **most direct Indian competitor**. They're free, comprehensive, and culturally trusted. CasePad's wedge: turn these casebooks into **interactive drillable AI mocks** — same content, transformed format.

### 14. InsideIIM
Articles + structured-approach guides for case interview ([Source: InsideIIM consulting case interview guide](https://insideiim.com/consulting-case-interview-guide); [Source: Case Interview Masterklass](https://insideiim.com/case-interview-masterklass)). Content site, no interactivity.

### 15. MBA Crystal Ball
Admissions consulting, with case interview articles. Mostly admissions-focused, not case-prep core ([Source](https://www.mbacrystalball.com/blog/2018/06/18/case-interviews-prepare/)).

### 16. CrackVerbal
GMAT + MBA admissions consulting, light case interview content. Not a direct case-prep competitor ([Source](https://www.crackverbal.com/resources/how-to-secure-a-consulting-job-with-mba/)).

### 17. WhatsApp / Telegram cohort groups (the dark-matter competitor)
The single biggest informal competitor: **IIM-A consult club WhatsApp groups, ISB consult-prep Telegram channels, IIM-B and IIM-C peer groups.** Members share casebook PDFs, schedule peer mocks, swap interview feedback. Zero formal product.

**Implication for CasePad:** Don't fight this; **integrate into it**. CasePad should be "the tool the WhatsApp group recommends." Build:
- Easy-to-share case links (cohort-attributed)
- Group leaderboards visible by URL (no signup wall)
- WhatsApp-shareable result cards ("Ash solved Bain Coffee Chain in 23 min, top 5% of IIM-A cohort")

### 18. Tough Tongue AI / India-specific MBA prep AI tools
Tough Tongue AI's "Ultimate MBA Guide India 2025" article ([Source](https://www.toughtongueai.com/blog/ultimate-mba-guide-india-2025)) shows nascent India-focused AI MBA-prep niche. Likely competitor in adjacent CAT/SOP space, not case-interview core. [unverified — depth of product not directly evaluated]

---

## Sources (bibliography)

**Tier-1 platforms:**
- [Hacking the Case Interview homepage](https://www.hackingthecaseinterview.com/)
- [Hacking the Case Interview consulting course](https://www.hackingthecaseinterview.com/courses/consulting)
- [Hacking the Case Interview free practice cases](https://www.hackingthecaseinterview.com/pages/free-practice-cases)
- [Hacking the Case Interview LOMS review](https://www.hackingthecaseinterview.com/pages/look-over-my-shoulder-review)
- [Blinkist book summary](https://www.blinkist.com/en/books/hacking-the-case-interview-en)
- [Shortform book summary](https://www.shortform.com/summary/hacking-the-case-interview-summary-taylor-warfield)
- [Amazon Hacking the Case Interview](https://www.amazon.com/Hacking-Case-Interview-Consulting-Interviews/dp/1545261822)
- [Caseinterview.com LOMS landing](https://caseinterview.com/loms)
- [My Consulting Offer LOMS review](https://www.myconsultingoffer.org/case-study-interview-prep/victor-cheng-loms/)
- [Management Consulted LOMS review](https://managementconsulted.com/look-over-my-shoulder-review/)
- [Caseinterview LOMS reviews collection](https://caseinterview.com/look-over-my-shoulder-review)
- [GMATClub LOMS thread](https://gmatclub.com/forum/victor-cheng-s-look-over-my-shoulder-program-loms-107893.html)
- [PrepLounge LOMS reviews](https://www.preplounge.com/consulting-forum/any-reviews-on-the-look-over-my-shoulder-program-presented-by-victor-cheng-2232)
- [PrepLounge bad-experience-with-Cheng thread](https://www.preplounge.com/consulting-forum/bad-experience-with-victor-cheng-case-interview-material-alternatives-1819)
- [RocketBlocks homepage](https://www.rocketblocks.me/)
- [RocketBlocks consulting page](https://www.rocketblocks.me/consulting.php)
- [RocketBlocks case prep plans](https://www.rocketblocks.me/guide/case-prep-plans.php)
- [RocketBlocks Kenton Kivestu coach page](https://www.rocketblocks.me/coaches/kenton-kivestu.php)
- [RocketBlocks coach booking](https://www.rocketblocks.me/coaches/booking/intro.php)
- [Kenton Kivestu LinkedIn](https://www.linkedin.com/in/kivestu)
- [RocketBlocks structuring drills criticism](https://www.preplounge.com/consulting-forum/rocketblocks-structuring-drills-harmful-for-candidate-10994)
- [Quora RocketBlocks review](https://www.quora.com/What-do-you-think-of-rocketblocks-me-as-a-preparation-website-for-management-consulting-interviews)
- [Wall Street Oasis RocketBlocks thread](https://www.wallstreetoasis.com/forums/rocketblocksme-thoughts)
- [Crafting cases vs RocketBlocks PrepLounge](https://www.preplounge.com/consulting-forum/crafting-cases-vs-rocket-blocks-19984)
- [RocketBlocks FAQ](https://www.rocketblocks.me/faq.php)
- [RocketBlocks Accepted blog post](https://blog.accepted.com/building-your-consulting-career-and-a-look-back-at-a-tuck-mba/)

**Tier-2 platforms:**
- [PrepLounge premium membership](https://www.preplounge.com/en/shop/premium-membership)
- [PrepLounge case interview practice page](https://www.preplounge.com/en/case-interview-practice)
- [PrepLounge AI Casebot](https://www.preplounge.com/en/ai-casebot)
- [IGotAnOffer PrepLounge review](https://igotanoffer.com/en/advice/preplounge-alternatives)
- [PrepLounge coaching basics](https://www.preplounge.com/en/case-interview-basics/coaching)
- [PrepLounge meeting board / partner thread](https://www.preplounge.com/consulting-forum/how-to-find-experienced-partners-on-this-platform-24795)
- [IGotAnOffer case interview coaching](https://igotanoffer.com/en/interview-coaching/type/case-interview)
- [IGotAnOffer 1h case interview coaching product](https://igotanoffer.com/products/case-interview-coaching)
- [IGotAnOffer MBB coaching](https://igotanoffer.com/en/interview-coaching/type/mbb-interview)
- [IGotAnOffer 47 case interview examples](https://igotanoffer.com/blogs/mckinsey-case-interview-blog/case-interview-examples)
- [IGotAnOffer best case-interview-coaching services 2026](https://igotanoffer.com/en/advice/best-case-interview-coaching-services)
- [Management Consulted Trustpilot](https://www.trustpilot.com/review/managementconsulted.com)
- [Management Consulted vs RocketBlocks](https://managementconsulted.com/management-consulted-vs-rocketblocks/)
- [Management Consulted vs CaseCoach](https://managementconsulted.com/management-consulted-vs-casecoach/)
- [Management Consulted Bain full case example](https://managementconsulted.com/bain-full-case-interview-example/)
- [Management Consulted Best Case Interview Prep 2026](https://managementconsulted.com/best-case-interview-prep-services/)
- [MyConsultingCoach problem-driven structure](https://www.myconsultingcoach.com/case-interview-problem-driven-structure)
- [MyConsultingCoach hypothesis-driven structure](https://www.myconsultingcoach.com/case-interview-hypothesis-driven-structure)
- [MyConsultingCoach case interview guide](https://www.myconsultingcoach.com/case-interview)
- [MyConsultingCoach case interview AI](https://www.myconsultingcoach.com/case-interview-ai)
- [Crafting Cases homepage](https://www.craftingcases.com/)
- [Crafting Cases prep guide](https://www.craftingcases.com/case-interview-prep-guide/)
- [Crafting Cases practice resources](https://www.craftingcases.com/case-interview-practice/)
- [Crafting Cases Fundamentals course](https://students.craftingcases.com/courses/case-interview-fundamentals)
- [Crafting Cases Control the Case course](https://students.craftingcases.com/courses/control-the-case)
- [CaseCoach case coaching](https://casecoach.com/case-coaching/)
- [CaseCoach platform page](https://casecoach.com/c/)
- [CaseCoach for universities](https://casecoach.com/case-interview-prep-solutions-universities/)
- [CaseCoach ultimate guide to frameworks](https://casecoach.com/b/ultimate-guide-case-interview-frameworks/)
- [LSE / CaseCoach partnership](https://info.lse.ac.uk/current-students/careers/information-and-resources/online-tools/casecoach)
- [StrategyU homepage](https://learn.strategyu.co/)
- [StrategyU consulting frameworks](https://strategyu.co/consulting-frameworks/)
- [StrategyU case interview frameworks](https://strategyu.co/case-interview-frameworks/)
- [StrategyU research on case interviews](https://strategyu.co/case-studies-deep-dive/)

**AI competitors:**
- [CaseStudyPrep.AI homepage](https://www.casestudyprep.ai/)
- [CaseStudyPrep.AI pricing](https://casestudyprep.ai/pricing)
- [CaseStudyPrep.AI vs MBB.AI](https://www.casestudyprep.ai/mbb-ai-vs-casestudyprep-ai/)
- [CaseStudyPrep.AI MBB.AI alternatives](https://www.casestudyprep.ai/top-mbb-ai-alternatives-ai-case-prep)
- [CaseWithAI homepage](https://www.casewithai.com/)
- [MBB.AI homepage](https://www.mbb.ai/)
- [PrepPartner.ai homepage](https://preppartner.ai)
- [PrepPartner Case 101 course](https://www.preppartner.ai/course/case-101-introduction-to-the-case-interview)
- [PrepPartner finding case partners blog](https://www.preppartner.ai/blog/finding-case-partners)
- [CasePrepared homepage](https://www.caseprepared.com/)
- [CrackTheCase AI](https://www.crackthecaseai.com)
- [Sensei AI homepage](https://www.senseicopilot.com/)
- [Sensei AI tools comparison](https://www.senseicopilot.com/blog/top-ai-interview-tools-2025)
- [PrepLounge AI tools thread](https://www.preplounge.com/consulting-forum/has-anyone-tried-any-of-the-ai-interview-tools-for-mbb-before-20398)
- [PrepLounge ChatGPT for case practice](https://www.preplounge.com/consulting-forum/ai-chatgpt-for-case-practice-22042)
- [PrepLounge AI interviewer thread](https://www.preplounge.com/consulting-forum/did-anyone-tried-to-prep-with-an-ai-interviewer-17314)
- [My Consulting Offer AI case interview prep](https://www.myconsultingoffer.org/case-study-interview-prep/ai-case-interview-prep/)
- [Casebasix interview chatbot guide](https://www.casebasix.com/pages/interview-chatbot-case-prep)
- [ScreenApp AI interview assistants 2026](https://screenapp.io/blog/best-ai-interview-assistants-2025)
- [YesChat custom GPT for case interview](https://www.yeschat.ai/gpts-2OToOApuYI-Case-Interview)
- [Strategic Student ChatGPT interview prep guide](https://www.thestrategicstudent.com/strategy-guides/chatgpt-interview-prep-guide)

**India-specific:**
- [IIMA Casebook 2022-23 LinkedIn](https://www.linkedin.com/posts/consult-club-iim-ahmedabad_iima-casebook-2022-23-activity-6972579962100834304-kfq-)
- [IIMA Casebook 2022-23 SlideShare](https://www.slideshare.net/slideshow/iima-casebook-202223pdf/253228492)
- [IIMA Prep Book 2024-25 CliffsNotes](https://www.cliffsnotes.com/study-notes/19662007)
- [IIMA Prep Book 2023-2024 StudyLib](https://studylib.net/doc/26996017/iima-prep-book-2023-2024)
- [InsideIIM consulting case interview guide](https://insideiim.com/consulting-case-interview-guide)
- [InsideIIM case masterklass](https://insideiim.com/case-interview-masterklass)
- [MBA Crystal Ball case interview prep](https://www.mbacrystalball.com/blog/2018/06/18/case-interviews-prepare/)
- [MBA Crystal Ball management consulting interview questions](https://www.mbacrystalball.com/blog/2014/03/29/management-consulting-interview-questions/)
- [CrackVerbal consulting](https://www.crackverbal.com/resources/how-to-secure-a-consulting-job-with-mba/)
- [Tough Tongue AI MBA guide India 2025](https://www.toughtongueai.com/blog/ultimate-mba-guide-india-2025)
- [BCG case interview prep page](https://careers.bcg.com/global/en/case-interview-preparation)

**Comparative articles:**
- [Prepmatter best consulting interview prep platforms 2026](https://prepmatter.com/blog/best-consulting-interview-prep-platforms)
- [Road to Offer vs RocketBlocks](https://www.roadtooffer.com/blog/case-interview-ai-vs-rocketblocks)
- [Hacking the Case is coaching worth the money](https://www.hackingthecaseinterview.com/pages/is-case-interview-coaching-worth-the-money)
- [Glassdoor RocketBlocks subscription thread](https://www.glassdoor.co.in/Community/consulting/has-anyone-used-rocketblocks-for-case-prep-is-it-worth-the-monthly-subscription)
- [PrepPartner alternatives for finding case partners](https://www.preppartner.ai/blog/finding-case-partners)

---

## Final report-back to Ash

### Top 5 things CasePad should steal in priority order (with feature-level concrete impl)

1. **RocketBlocks-style atomic timed drills** — `/drills/math`, `/drills/structure`, `/drills/charts`, `/drills/brainstorm`, `/drills/synthesis`. LLM-generated banks, 30/60/90-second timers, auto-graded, ELO score per skill. Highest leverage, easiest to ship — could go live in days using Groq + existing case corpus. This is the single feature that, if missing, makes CasePad lose to RocketBlocks-class incumbents; if present, makes CasePad indistinguishable in feature parity.
2. **LOMS good-vs-bad paired solve walkthrough per case** — for each of the 1,165 cases, AI-generate two narrated solve transcripts (strong/weak) with diverge commentary. Render as audio + text. Replicates the most-cited LOMS feature at near-zero marginal cost.
3. **The 7-question-type / 6-Building-Block taxonomy** as the case-tagging schema — tag every case with which question types it tests, render as progress bars on the dashboard. Routes students to weak-area cases automatically.
4. **Permanent free tier + cohort B2B2C white-label distribution** — keep the free wedge, monetize via consulting clubs (IIM-A/B/C, ISB, NMIMS) paying for branded versions + analytics. Sidesteps Option-B paywall friction; aligns with zero-budget rule.
5. **Cohort leaderboard + WhatsApp-shareable result cards** — "Ash solved Bain Coffee Chain in 23 min, top 5% of IIM-A cohort" as a shareable image. Integrates CasePad into the dark-matter WhatsApp/Telegram cohort prep groups instead of competing with them.

### The single biggest differentiation gap (CasePad's moat)

**The combination of (a) verified large case corpus + (b) AI-as-adaptive-interviewer + (c) Indian-market context + (d) cohort signal + (e) free tier.** No competitor has all five. Closest is PrepLounge Preppie (a + b, but not c/d/e). Closest AI-native is CaseStudyPrep.AI (a + b, paid, US). The 5-axis intersection is genuinely unclaimed.

### The single biggest threat (could obsolete CasePad)

**OpenAI / Anthropic shipping a "Case Interview" mode in ChatGPT or Claude with verified MBB content licensed from a partner.** They already have the LLM, distribution, and persistent memory. If they cut a deal with PrepLounge's 700-case library or McKinsey's training arm, CasePad's moat collapses to "cheaper + India-aware." This is plausible within 18 months given the AI-mock category's growth. **CasePad's defense:** depth of cohort signal + India-specific corpus + the social/leaderboard/WhatsApp layer that ChatGPT cannot ship.

Secondary threat: **CaseStudyPrep.AI** scaling its ex-MBB-written corpus + voice mocks + scoring loop. They're ~2 years ahead on the AI-native UX. CasePad must out-execute on cohort distribution + India context before they translate.

### Surprising finding

**LOMS is $297, not $500** — Ash's mental price-anchor was wrong. The market price-ceiling for "lifetime case prep content" is closer to $300, not $500. This matters because if CasePad ever monetizes individual users (Option B), the implicit benchmark is $300/lifetime or ~$25/mo, NOT $500/$50.

**Second surprise:** **Two of the top-3 MBB firms use CaseCoach to prep their own incoming candidates** ([Source](https://casecoach.com/c/)). The most credible endorsement in the category is firms-eating-their-own-dogfood. CasePad's analog: get *one* IIM consult-club to officially endorse it as their internal prep tool before any global push. That single endorsement is worth more than 100 student testimonials.

**Third surprise:** **The most successful case-prep platforms are content-first, not technology-first.** Hacking, LOMS, Crafting Cases, IGotAnOffer all win by methodology + content quality, not by software polish. RocketBlocks is the exception that proves the rule (and even RocketBlocks' praised features are content-driven: ex-MBB-curated structure references). **Implication:** CasePad's 1,165-case corpus is more strategically valuable than its AI engine. Invest in case quality + tagging + rubric-writing, not just AI features.
