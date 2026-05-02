// Ideal 90+ scoring STAR answers for the 30 most-asked behavioral questions.
// Written for an MBA-track student in India (SSB Scaler / SP Jain / IIM context).
// Each answer is fictional but realistic, ~150 words, and engineered to model:
//   - Specific Situation (concrete, dated, numbered)
//   - Clear Task / stake
//   - 3-5 specific Actions with reasoning ("WHY")
//   - Result with numbers + a learning moment
//   - One "spike move" — a catch-yourself, contrarian, or principle-backed beat

export const BEHAVIORAL_IDEAL_ANSWERS: {
  question_index: number;
  ideal_answer: string;
  why_it_scores_90: string[];
}[] = [
  {
    question_index: 1,
    ideal_answer:
      "In my second year at SSB Scaler, I led a 6-person consulting club team on a live project for a Bengaluru D2C skincare brand — they wanted a GTM for tier-2 cities but had given us no budget data, no SKU data, and no clear success metric. Two weeks in, the team was paralyzed. My task was to ship a defensible recommendation in 21 days. First, I reframed the brief into three testable hypotheses on a whiteboard so disagreement became debate, not deadlock. Second, I split the team into two pods and forced a 48-hour 'minimum data' rule — we'd act on partial information rather than wait. Third, I built a weekly 'kill-the-bad-ideas' standup so we converged. We presented three GTM scenarios; the founder picked one and ran a Surat pilot that hit 1,200 orders in 6 weeks. I learned ambiguity is a leadership tax — your job is to invent the structure others are waiting for.",
    why_it_scores_90: [
      "Specific S with named brand and 21-day clock",
      "Reframing ambiguity into testable hypotheses is the spike move",
      "Numbers tied to outcome (1,200 orders, 6 weeks)",
      "Self-aware learning beat at the end",
    ],
  },
  {
    question_index: 2,
    ideal_answer:
      "During an inter-college case competition at IIM Bangalore, I was on a 4-person team where two members were from a stronger feeder college and consistently overrode the analyst — a fresher who actually had the cleanest financial model. I had no formal authority; I was just the strategy lead. My task was to get her work into the final deck without making it a power fight. I started by validating her model 1:1 with a senior alum over a 20-minute call, so I could cite an external voice rather than my own opinion. Then I proposed a 'red team' format where each slide had to be defended on data, not seniority — that flipped the floor. Finally, I gave the analyst the financial slide to present herself. We placed second of 47 teams. I learned influence without authority is mostly about borrowing legitimacy and engineering moments where the right voice can't be ignored.",
    why_it_scores_90: [
      "Concrete competition context with team dynamics",
      "Borrowed legitimacy via alum is a tactical spike move",
      "Specific result (2nd of 47)",
      "Principle-backed learning on legitimacy and structure",
    ],
  },
  {
    question_index: 3,
    ideal_answer:
      "In my final undergrad year at VJTI, I'd committed to building a campus placement-prep platform for juniors but lost my co-founder to a US masters offer in week three, with 80% of the backend unwritten. The task was to ship before the September placement cycle, two months out. I forced myself to triage — I cut three features that weren't on the critical path, even though I'd already built UI for them. I taught myself Supabase auth in a weekend instead of porting our half-built JWT system. I cold-messaged eight CS seniors on LinkedIn asking for 30-minute code reviews; three said yes. The honest moment: at week six I almost gave up because nothing was working in production. I gave myself 48 hours to either fix it or shut it down — and fixed the deploy bug at hour 41. The platform onboarded 230 juniors that cycle. Drive isn't grit — it's deciding what to abandon.",
    why_it_scores_90: [
      "Catch-yourself moment (almost quitting at week 6) makes it authentic",
      "Specific tradeoffs (cut features, learned Supabase) show judgment under stress",
      "Numbered result (230 juniors)",
      "Contrarian closing line is memorable",
    ],
  },
  {
    question_index: 4,
    ideal_answer:
      "In my first internship at a Mumbai fintech, I was given ownership of a churn-prediction dashboard for the SME lending team. I delivered on time but the model was overfit — when ops actually used it, two weeks later it flagged 40% false positives and the credit team lost trust in the tool. My task in retrospect was to own the failure cleanly. I asked for a 30-minute meeting with the credit head and walked through exactly where the model broke — leakage from a feature only available post-default. I didn't blame data quality even though I could have. I rebuilt v2 in my last 10 days using a stricter feature lockbox and cross-validated by month, not random split. v2 hit 71% precision; they kept using it after I left. The hard learning: I'd optimized for delivering on schedule instead of asking 'will this survive contact with users.' I now budget 20% of any project for adversarial testing.",
    why_it_scores_90: [
      "Names the failure precisely (overfit, 40% FPs, leakage)",
      "Doesn't deflect — explicit ownership beat",
      "Concrete behavior change (20% adversarial testing budget)",
      "Spike move: choosing not to blame data quality",
    ],
  },
  {
    question_index: 5,
    ideal_answer:
      "On a marketing club project in PGDM term 2, my co-lead Rohan and I clashed hard — he wanted a brand-led pitch for the cohort, I wanted a performance-marketing-led one, and we'd burned three meetings shouting past each other. The stake was a 200-person cohort showcase 10 days out. I called him for chai off-campus and asked one question: 'What are you actually worried about if we go my way?' He said he'd been burned in undergrad presenting a deck a senior tore apart for being shallow. That reframed everything — it wasn't a strategy fight, it was a credibility fear. We agreed to lead with the brand narrative he wanted and back it with my CAC/LTV data as proof. The deck won the cohort vote 64% to 36%. I learned conflict almost always has a private reason underneath the public one — and most teammates will tell you if you ask without an agenda.",
    why_it_scores_90: [
      "Names the teammate, time, and stake",
      "The 'one question off-campus' is the spike move",
      "Reveals genuine emotional intelligence without being saccharine",
      "Memorable principle: public reason vs. private reason",
    ],
  },
  {
    question_index: 6,
    ideal_answer:
      "As a summer intern at a Pune logistics startup, I was hired for a market-sizing project but noticed in week one that the ops team was manually reconciling driver payouts in an Excel sheet that took 6 hours every Friday. Nobody had asked me to look at this. The task wasn't mine, but the cost was real — that was 24 person-hours a month on rote work. I built a Google Apps Script that pulled the sheet, matched against the trip log, and flagged mismatches in 4 minutes. Before shipping, I deliberately showed it to the ops lead first so it landed as her win, not my flex. She rolled it out and it cut the Friday close to 40 minutes. My core market-sizing deliverable still landed on time because I capped the side project at 8 hours total. I learned initiative is only welcome when it doesn't compete with what people actually hired you for.",
    why_it_scores_90: [
      "Quantified pain (6 hours/week → 40 min)",
      "Spike move: ego management — landed it as her win",
      "Self-discipline beat (capped at 8 hours, primary deliverable still shipped)",
      "Wisdom about scope creep is unusually mature",
    ],
  },
  {
    question_index: 7,
    ideal_answer:
      "Going into MBA prep, I was certain I wanted product management — I'd interned in PM, read Marty Cagan, the whole thing. In my first term I shadowed a consulting club case on rural healthcare in UP, and the field interviews cracked something. I realized I liked the diagnostic part of the job — the messy 'what is even the problem' phase — far more than the build phase I'd been romanticizing. The hard part was admitting it after I'd told my whole network I was a PM person. I ran an honest audit: I listed every project I'd genuinely enjoyed in the last two years and 7 of 9 were diagnosis-heavy, not execution-heavy. I shifted my recruiting prep toward strategy and consulting and re-introed myself to two mentors who'd backed my PM track. Both respected the call. I learned changing your mind publicly costs less than people think — but only if you can show your work.",
    why_it_scores_90: [
      "Specific moment of cracking (UP healthcare field work)",
      "Audit of past projects is a structured spike move",
      "Honest about the social cost of changing direction",
      "Principle: 'changing your mind costs less if you show your work'",
    ],
  },
  {
    question_index: 8,
    ideal_answer:
      "After my first live consulting project at SSB, my faculty mentor told me — bluntly, in a 1:1 — that I was 'the kind of person who confuses being articulate with being right.' I'd dominated the final readout and been wrong on a key revenue assumption that the data would have caught. The task was to actually internalize it, not just nod. I asked for a 30-minute follow-up the next week so it didn't become a one-shot wound. I started keeping a 'speaking ledger' for my next two projects — a tally in my notebook of how often I spoke first vs. last in meetings. In project two I spoke first in 4 of 11 meetings; in project four, 1 of 9. I also adopted a 'data citation rule' — no claim without a source slide. My readout scores in the next cohort review went from 6.2 to 8.4. The feedback hurt because it was true, and that's the only kind worth keeping.",
    why_it_scores_90: [
      "Direct quote of the feedback makes it visceral",
      "Speaking ledger is a concrete, unusual spike move",
      "Numbered behavior change (4/11 → 1/9, score 6.2 → 8.4)",
      "Closing line is sharp without being performative",
    ],
  },
  {
    question_index: 9,
    ideal_answer:
      "In my pre-MBA role at a Gurgaon edtech, I led the launch of a regional-language mock-test product for UPSC aspirants — a segment leadership had de-prioritized as 'low LTV.' I asked for 6 weeks and a budget of INR 4 lakh to test the hypothesis. The work I'm proudest of isn't the launch — it's the user research. I personally interviewed 32 aspirants in Allahabad and Patna, recorded each call, and built a heatmap of where existing English mocks broke their confidence. That's where the real product spec came from, not the leadership doc. We launched in Hindi-first with a 'mistake explanation in your language' feature nobody else had. We hit 8,400 paid users in 90 days at a CAC of INR 312 — the lowest in the company's history. I'm proud because I didn't take the brief on faith — I went and looked. Most product failures are scoped, not built.",
    why_it_scores_90: [
      "Pride attached to research process, not the launch — unusual and credible",
      "Specific cities, sample size, CAC number",
      "Spike move: pushed back on 'low LTV' framing with data",
      "Principle-backed close: 'most failures are scoped, not built'",
    ],
  },
  {
    question_index: 10,
    ideal_answer:
      "Two days before our IIM-A live case competition final, our team's 60-page deck got corrupted — the Google Slides file went read-only and we lost the latest 14 slides. We had 38 hours to the pitch. The stake was a national final, four teams from 200+. I made the call within 10 minutes: we don't recover, we rebuild. I broke the deck into four parallel tracks, one per teammate, each owning 12-15 slides, with a shared 'source of truth' in Notion so we didn't double-edit. I took the synthesis slides myself because they needed one voice. We built a 90-minute hard checkpoint at the 24-hour mark — anything not at 'ugly but defensible' got cut. We slept 4 hours total. We placed third nationally. The lesson: under time pressure, the failure mode isn't speed — it's rework. The whole game is making sure work doesn't have to be redone.",
    why_it_scores_90: [
      "Crisis is named precisely (corrupted file, 38 hours)",
      "10-minute decision is a clear leadership beat",
      "Operating principle (avoid rework) is the spike move",
      "Honest about sleep / cost; doesn't pretend it was clean",
    ],
  },
  {
    question_index: 11,
    ideal_answer:
      "As placement coordinator for my undergrad batch at NMIMS, I had to decide whether to let a top-recruiting NBFC come on Day 1 of the season. The students wanted them — they paid INR 9.5L CTC. I'd talked to four alumni who'd worked there and three flagged toxic culture and 80-hour weeks with no learning curve. My task was to make a call that the batch would resent in the short term. I moved the NBFC to Day 4 and used Day 1 for two consulting boutiques with smaller cheques but better trajectories. I called a town hall and showed the alumni notes — anonymized but verbatim. I told the batch: 'You can disagree with me on Day 4 by accepting the offer. I'm just removing the FOMO trap of Day 1.' 23 of 31 finance-track students still interviewed; 4 accepted. Two years later, three of those four switched out. The unpopular call wasn't blocking the company — it was forcing reflection.",
    why_it_scores_90: [
      "Honest, specific (NBFC, 9.5L, 4 alumni)",
      "Reframing 'unpopular' as 'forcing reflection' is the spike move",
      "Doesn't paint himself as right; shows long-term outcome",
      "Quote in the town hall is memorable",
    ],
  },
  {
    question_index: 12,
    ideal_answer:
      "Three weeks into my pre-MBA role, I was assigned a SQL-heavy analytics task and I'd never touched SQL beyond a single CS course two years prior. The deadline was 9 working days. My task was to be useful, not look smart. I did three things in parallel: I bought one DataCamp track and committed 90 minutes a day before standup so it didn't compete with work. I asked the senior analyst, Priya, if I could pair-debug her queries 15 minutes a day in exchange for taking her ad-hoc data pulls — a clean trade, not a favor. I built a personal 'cheat sheet doc' of every query pattern I learned, with comments in plain English so I could re-derive them. By day 7 I shipped a working query for the marketing dashboard; by day 12 I was the team's go-to for cohort retention pulls. I learned learning fast under pressure is mostly about engineering trades — making your learning useful to someone else.",
    why_it_scores_90: [
      "Specific timeline (9 days), specific tool (SQL)",
      "Spike move: framed help-seeking as a trade, not a favor",
      "Cheat sheet with plain-English comments shows metacognition",
      "Generalizable principle in close",
    ],
  },
  {
    question_index: 13,
    ideal_answer:
      "On a live project for a Hyderabad SaaS company, the client-side stakeholder — the head of sales — was openly hostile in the first two meetings. He'd been forced to host us by his CEO and saw us as 'students playing consultant.' My task was to either earn his buy-in in two weeks or watch our recommendations die in a drawer. I stopped sending updates over email and started showing up at his office at 4 pm Tuesdays — no agenda, just 20 minutes with the data we'd pulled that week. The third Tuesday, he started correcting our assumptions instead of dismissing them — that's when I knew the dynamic had flipped. I also explicitly attributed two early insights to his team's tribal knowledge in our interim deck. The final readout, he was the one defending our recommendation to the CMO. The lesson: difficult stakeholders aren't difficult — they're protecting something you haven't bothered to understand.",
    why_it_scores_90: [
      "Specific cadence (Tuesday 4pm) shows operational craft",
      "'Correcting instead of dismissing' is a sharp inflection point",
      "Spike move: attributing insights to his team — strategic credit-sharing",
      "Reframing of 'difficult' people in close",
    ],
  },
  {
    question_index: 14,
    ideal_answer:
      "During my analytics internship, the marketing team kept asking for 'cohort retention dashboards' but every dashboard I built got abandoned within a week. My task was to figure out why my creative output was dying. The boring answer was bad UX. The real answer was that they didn't want dashboards at all — they wanted a yes/no on whether to push more spend into a channel that week. I scrapped the dashboard project and built a Slack bot instead. Every Monday at 9 am it posted three lines per channel: 'Last week's CAC, this week's projected CAC, suggested action: scale / hold / cut.' That's it. I got pushback for 'oversimplifying' from the senior analyst. I held my ground because the existing tool was being ignored — that's the actual data. The bot was used by 11 of 13 marketers within a month. Creativity isn't novel solutions — it's noticing when the brief itself is wrong.",
    why_it_scores_90: [
      "Not a heroic 'I invented X' answer — about reframing the brief",
      "Specific, unusual artifact (3-line Slack bot)",
      "Spike move: holding ground against 'oversimplifying' critique",
      "Memorable definition of creativity",
    ],
  },
  {
    question_index: 15,
    ideal_answer:
      "In my pre-MBA role, leadership was about to triple ad spend on Instagram based on a 'gut feel' that engagement was up. My task was to either back the call or block it before INR 38 lakh got committed. I pulled the last 90 days of engagement data and segmented it by post type, time-of-day, and audience cohort instead of looking at the topline. The aggregate engagement was up 22%, but it was almost entirely driven by one viral reel — strip that out and engagement was flat to declining. I built a 5-slide memo showing the decomposition and recommended a 30% spend lift instead of 200%, with a 4-week measurement window. I deliberately led with the counter-evidence first so it didn't read as a hit piece. Leadership took the smaller bet; CAC stayed within 8% of baseline instead of the projected 40% increase. The lesson: aggregate numbers lie almost every time — segment first, summarize last.",
    why_it_scores_90: [
      "Concrete stake (INR 38L)",
      "Specific decomposition (post type / time / cohort)",
      "Spike move: leading with counter-evidence to manage politics",
      "Operating principle: 'segment first, summarize last'",
    ],
  },
  {
    question_index: 16,
    ideal_answer:
      "My VP of marketing wanted to launch a referral program with a INR 500 reward, modeled on a competitor. I was the analyst on the call and I thought the math was wrong. Pushing back on a VP as a 22-year-old contractor was uncomfortable. My task was to disagree without making it about ego. I asked for a 15-minute slot the next morning — not in the meeting itself — so the conversation wasn't a public correction. I came in with one slide: our LTV was INR 1,800, not INR 4,000 like the competitor's, so a INR 500 reward at 30% activation broke unit economics within 6 weeks. I framed it as 'I want to make sure we're not modeling on apples-to-oranges' rather than 'you're wrong.' She heard me out, brought in the finance lead, and we relaunched the program at INR 220. CAC came in at INR 410. The takeaway: pushing back works when you remove the audience.",
    why_it_scores_90: [
      "Names the power gap honestly (22-year-old contractor)",
      "Spike move: 'remove the audience' before disagreeing",
      "Specific numbers on both sides",
      "Reframing language ('apples to oranges') is concrete craft",
    ],
  },
  {
    question_index: 17,
    ideal_answer:
      "In my second consulting club semester, I committed to leading two live projects in parallel — I'd been told by alumni that this was a stretch I should take. By week four I was clearly under-delivering on both. My faculty advisor flagged that one client had emailed twice without response. The task was to stop pretending and clean it up. I went to the second client and asked to step down from lead to support — that conversation was the hardest professional call I've made because it felt like quitting. I helped transition the project to a peer over 5 days with full handoff notes. On the first project, I worked weekends to catch up and shipped the final deliverable two days late but with a written apology to the client. The honest learning: I took the second project to look ambitious, not because I had capacity. Now I run a calendar audit before saying yes to anything stretch — if it doesn't fit the calendar, the answer is no.",
    why_it_scores_90: [
      "Owns the actual reason (looked ambitious)",
      "Specific corrective behavior (calendar audit)",
      "Doesn't soften the failure — late delivery, written apology",
      "Honest about the emotional difficulty of stepping down",
    ],
  },
  {
    question_index: 18,
    ideal_answer:
      "On day one of an inter-IIM case competition I was hosting as ops lead, our venue's projector died 20 minutes before the opening pitch — and we had 80 participants in the room. The stake was the credibility of an event we'd spent four months building. I delegated three things in 90 seconds: one teammate to find AV from the closest hostel, one to stall the audience with the icebreaker we'd planned for later, and I went directly to the campus AV head whose number I'd kept from a fest the previous year. We had a working setup in 18 minutes. I deliberately didn't hide the issue — when the first team came up I said 'we just survived a small disaster, thank you for your patience' and got a laugh. The event ran 22 minutes behind but rated 4.6/5 in the post-event survey. The lesson: in a crisis, parallelize and own the narrative — both at once.",
    why_it_scores_90: [
      "Concrete crisis (projector, 20 min before, 80 people)",
      "Specific 90-second delegation shows operational craft",
      "Spike move: owning the disaster publicly to defuse it",
      "Numbered outcome (4.6/5)",
    ],
  },
  {
    question_index: 19,
    ideal_answer:
      "Going into my final semester of undergrad, I set a goal to crack a top-3 Indian B-school admit while also working a 40-hour pre-MBA role. My CAT percentile starting point was 78 — I needed 99+ for that goal. Stretch was honest: I had 11 months. I rebuilt my prep system. I dropped from 6 mock tests a month to 3, but I started spending 2 hours per mock on error analysis instead of 30 minutes — that single change moved my accuracy more than any new content. I committed to a 'no Sunday work' rule so my brain had recovery time, even when work pressure pushed back. I joined a 4-person study group via Discord and we did 90-minute weekly post-mortems. I hit 99.4. The honest part: I wasn't sure I'd make it until the last 3 mocks. Stretch goals work because they force you to redesign your system — incremental goals just let you optimize the existing one.",
    why_it_scores_90: [
      "Concrete starting state (78%) and target (99+)",
      "Spike move: error analysis ratio change (3x)",
      "Self-discipline rule (no Sunday work)",
      "Sharp principle in close on stretch vs. incremental",
    ],
  },
  {
    question_index: 20,
    ideal_answer:
      "I started undergrad in mechanical engineering at VJTI because I'd been good at physics and my parents valued the degree. By year two I'd built two side projects — a placement-prep platform and a small data tool for a campus club — and I noticed I learned 3x faster on those than in any class. That was the first signal. I took on an analytics internship in year three to test whether the pull was real or novelty; it was real. I declined a core mechanical placement offer in year four — uncomfortable conversation with my family — and joined a Gurgaon edtech as an analyst. After 18 months, I'd seen enough to know I wanted the diagnostic / strategy side, not pure execution, which is why I'm pursuing an MBA now. I didn't take a clean path. I've taken one inflection at a time, tested before I committed, and I'm okay being explicit about that — most career stories are reverse-engineered narratives anyway.",
    why_it_scores_90: [
      "Honest about non-linear path",
      "Each step has a reason and a test",
      "Spike move: explicit about reverse-engineered narratives",
      "Connects past to present MBA decision cleanly",
    ],
  },
  {
    question_index: 21,
    ideal_answer:
      "A first-year at SSB Scaler reached out for help with case prep — she'd bombed two club shortlists and was thinking of dropping out of the consulting track. My task was to figure out whether she had a fixable gap or a wrong-fit. I asked her to do one case with me before I committed. She didn't lack frameworks — she lacked a 'pause before answering' habit; she was anxious-talking. I didn't tell her that on day one. Instead, I gave her a structural exercise: every case answer had to start with 5 seconds of silence, no exceptions. I sat with her on 8 cases over 6 weeks. By week 4 she pushed back on me — said the silence rule was infantilizing — and that was the moment I knew she'd internalized it enough to outgrow it. She made the consulting club's final shortlist. Mentoring isn't transferring knowledge — it's installing a habit and being okay when they grow past your method.",
    why_it_scores_90: [
      "Specific, weird intervention (5-second silence rule)",
      "Reads the diagnosis carefully (not framework gap, anxiety)",
      "Spike move: pushback as a positive signal",
      "Sharp definition of mentoring",
    ],
  },
  {
    question_index: 22,
    ideal_answer:
      "At my pre-MBA role, the founder asked for a 'one-pager' on our 5 product lines for a board meeting. The internal version was a 14-tab spreadsheet only two people understood. My task was to compress it without losing decision-relevance. I started by asking the board's actual question — which I had to dig out from the founder. It wasn't 'how is each product doing.' It was 'where do we double down.' That changed everything. I dropped 3 of 5 metrics per product and kept only: revenue trajectory, gross margin direction, and one sentence on the strategic bet. I used a single 2x2 — growth vs. margin — and put each product on it with a colored dot. The whole thing fit on one page with ~80 words of text. The board spent 35 minutes on it instead of the planned 10. The lesson: simplification fails when you start with the artifact — start with the decision the artifact has to drive.",
    why_it_scores_90: [
      "Specific before/after (14 tabs → 1 page, 80 words)",
      "Spike move: figuring out the real question first",
      "Concrete tool (2x2)",
      "Principle: 'start with the decision, not the artifact'",
    ],
  },
  {
    question_index: 23,
    ideal_answer:
      "On a marketing audit during my analytics internship, I found that a campaign manager had been inflating click-through rates in his weekly reports by ~15% — small enough that nobody had caught it. He was a senior to me by four years. My task was to handle it without playing internal politics or ducking it. I confirmed first — pulled the raw GA data, cross-checked against the Meta export, ran it twice. I went to him directly before going to anyone else; I told him what I'd found and asked if there was a context I was missing. He admitted he'd been padding to hit his quarterly target. I gave him 48 hours to flag it to our shared manager himself. He did. He got a written warning, not fired. I could have escalated immediately and looked like the guy who caught it — but the goal was the data being honest, not me being right. Ethics isn't about catching people. It's about giving them the chance to own it first.",
    why_it_scores_90: [
      "Power gap (junior catching senior) is honest",
      "Verification step (run it twice) shows discipline",
      "Spike move: the 48-hour ownership window",
      "Sharp principle in close",
    ],
  },
  {
    question_index: 24,
    ideal_answer:
      "In a live client readout during my first consulting project at SSB, I confidently quoted a market size figure that was off by an order of magnitude — I'd misread a Statista chart's units. The client noticed mid-meeting. My task in that 30-second window was to handle it cleanly. I caught myself, said 'I need to stop — that figure I just quoted, I want to recheck the units in real time before we build on it,' and pulled up the source on the spot. The original was in USD millions, not USD billions. I corrected, apologized once, and moved on. After the meeting I emailed a written note to the client with the corrected figure and the implication for our recommendation. I also stopped using rounded numbers in any deck without a footnote citing the raw source. The mistake hurt because it was avoidable — but the recovery taught me that owning the error in real time costs less than letting it sit.",
    why_it_scores_90: [
      "Catches the mistake live, in front of the client",
      "Specific behavior change (footnote rule)",
      "Spike move: stopping yourself mid-readout",
      "Honest about avoidability",
    ],
  },
  {
    question_index: 25,
    ideal_answer:
      "During an inter-college case prep group of 6, we split 3-3 on whether to pursue strategy cases or finance cases for the upcoming season — both factions were emotional and convinced. As the informal lead, my task was to get a working consensus in one weekend before we wasted another month. I didn't try to debate which was 'right.' I asked everyone to write down — anonymously — the actual outcome they wanted from the season. Five of six wanted 'a final-round shortlist somewhere,' one wanted 'a deep skill in finance.' That reframed it. Strategy cases had higher historical shortlist rates per hour invested. We decided to do strategy as the default and let the finance person run a parallel 90-minute weekly track with anyone who wanted in. Both sides got what they actually wanted. We hit 4 final shortlists across the team that season. Consensus isn't compromise — it's finding the higher-order goal both sides have already implicitly agreed on.",
    why_it_scores_90: [
      "Spike move: anonymous outcome write-down",
      "Reframes positions vs. interests cleanly",
      "Concrete result (4 shortlists)",
      "Sharp definition of consensus in close",
    ],
  },
  {
    question_index: 26,
    ideal_answer:
      "My consulting club cohort was unanimous on the recommendation for a live project — we'd recommend a Tier-1 city expansion for the client. I disagreed. The unit economics didn't hold up if you assumed even 30% rent inflation, which the team had explicitly excluded. My task was to either go with the team or go on record with a dissent in two days. I went on record — in writing — to the faculty advisor before the readout, with my model attached. I also presented with the team and didn't sandbag the recommendation in the room because that would have been disloyal. After the readout, the client actually asked about the rent assumption and the advisor flagged my dissent memo. The client paused the expansion. The team was annoyed at me for two weeks. I'd do it again — going against consensus only matters if you do it on the record and on time, not afterward in the corridor.",
    why_it_scores_90: [
      "Specific dissent (rent inflation assumption)",
      "Honest about the social cost (annoyed team, 2 weeks)",
      "Spike move: written dissent + loyal presentation simultaneously",
      "Operating principle: 'on the record, on time, not in the corridor'",
    ],
  },
  {
    question_index: 27,
    ideal_answer:
      "On a 4-person finance club committee, one teammate, Anuj, had been silent for three weeks and had missed two deliverables. The instinct was to write him off. My task was to figure out whether to recover him or replace him with the deadline 5 weeks away. I sat with him 1:1 — not to confront, just to ask what was actually going on. He'd had a family medical issue he hadn't told anyone about. I didn't excuse the missed work, but I redesigned his role: smaller scope, daily 10-minute check-in, and a clear 'minimum viable contribution' for the next two weeks. I told him explicitly: 'this is a chance, not a guarantee.' He hit every check-in. By week 3 he was back to full scope and produced the financial model that anchored our final recommendation. The thing I almost got wrong: I'd been ready to replace him in week one. Underperformance is almost always context, not character — but you have to actually look.",
    why_it_scores_90: [
      "Names the teammate, the gap, the timeline",
      "Spike move: 'chance, not guarantee' — direct, not soft",
      "Catch-yourself moment (almost replaced him in week one)",
      "Strong principle in close",
    ],
  },
  {
    question_index: 28,
    ideal_answer:
      "Six weeks before my final CAT attempt, I was stuck at 96-97 percentile in mocks and couldn't break through. I'd been prepping alone for 9 months because I thought asking for help meant I wasn't good enough. My task was to honestly evaluate whether I needed external input. I cold-emailed three IIM-A students whose CAT-prep blogs I'd read — not asking for free coaching, asking specifically: 'can I send you my last 3 mock analyses and get 30 minutes of your time on what you'd change?' Two responded. Both, independently, said the same thing — my QA section had a timing problem, not a concept problem. I'd been over-investing in concept revision for a problem I didn't have. I rebuilt the last 4 weeks around timed sets. I hit 99.4. The honest learning: not asking for help wasn't humility, it was ego dressed as self-reliance. Now I default to asking earlier than I'm comfortable with.",
    why_it_scores_90: [
      "Honest about why he didn't ask sooner (ego)",
      "Specific ask format (mock analyses + 30 min)",
      "Independent confirmation from two sources strengthens credibility",
      "Sharp principle in close",
    ],
  },
  {
    question_index: 29,
    ideal_answer:
      "In my final pre-MBA quarter, I had three things converging: a CAT exam in 8 weeks, a major work project I'd promised to ship before leaving, and a younger cousin's wedding I'd committed to coordinate. The instinct was to do all three at 70%. My task was to figure out what to actually drop. I ran a brutal audit — for each commitment I asked 'who is hurt the most if I downgrade this, and is that hurt recoverable.' The wedding had hard external dependencies and family stakes. The work project had a clear teammate I could transfer the synthesis layer to with 6 hours of handoff. CAT was non-negotiable; it was my entire MBA path. I went to my work manager, proposed the handoff, and got agreement. I then designed my week as: CAT mornings, wedding afternoons, work evenings — strict blocks, no overflow. I scored 99.4, the wedding ran clean, the work project shipped on time. Priority isn't about ranking — it's about being honest about what's actually transferable.",
    why_it_scores_90: [
      "Specific, asymmetric audit question",
      "Concrete time-boxing structure",
      "Spike move: framing transferability as the real lever",
      "Multi-domain success without sounding boastful",
    ],
  },
  {
    question_index: 30,
    ideal_answer:
      "My manager at the edtech would name 'structured under ambiguity' — when a brief was vague, I'd default to writing a one-page hypothesis doc before touching the work, and that doc became the team's working artifact more than once. The weakness she'd name — and has named — is that I over-edit my own work in early drafts, which slows down feedback loops. I'll polish a v1 to v3 quality before showing it, which costs a day and means the eventual reviewer can't shape direction early. I've been actively working on it: I've started forcing myself to share at v1.5 with an explicit 'this is rough, here's what I want feedback on' framing. It's uncomfortable but it's cut my project cycle time by roughly 30%. The honest version of the answer: my strength and my weakness are the same instinct — wanting things to be rigorous — just expressed at the wrong stage.",
    why_it_scores_90: [
      "Real, named weakness — not a humblebrag",
      "Spike move: strength and weakness as same instinct",
      "Concrete corrective behavior (v1.5 sharing) with measured impact",
      "Authentic, conversational close",
    ],
  },
];
