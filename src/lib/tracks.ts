// Track definitions: rubrics, frameworks, math drills, primer content per
// MBA job track. Used by the track switcher, scoring engine, cheat sheet.

export type Track = 'consulting' | 'ib_pe_vc' | 'pm' | 'marketing' | 'strategy_bizops' | 'behavioral';

export interface TrackDef {
  key: Track;
  label: string;
  short: string;
  description: string;
  rubric: { dimension: string; weight: number; description: string }[];
  frameworks: { name: string; when_to_use: string; structure: string[] }[];
  math: { name: string; formula: string; mnemonic?: string }[];
  industry_signal: string; // hint to LLM about what to research
  recovery_scripts: string[];
  killer_phrases: string[]; // L4 "spike" moves
}

export const TRACKS: Record<Track, TrackDef> = {
  consulting: {
    key: 'consulting',
    label: 'Consulting (MBB / Big4 / Tier-1)',
    short: 'Consulting',
    description: 'Case interviews. Frameworks + math + synthesis.',
    rubric: [
      { dimension: 'Structure', weight: 25, description: 'MECE decomposition with case-specific (not template) framework' },
      { dimension: 'Quant Reasoning', weight: 20, description: 'Mental math accuracy + interpretation of numbers' },
      { dimension: 'Business Judgment', weight: 15, description: 'Practical recommendations grounded in industry context' },
      { dimension: 'Communication', weight: 15, description: 'Clear, top-down, signposted speaking' },
      { dimension: 'Hypothesis Management', weight: 10, description: 'States hypothesis upfront, pivots when data contradicts' },
      { dimension: 'Creativity', weight: 10, description: 'Insightful framings beyond the obvious' },
      { dimension: 'Synthesis', weight: 5, description: 'Bottom-line first recommendation tying back to client objective' },
    ],
    frameworks: [
      { name: 'Profitability Tree', when_to_use: 'Profit declined / increase profitability', structure: ['Revenue (Price × Volume)', 'Cost (Fixed + Variable)', 'Volume drivers', 'Price drivers'] },
      { name: 'Market Entry', when_to_use: 'Should client enter new market/geography', structure: ['Market attractiveness', 'Client fit', 'Entry mode', 'Risks'] },
      { name: 'M&A', when_to_use: 'Acquisition, divestiture, JV decision', structure: ['Strategic fit', 'Financial fit', 'Synergies', 'Integration risks'] },
      { name: 'Pricing', when_to_use: 'New product price / price change', structure: ['Cost-based', 'Competitor-based', 'Value-based', 'Price elasticity'] },
      { name: 'Operations', when_to_use: 'Capacity, throughput, cost reduction', structure: ['Process map', 'Bottlenecks', 'Utilization', 'Quality'] },
      { name: 'Market Sizing', when_to_use: 'Estimate market size / volume', structure: ['Top-down (population × penetration × usage)', 'Bottom-up (units × price)', 'Sanity check'] },
    ],
    math: [
      { name: 'Growth rate', formula: '(New − Old) / Old × 100', mnemonic: 'change over base' },
      { name: 'CAGR', formula: '(End / Start)^(1/years) − 1', mnemonic: 'rule of 72 ≈ years to double = 72 / rate%' },
      { name: 'Breakeven', formula: 'Fixed cost / (Price − Variable cost)', mnemonic: 'how many units to cover fixed' },
      { name: 'Contribution margin', formula: '(Price − Variable cost) / Price', mnemonic: '% of each sale that covers fixed + profit' },
      { name: 'Payback period', formula: 'Investment / Annual cash flow', mnemonic: 'years to recover' },
      { name: 'Market sizing (top-down)', formula: 'Population × % adopters × usage × price', mnemonic: 'P × A × U × $' },
    ],
    industry_signal: 'industry margins, market size, top players, recent disruption, KPIs',
    recovery_scripts: [
      'Let me reorient: so far we\'ve established X. The core question is Y. May I take 30 seconds to think through next steps?',
      'Stepping back — to make sure I\'m on the right track, the client cares most about [objective]. Should I keep going down [branch] or pivot to [other]?',
      'I want to make sure I\'m not missing the obvious — what data could I ask for that would most clarify this question?',
    ],
    killer_phrases: [
      'Bottom-line first: my recommendation is X because of Y, with Z as the main risk.',
      'Let me pivot — the data on [X] contradicts my initial hypothesis. Here\'s the updated structure.',
      'Beyond the financials, the most important non-quant consideration is [strategic optionality / brand / talent].',
    ],
  },

  ib_pe_vc: {
    key: 'ib_pe_vc',
    label: 'Investment Banking / PE / VC',
    short: 'IB / PE',
    description: 'Technical valuation, LBO, M&A modeling.',
    rubric: [
      { dimension: 'Technical Accuracy', weight: 30, description: 'DCF, LBO, comps math correct' },
      { dimension: 'Valuation Judgment', weight: 20, description: 'Picks right method for the situation' },
      { dimension: 'Accounting Linkages', weight: 15, description: '3-statement flow understood' },
      { dimension: 'Deal Sense', weight: 15, description: 'Strategic rationale + synergies' },
      { dimension: 'Communication', weight: 10, description: 'Clear technical explanation' },
      { dimension: 'Brain Teasers', weight: 10, description: 'Quick mental math + market sizing' },
    ],
    frameworks: [
      { name: 'DCF', when_to_use: 'Intrinsic valuation', structure: ['Project FCF (5-10 yr)', 'Terminal value (Gordon or Exit Multiple)', 'WACC discount', 'Enterprise value → Equity value'] },
      { name: 'Paper LBO', when_to_use: 'PE buyout return calc', structure: ['Entry: EBITDA × Multiple − Debt', 'Project FCF + debt paydown', 'Exit: Year-5 EBITDA × Exit Multiple', 'IRR + MOIC'] },
      { name: 'Comparable Company', when_to_use: 'Relative valuation', structure: ['Identify peers', 'EV/EBITDA, EV/Revenue, P/E multiples', 'Adjust for growth/margin', 'Apply to target'] },
      { name: 'Precedent Transactions', when_to_use: 'M&A pricing', structure: ['Recent deals in sector', 'Control premium 20-30%', 'Adjust for synergies', 'Comparable multiples'] },
      { name: 'Accretion-Dilution', when_to_use: 'M&A EPS impact', structure: ['Combined NI', 'New share count', 'New EPS vs standalone', 'Synergies kicker'] },
    ],
    math: [
      { name: 'WACC', formula: '(E/V × Re) + (D/V × Rd × (1−T))', mnemonic: 'cost of capital weighted' },
      { name: 'Terminal value (Gordon)', formula: 'FCF × (1+g) / (WACC − g)', mnemonic: 'perpetuity growth' },
      { name: 'IRR (paper LBO)', formula: '(Exit / Entry)^(1/years) − 1', mnemonic: 'target ~20-25%' },
      { name: 'MOIC', formula: 'Exit equity / Entry equity', mnemonic: 'target ~2-3x in 5 yr' },
      { name: 'EV', formula: 'Equity + Debt − Cash', mnemonic: 'enterprise = what acquirer pays' },
      { name: 'Levered FCF', formula: 'Net income + D&A − ΔWC − Capex', mnemonic: 'cash to equity holders' },
    ],
    industry_signal: 'sector multiples, recent M&A deals, debt markets, EBITDA margins typical for sector',
    recovery_scripts: [
      'Let me restate the question — we\'re valuing [target] using [method]. The drivers I haven\'t locked in yet are [A, B].',
      'I want to sanity-check — is the cost of debt before or after tax? I\'ll proceed with after-tax.',
      'For brevity, I\'ll assume [common assumption] unless you want me to challenge it.',
    ],
    killer_phrases: [
      'The IRR is sensitive to exit multiple — let me show you the table.',
      'Synergies are typically 50% probability-weighted in the first model pass.',
      'Cross-checking against precedents, this multiple is rich/cheap because [X].',
    ],
  },

  pm: {
    key: 'pm',
    label: 'Product Management',
    short: 'PM',
    description: 'Product sense, estimation, root cause, design.',
    rubric: [
      { dimension: 'Product Sense', weight: 25, description: 'User-centric problem framing + creative solutions' },
      { dimension: 'Estimation', weight: 15, description: 'Fermi-style decomposition' },
      { dimension: 'Strategy', weight: 15, description: 'Connects to business goals + competitive landscape' },
      { dimension: 'Metrics', weight: 15, description: 'Picks right success metric, anticipates trade-offs' },
      { dimension: 'Communication', weight: 15, description: 'Structured, signposted thinking' },
      { dimension: 'Design Sense', weight: 10, description: 'UX intuition + edge case awareness' },
      { dimension: 'Prioritization', weight: 5, description: 'RICE, Impact/Effort framing' },
    ],
    frameworks: [
      { name: 'CIRCLES', when_to_use: 'Product design Q', structure: ['Comprehend situation', 'Identify customer', 'Report needs', 'Cut by priority', 'List solutions', 'Evaluate trade-offs', 'Summarize'] },
      { name: 'AARRR', when_to_use: 'Growth metric / funnel analysis', structure: ['Acquisition', 'Activation', 'Retention', 'Referral', 'Revenue'] },
      { name: 'North Star Metric', when_to_use: 'Pick a success metric', structure: ['Long-term value indicator', 'Counter-metric for quality', 'Leading indicators upstream'] },
      { name: 'Root Cause (5 Whys)', when_to_use: 'Metric dropped, find why', structure: ['Segment users / time / geography', 'Ask why repeatedly', 'External vs internal', 'Hypothesize → test'] },
      { name: 'GAME', when_to_use: 'Product strategy', structure: ['Goals', 'Acts (initiatives)', 'Metrics', 'Evaluation criteria'] },
    ],
    math: [
      { name: 'Funnel conversion', formula: 'Step N / Step N−1', mnemonic: 'where users drop off' },
      { name: 'Retention curves', formula: 'Day-N active / Day-0 active', mnemonic: 'D1, D7, D30 typical' },
      { name: 'LTV/CAC', formula: 'LTV / CAC ≥ 3', mnemonic: 'unit economics threshold' },
      { name: 'Estimation (Fermi)', formula: 'Population × % users × frequency × duration', mnemonic: 'decompose then estimate each' },
      { name: 'Engagement rate', formula: '(Likes + Comments + Shares) / Views', mnemonic: 'health of content' },
    ],
    industry_signal: 'app type, key engagement metrics, recent feature launches, competitor positioning',
    recovery_scripts: [
      'Let me reframe — the user we\'re solving for is [persona]. The job-to-be-done is [JTBD]. Does that match your intent?',
      'I\'d like to start with the user, not the feature — what user problem are we trying to solve?',
      'For success, I\'d propose [primary metric] with [counter-metric] to guard against [degradation].',
    ],
    killer_phrases: [
      'The user\'s job-to-be-done isn\'t what they say — it\'s what they\'re trying to achieve at a higher level.',
      'I\'d kill this feature if [counter-metric] drops more than X% in the experiment.',
      'The 80/20 here is [feature] for [segment] — let\'s ship that and learn before building [bigger feature].',
    ],
  },

  marketing: {
    key: 'marketing',
    label: 'Marketing / Brand / GTM',
    short: 'Marketing',
    description: 'Brand strategy, GTM, pricing, campaigns.',
    rubric: [
      { dimension: 'Customer Insight', weight: 25, description: 'Deep understanding of consumer behavior + segmentation' },
      { dimension: 'Brand Positioning', weight: 20, description: 'Clear, differentiated, defensible positioning' },
      { dimension: '4P Coherence', weight: 15, description: 'Product, price, place, promotion align with positioning' },
      { dimension: 'Quant Marketing', weight: 15, description: 'CAC, LTV, ROAS, payback math' },
      { dimension: 'Communication', weight: 15, description: 'Persuasive, structured pitch' },
      { dimension: 'Channel Strategy', weight: 10, description: 'Right mix of channels for the audience' },
    ],
    frameworks: [
      { name: '5C-STP-4P (chained)', when_to_use: 'Most marketing cases', structure: ['5C: Customer/Company/Competition/Collaborators/Context', 'STP: Segment/Target/Position', '4P: Product/Price/Place/Promotion'] },
      { name: 'Brand positioning canvas', when_to_use: 'Brand strategy', structure: ['Target persona', 'Frame of reference', 'Point of difference', 'Reason to believe'] },
      { name: 'GTM canvas', when_to_use: 'Launching new product', structure: ['Customer segments', 'Value prop', 'Channels', 'Pricing', 'Launch plan + metrics'] },
      { name: 'Funnel marketing', when_to_use: 'Campaign analysis', structure: ['Awareness', 'Consideration', 'Conversion', 'Retention', 'Advocacy'] },
    ],
    math: [
      { name: 'CAC', formula: 'Marketing spend / new customers acquired', mnemonic: 'cost to acquire one' },
      { name: 'LTV', formula: 'ARPU × gross margin × avg lifetime', mnemonic: 'lifetime customer value' },
      { name: 'ROAS', formula: 'Revenue / Ad spend', mnemonic: 'target ≥ 3-4x' },
      { name: 'Payback period', formula: 'CAC / monthly contribution margin', mnemonic: 'months to recoup' },
      { name: 'Market share', formula: 'Brand sales / total category sales', mnemonic: 'relative position' },
    ],
    industry_signal: 'category size, share leaders, recent campaigns, distribution channels typical, pricing benchmarks',
    recovery_scripts: [
      'Let me start with the consumer — who is the target and what unmet need are we serving?',
      'Before 4P, I want to lock STP — segment, target, position. Otherwise the marketing mix won\'t cohere.',
      'The brand promise is [X]. Every marketing decision should ladder up to that.',
    ],
    killer_phrases: [
      'The category isn\'t [obvious category] — it\'s [reframed category] because consumers compare us to [X].',
      'Brand is the premium consumers pay for the same product — our pricing power tells us how strong the brand is.',
      'I\'d kill the campaign if it doesn\'t move [brand health metric] in 6 months, regardless of short-term sales.',
    ],
  },

  strategy_bizops: {
    key: 'strategy_bizops',
    label: 'Corporate Strategy / BizOps',
    short: 'Strategy / BizOps',
    description: 'Hybrid consulting + analytics. Often in-house at tech / FMCG.',
    rubric: [
      { dimension: 'Strategic Framing', weight: 25, description: 'Frames the question in terms of company priorities' },
      { dimension: 'Analytics', weight: 20, description: 'SQL-like thinking + data interpretation' },
      { dimension: 'Business Judgment', weight: 15, description: 'Practical, executable recommendations' },
      { dimension: 'Communication', weight: 15, description: 'Crisp, exec-level summarization' },
      { dimension: 'Stakeholder Sense', weight: 10, description: 'Anticipates buy-in challenges + politics' },
      { dimension: 'Quant Rigor', weight: 10, description: 'Right math + sanity checks' },
      { dimension: 'Synthesis', weight: 5, description: 'Bottom-line first' },
    ],
    frameworks: [
      { name: 'Strategy Diamond', when_to_use: 'Strategy formulation', structure: ['Arenas (where to compete)', 'Vehicles (how to get there)', 'Differentiators', 'Staging', 'Economic logic'] },
      { name: 'Porter 5 Forces', when_to_use: 'Industry attractiveness', structure: ['Buyers', 'Suppliers', 'New entrants', 'Substitutes', 'Rivalry'] },
      { name: 'BCG Matrix', when_to_use: 'Portfolio decisions', structure: ['Stars', 'Cash cows', 'Question marks', 'Dogs'] },
      { name: 'A/B test design', when_to_use: 'Validate change', structure: ['Hypothesis', 'Metric + counter-metric', 'Sample size', 'Duration', 'Decision criteria'] },
    ],
    math: [
      { name: 'Year-over-year growth', formula: '(This year − Last) / Last', mnemonic: 'common reporting metric' },
      { name: 'Cohort retention', formula: 'Users still active in cohort / cohort size', mnemonic: 'D7, M3 typical' },
      { name: 'Statistical significance', formula: 'p < 0.05', mnemonic: 'check before declaring win' },
    ],
    industry_signal: 'company strategy, recent earnings call themes, competitive moves, internal KPIs typical',
    recovery_scripts: [
      'Stepping back — what\'s the underlying business question this is supporting?',
      'Let me check the math — at this scale, [number] feels off; let me re-derive.',
      'Before recommending, the key stakeholders to align are [X, Y]. Are they on board with the framing?',
    ],
    killer_phrases: [
      'The metric we\'re optimizing isn\'t the actual goal — let me reframe.',
      'This decision has a [reversibility / cost-of-mistake] of [low/high] — that determines how much data we need.',
      'I\'d build, measure, learn rather than commit — what\'s the smallest experiment that proves the thesis?',
    ],
  },

  behavioral: {
    key: 'behavioral',
    label: 'Behavioral / Fit (universal)',
    short: 'Behavioral',
    description: 'STAR stories, leadership, drive, growth — applies to every track.',
    rubric: [
      { dimension: 'Story Structure (STAR)', weight: 25, description: 'Situation/Task/Action/Result clearly told' },
      { dimension: 'Specificity', weight: 20, description: 'Concrete numbers + specifics, not generalities' },
      { dimension: 'Self-Awareness', weight: 15, description: 'Honest reflection on what you learned' },
      { dimension: 'Relevance', weight: 15, description: 'Story matches the dimension being asked' },
      { dimension: 'Authenticity', weight: 15, description: 'Sounds like you, not rehearsed' },
      { dimension: 'Impact', weight: 10, description: 'Outcome was meaningful, not trivial' },
    ],
    frameworks: [
      { name: 'STAR', when_to_use: 'Any behavioral question', structure: ['Situation: when/where', 'Task: what was the goal', 'Action: what YOU did', 'Result: outcome + what you learned'] },
      { name: 'McKinsey PEI 2025', when_to_use: 'McKinsey behavioral round', structure: ['Connection (genuine relationship-building)', 'Drive (push past obstacle)', 'Leadership (influence without authority)', 'Growth (learn from setback)'] },
      { name: 'Bain ABCD', when_to_use: 'Bain behavioral', structure: ['Affinity (cultural fit)', 'Brilliance (intellect)', 'Curiosity (learning mindset)', 'Drive (resilience)'] },
    ],
    math: [],
    industry_signal: 'firm-specific behavioral dimensions, recent culture priorities, recruiter focus areas',
    recovery_scripts: [
      'Let me take 10 seconds to pick the right story — I have a few that could work.',
      'I want to be specific — the outcome was [concrete number/result], and what I learned was [insight].',
      'Reflecting honestly, what I\'d do differently is [X], because [reasoning].',
    ],
    killer_phrases: [
      'The hardest part was [X] — most people would have [easy path], but I [different choice] because [reason].',
      'I made a mistake here: [specific mistake]. What I learned: [insight]. How I\'ve applied it since: [example].',
      'The team didn\'t agree with my recommendation initially — here\'s how I built consensus.',
    ],
  },
};

export const TRACK_LIST: Track[] = ['consulting', 'ib_pe_vc', 'pm', 'marketing', 'strategy_bizops', 'behavioral'];
