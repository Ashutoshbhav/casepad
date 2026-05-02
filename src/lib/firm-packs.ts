// src/lib/firm-packs.ts
//
// Pre-authored fallback content per top recruiter for /company-pack feature.
// Used when Tavily quota is exhausted or live research returns low-confidence
// output. Content reflects 2024-2025 process intelligence cross-referenced
// from PrepLounge, Management Consulted, IGotAnOffer, InsideIIM, Glassdoor
// India, Wall Street Oasis, Product Alliance, and recent IIM placement
// experience write-ups. Refresh annually.

export interface FirmPack {
  overview: string;
  process: string[];
  case_archetypes: { name: string; example: string }[];
  behavioral_dimensions: string[];
  spike_phrases: string[];
  avoid: string[];
  behavioral_questions: string[];
}

export const FIRM_PACKS: Record<string, FirmPack> = {
  McKinsey: {
    overview:
      'McKinsey & Company is the original strategy consultancy, known for CEO-level mandates, the Obligation to Dissent culture, and rigorous fact-based analysis. India practice is hub-heavy in Gurgaon, Mumbai, Bengaluru, with strong financial services, public sector, and consumer goods franchises. Brand is built on the McKinsey Global Institute, Implementation arm, and McKinsey Digital/QuantumBlack. The firm refreshed its PEI dimensions in summer 2025 and runs the Solve Game (restructured mid-2025) as a screening gate.',
    process: [
      'Round 0: Solve Game (Imbellus-built) — three mini-games (Ecosystem, Red Rock, Sea Wolf), ~70-110 min, ~20% pass rate post mid-2025 reset',
      'Round 1: Two interviews x 45 min — interviewer-led case (25 min) + PEI deep-dive (20 min)',
      'Round 2: Two to four interviews with Partners and Senior Partners, same case + PEI structure, higher bar on synthesis and judgment',
      'Timeline: ~3-5 weeks from CV shortlist to offer in IIM placements; lateral processes run 6-8 weeks',
    ],
    case_archetypes: [
      { name: 'Profitability decline', example: 'Indian cement player has seen EBITDA margin drop 400 bps in 18 months — diagnose drivers' },
      { name: 'Market entry / growth', example: 'Global EV OEM evaluating India 2-wheeler market entry — go/no-go and route-to-market' },
      { name: 'Operations / cost transformation', example: 'PSU bank wants to take 20% out of cost-to-serve in retail branches over 3 years' },
      { name: 'M&A / synergy sizing', example: 'Pharma client acquiring an API maker — quantify revenue and cost synergies' },
      { name: 'Public sector / social impact', example: 'State govt wants to triple agri-export revenue by 2030 — design intervention portfolio' },
    ],
    behavioral_dimensions: [
      'Leadership (refreshed 2025) — leading without authority, courage to dissent',
      'Drive (refreshed 2025) — entrepreneurial bias, ownership of outcomes',
      'Connection (refreshed 2025) — building trust with skeptical stakeholders',
      'Growth (refreshed 2025) — reflective learning, adaptability under feedback',
      'Personal impact — measurable change you drove on a real outcome',
    ],
    spike_phrases: [
      '"My hypothesis is X — to confirm it I would need data on A, B, C; the answer turns on B"',
      '"Stepping back, the so-what for the CEO is..."',
      '"I want to dissent here — the data points suggest the opposite conclusion"',
      '"To make this MECE I would split it into..."',
      '"If I had only one chart for the partner deck, it would show..."',
    ],
    avoid: [
      'Do not recite a textbook framework (4Ps, Porter) — McKinsey explicitly tests against canned structures',
      'Do not bury the recommendation; lead with the answer up front (pyramid principle is non-negotiable)',
      'Do not give vague PEI stories with team-level "we" — interviewers will dig until they find your individual contribution',
    ],
    behavioral_questions: [
      'Tell me about a time you persuaded someone senior to change their position when the data was on your side',
      'Describe a situation where you took initiative on something that was not in your job description',
      'Walk me through a time you failed and what specifically you changed in your approach afterwards',
    ],
  },

  BCG: {
    overview:
      'Boston Consulting Group is the most growth-oriented MBB, known for hypothesis-driven thinking, the Growth-Share Matrix heritage, and a less hierarchical culture than McKinsey. BCG X (digital, AI, ventures) is a major growth engine. India practice is strong in consumer, financial services, climate/energy, and industrial goods. Casey, the chatbot online case, replaced traditional online tests in 2023-24 and now screens most applicants before human rounds.',
    process: [
      'Round 0: Casey chatbot online case — 25-30 min conversational case + 1-min video recommendation, MCQ + short-answer + math',
      'Round 1: Two interviewer-led cases (40-45 min each), often with a fit component bolted on',
      'Round 2: Two to three Partner interviews — at least one heavy fit/personal, one complex case with curveball data',
      'Optional: Written/group case at final round for some tracks (especially internships)',
    ],
    case_archetypes: [
      { name: 'Growth strategy', example: 'D2C beauty brand at INR 200cr ARR — design path to INR 1000cr in 3 years' },
      { name: 'Digital / AI transformation', example: 'Private bank wants to deploy GenAI across customer service — prioritize use cases' },
      { name: 'Pricing', example: 'Telecom operator considering tariff hike — quantify churn vs ARPU trade-off' },
      { name: 'Sustainability / climate', example: 'Steel major mapping path to net-zero by 2050 — abatement curve and capex sequencing' },
      { name: 'Market sizing with twist', example: 'Size the Indian premium dog food market in 2030' },
    ],
    behavioral_dimensions: [
      'Intellectual curiosity — depth of probing on ambiguity',
      'Pragmatism — "so-what" orientation, implementation realism',
      'Collaboration — explicit emphasis on flat-team behaviour',
      'Drive and resilience — handling pushback mid-case without rattling',
      'Authenticity — BCG is allergic to over-rehearsed PEI delivery',
    ],
    spike_phrases: [
      '"My initial hypothesis is X — let me pressure-test it against the data"',
      '"The growth lever with highest impact-to-effort is..."',
      '"I am updating my structure based on what you just shared..."',
      '"Two ways to look at this — let me take the more contrarian one"',
      '"What would make me change my recommendation is if we saw..."',
    ],
    avoid: [
      'Do not freeze on Casey — the chatbot rewards visible iterative reasoning, not perfect answers',
      'Do not lecture on Porter or BCG matrix — interviewers find this tone-deaf in their own house',
      'Do not under-quantify — BCG cases punish hand-wavy synthesis without numbers attached',
    ],
    behavioral_questions: [
      'Tell me about a time you pushed back on a teammate or boss and changed the outcome',
      'When have you operated with incomplete information and still made a confident call?',
      'Describe a time you failed and what your team specifically learned from it',
    ],
  },

  Bain: {
    overview:
      'Bain & Company is the most PE-adjacent MBB, with the strongest commercial due diligence franchise globally and a famously tight, "A True North" culture. India practice is consumer-, PE/PortCo-, and tech-heavy with offices in Mumbai, Gurgaon, Bengaluru, and New Delhi. Bain weighs the standalone behavioural interview equally with cases — a 45-minute, eight-question structured fit round introduced in 2023.',
    process: [
      'Round 0: Online test (TestGorilla-style or customised) for some intakes; CV-screen heavy at IIMs',
      'Round 1: Two cases (one standard, one market-sizing) + the structured 45-min behavioural round (8 scripted questions, 4 dimensions)',
      'Round 2: Two to three Partner interviews — case + fit, often forward-looking hypothetical fit questions',
      'IIM-specific: Buddy program — shortlisted candidates paired with 1-2 yr alum buddy for practice cases pre-interview',
    ],
    case_archetypes: [
      { name: 'Commercial due diligence', example: 'PE fund evaluating a INR 2000cr ed-tech buyout — assess market, moat, and 5-yr revenue plan' },
      { name: 'Full-potential / growth', example: 'Regional QSR chain — what is the realistic revenue ceiling in next 5 years?' },
      { name: 'Net Promoter / customer experience', example: 'Private bank NPS dropped 15 points in retail — diagnose and fix' },
      { name: 'Cost transformation', example: 'Auto OEM needs to pull 15% out of indirect spend without hitting volume' },
      { name: 'Profit pool / industry economics', example: 'Map profit pools across the Indian airline value chain and recommend where a new entrant should play' },
    ],
    behavioral_dimensions: [
      'Results — measurable outcomes you owned',
      'Passion — visible energy and commitment',
      'Teamwork — "A True North" collaboration, no jerks rule',
      'Recommend Me — would your last team take you again?',
      'Forward-looking judgement — handling hypothetical Bain situations',
    ],
    spike_phrases: [
      '"Let me start with the answer — then I will walk through how I got there"',
      '"The 80/20 of this problem is..."',
      '"If I were the PortCo CEO Monday morning, I would..."',
      '"This is the kind of insight I would put on slide 3 of the partner deck"',
      '"To stress-test that, I would want to look at..."',
    ],
    avoid: [
      'Do not under-prep behavioural — at Bain it is 50% of the decision and forward-looking questions catch unprepared candidates',
      'Do not skip the math — Bain interviewers explicitly grade quantitative comfort and check arithmetic in real time',
      'Do not appear arrogant — "no jerks" is a literal screening filter; warmth and likeability move the needle',
    ],
    behavioral_questions: [
      'Tell me about a time you delivered a result that exceeded what was expected of you',
      'Imagine you join Bain and your manager keeps changing direction every week — how would you handle it?',
      'When have you motivated a team that was not formally reporting to you?',
    ],
  },

  Kearney: {
    overview:
      'Kearney is a Tier-2 strategy firm with the deepest operations and supply-chain DNA in the industry, known for the Global Cities Index, Foreign Direct Investment Confidence Index, and a notably down-to-earth culture vs MBB. India practice is strong in industrial goods, retail/consumer, public sector, and aerospace/defence. The "Essential Rightness" mantra signals a focus on pragmatic, implementable answers over theoretical elegance.',
    process: [
      'Round 1: Two 45-min interviews — one case, one behavioural/fit',
      'Round 2: Three 45-min interviews with senior managers, principals, partners — two cases, one fit',
      'Some intakes include a written case in Round 2 (60-min prep, 30-min discussion)',
      'Total timeline ~30-35 days from CV to offer per recent Glassdoor data',
    ],
    case_archetypes: [
      { name: 'Operations / supply chain', example: 'Auto OEM is missing delivery SLAs by 18% — find and fix the bottleneck' },
      { name: 'Profitability with industrial bent', example: 'Specialty chemicals firm losing margin despite stable volumes — diagnose plant by plant' },
      { name: 'Procurement / cost-out', example: 'CPG major wants 12% reduction in indirect spend over 18 months — design the plan' },
      { name: 'Market entry — heavy industry', example: 'Korean steel major evaluating Indian Greenfield plant — site, scale, and timing' },
      { name: 'Public sector / FDI', example: 'State government wants to attract USD 5bn in electronics manufacturing — what does it pull?' },
    ],
    behavioral_dimensions: [
      'Pragmatism — implementable answers over consultant-speak',
      'Collaboration / humility — Kearney explicitly contrasts itself with MBB ego',
      'Operational rigour — comfort with plants, ops metrics, supply chains',
      'Ownership and grit — case studies often run long and recursive',
      'Cultural alignment — "Essential Rightness" and client-first language',
    ],
    spike_phrases: [
      '"To make this implementable on Monday, the recommendation is..."',
      '"Let me anchor on operational metrics — yield, OTIF, takt time"',
      '"The 3 things I would put in front of the COO are..."',
      '"If I had to pilot this in one plant first, I would pick..."',
      '"The downside risk to my recommendation is X, mitigated by Y"',
    ],
    avoid: [
      'Do not posture as MBB-elite — Kearney interviewers actively select against arrogance',
      'Do not skip operational depth — supply-chain and manufacturing fluency is genuinely tested',
      'Do not give over-engineered frameworks for simple cost cases — they reward parsimony',
    ],
    behavioral_questions: [
      'Tell me about a time you fixed a process or operation hands-on, not just on a slide',
      'Why Kearney specifically over the larger consulting brands?',
      'Describe a project where the "right" answer was not the elegant one',
    ],
  },

  'Strategy&': {
    overview:
      'Strategy& is the strategy arm of PwC (post 2014 Booz acquisition), known historically for capability-based strategy and now for deep integration with PwC advisory. India practice is strong in financial services, telecom, energy, and government, with growing digital and deals work. Brand sits between MBB and Tier-2; offers pure-strategy work but with PwC-scale implementation pull-through.',
    process: [
      'Round 1: Two 45-min interviews — case + behavioural mixed in each',
      'Final Round: Two to three interviews with senior leaders — at least one heavy behavioural, one or two advanced cases',
      'Final round increasingly hybrid post-2025: PwC office visit common',
      'Some final rounds include a written or group case (especially graduate intake)',
    ],
    case_archetypes: [
      { name: 'Capabilities-based strategy', example: 'Indian telecom evaluating which 3 capabilities to double down on for next 5 years' },
      { name: 'Profitability', example: 'Mid-market PSU bank net interest margin compressed 80 bps — find the leak' },
      { name: 'M&A / deal value', example: 'Listed pharma firm evaluating a CDMO bolt-on — value, synergy, integration risk' },
      { name: 'Digital / tech transformation', example: 'Insurance carrier modernising core platform — sequencing and ROI' },
      { name: 'Government / regulator', example: 'Sector regulator designing a new tariff framework — stakeholder and impact analysis' },
    ],
    behavioral_dimensions: [
      'Structured thinking under time pressure',
      'Client communication — partner-facing polish',
      'Commercial pragmatism — PwC values implementability',
      'Teaming across PwC LoS (Lines of Service)',
      'Leadership and ownership stories with quantified outcomes',
    ],
    spike_phrases: [
      '"The capabilities this client must own to win are..."',
      '"In the deal context, the value lever I would protect first is..."',
      '"To pressure-test the synergy number, I would benchmark against..."',
      '"My recommendation for the CFO Monday morning is..."',
      '"If we got this wrong by 20%, the implication would be..."',
    ],
    avoid: [
      'Do not treat it as "PwC audit interview" — Strategy& expects MBB-level case rigour',
      'Do not skip industry context — Strategy& cases lean industry-specific (less generic than Tier-2 average)',
      'Do not run weak math — written cases will check your arithmetic line by line',
    ],
    behavioral_questions: [
      'Why Strategy& over MBB and over Bain/Kearney specifically?',
      'Tell me about a time you delivered under a hard deadline with shifting requirements',
      'Describe a moment you had to integrate inputs from very different functional experts',
    ],
  },

  'Deloitte S&O / Monitor Deloitte': {
    overview:
      'Monitor Deloitte is the pure-strategy arm (Monitor Group acquired 2013) sitting inside Deloitte Strategy & Operations (S&O). Monitor handles upstream strategy, S&O the broader transformation work. Strongest in India for financial services, life sciences, consumer, and public sector. Recent 2024-25 push around GenAI and CFO-services has reshaped case mix. Brand offers Big-4-stable comp with a tilt toward strategy work for those who pick the Monitor track explicitly.',
    process: [
      'Round 0: Online assessment / cognitive test for some intakes',
      'Round 1: Two interviews — one case, one behavioural; sometimes a group case for graduate hires',
      'Round 2: Two to three interviews with senior managers/partners — case + behavioural, one Partner round',
      'Each interview ~30-60 min; full process 3-5 weeks at IIMs',
    ],
    case_archetypes: [
      { name: 'Growth strategy', example: 'Mid-cap NBFC mapping path to double AUM in 4 years' },
      { name: 'Operating model / org design', example: 'Conglomerate restructuring HQ vs business unit roles post-acquisition' },
      { name: 'Cost transformation', example: 'Insurance carrier wants 20% reduction in operations cost via automation' },
      { name: 'Digital / GenAI use-case prioritization', example: 'Retail bank with 12 GenAI ideas — pick the 3 to fund' },
      { name: 'Public sector', example: 'Ministry designing a viability gap funding framework for green hydrogen' },
    ],
    behavioral_dimensions: [
      'Structured thinking and MECE rigour',
      'Implementation realism — Deloitte values "we ship it" stories',
      'Collaboration across multi-disciplinary teams',
      'Client-readiness and partner-facing maturity',
      'Curiosity / adaptability across industries',
    ],
    spike_phrases: [
      '"My recommendation, with the caveat that we validate X, is..."',
      '"This is a Monitor question, not an S&O question — let me handle the strategy frame first"',
      '"The implementation risk I would flag to the CIO is..."',
      '"To phase this realistically across 18 months I would..."',
      '"The KPI we should track from week one is..."',
    ],
    avoid: [
      'Do not blur Monitor (strategy) and S&O (transformation) — interviewers test whether you understand the distinction',
      'Do not treat the case as Big-4 advisory-lite — Monitor cases are MBB-grade in expectation',
      'Do not over-rely on Deloitte methodology decks; bring your own structure',
    ],
    behavioral_questions: [
      'Why Monitor Deloitte specifically over MBB or over Strategy&?',
      'Tell me about a time you carried an idea from strategy slide to live implementation',
      'Describe a stakeholder you struggled to align and what specifically worked',
    ],
  },

  'Accenture Strategy': {
    overview:
      'Accenture Strategy is the strategy arm of Accenture, fused tightly with Technology and Operations under the Strategy & Consulting umbrella. India is a major hub — Mumbai, Gurgaon, Bengaluru — with strong financial services, products, comms-media-tech, and resources practices. Differentiator vs MBB is technology depth and implementation pull-through; cases lean digital, data, and AI. Compensation and brand sit just below Tier-2 strategy, with clear path through the Potentia interview at senior levels.',
    process: [
      'Round 1: Resume shortlist + 2-3 interviews — typical pairing of behavioural + case',
      'Round 2: Senior interviews including Potentia (1-hour structured assessment for Strategy track)',
      'Total: 2-3 elimination rounds, 3-6 weeks; ~5 of 20 shortlisted get offers in IIM cycles per recent reports',
      'Some intakes include guesstimates and PEI in the same 45-60 min interview',
    ],
    case_archetypes: [
      { name: 'Digital transformation', example: 'Retail bank designing 3-year digital roadmap with embedded GenAI bets' },
      { name: 'Operating model + tech', example: 'Insurance carrier consolidating 4 underwriting platforms — sequencing and value' },
      { name: 'Growth + tech', example: 'D2C brand wants to triple revenue using personalisation engine — feasibility and ROI' },
      { name: 'Cost takeout via automation', example: 'BPO arm of a bank — where to deploy GenAI for biggest near-term cost wins' },
      { name: 'Guesstimate', example: 'Estimate the number of UPI transactions in India per day in 2027' },
    ],
    behavioral_dimensions: [
      'Tech fluency — comfort with AI, cloud, data',
      'Client orientation — visible empathy and pragmatism',
      'Collaboration across S&C, Technology, Operations',
      'Drive and ownership — Accenture loves "I built/shipped" stories',
      'Adaptability — multi-industry and multi-format work',
    ],
    spike_phrases: [
      '"The tech enabler that unlocks this strategy is..."',
      '"To capture the value we would need both the strategy and the platform team aligned"',
      '"My recommendation runs across people, process, and tech — here is the people piece..."',
      '"The GenAI use case with highest signal-to-noise is..."',
      '"To get to ROI within 18 months we should sequence as..."',
    ],
    avoid: [
      'Do not treat it as a tech-only firm — Strategy track expects MBB-style case rigour',
      'Do not under-prep guesstimates — they show up in the first round routinely',
      'Do not dismiss implementation — Accenture genuinely values "I helped ship it" answers',
    ],
    behavioral_questions: [
      'Why Accenture Strategy and not pure-play MBB?',
      'Tell me about a time you bridged business and technology stakeholders',
      'Describe a project where you used data or technology to change a decision',
    ],
  },

  'ZS Associates': {
    overview:
      'ZS Associates is a sales-and-marketing-analytics-led consultancy with a dominant pharma/life-sciences franchise and growing tech and consumer practices. India is the largest delivery hub globally (Pune, Gurgaon, Bengaluru). The work mixes consulting and analytics — interviews accordingly weight quantitative chops heavily. Recently expanded into AI/ML-driven commercial decisions for pharma and tech clients.',
    process: [
      'Round 1: Written case (5-6 charts/exhibits, MCQ + short answer) — 60-90 min',
      'Round 2: Case interview with guesstimate + structured framework question',
      'Round 3: Behavioural / resume-based interview, often with a puzzle thrown in',
      'Some intakes add an unstructured case round at senior levels',
    ],
    case_archetypes: [
      { name: 'Sales force sizing / structuring', example: 'Pharma client launching new oncology drug — design the rep footprint' },
      { name: 'Pricing analytics', example: 'Specialty pharma considering price hike — quantify volume impact and payer pushback' },
      { name: 'Chart-based business problem', example: '5 exhibits show a decline in script share — diagnose root cause' },
      { name: 'Market sizing / guesstimate', example: 'Estimate annual diabetes drug market in India by 2030' },
      { name: 'Customer segmentation', example: 'Tech client wants to re-segment SMB customers based on usage data — design approach' },
    ],
    behavioral_dimensions: [
      'Quantitative comfort — non-negotiable',
      'Structured problem-solving and chart fluency',
      'Domain curiosity — pharma/lifesci interest is a real plus',
      'Collaboration in cross-functional analytics teams',
      'Ownership of analytical output through to recommendation',
    ],
    spike_phrases: [
      '"Looking at chart 3, the trendline tells me..."',
      '"To size this I would triangulate top-down and bottom-up..."',
      '"The driver of the decline is X based on exhibits B and D"',
      '"The data I would want next to confirm this is..."',
      '"My recommendation, quantified, is..."',
    ],
    avoid: [
      'Do not panic on the written case — pace yourself across exhibits, do not over-invest in chart 1',
      'Do not skip the math — wrong arithmetic in a guesstimate is the fastest reject signal',
      'Do not ignore pharma context — basic knowledge of drug lifecycle, payers, reps is expected',
    ],
    behavioral_questions: [
      'Walk me through a time you used data to change a stakeholder\'s mind',
      'Why ZS over a pure-strategy firm or pure-analytics firm?',
      'Describe a complex analysis you ran and how you communicated it to a non-analytical audience',
    ],
  },

  'Parthenon-EY': {
    overview:
      'EY-Parthenon is the strategy arm of EY, formed by EY\'s acquisition of Parthenon and integration with EY Strategy. Strongest globally in commercial due diligence (CDD) for PE — among the busiest CDD shops outside Bain. India practice is growing fast in PE-backed deals, education, healthcare, and consumer. Cases are notably faster-paced, profit-focused, and PE-flavoured vs MBB.',
    process: [
      'Round 0: Recruiter screen + sometimes online test',
      'Round 1: Two 30-min back-to-back interviews — one case, one behavioural',
      'Round 2 (Final): Two to four interviews with senior managers/partners — typically includes a group case or written/slide-based case alongside live cases',
      'Strategy-track candidates see more PE/CDD cases; Advisory track sees implementation/operational cases',
    ],
    case_archetypes: [
      { name: 'Commercial due diligence', example: 'PE fund evaluating a INR 800cr K-12 chain — assess market growth, moat, downside' },
      { name: 'Market entry — PE bent', example: 'Global PE fund evaluating a platform play in Indian medical devices — market and target shortlist' },
      { name: 'Growth strategy', example: 'PortCo at INR 500cr revenue mapping path to INR 2000cr in 4 years pre-exit' },
      { name: 'Profitability', example: 'PE-owned QSR chain with margin compression — diagnose store-level economics' },
      { name: 'Market sizing fast', example: 'Size the Indian premium pet care market in 2028' },
    ],
    behavioral_dimensions: [
      'Speed and pace — Parthenon cases run faster than MBB',
      'Commercial / investor mindset — think like LP, not CEO',
      'Numerical confidence — IRR, CAGR, breakeven on demand',
      'Comfort with ambiguity in CDD-style data dumps',
      'Crisp synthesis — "what matters for the deal" in 2 lines',
    ],
    spike_phrases: [
      '"From an LP perspective, the deal-breaker would be..."',
      '"The market is growing X% — but the addressable subset for this asset is..."',
      '"The downside case at 70% of management plan still gives Y IRR"',
      '"The 3 deal-killers I would diligence first are..."',
      '"My investment view is positive/negative — and here is the one chart for the IC memo"',
    ],
    avoid: [
      'Do not pace like an MBB case — Parthenon expects faster, sharper synthesis',
      'Do not ignore PE financial vocabulary — IRR, MOIC, EV/EBITDA need to be automatic',
      'Do not over-engineer frameworks; a simple 3-bucket structure for a CDD beats a 10-box tree',
    ],
    behavioral_questions: [
      'Why Parthenon and why CDD over broader strategy work?',
      'Tell me about a time you formed a sharp investment-style view under time pressure',
      'Describe a project where you had to challenge a client/management team\'s plan',
    ],
  },

  'Goldman Sachs IB': {
    overview:
      'Goldman Sachs Investment Banking is the most prestigious global IB, known for the partnership culture, the 14 Business Principles, and a reputation for technical rigour and intensity. India IB practice (Bengaluru/Mumbai) covers TMT, Industrials, Consumer, FIG, and Natural Resources, with strong M&A and ECM franchises. 2024-25 was particularly competitive — historic low acceptance rates on the SA programme globally.',
    process: [
      'Round 0: Online application + recruiter screen + HireVue video interview (behavioural)',
      'Round 1: First-round interviews — 1-2 calls, mix of technical (DCF, LBO, comps) and behavioural',
      'Round 2 (Superday): 3-5 back-to-back interviews, 30-45 min each, with bankers Associate to MD',
      'Decision usually within days of Superday given speed of GS pipeline',
    ],
    case_archetypes: [
      { name: 'Valuation walk-through', example: 'Walk me through how you would value a listed Indian renewables IPP today' },
      { name: 'M&A thesis / fit', example: 'Why would you advise an Indian conglomerate to demerge its consumer arm now?' },
      { name: 'Stock pitch', example: 'Pick an Indian listed name, give me long/short with thesis, valuation, catalysts' },
      { name: 'Technical drill', example: 'Walk me through DCF, then a paper LBO with 5x entry, 3x leverage' },
      { name: 'Market view', example: 'What is your view on Indian rate cycle and IPO market for next 12 months?' },
    ],
    behavioral_dimensions: [
      'Commercial drive and curiosity — markets-aware always',
      'Resilience under intensity (long hours expectation tested)',
      'Teamwork — "selfless excellence" language from 14 principles',
      'Integrity / judgement — GS interviews dig on ethical scenarios',
      'Hunger for ownership and learning velocity',
    ],
    spike_phrases: [
      '"I have been tracking [specific recent India deal] — the comp set tells me..."',
      '"My stock pitch is [name] — thesis, valuation, catalyst, key risk in 90 seconds"',
      '"On the LBO, with X entry and Y leverage, IRR comes to roughly..."',
      '"The reason this M&A makes sense now and not 12 months ago is..."',
      '"If I were on the deal team Monday I would model..."',
    ],
    avoid: [
      'Do not under-prep technicals — even round 1 will hit DCF, accretion/dilution, paper LBO',
      'Do not give a generic "I want IB" answer — GS specifically tests commercial curiosity and recent deal awareness',
      'Do not appear fragile — interviewers genuinely probe for hours/intensity tolerance',
    ],
    behavioral_questions: [
      'Walk me through a recent M&A or IPO you have been following and what you would have done differently',
      'Tell me about a time you worked through extreme pressure or long hours and still delivered',
      'Why Goldman over Morgan Stanley or JPMorgan specifically?',
    ],
  },

  'Morgan Stanley IB': {
    overview:
      'Morgan Stanley Investment Banking is a top-bracket global IB with notably strong M&A advisory, Equity Capital Markets, and a growing tech/healthcare franchise. Brand is known for the 5 Core Values (Do the Right Thing, Put Clients First, Lead with Exceptional Ideas, Commit to Diversity and Inclusion, Give Back) and a slightly more collegial culture vs Goldman. India IB hub in Mumbai with sector coverage in Industrials, Consumer, TMT, FIG.',
    process: [
      'Round 0: Online application + HireVue video + sometimes online assessment',
      'Round 1: 1-2 video interviews with bankers — technical + behavioural',
      'Round 2 (Superday — distinctively 3-part at MS): (a) interviews with associate-to-MD, (b) group exercise (e.g. budget allocation simulation), (c) stock pitch',
      'Final decision typically within 1-2 weeks',
    ],
    case_archetypes: [
      { name: 'Stock pitch', example: 'Long/short an Indian listed name with thesis, valuation, 3 catalysts, 2 risks' },
      { name: 'Group exercise / capital allocation', example: 'You are the team — allocate INR 500cr capex across 4 projects with different IRR/risk profiles' },
      { name: 'M&A advisory thesis', example: 'Why is now the right time for two Indian fintechs to consolidate?' },
      { name: 'Valuation', example: 'Walk me through DCF for an Indian e-commerce platform with 5-year losses' },
      { name: 'Markets / macro view', example: 'Where do you see Indian IPO market in next 12 months and which sectors lead?' },
    ],
    behavioral_dimensions: [
      'Putting Clients First — explicitly probed via behavioural questions',
      'Doing the Right Thing — judgement and ethics scenarios',
      'Leading with Exceptional Ideas — original thinking on stock pitches and deals',
      'Teamwork — observed live in the group exercise',
      'Commitment to giving back — community and impact stories valued',
    ],
    spike_phrases: [
      '"Putting the client first here would mean recommending..."',
      '"My exceptional idea on this deal would be..."',
      '"In the group, I want to build on what X said and add..."',
      '"My stock pitch is [name] — thesis, target price, catalyst, risk"',
      '"The risk-adjusted return on project A beats B because..."',
    ],
    avoid: [
      'Do not dominate the group exercise — MS explicitly grades collaborative behaviour',
      'Do not skip the stock pitch prep — it is a distinct round, not optional',
      'Do not parrot the 5 values — anchor stories in them but do not list them robotically',
    ],
    behavioral_questions: [
      'Tell me about a time you put a client or stakeholder ahead of your own short-term interest',
      'Describe a moment you led with an idea that was unpopular at first',
      'Why Morgan Stanley over Goldman or JPMorgan?',
    ],
  },

  'JPMorgan IB': {
    overview:
      'JPMorgan Investment Banking is a global universal-bank powerhouse, #1 or #2 in M&A and ECM league tables most years, with Jamie Dimon\'s "fortress balance sheet" culture. India IB practice (Mumbai) is full-service with notable strength in FIG, Industrials, Consumer, and a strong Indian ECM franchise. Process is structured and data-driven with HireVue used heavily at the screening stage.',
    process: [
      'Round 0: Application + HireVue video interview (behavioural, ~5 questions)',
      'Round 0.5: Pymetrics game assessment / online test for some tracks',
      'Round 1: Recruiter phone screen (~30 min)',
      'Round 2 (Superday): 4-5 interviews of 30-45 min, mix of technical and behavioural with VPs, EDs, MDs',
      'Total process 3-6 weeks',
    ],
    case_archetypes: [
      { name: 'Technical drill', example: 'Walk me through DCF, then accretion/dilution for a stock-for-stock M&A' },
      { name: 'Three statements / linkage', example: 'Depreciation goes up by 100 — walk through impact across IS, BS, CF' },
      { name: 'Industry / sector view', example: 'What is your view on Indian banking consolidation over next 3 years?' },
      { name: 'Deal walk-through', example: 'Pick a recent JPM-led India deal — why did it happen now, who paid what, what next?' },
      { name: 'Behavioural fit', example: 'Tell me about a time you were under pressure with a tight deadline' },
    ],
    behavioral_dimensions: [
      'Technical fluency — three statements, DCF, LBO automatic',
      'Resilience under hours and pressure',
      'Attention to detail — JPM interviews are notably granular',
      'Commercial curiosity — markets and recent deals',
      'Cultural fit — "fortress" mentality, risk-aware judgement',
    ],
    spike_phrases: [
      '"On the three-statement walk, depreciation up 100 means..."',
      '"My sector view on Indian banks is consolidation accelerates because..."',
      '"In an accretion/dilution analysis, the key sensitivity is..."',
      '"On the recent JPM deal X, the strategic logic was..."',
      '"If I were on the live deal team I would build the comp set as..."',
    ],
    avoid: [
      'Do not slip on three-statement linkages — JPM interviewers will probe until you stumble',
      'Do not give vague behavioural answers — STAR with specifics or it gets discounted',
      'Do not under-prep recent deals — JPM expects you to track their league tables',
    ],
    behavioral_questions: [
      'Walk me through your resume in 2 minutes — then defend any choice on it',
      'Tell me about a time you worked extreme hours and what kept you going',
      'Why JPMorgan over Goldman or Morgan Stanley?',
    ],
  },

  'Avendus / Kotak IB (India)': {
    overview:
      'Avendus and Kotak Mahindra Capital are the two leading domestic Indian investment banks. Avendus is the dominant mid-market M&A and growth-equity advisor (especially consumer, healthcare, tech) and runs a strong Capital Alternatives and Wealth franchise. Kotak Mahindra Capital is the bulge-bracket of Indian banks — top of league tables in Indian ECM/IPOs and large-cap M&A. Both are top-tier targets at IIMs for India-focused IB careers.',
    process: [
      'Avendus: 2 virtual rounds (1 technical + 1 case study, often with a 2-day take-home valuation case on a hypothetical company), then final round with 2 technical + 1 case + 1 HR interview',
      'Kotak: Typically 2-3 rounds — technical/finance + behavioural + final partner-level interview',
      'Both: heavy emphasis on Indian capital markets, recent Indian deals, sector views',
      'IIM placements: 1-3 offers per top IIM per firm, highly competitive',
    ],
    case_archetypes: [
      { name: 'Take-home valuation (Avendus)', example: 'Value a hypothetical D2C personal care brand at INR 300cr ARR — DCF + comps + view on exit' },
      { name: 'Live valuation', example: 'How would you value an Indian listed renewables IPP today — what multiple and why?' },
      { name: 'Indian ECM view', example: 'What sectors lead the Indian IPO market in next 12 months and why?' },
      { name: 'Three statements / accounting', example: 'Walk through impact of a INR 200cr inventory write-down across IS/BS/CF' },
      { name: 'Stock or sector pitch', example: 'Pick an Indian listed name — long/short with thesis and valuation' },
    ],
    behavioral_dimensions: [
      'India-markets fluency — recent deals, league tables, regulators',
      'Technical depth — three statements, valuation, DCF',
      'Hustle and ownership — Indian IBs run lean, expect fast learning',
      'Network and relationship orientation (esp. Avendus growth-equity)',
      'Cultural fit — entrepreneurial, less hierarchical than bulge bracket',
    ],
    spike_phrases: [
      '"In the recent [Indian deal] the multiple paid implies..."',
      '"For a D2C asset the right comp set in India is..."',
      '"On the take-home, the downside case at 70% of plan still gives..."',
      '"My view on Indian ECM next 12 months is led by [sector] because..."',
      '"As an India-focused IB you would prioritise this client because..."',
    ],
    avoid: [
      'Do not pitch global names or comps — interviewers expect Indian deal context',
      'Do not under-prep on Indian regulators (SEBI, RBI norms) — they show up regularly',
      'Do not be passive on the take-home — Avendus weights it heavily and expects an explicit recommendation',
    ],
    behavioral_questions: [
      'Why Avendus/Kotak specifically over a bulge-bracket Indian IB seat?',
      'Walk me through the most interesting Indian deal in last 12 months and what you would have changed',
      'Tell me about a time you operated with very lean resources and still delivered',
    ],
  },

  'Microsoft PM': {
    overview:
      'Microsoft Product Management hires globally and in India (Hyderabad, Bengaluru, Noida) across Azure, M365, Windows, AI/Copilot, Dynamics, Gaming, and Security. Post-2023 the bar lifted significantly with the AI/Copilot push. The "As Appropriate" (AA) round retains effective veto power. Question mix skews ~40% product sense, ~30% execution, ~30% behavioural with a real technical undercurrent.',
    process: [
      'Round 0: Recruiter screen + sometimes a written assessment (product memo) for senior PM roles',
      'Round 1: Phone/video interview with PM — usually a product sense + light execution question',
      'Round 2 (Loop): 4-5 interviews of 45-60 min — product sense, execution, technical, leadership, As Appropriate (AA)',
      'AA Round: Senior leader who can veto regardless of other rounds — heavy on judgement and bar',
    ],
    case_archetypes: [
      { name: 'Product design', example: 'Design a feature in Microsoft Teams to help hybrid-team managers' },
      { name: 'Improve an existing product', example: 'How would you improve Outlook for new managers?' },
      { name: 'Strategy / market', example: 'Should Microsoft build a consumer-grade AI agent for personal productivity?' },
      { name: 'Execution / metrics', example: 'You are PM for Copilot in Word — your weekly active users dropped 8% — diagnose' },
      { name: 'Technical', example: 'How would you architect a new feature that needs sub-100ms latency at global scale?' },
    ],
    behavioral_dimensions: [
      'Customer obsession — Satya-era cultural shift',
      'Growth mindset — explicit Microsoft language; learn-it-all over know-it-all',
      'One Microsoft / collaboration across orgs',
      'Diversity and inclusion in stakeholder management',
      'Drive for results / delivering at scale',
    ],
    spike_phrases: [
      '"The user I am designing for is X — their core unmet need is Y"',
      '"To validate this with users I would run [specific test]"',
      '"The success metric I would commit to is..."',
      '"With a learn-it-all mindset, the experiment I would run first is..."',
      '"To make this One Microsoft, I would partner with [team] to..."',
    ],
    avoid: [
      'Do not skip technical depth — Microsoft AA interviewers test architectural understanding even for non-TPM roles',
      'Do not give product ideas without a clear primary user persona and metric',
      'Do not parrot "customer obsession" without concrete user research instinct behind it',
    ],
    behavioral_questions: [
      'Tell me about a time you championed a feature that initially got pushback from leadership',
      'Describe a moment you operated with a growth mindset after a clear failure',
      'Walk me through how you balanced shipping speed vs technical debt on a product call',
    ],
  },

  'Google PM': {
    overview:
      'Google PM is among the most selective PM roles globally — APM has historically run at sub-1% acceptance. India PM roles (Bengaluru, Hyderabad, Gurgaon) span Search, Ads, YouTube, Cloud, Android, AI/Gemini. The bar is on creativity, scale-thinking, technical fluency, and user empathy. Hiring committee owns the final decision, not the team — a structural difference vs Meta and Microsoft.',
    process: [
      'Round 0: Recruiter screen + sometimes a phone interview (product or analytical)',
      'Round 1: Phone interview with PM — product sense + estimation typically',
      'Round 2 (Onsite): 5 x 45-min interviews — 4 product (sense, strategy, execution, analytics) + 1 technical (system-design lite) with engineer',
      'Hiring Committee review (no team interview at this stage) — committee owns hire/no-hire',
      'Team Match round after offer in principle',
    ],
    case_archetypes: [
      { name: 'Product design at scale', example: 'Design a product to help small businesses in India go online' },
      { name: 'Estimation / sizing', example: 'Estimate YouTube\'s annual storage cost growth' },
      { name: 'Strategy', example: 'Should Google launch a paid version of Gemini for Indian SMBs?' },
      { name: 'Analytics / metrics', example: 'Maps weekly active users dropped 5% in Tier-2 cities — diagnose' },
      { name: 'Technical / system design', example: 'Design a system to serve personalised search results at sub-50ms p99 globally' },
    ],
    behavioral_dimensions: [
      'User-centricity at scale — Google PM thinks billions, not millions',
      'Creativity and product judgement — "10x not 10%"',
      'Analytical chops — clean reasoning under quantitative pressure',
      'Technical literacy — engineers must respect you',
      'Googleyness — humility, mission orientation, bias to action',
    ],
    spike_phrases: [
      '"Designing for billions, the constraint that matters most is..."',
      '"My north-star metric would be X because it captures Y user value"',
      '"To estimate YouTube storage I would decompose into uploads, retention, codec efficiency..."',
      '"To stress-test creativity here, the 10x version of this idea would be..."',
      '"The hardest part of the system-design is the [specific component] because..."',
    ],
    avoid: [
      'Do not give a product idea that does not work at Google scale — interviewers test for that instinct',
      'Do not skip the metric — every product answer needs a concrete success measure',
      'Do not bluff on technical/system-design — engineers on the panel will catch it',
    ],
    behavioral_questions: [
      'Tell me about a product or feature you would change at Google today and why',
      'Describe a time you made a 10x bet vs a 10% improvement and what happened',
      'Walk me through a time you disagreed with an engineer and how you resolved it',
    ],
  },

  'Meta PM': {
    overview:
      'Meta (formerly Facebook) PM hires across Family of Apps (FB, Instagram, WhatsApp, Threads), Reality Labs, and AI. India PM presence is small but growing in Hyderabad/Bengaluru. Process is structured around three explicit themes — Product Sense, Execution (analytical thinking), Leadership and Drive — each typically a discrete interview. Meta PMs operate with high autonomy and influence rather than authority — leadership round tests that explicitly.',
    process: [
      'Round 0: Recruiter screen',
      'Round 1: 2 video screens — Product Sense + Execution/Analytical Thinking',
      'Round 2 (Onsite Loop): 3 interviews — Product Sense (deeper), Execution, Leadership and Drive',
      'Hiring Committee review',
      'Total timeline 4-8 weeks',
    ],
    case_archetypes: [
      { name: 'Product sense / favourite product', example: 'Pick a Meta product you love — improve it' },
      { name: 'Product design for new audience', example: 'Design Instagram for users 60+ in India' },
      { name: 'Execution — goal setting', example: 'You are PM for Reels in India — define success metrics for next quarter' },
      { name: 'Execution — debug', example: 'WhatsApp daily active users dropped 4% in India — diagnose' },
      { name: 'Trade-off', example: 'Add a feature that boosts DAU 5% but reduces session length 10% — ship or not?' },
    ],
    behavioral_dimensions: [
      'Product sense — taste, judgement, user empathy',
      'Analytical rigor — debugging metrics, defining trade-offs',
      'Move Fast — Meta\'s explicit cultural value',
      'Leadership without authority — drive cross-functional outcomes',
      'Drive / impact-orientation — "what changed in the world"',
    ],
    spike_phrases: [
      '"For this user segment the unmet need is X and I would solve it by..."',
      '"My north-star metric would be X — guardrails would be Y and Z"',
      '"To debug the DAU drop I would slice by [dimension hierarchy]..."',
      '"The trade-off is between short-term engagement and long-term retention — I would choose..."',
      '"To move fast on this I would ship the MVP in 2 weeks scoped as..."',
    ],
    avoid: [
      'Do not give shallow product ideas without metric and trade-off',
      'Do not skip "leadership without authority" stories — the leadership round explicitly tests this',
      'Do not pretend Meta has no problems — interviewers respect candour about FB/Insta/WA pain points',
    ],
    behavioral_questions: [
      'Tell me about a time you drove a project across a team that did not report to you',
      'Describe a metric you owned that moved meaningfully — what specifically did you do?',
      'Walk me through a product decision you made that involved a real trade-off',
    ],
  },

  'Amazon PM': {
    overview:
      'Amazon PM (and PM-T) interviews are structured almost entirely around the 16 Leadership Principles. India PM roles (Bengaluru, Hyderabad, Gurgaon) span Retail, AWS, Prime, Alexa, Devices, Ads. The Bar Raiser — a senior cross-team Amazonian with veto power — sits in every loop. Stories must be specific, individual ("I" not "we"), and quantified. PRFAQ ("Working Backwards" Press Release + FAQ) shows up for senior PMs.',
    process: [
      'Round 0: Recruiter screen + sometimes a written assessment (PRFAQ for senior PM)',
      'Round 1: Phone interview — typically product + LP behavioural mix',
      'Round 2 (Loop): 5-6 interviews of 60 min, each anchored on 2-3 LPs, including Bar Raiser',
      'Bar Raiser veto: even unanimous yes from team can be overridden if Bar Raiser says no',
      'Debrief and offer typically within 1-2 weeks of loop',
    ],
    case_archetypes: [
      { name: 'PRFAQ / Working Backwards', example: 'Write a 1-page PR for a new Amazon product solving X for Indian customers' },
      { name: 'LP behavioural — Customer Obsession', example: 'Tell me about a time you went beyond what was expected for a customer' },
      { name: 'LP behavioural — Ownership / Bias for Action', example: 'Tell me about a time you took a calculated risk without checking with your manager' },
      { name: 'Product design', example: 'Design a feature in Amazon Prime for Tier-2 Indian customers' },
      { name: 'Metric / dive deep', example: 'Cart abandonment up 6% in last 30 days — what is your investigation plan?' },
    ],
    behavioral_dimensions: [
      'Customer Obsession — anchor of every story',
      'Ownership — "I" not "we", measurable outcomes',
      'Bias for Action — speed and calculated risk',
      'Dive Deep — comfort with raw data, root-cause',
      'Have Backbone; Disagree and Commit — push-back stories required',
    ],
    spike_phrases: [
      '"The customer pain point I obsessed over was..."',
      '"I owned this end-to-end — the result was X (quantified)"',
      '"I disagreed with my manager because the data showed Y; I committed once we aligned"',
      '"Working backwards from the customer, the headline of the press release would read..."',
      '"To dive deep I pulled the raw query and found..."',
    ],
    avoid: [
      'Do not say "we" — Bar Raiser will explicitly ask "what did you do" until they hear "I"',
      'Do not give unquantified stories — every STAR needs a number',
      'Do not skip preparing for Bar Raiser — a strong loop with weak BR = reject',
    ],
    behavioral_questions: [
      'Tell me about a time you disagreed with a senior leader and what specifically you did',
      'Describe the most customer-obsessed decision you made when it cost the business short-term',
      'Walk me through a time you owned a problem that nobody else wanted to touch',
    ],
  },

  'Flipkart / Walmart PM': {
    overview:
      'Flipkart PM (and Walmart Global Tech PM in Bengaluru) is the top India-based PM destination for IIM/B-school grads outside Big Tech. The Flipkart APM program is a 2-year rotational programme hiring small APM cohorts annually. Walmart PM3 is the senior PM bar. Interviews skew Indian-commerce-context heavy — Tier-2/Tier-3 user nuance, monetisation, supply chain — with explicit RCA (root-cause-analysis) and product-thinking rounds.',
    process: [
      'Flipkart APM: Deck round (build and present a product deck) + 3 interviews — Problem Solving (60 min), Product Thinking (60 min), Tech Understanding (60 min). Spaced ~1 month apart',
      'Flipkart senior PM: 4-5 rounds, each with someone 1 level up, every round has at least 1 open product case',
      'Walmart PM3: 4-5 rounds, technical + product + leadership',
      'Both: HR/cultural-fit final',
    ],
    case_archetypes: [
      { name: 'RCA / metric debug', example: 'Flipkart\'s Tier-2 GMV dropped 12% MoM — diagnose' },
      { name: 'Product design — India context', example: 'Design a feature for a first-time online shopper in a Tier-3 town' },
      { name: 'Monetisation / pricing', example: 'How would you monetise Flipkart Plus differently in 2026?' },
      { name: 'Deck round (APM)', example: 'Build a deck on a product you are most proud of — end-to-end story with metrics' },
      { name: 'Tech understanding', example: 'Walk me through how you would build a recommendation system for grocery' },
    ],
    behavioral_dimensions: [
      'India context fluency — Bharat user, vernacular, Tier-2/3 reality',
      'Audacity / 10x thinking — Flipkart culture',
      'Customer-first — Walmart/Flipkart explicit value',
      'Bias for execution — ship-and-iterate culture',
      'Ownership at scale and accountability for metrics',
    ],
    spike_phrases: [
      '"For the Tier-2 first-time user the friction is X — I would solve it by..."',
      '"My RCA tree would split GMV drop into [traffic / conversion / AOV / supply]..."',
      '"To monetise this without hurting trust I would..."',
      '"On the deck — the one slide that tells the whole story is..."',
      '"To build this recommendation engine I would start with [signals] and tradeoff [latency/precision]"',
    ],
    avoid: [
      'Do not assume metro/English-first user — interviewers test Bharat empathy explicitly',
      'Do not skip the deck round prep — Flipkart APMs specifically grade narrative + design',
      'Do not be all strategy and no execution — they value PMs who actually shipped',
    ],
    behavioral_questions: [
      'Tell me about a product you used recently that you would change for a Bharat user',
      'Walk me through a metric you owned end-to-end and how it moved',
      'Describe a time you shipped fast vs perfect and what trade-offs you made',
    ],
  },

  'ITC Marketing': {
    overview:
      'ITC is one of India\'s most diversified conglomerates — FMCG (Aashirvaad, Sunfeast, Bingo, Yippee, Classmate, Fiama), Hotels, Paperboards, Agri, Cigarettes — and a top marketing destination for IIM grads. ITC Leader\'s Programme (KLP) and Core Management Trainee (CMT) for marketing is a flagship pipeline with a strong on-ground "Sales-Stint" before brand work. Heavy emphasis on consumer insight, distribution understanding, and India-rural fluency.',
    process: [
      'Round 0: Online aptitude/psychometric test + CV shortlist',
      'Round 1: HR + technical interview (~30-45 min) — resume deep-dive + brand basics',
      'Round 2: Functional/case interview — guesstimate, market sizing, brand/consumer case',
      'Round 3 (Final): Senior leader interview — fit, India-context, why ITC, why FMCG',
      'Sales stint: 6-month rural/urban sales rotation before brand role for KLP',
    ],
    case_archetypes: [
      { name: 'Brand strategy', example: 'How would you grow Aashirvaad atta in South India where penetration is lower?' },
      { name: 'New product launch', example: 'Should ITC enter the protein-bar category? Position, pricing, channel' },
      { name: 'Distribution / GTM', example: 'Bingo lost 2 points share in modern trade — diagnose and fix' },
      { name: 'Guesstimate', example: 'Estimate annual biscuit consumption in rural Maharashtra' },
      { name: 'Consumer insight', example: 'What is one consumer behaviour shift in 2025 that ITC should bet on?' },
    ],
    behavioral_dimensions: [
      'India / Bharat consumer empathy',
      'Sales-and-distribution respect — KLP explicitly tests willingness to do field stint',
      'Brand-building instinct vs pure analytics',
      'Long-term orientation — ITC values 10-15 year careers',
      'Resilience and humility — sales stint culture filter',
    ],
    spike_phrases: [
      '"The Bharat consumer for this category does X because..."',
      '"In modern trade vs general trade the shopper mission shifts to..."',
      '"To win share I would focus on the bottom-of-pyramid SKU at INR Y price-point..."',
      '"On distribution, the unlock is Tier-3/4 wholesale partner depth"',
      '"My positioning for this brand would be [emotional benefit] backed by [functional proof]"',
    ],
    avoid: [
      'Do not say you are unwilling to do the sales stint — instant disqualifier',
      'Do not pitch only digital-first ideas — ITC is general-trade-heavy and tests it',
      'Do not be condescending about FMCG vs consulting/IB — interviewers screen for genuine FMCG passion',
    ],
    behavioral_questions: [
      'Why FMCG, why ITC over HUL, P&G, Nestle?',
      'Tell me about a brand you admire and what you would change about it',
      'Are you willing to do 6 months of sales stint in a Tier-3 town? Walk me through how you would approach it',
    ],
  },

  'Hindustan Unilever Marketing': {
    overview:
      'Hindustan Unilever Limited (HUL) is the gold standard of Indian FMCG marketing — Surf Excel, Lifebuoy, Dove, Vim, Brooke Bond, Knorr, Kissan, Lux, Rin, Pond\'s, Lakme. The Unilever Future Leaders Programme (UFLP) is the flagship management trainee track and the most coveted FMCG seat at IIMs. The "HUL Launch" programme converts top summer interns directly to MTs. Process is heavy on psychometric and structured behavioural rigour.',
    process: [
      'Round 0: CV shortlist + psychometric test (Google/Microsoft Form)',
      'Round 1: HireVue video interview — 3 questions, 1 min think + 3 min record per question',
      'Round 2: Final interview (online or office) — 30-45 min, mix of HR + technical/functional',
      'UFLP: Multi-functional rotations (Marketing, Sales, Supply Chain, Finance, HR) over 12-15 months',
      'Total process 4-8 weeks at IIMs',
    ],
    case_archetypes: [
      { name: 'Brand growth', example: 'Surf Excel share is flat for 2 years — design a 3-year growth plan' },
      { name: 'New product / occasion creation', example: 'How would you grow Knorr in the Indian breakfast occasion?' },
      { name: 'Communication / TG', example: 'Reposition Lifebuoy for urban Gen Z without losing rural relevance' },
      { name: 'Guesstimate', example: 'Estimate annual shampoo sachet consumption in India' },
      { name: 'Channel / distribution', example: 'How should HUL respond to D2C beauty brands eroding share in premium personal care?' },
    ],
    behavioral_dimensions: [
      'Standards of Leadership (HUL\'s 9 SoL — Purpose & Service, Personal Mastery, Agility, Business Acumen, etc.) — explicitly evaluated',
      'Bias for action and growth orientation',
      'Consumer-first thinking — "we are consumers in disguise" mantra',
      'Cross-functional collaboration (UFLP rotations test it)',
      'Purpose orientation — Unilever explicitly probes USLP/sustainability fit',
    ],
    spike_phrases: [
      '"The consumer insight that unlocks growth is..."',
      '"Mapped to Unilever\'s Standards of Leadership, the value at stake here is..."',
      '"For this TG, the unmet need is X — backed by [behaviour observation]"',
      '"My positioning would be functional X + emotional Y, with [executional proof]"',
      '"On Purpose — this idea connects to USLP because..."',
    ],
    avoid: [
      'Do not under-prep the HireVue — many candidates lose here on poor energy/clarity in 3-min recordings',
      'Do not skip the Standards of Leadership — anchor STAR stories in them explicitly',
      'Do not give US/global brand examples — interviewers want India-context muscle',
    ],
    behavioral_questions: [
      'Tell me about a time you used consumer insight to change a decision',
      'Why HUL/UFLP over ITC, P&G, Nestle, or consulting?',
      'Describe a moment you led with purpose, not just performance',
    ],
  },
};

export function getFirmPack(name: string): FirmPack | null {
  // exact match
  if (FIRM_PACKS[name]) return FIRM_PACKS[name];
  // case-insensitive fallback
  const lower = name.toLowerCase();
  for (const key of Object.keys(FIRM_PACKS)) {
    if (key.toLowerCase() === lower) return FIRM_PACKS[key];
  }
  return null;
}

export const FIRM_PACK_NAMES = Object.keys(FIRM_PACKS);
