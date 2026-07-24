// Ideal-answer playbooks (Wave 2, 2026-06-03).
//
// Distilled from a 21-agent research fan-out grounded in real-interview
// transcripts (CaseCoach / RocketBlocks / Exponent / Meta mocks) + verified
// 2026 prep sources. Full provenance: docs/research/IDEAL-ANSWER-PLAYBOOKS.md.
//
// These power generateIdealWalkthrough(): for a given case type we inject the
// canonical framework + the anatomy of a top-percentile answer + spike moves +
// common mistakes + a scorable checklist, plus an always-on CROSS_CUTTING block
// (the L0→L4 depth model + anti-slop rules + India grounding). This is what
// turns the "how a top candidate would solve this" section from a textbook
// skeleton into a genuinely expert answer.

export interface Playbook {
  framework: string;
  anatomy: string[];
  spikeMoves: string[];
  commonMistakes: string[];
  checklist: string[];
}

// Always injected, regardless of case type. The expert-vs-textbook backbone.
export const CROSS_CUTTING = `EXPERT-ANSWER PRINCIPLES (apply to every case):
- Answer-depth model (coarse→fine; distinct from the L0→L4 structural zoom ladder used in live solving): one-line recommendation stated FIRST → the 2-4 tailored drivers (a custom tree, NOT a named off-the-shelf framework) → each driver pinned to a number/named company/mechanism → risks & the case-changing "so what" → concrete sequenced next steps + what to measure. A textbook answer dies at the drivers; an expert answer reaches grounded evidence and next steps.
- Answer-first / top-down always: recommendation, THEN support. Never make the reader wait for the conclusion.
- Hypothesis-driven: commit to an early directional hypothesis, state the test that would KILL it, and update out loud when data contradicts.
- Quant: state the equation before computing; round cleanly; sanity-check the result a second way; then translate the number into its business meaning.
- India grounding (this is an India-focused B-school tool): prefer ₹/lakh/crore, real Indian companies/markets, and SEBI/RBI where relevant.
- ANTI-SLOP (hard bans): no ungrounded "synergy / leverage / holistic / robust / it's not just X it's Y"; no "pros and cons" / "it depends" hedging with no position; no "they should consider". EVERY number is sourced or explicitly labeled ESTIMATE — never state an unsourced figure as fact. Prefer a named company + real figure over "a leading player".`;

export const PLAYBOOKS: Record<string, Playbook> = {
  profitability: {
    framework: 'Profit = Revenue (Price × Volume) − Cost (Fixed + Variable), as a tailored MECE tree with THIS business\'s named drivers. NOT Porter\'s 5 Forces or market-attractiveness.',
    anatomy: [
      'Clarify the metric (absolute profit vs margin% vs ROI) + baseline + timeframe.',
      'Get business context before structuring, so the tree is customized not recited.',
      'Quantify the revenue-vs-cost split EARLY and attack the bigger driver first (Pareto: "≈80% is a revenue problem").',
      'Segment the offending branch (product/geo/customer/channel) until one segment explains most of the gap.',
      'Distinguish price vs volume vs MIX SHIFT (revenue up but margin down = mix).',
      'Check external context (new entrant, input-cost spike, demand shift), not just internal levers.',
      'Synthesize top-down: answer → 2-3 reasons → short- + long-term actions → next step.',
    ],
    spikeMoves: [
      'Convert the problem into an "80% revenue / 20% cost" triage in the first 60 seconds.',
      'Name MIX SHIFT explicitly when revenue rises but margin falls — most candidates only test price and volume.',
      'Combine data points across the case rather than reading each in isolation.',
    ],
    commonMistakes: [
      'Reciting a generic Profit=R−C tree with no company-specific drivers.',
      'Not defining the metric/baseline; solving for absolute profit when margin% is the ask.',
      'Failing to quantify the revenue-vs-cost split first, then spreading time evenly.',
      'Staying at the aggregate level instead of segmenting to the root cause.',
    ],
    checklist: [
      'Metric defined (abs/margin/ROI) + baseline + timeframe.',
      'Tree customized with this business\'s named drivers.',
      'Revenue-vs-cost split quantified; bigger driver attacked first.',
      'Offending branch segmented to the causal segment.',
      'Price vs volume vs mix-shift distinguished.',
      'External context checked.',
      'Top-down recommendation with short/long-term actions + next step.',
    ],
  },
  market_entry: {
    framework: 'Should we enter? (market attractiveness + objective fit) → Can we enter? (competition + our capability/right-to-win) → How? (build/buy/partner + economics & risks). Gate each phase on the prior.',
    anatomy: [
      'Confirm the objective AND decision criterion (hurdle rate, timeframe) before structuring.',
      'Size the market (state method) + growth + incumbent margins.',
      'Back-solve the IMPLIED SHARE needed to hit the goal and reality-check it vs incumbents.',
      'Assess our right-to-win + the competitor\'s likely retaliation.',
      'Compute profit/breakeven tied to the goal.',
      'Choose entry mode justified by the binding constraint + speed-to-market.',
      'Answer-first recommendation → reasons → risks → next steps.',
    ],
    spikeMoves: [
      'Gate the structure on the objective ("if the goal is a strategic foothold not 3-yr profit, my entry bar changes").',
      'Quantify the implied share and judge plausibility — turns a sizing into a go/no-go argument.',
      'Let the binding constraint pick the entry mode ("distribution is the bottleneck, so partner, don\'t build").',
    ],
    commonMistakes: [
      'Naming a template (4 Cs / Porter) instead of a tailored structure.',
      'Boiling the ocean on attractiveness and never reaching economics or a recommendation.',
      'Sizing the market but never converting to a decision (implied-share/breakeven).',
      'Recommending "enter" with no entry mode, timing, or investment.',
    ],
    checklist: [
      'Objective + decision criterion confirmed first.',
      'Market sized (method stated) + growth + margins.',
      'Implied share back-solved and reality-checked.',
      'Right-to-win + competitor reaction addressed.',
      'Profit/breakeven computed.',
      'Entry mode chosen and justified.',
      'Answer-first recommendation + risks + next steps.',
    ],
  },
  pricing: {
    framework: 'Three-lens corridor: Cost floor → Competitor reference range → Value ceiling (WTP), chosen against an explicit objective. Lead with VALUE, use cost only as a floor.',
    anatomy: [
      'Clarify objective (profit/share/cash) + new price vs change.',
      'Set the cost floor (label it as a floor, not the answer).',
      'Build the value ceiling: customer\'s next-best alternative + quantified differentiation value = WTP.',
      'Overlay the competitor range as a sanity check, not the driver.',
      'Pick one price in the corridor; state the % of value captured (visible customer ROI).',
      'For a price CHANGE, compute breakeven volume loss / elasticity before recommending.',
      'Layer segmentation + competitor reaction; recommend one price + the trade-off.',
    ],
    spikeMoves: [
      'Quantify the next-best alternative, then express price as "% of value captured" (~30-50%).',
      'For any increase, compute the breakeven volume loss up front.',
      'Segment WTP and propose tiered/versioned pricing.',
    ],
    commonMistakes: [
      'Anchoring on cost first, dragging price to thin margins.',
      '"Price on value" hand-wave with no quantified customer benefit.',
      'Me-too competitor pricing / price-war risk.',
      'Recommending a change with no elasticity/breakeven check.',
    ],
    checklist: [
      'Objective stated; new-vs-change identified.',
      'Cost floor set and labeled.',
      'Next-best alternative + differentiation value → WTP ceiling.',
      'Competitor range as sanity check.',
      'Single price recommended with % value captured.',
      'Breakeven/elasticity computed for a change.',
      'Segmentation + competitor reaction addressed.',
    ],
  },
  mna: {
    framework: 'Standalone target value → Synergies (revenue + cost) NET of integration cost → Feasibility/risk → Price & recommendation. The question is: does combined value exceed standalone + the premium paid?',
    anatomy: [
      'Pin the acquisition objective + scope (binary vs vs-alternatives) before structuring.',
      'Test standalone value first (does the target win in a growing market?); stress-test with implied-share math.',
      'Quantify cost synergies (overlap × reduction) and revenue synergies WITH a realization haircut (~40-50%).',
      'Subtract one-time integration cost (~1-2× annual synergy) → NET synergies.',
      'Separate deal-killers (antitrust) from price-adjusters (lawsuit).',
      'State a max price / payback (target 3-5 yrs), then answer-first synthesis.',
    ],
    spikeMoves: [
      'Implied-share sanity check on the growth thesis.',
      'Unit-economics clash test (acquirer vs target AOV/transaction-cost/margin) to confirm or kill cross-sell.',
      '"Walk away" / counter-lower as the strong answer when synergies don\'t cover the premium.',
    ],
    commonMistakes: [
      'Defaulting to "acquire" without testing build/partner/no-deal.',
      'Vague synergies with no $ estimate or realization haircut.',
      'Counting gross synergies; ignoring integration cost.',
      'Recommending with no price ceiling/payback; confusing a good company with a good deal.',
    ],
    checklist: [
      'Objective + scope clarified.',
      'Standalone value = market attractiveness × right-to-win.',
      'Cost synergies quantified (overlap × reduction).',
      'Revenue synergies haircut applied.',
      'Integration cost subtracted → net synergies.',
      'Max price / payback stated.',
      'Risks named; answer-first synthesis.',
    ],
  },
  operations: {
    framework: 'Metric → Process map (stages with capacity each) → Bottleneck (demand vs capacity) → People/Process/Tech root cause ON the constraint → prioritized fix → quantified impact. System throughput = the slowest step.',
    anatomy: [
      'Lock the metric (units/day, cost/order, defects/M) + the numeric gap.',
      'Map end-to-end as MECE sequential stages with a capacity at each.',
      'Find the constraint quantitatively (utilization ~100%, queue forms).',
      'Run PPT root-cause on the bottleneck only, not every step.',
      'Quantify the lever (relieve constraint by X → +X throughput → ₹); show non-constraints yield nothing.',
      'Name the NEXT bottleneck the fix exposes; recommend + risk + next step.',
    ],
    spikeMoves: [
      'Pre-empt the moving bottleneck (name the next binding step + new ceiling).',
      'Reject the obvious-but-wrong lever aloud ("speeding up billing adds zero throughput — it isn\'t the constraint").',
      'Use effective (not nameplate) capacity — account for downtime/changeovers/yield.',
    ],
    commonMistakes: [
      'Optimizing a non-constraint (zero throughput gain).',
      'Jumping to PPT brainstorm before locating the constraint.',
      'Forgetting the bottleneck moves after a fix.',
      'No number on the recommendation.',
    ],
    checklist: [
      'Metric + numeric gap stated.',
      'Process mapped as stages with capacity.',
      'Constraint identified via demand-vs-capacity.',
      'Throughput = bottleneck capacity (not an average).',
      'PPT root-cause on the constraint.',
      'Lever quantified (Δthroughput → ₹).',
      'Next bottleneck named; recommendation + next step.',
    ],
  },
  estimation: {
    framework: 'Build the equation TREE first (top-down Population × Penetration × Usage × Price, and/or bottom-up Unit × Frequency × Scale), THEN populate assumptions, THEN calculate, THEN sanity-check. No single right number — score the defensible path.',
    anatomy: [
      'Clarify scope: geography, unit, time window, counting rules — always, even if it looks obvious.',
      'Choose top-down (demand-constrained) vs bottom-up (supply/capacity-constrained) and say why.',
      'Segment only where behavior genuinely differs (MECE).',
      'Separate structure → assumptions → calculation; lay the tree with no numbers first.',
      'Use round, anchorable numbers; one calculation pass at the end; narrate aloud.',
      'Sanity-check against a known anchor; for supply-side, apply a utilization/occupancy rate.',
      'State a RANGE + the "so what" (what decision the number informs).',
    ],
    spikeMoves: [
      'Offer two approaches, name your pick, then triangulate — if both land in the same order of magnitude, confidence is high.',
      'Apply an occupancy/utilization adjustment on supply-side sizing (a driver/gas-pump is never 100% busy).',
      'Pre-mortem: when pushed "you\'re off by 5×", isolate WHICH assumption can physically move that far.',
    ],
    commonMistakes: [
      'Calculating before structuring (linear, undebatable).',
      'Not clarifying scope → solving the wrong question.',
      'False precision (23M instead of ~20M).',
      'Skipping the sanity-check / order-of-magnitude slip.',
      'Forgetting utilization on supply-side; over-segmenting.',
    ],
    checklist: [
      'Scope clarified (geo/unit/time/counting).',
      'Top-down vs bottom-up chosen with a reason.',
      'Equation tree built before numbers.',
      'Rounded numbers; arithmetic narrated.',
      'Utilization applied on supply-side.',
      'Sanity-checked vs an anchor; triangulated.',
      'Answer given as a range + the "so what".',
    ],
  },
  growth_metrics: {
    framework: 'A DIAGNOSTIC (debugging) tree, not a list. Is it REAL (logging/definition)? → INTERNAL (release/ranking/bug) vs EXTERNAL (competitor/demand) vs ENVIRONMENT (OS/outage) — then cross-cut EVERY branch by segment (new vs existing, platform, geo, surface, supply vs demand, time).',
    anatomy: [
      'Clarify the exact metric, surface, time window, and SHAPE (cliff = release/bug; slope = demand/competition).',
      'Rule out measurement first (logging/definition/pipeline change).',
      'Hypothesize in MECE buckets (internal/external/environment) out loud.',
      'Isolate via segmentation; narrate interim conclusions so the funnel visibly tightens.',
      'On two-sided products, check the SUPPLY side (creators/sellers), not just consumers.',
      'State the lead hypothesis + the one decisive check; recommend + the metric that confirms the fix.',
    ],
    spikeMoves: [
      'Map the drop\'s shape (cliff vs slope) to a cause class early.',
      'Split supply vs demand on two-sided products.',
      'Quantify the bridge — confirm the culprit segment is big enough to move the aggregate.',
    ],
    commonMistakes: [
      'Diagnosing before clarifying the metric/window.',
      'Skipping the measurement check.',
      'Listing causes instead of a MECE tree.',
      'Never segmenting; reasoning on the global average.',
      'Jumping to solutions before isolating root cause.',
    ],
    checklist: [
      'Metric, surface, window, and shape clarified.',
      'Measurement/logging ruled out first.',
      'MECE buckets (internal/external/environment) stated.',
      'Segmented (new/existing, platform, geo, surface).',
      'Supply side checked on two-sided products.',
      'Lead hypothesis + decisive confirming check.',
      'Root cause + action + the metric proving the fix.',
    ],
  },
  product_design: {
    framework: 'Goal → list 3+ user segments → COMMIT to one → that persona\'s pains (severity × frequency) → 3 solution ideas → pick one → prioritize into an MVP (impact vs effort) → success metric + a counter-metric → trade-offs. There is no single right answer — score the reasoning + user empathy.',
    anatomy: [
      'Restate the goal + tie to a real business/mission outcome.',
      'Name 3+ segments, then explicitly commit to ONE (highest-leverage move).',
      'Make the persona specific & situated (name + context + the moment the pain bites).',
      'Pick the sharpest pain; brainstorm 3 ideas; choose one tied back to the pain + goal.',
      'Prioritize into an explicit MVP with a visible lens.',
      'Define a North Star metric + at least one guardrail/counter-metric.',
      'Name a trade-off/risk; recap goal→persona→pain→solution→metric.',
    ],
    spikeMoves: [
      'Verbalize the trade-off of narrowing ("I\'ll pick one and here\'s why") instead of silently choosing.',
      'Name a counter-metric/guardrail — almost no candidates do.',
      'One vivid moment of the pain proves empathy beyond a demographic label.',
    ],
    commonMistakes: [
      'Refusing to pick one segment (designing for everyone).',
      'Generic persona (age/income bracket, no context).',
      'Jumping to a solution before goal/user/pain.',
      'Feature laundry list with no prioritization; no metrics or only vanity metrics.',
      'Announcing the framework ("using CIRCLES…") and reciting mechanically.',
    ],
    checklist: [
      'Goal restated + tied to a business outcome.',
      '3+ segments named, ONE committed to.',
      'Specific situated persona.',
      'Sharpest pain chosen; 3 ideas → 1 justified.',
      'Explicit MVP via impact/effort.',
      'North Star + counter-metric.',
      'Trade-off named; tight recap.',
    ],
  },
  behavioral: {
    framework: 'One real high-stakes story in SCORE/STAR: Situation+Task tight (~20%) → your individual ACTION in first person (~60-80%) → quantified Result + one honest reflection. For McKinsey PEI, target ONE dimension (Connection/Drive/Leadership/Growth) and hold depth in reserve for the 8-15 min of follow-ups.',
    anatomy: [
      'Pick a real story with genuine tension centered on ONE decision moment.',
      'Set stakes fast with named specifics (people, size, ₹/number at risk).',
      'Stay in "I" + concrete verbs; isolate YOUR contribution from the team\'s.',
      'Frame the obstacle as yours to resolve, not someone else\'s failure.',
      'Close quantified + one specific (non-clichéd) learning.',
      'Survive the drill: answer "what exactly did YOU do / why not the alternative / how did you feel" with verbatim, non-rehearsed detail.',
    ],
    spikeMoves: [
      'Pre-write the follow-up layer (the answers to "what exactly did you do"), not just the 2-min narration.',
      'Quantify the counterfactual ("without my action, X would have happened") to isolate your contribution.',
      'Bring genuine emotion to the conflict beat — signals a lived, not manufactured, story.',
    ],
    commonMistakes: [
      '"We" language that buries the individual contribution (the #1 kill).',
      'Narrating the whole project instead of the one decision moment.',
      'Vague/unquantified outcome; stale story (>5 yrs).',
      'Framing the obstacle as someone else\'s fault; no reflection or a clichéd one.',
    ],
    checklist: [
      'Real story, one decision moment, genuine stakes.',
      'Situation/Task tight (~20%); stakes named.',
      'Action is the bulk, first-person, contribution isolated.',
      'Quantified result (or hard qualitative proxy).',
      'One specific learning.',
      'Survives "what did YOU do / why not the alternative" probes.',
    ],
  },
  marketing: {
    framework: '5C (Company/Customers/Competitors/Collaborators/Context) → STP (segment, target, position) → 4P (Product/Price/Place/Promotion). Every 4P move traces to a chosen segment + positioning. Show unit economics (CAC, LTV, LTV:CAC ≥3:1, payback, ROAS).',
    anatomy: [
      'Restate the objective as a metric (e.g. +20% revenue = X customers at CAC ≤ Y).',
      'State the 5C→STP→4P spine; ask one path-changing clarifying question.',
      'Use only the decision-relevant Cs.',
      'Score segments on attractiveness × ability-to-win; pick one, say what you\'re NOT targeting.',
      'Write one positioning sentence (for [target] who [need], [brand] is the [frame] that [POD], because [RTB]).',
      'Derive the 4Ps from positioning; quantify the funnel (CAC/LTV/payback).',
      'Recommend + risk + first 30/90-day action.',
    ],
    spikeMoves: [
      'Name the trade-off you reject ("won\'t chase casual buyers — 1.2-order repeat makes CAC unrecoverable").',
      'Tie one P to the POD explicitly (discount-led would undercut a clean-ingredient claim).',
      'Pressure-test LTV with retention/gross-margin, not top-line revenue.',
    ],
    commonMistakes: [
      'Jumping to the 4Ps / "run more ads" before segmenting.',
      'Touring all 5Cs/4Ps with no point of view.',
      'Segmenting without scoring/choosing.',
      'Positioning as a slogan with no reason-to-believe; fabricated/top-line LTV.',
    ],
    checklist: [
      'Objective as a metric.',
      '5C→STP→4P spine + one clarifying question.',
      'Segments scored; one chosen, others rejected.',
      'One positioning sentence with RTB.',
      'Each P traceable to positioning.',
      'Unit economics shown (CAC/LTV/payback, labeled ESTIMATE).',
      'Recommendation + risk + leading indicator.',
    ],
  },
  ib_technical: {
    framework: 'Lead with the 30-second skeleton then stop for follow-ups. Pair cash-flow type with the right discount rate (unlevered FCF ↔ WACC → Enterprise Value; levered ↔ cost of equity → Equity Value). Bridge EV ↔ Equity Value explicitly. Anchor accounting to the identity (the 3 statements must re-balance).',
    anatomy: [
      'Open with a one-line thesis/output before steps.',
      'DCF: project UFCF → WACC (CAPM) → terminal value (flag it\'s 60-80% of value, g < WACC, g≈2-3%) → discount → EV → bridge to equity → per share.',
      '3-statement linkage: apply the tax shield; confirm the balance sheet re-balances (both sides move equally).',
      'LBO: Sources&Uses → entry equity → project levered FCF/debt paydown → exit equity → IRR & MOIC.',
      'State assumptions (tax rate, horizon, terminal method) aloud.',
    ],
    spikeMoves: [
      'Flag terminal-value dominance and offer to sensitize it unprompted.',
      'Volunteer the levered/unlevered ↔ discount-rate pairing as a rule.',
      'Use the financing-invariance insight (capital structure doesn\'t change EV).',
    ],
    commonMistakes: [
      'Discounting levered FCF at WACC (or unlevered at cost of equity) — canonical disqualifier.',
      'Terminal growth ≥ WACC or > long-run GDP.',
      'Forgetting the EV→Equity bridge.',
      'Saying net income changes by the full pre-tax amount (ignoring the tax shield).',
      '3-statement linkage that doesn\'t re-balance.',
    ],
    checklist: [
      'One-line thesis first.',
      'Cash-flow type paired with correct discount rate.',
      'Terminal value method + g<WACC; flagged as most of value.',
      'EV→Equity bridge in the right direction.',
      'Tax shield applied; balance sheet balances.',
      'LBO laid out S&U → FCF/paydown → IRR/MOIC.',
      'Assumptions stated; concise, expand on follow-up.',
    ],
  },
};

// Render the playbook block for a given case type. Falls back to cross-cutting
// only for unknown types. Kept compact for prompt-token economy.
export function renderPlaybook(caseType: string): string {
  const p = PLAYBOOKS[caseType];
  if (!p) return `TOP-CANDIDATE STANDARD:\n${CROSS_CUTTING}`;
  const list = (arr: string[]) => arr.map((x) => `  - ${x}`).join('\n');
  return `TOP-CANDIDATE PLAYBOOK for a "${caseType}" case (match this quality):
FRAMEWORK: ${p.framework}
ANATOMY OF A TOP ANSWER:
${list(p.anatomy)}
SPIKE MOVES (good→great):
${list(p.spikeMoves)}
AVOID (common mistakes):
${list(p.commonMistakes)}
SELF-CHECK before finalizing:
${list(p.checklist)}

${CROSS_CUTTING}`;
}
