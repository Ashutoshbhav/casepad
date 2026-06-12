// src/lib/india-reference.ts
//
// India macro + sector NUMBER BANK — verified anchors for grounding guesstimate
// evaluation and ideal-answer generation.
//
// WHY THIS EXISTS: the engine was told to "prefer ₹/lakh/crore and real Indian
// markets" (see ideal-answer-playbooks CROSS_CUTTING) but had NO source of truth,
// so the model invented figures. This module is that source of truth.
//
// PROVENANCE RULE (per the project's no-assumptions mandate): every anchor here
// was WebSearch-verified against a real source on 2026-06-12. Each carries its
// sourceName + sourceUrl + asOf + a confidence flag:
//   - 'verified' = official/primary (MoSPI, RBI, IMF, World Bank, NPCI, SIAM,
//                  IRDAI, AMFI, PLFS, Income-Tax Dept, GSTN) or top-tier press
//                  citing one of those directly.
//   - 'estimate' = best available consultancy/report/survey figure (Bain,
//                  Redseer, Deloitte, IAMAI-Kantar, IBEF…) — ranges are common.
//
// DELIBERATELY ABSENT: NCCS A-E population shares and the Tier-1/2/3/rural
// consumer-spend split. Both are proprietary/paywalled with no credible free
// primary source; per no-assumptions we do NOT launder a cheat-sheet guess into
// "fact". If you ever need them, source them first, then add them here.
//
// This module is PURE + STATIC (no fetch, no LLM, no DB) and the renderer is
// total (never throws) so it is safe to inject anywhere — including the Fortress
// generation paths — as additive context only.

export type AnchorGroup = 'macro' | 'income' | 'digital' | 'sector';
export type AnchorConfidence = 'verified' | 'estimate';

export interface IndiaAnchor {
  key: string;
  label: string;
  value: string;
  unit: string | null;
  asOf: string;
  sourceName: string;
  sourceUrl: string;
  confidence: AnchorConfidence;
  group: AnchorGroup;
  note?: string;
}

// All numbers verified 2026-06-12. Update `asOf` + re-verify before quoting as
// fact in any externally-facing artifact.
export const VERIFIED_ON = '2026-06-12';

export const INDIA_ANCHORS: IndiaAnchor[] = [
  // ── MACRO & DEMOGRAPHICS ────────────────────────────────────────────────
  { key: 'total-population', label: 'Total population', value: '1.46 Billion', unit: 'Billion', asOf: '2025', sourceName: 'UNFPA / UN WPP 2024', sourceUrl: 'https://www.unfpa.org/data/world-population/IN', confidence: 'verified', group: 'macro', note: 'World Bank/UN report ~1.45B for 2024; #1 globally' },
  { key: 'urban-population', label: 'Urban population', value: '~540 Million (36.9%)', unit: 'Billion', asOf: '2025', sourceName: 'UN World Urbanization Prospects', sourceUrl: 'https://population.un.org/wup/', confidence: 'estimate', group: 'macro', note: 'Census overdue, so split is a UN model estimate' },
  { key: 'rural-population', label: 'Rural population', value: '~923 Million (63.1%)', unit: 'Billion', asOf: '2025', sourceName: 'UN World Urbanization Prospects', sourceUrl: 'https://population.un.org/wup/', confidence: 'estimate', group: 'macro' },
  { key: 'total-households', label: 'Total households + avg size', value: '~296 Million HH; 4.4 persons/HH', unit: null, asOf: '2025 / NFHS-5', sourceName: 'MoSPI / NFHS-5', sourceUrl: 'https://www.mospi.gov.in/estimated-number-households-average-household-size-and-sex-ratio-no-female-1000-male-4', confidence: 'estimate', group: 'macro', note: 'Avg size 4.4 (NFHS-5 2019-21); HH count is an NSO-based estimate' },
  { key: 'population-growth-rate', label: 'Population growth rate', value: '0.89%/yr', unit: '%', asOf: '2024', sourceName: 'World Bank', sourceUrl: 'https://data.worldbank.org/indicator/SP.POP.GROW?locations=IN', confidence: 'verified', group: 'macro' },
  { key: 'median-age', label: 'Median age', value: '29.5 years', unit: 'years', asOf: '2025', sourceName: 'UN / Worldometer', sourceUrl: 'https://www.worldometers.info/demographics/india-demographics/', confidence: 'verified', group: 'macro', note: 'Young vs China (~39), USA (~38)' },
  { key: 'working-age-population', label: 'Working-age population (15-64)', value: '68.4% (~1.0 Billion)', unit: '%', asOf: '2025', sourceName: 'World Bank', sourceUrl: 'https://data.worldbank.org/indicator/SP.POP.1564.TO.ZS?locations=IN', confidence: 'verified', group: 'macro' },
  { key: 'age-0-14', label: 'Age 0-14 share', value: '24.2% (~354 Million)', unit: '%', asOf: '2025', sourceName: 'World Bank', sourceUrl: 'https://data.worldbank.org/indicator/SP.POP.0014.TO.ZS?locations=IN', confidence: 'verified', group: 'macro' },
  { key: 'age-60-plus', label: 'Age 60+ share', value: '~11% (~155 Million)', unit: '%', asOf: '2025', sourceName: 'Worldometer / World Bank', sourceUrl: 'https://www.worldometers.info/demographics/india-demographics/', confidence: 'estimate', group: 'macro', note: '65+ firmly 7.4% (World Bank); 60+ interpolated' },
  { key: 'gdp-nominal', label: 'GDP (nominal)', value: '$4.13 Trillion', unit: 'USD', asOf: '2025', sourceName: 'IMF WEO Oct 2025', sourceUrl: 'https://www.imf.org/external/datamapper/NGDPD@WEO/IND', confidence: 'verified', group: 'macro', note: '4th largest economy' },
  { key: 'gdp-ppp', label: 'GDP (PPP)', value: '$17.71 Trillion', unit: 'USD', asOf: '2025', sourceName: 'IMF WEO Oct 2025', sourceUrl: 'https://www.imf.org/external/datamapper/PPPSH@WEO/IND', confidence: 'verified', group: 'macro', note: '3rd largest on PPP' },
  { key: 'gdp-per-capita-nominal', label: 'GDP per capita (nominal)', value: '$2,818', unit: 'USD', asOf: '2025', sourceName: 'IMF WEO Oct 2025', sourceUrl: 'https://www.imf.org/external/datamapper/profile/IND', confidence: 'verified', group: 'macro' },
  { key: 'gdp-per-capita-ppp', label: 'GDP per capita (PPP)', value: '$12,101', unit: 'USD', asOf: '2025', sourceName: 'IMF WEO Oct 2025', sourceUrl: 'https://www.imf.org/external/datamapper/PPPPC@WEO/IND', confidence: 'verified', group: 'macro', note: 'More useful for consumption models' },
  { key: 'real-gdp-growth', label: 'Real GDP growth', value: '6.5%', unit: '%', asOf: 'FY2024-25', sourceName: 'MoSPI / NSO', sourceUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2132688&reg=3&lang=2', confidence: 'verified', group: 'macro', note: 'Nominal growth 9.8%' },
  { key: 'cpi-inflation', label: 'CPI inflation', value: '~3% (full-yr 2025 avg)', unit: '%', asOf: '2025', sourceName: 'MoSPI / PIB', sourceUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2213736&reg=3&lang=1', confidence: 'verified', group: 'macro', note: 'Dec 2025 YoY just 1.33%; below RBI 4% target' },
  { key: 'gdp-sector-split', label: 'GDP sector split (GVA)', value: 'Agri 18% / Industry 27% / Services 55%', unit: '%', asOf: 'FY2024-25', sourceName: 'MoSPI', sourceUrl: 'https://statisticstimes.com/economy/country/india-gdp-sectorwise.php', confidence: 'verified', group: 'macro' },
  { key: 'workforce-in-agriculture', label: 'Workforce in agriculture', value: '46.1%', unit: '%', asOf: 'FY2023-24', sourceName: 'PLFS / Economic Survey', sourceUrl: 'https://mospi.gov.in/sites/default/files/press_release/Press_note_AR_PLFS_2023_24_22092024.pdf', confidence: 'verified', group: 'macro', note: 'But only ~18% of GDP — low productivity' },
  { key: 'private-consumption-pct-gdp', label: 'Private consumption (PFCE) % GDP', value: '61.4%', unit: '%', asOf: 'FY2024-25', sourceName: 'Economic Survey / MoSPI', sourceUrl: 'https://www.mospi.gov.in/134-private-final-consumption-expenditure', confidence: 'verified', group: 'macro', note: 'Key demand driver' },

  // ── INCOME, CONSUMPTION & LABOUR ────────────────────────────────────────
  { key: 'rural-mpce', label: 'Avg rural MPCE (per person/month)', value: '₹4,122', unit: '₹/month', asOf: 'HCES 2023-24', sourceName: 'MoSPI HCES 2023-24', sourceUrl: 'https://www.mospi.gov.in/sites/default/files/press_release/HCES_Press_Note_2023-24_27122024_rev.pdf', confidence: 'verified', group: 'income', note: '×4.4 ≈ ₹18K/household/month' },
  { key: 'urban-mpce', label: 'Avg urban MPCE (per person/month)', value: '₹6,996', unit: '₹/month', asOf: 'HCES 2023-24', sourceName: 'MoSPI HCES 2023-24', sourceUrl: 'https://www.mospi.gov.in/sites/default/files/press_release/HCES_Press_Note_2023-24_27122024_rev.pdf', confidence: 'verified', group: 'income', note: '×4.4 ≈ ₹31K/household/month' },
  { key: 'urban-rural-consumption-gap', label: 'Urban-rural consumption gap', value: 'Urban ~70% higher', unit: '%', asOf: 'HCES 2023-24', sourceName: 'MoSPI HCES 2023-24', sourceUrl: 'https://www.mospi.gov.in/sites/default/files/press_release/HCES_Press_Note_2023-24_27122024_rev.pdf', confidence: 'verified', group: 'income', note: 'Means urban MPCE is ~70% above rural (NOT 70% OF rural); narrowing' },
  { key: 'food-share-rural', label: 'Food share of rural spend', value: '47.0%', unit: '%', asOf: 'HCES 2023-24', sourceName: 'MoSPI HCES Factsheet', sourceUrl: 'https://www.mospi.gov.in/sites/default/files/publication_reports/HCES%20FactSheet%202023-24.pdf', confidence: 'verified', group: 'income', note: "Engel's law: falls as income rises" },
  { key: 'food-share-urban', label: 'Food share of urban spend', value: '39.7%', unit: '%', asOf: 'HCES 2023-24', sourceName: 'MoSPI HCES Factsheet', sourceUrl: 'https://www.mospi.gov.in/sites/default/files/publication_reports/HCES%20FactSheet%202023-24.pdf', confidence: 'verified', group: 'income', note: 'Non-food 60% — the discretionary pool' },
  { key: 'household-saving-rate', label: 'Household saving rate', value: '18.1% gross / 5.1% net financial (of GNDI)', unit: '%', asOf: 'FY2023-24', sourceName: 'RBI Annual Report', sourceUrl: 'https://www.rbi.org.in/Scripts/QuarterlyPublications.aspx?head=Household+Financial+Savings', confidence: 'verified', group: 'income', note: 'National gross savings ~30.7% of GDP' },
  { key: 'unemployment-rate', label: 'Unemployment rate (15+)', value: '3.1% (CY2025); 4.9% (CY2024)', unit: '%', asOf: 'PLFS 2025', sourceName: 'MoSPI PLFS', sourceUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2246009&reg=3&lang=1', confidence: 'verified', group: 'income', note: 'CY2025 uses revised calendar-year methodology' },
  { key: 'lfpr', label: 'Labour force participation (15+)', value: '59.3% (M 79% / F 40%)', unit: '%', asOf: 'PLFS 2025', sourceName: 'MoSPI PLFS', sourceUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2246009&reg=3&lang=1', confidence: 'verified', group: 'income' },
  { key: 'informal-employment-share', label: 'Informal employment share', value: '~82% sector / ~90% employment', unit: '%', asOf: '2022', sourceName: 'ILO–IHD India Employment Report 2024', sourceUrl: 'https://www.ilo.org/sites/default/files/2024-08/India%20Employment%20-%20web_8%20April.pdf', confidence: 'verified', group: 'income', note: 'Formal regular employment only ~9.4%' },
  { key: 'income-tax-filers', label: 'Income-tax return filers', value: '9.19 crore (~92 Million)', unit: 'count', asOf: 'FY2024-25', sourceName: 'Income-Tax Dept', sourceUrl: 'https://www.incometax.gov.in/iec/foportal/statistics-data', confidence: 'verified', group: 'income', note: 'Very low vs population' },
  { key: 'gst-taxpayers', label: 'GST active taxpayers', value: '~1.53 crore (~15 Million)', unit: 'count', asOf: 'Jun 2025', sourceName: 'GSTN / GST Council', sourceUrl: 'https://gstcouncil.gov.in/gst-system-statistics', confidence: 'verified', group: 'income' },
  { key: 'multidimensional-poverty', label: 'Multidimensional poverty (MPI)', value: '11.3%', unit: '%', asOf: '2022-23', sourceName: 'NITI Aayog', sourceUrl: 'https://www.niti.gov.in/sites/default/files/2024-01/MPI-22_NITI-Aayog20254.pdf', confidence: 'verified', group: 'income', note: 'Down from 29.2% in 2013-14' },
  { key: 'extreme-poverty-rate', label: 'Extreme poverty rate', value: '5.3% ($3.00/day) / 2.3% ($2.15/day)', unit: '%', asOf: '2022-23', sourceName: 'World Bank (Jun 2025 lines)', sourceUrl: 'https://www.worldbank.org/en/news/factsheet/2025/06/05/june-2025-update-to-global-poverty-lines', confidence: 'verified', group: 'income', note: 'WB raised the line to $3.00/day (2021 PPP) in Jun 2025' },

  // ── DIGITAL & FINTECH PENETRATION ───────────────────────────────────────
  { key: 'upi-txn-volume-monthly', label: 'UPI transactions/month', value: '~23 Billion', unit: 'Billion', asOf: 'May 2026', sourceName: 'NPCI', sourceUrl: 'https://www.npci.org.in/what-we-do/upi/product-statistics', confidence: 'verified', group: 'digital', note: '~₹30 lakh crore/month; +24% YoY' },
  { key: 'upi-txn-volume-annual', label: 'UPI transactions/year (FY25)', value: '~186 Billion (₹180 lakh crore)', unit: 'Billion', asOf: 'FY2024-25', sourceName: 'RBI Annual Report', sourceUrl: 'https://www.rbi.org.in/Scripts/AnnualReportPublications.aspx', confidence: 'verified', group: 'digital', note: '83.7% of digital payment VOLUME' },
  { key: 'digital-payments-value-annual', label: 'Total digital payments value/yr', value: '~₹2,862 lakh crore', unit: '₹ lakh crore', asOf: 'FY2024-25', sourceName: 'RBI Annual Report', sourceUrl: 'https://www.rbi.org.in/Scripts/AnnualReportPublications.aspx', confidence: 'verified', group: 'digital', note: 'Volume +34.8% YoY' },
  { key: 'smartphone-users', label: 'Smartphone users', value: '~660 Million (→1B by 2026E)', unit: 'Million', asOf: '2024', sourceName: 'Deloitte TMT', sourceUrl: 'https://www2.deloitte.com/in/en/pages/technology-media-and-telecommunications/articles/tmt-predictions.html', confidence: 'estimate', group: 'digital', note: 'Deloitte ~660M actual; 1B is a projection' },
  { key: 'active-internet-users', label: 'Active internet users', value: '~958 Million', unit: 'Million', asOf: '2025', sourceName: 'IAMAI–Kantar', sourceUrl: 'https://www.iamai.in/', confidence: 'estimate', group: 'digital', note: 'Rural = 57% of active users' },
  { key: 'telecom-subscribers', label: 'Wireless (mobile) subscribers', value: '~1,244 Million', unit: 'Million', asOf: 'Dec 2025', sourceName: 'TRAI', sourceUrl: 'https://www.trai.gov.in/release-publication/reports/telecom-subscriptions-reports', confidence: 'verified', group: 'digital' },
  { key: 'credit-cards', label: 'Credit cards in circulation', value: '~115 Million', unit: 'count', asOf: 'Nov 2025', sourceName: 'RBI', sourceUrl: 'https://www.rbi.org.in/Scripts/ATMView.aspx', confidence: 'verified', group: 'digital', note: '~8% penetration — large headroom' },
  { key: 'debit-cards', label: 'Debit cards in circulation', value: '~991 Million', unit: 'count', asOf: 'Dec 2024', sourceName: 'RBI', sourceUrl: 'https://www.rbi.org.in/Scripts/ATMView.aspx', confidence: 'verified', group: 'digital', note: 'Broadly flat over 5 years' },
  { key: 'jan-dhan-accounts', label: 'PMJDY (Jan Dhan) accounts', value: '~562 Million', unit: 'count', asOf: 'Aug 2025', sourceName: 'PIB / DFS', sourceUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2161401&reg=3&lang=2', confidence: 'verified', group: 'digital', note: '~67% rural/semi-urban' },
  { key: 'demat-accounts', label: 'Demat accounts (CDSL+NSDL)', value: '~216 Million', unit: 'count', asOf: 'Dec 2025', sourceName: 'CDSL / NSDL', sourceUrl: 'https://www.cdslindia.com/', confidence: 'verified', group: 'digital', note: 'Crossed 21 crore in Oct 2025' },
  { key: 'mf-aum', label: 'Mutual fund industry AUM', value: '~₹81.6 lakh crore', unit: '₹ lakh crore', asOf: 'May 2026', sourceName: 'AMFI', sourceUrl: 'https://www.amfiindia.com/research-information/amfi-monthly', confidence: 'verified', group: 'digital' },
  { key: 'monthly-sip-inflow', label: 'Monthly SIP inflows', value: '~₹31,000 crore', unit: '₹ crore', asOf: 'May 2026', sourceName: 'AMFI', sourceUrl: 'https://www.amfiindia.com/research-information/amfi-monthly', confidence: 'verified', group: 'digital', note: 'ATH ~₹32,087 cr (Mar 2026)' },
  { key: 'sip-accounts', label: 'Contributing SIP accounts', value: '~96 Million', unit: 'count', asOf: 'May 2026', sourceName: 'AMFI', sourceUrl: 'https://www.amfiindia.com/research-information/amfi-monthly', confidence: 'verified', group: 'digital', note: 'SIP AUM ~₹17 lakh crore' },
  { key: 'insurance-penetration', label: 'Insurance penetration (% GDP)', value: '3.7% (life 2.7% + non-life 1.0%)', unit: '%', asOf: 'FY2024-25', sourceName: 'IRDAI Annual Report', sourceUrl: 'https://irdai.gov.in/annual-reports', confidence: 'verified', group: 'digital', note: 'Density ~$97; below global ~7%' },
  { key: 'health-insurance-coverage', label: 'Health insurance coverage', value: '~55% of population', unit: '%', asOf: '2025', sourceName: 'Secondary analysis / Ayushman Bharat', sourceUrl: 'https://pmjay.gov.in/', confidence: 'estimate', group: 'digital', note: 'Mostly govt schemes (Ayushman 36.9cr+ cards)' },

  // ── SECTOR MARKET SIZES & BENCHMARKS ────────────────────────────────────
  { key: 'ecommerce-gmv', label: 'E-commerce market (GMV)', value: '~$60 Billion', unit: 'USD', asOf: '2024', sourceName: 'Bain–Flipkart', sourceUrl: 'https://www.bain.com/insights/how-india-shops-online-2025/', confidence: 'estimate', group: 'sector', note: '~$65-66B in 2025; ~$170-190B by 2030 (>18% CAGR)' },
  { key: 'quick-commerce-gmv', label: 'Quick commerce market (GMV)', value: '~$6-7 Billion', unit: 'USD', asOf: '2024', sourceName: 'Bain–Flipkart / Redseer', sourceUrl: 'https://www.bain.com/insights/how-india-shops-online-2025/', confidence: 'estimate', group: 'sector', note: '~10% of e-retail GMV; >40% CAGR, $25B+ by 2030' },
  { key: 'online-food-delivery', label: 'Online food delivery market', value: '~$32 Billion', unit: 'USD', asOf: '2024', sourceName: 'Research and Markets', sourceUrl: 'https://www.researchandmarkets.com/', confidence: 'estimate', group: 'sector', note: 'Wide range $32-72B by scope; Swiggy+Zomato >80%' },
  { key: 'saas-market', label: 'India SaaS market', value: '~$25-30 Billion', unit: 'USD', asOf: '2025', sourceName: 'Bain / SaaSBOOMi', sourceUrl: 'https://www.bain.com/', confidence: 'estimate', group: 'sector', note: '~$50B by 2030; 13+ SaaS unicorns' },
  { key: 'total-retail', label: 'Total retail market', value: '~$1.06 Trillion', unit: 'USD', asOf: '2024', sourceName: 'Deloitte–FICCI', sourceUrl: 'https://www.deloitte.com/in/en/about/press-room/india-s-us-1-06-trillion-retail-sector-is-set-to-reach-1-93-trillion-by-2030.html', confidence: 'estimate', group: 'sector', note: '→$1.93T by 2030' },
  { key: 'organised-retail-share', label: 'Organised retail share', value: '~12-15%', unit: '%', asOf: '2024', sourceName: 'Industry estimates', sourceUrl: 'https://www.business-standard.com/industry/news/india-retail-market-trillion-2030-trade-supply-chains-125032700607_1.html', confidence: 'estimate', group: 'sector', note: 'Kirana dominates; →35%+ by 2030' },
  { key: 'fmcg-market', label: 'FMCG market', value: '~$220 Billion', unit: 'USD', asOf: '2025', sourceName: 'IBEF', sourceUrl: 'https://www.ibef.org/industry/fmcg', confidence: 'estimate', group: 'sector', note: 'Range $211-288B; rural ~45% of sales' },
  { key: 'ride-hailing-market', label: 'Ride-hailing market', value: '~$2.8 Billion', unit: 'USD', asOf: '2025', sourceName: 'Mordor / Knowledge Sourcing', sourceUrl: 'https://www.knowledge-sourcing.com/report/india-e-hailing-market', confidence: 'estimate', group: 'sector', note: '→~$4.9B by 2030 (12% CAGR); highly scope-dependent' },
  { key: 'ev-penetration-2w', label: 'EV penetration — 2-wheeler', value: '~6.1% of 2W sales', unit: '%', asOf: 'FY2025', sourceName: 'JMK Research', sourceUrl: 'https://jmkresearch.com/', confidence: 'estimate', group: 'sector', note: 'Target ~30% by 2030' },
  { key: 'ev-penetration-4w', label: 'EV penetration — 4-wheeler', value: '~2.6% of car sales', unit: '%', asOf: 'FY2025', sourceName: 'JMK Research', sourceUrl: 'https://jmkresearch.com/', confidence: 'estimate', group: 'sector', note: 'Overall EV penetration ~7.7% (incl 2W/3W)' },
  { key: 'logistics-market', label: 'Logistics market', value: '~$228 Billion', unit: 'USD', asOf: '2024', sourceName: 'Grand View Research', sourceUrl: 'https://www.grandviewresearch.com/horizon/outlook/logistics-market/india', confidence: 'estimate', group: 'sector', note: 'Logistics cost ~8% of GDP (global ~4-5%)' },
  { key: 'healthcare-market', label: 'Healthcare market', value: '~$638 Billion (high-end projection)', unit: 'USD', asOf: '2025', sourceName: 'IBEF / Bajaj Finserv AMC', sourceUrl: 'https://www.ibef.org/industry/healthcare-india', confidence: 'estimate', group: 'sector', note: 'Widely cited but considered optimistic; treat as high end' },
  { key: 'pharma-market', label: 'Pharma market (domestic)', value: '~$60 Billion', unit: 'USD', asOf: '2024', sourceName: 'IBEF', sourceUrl: 'https://www.ibef.org/industry/indian-pharmaceuticals-industry-analysis-presentation', confidence: 'estimate', group: 'sector', note: '3rd largest by volume; →~$130B by 2030' },
  { key: 'edtech-market', label: 'Edtech market', value: '~$6-7 Billion', unit: 'USD', asOf: '2024', sourceName: 'Market Research Future', sourceUrl: 'https://www.marketresearchfuture.com/reports/india-edtech-market-46222', confidence: 'estimate', group: 'sector', note: 'Post-correction from $30B peak; range $2.8-10.5B' },
  { key: 'ott-streaming-market', label: 'OTT / streaming market', value: '~$4 Billion', unit: 'USD', asOf: '2024', sourceName: 'Media Partners Asia / MRFR', sourceUrl: 'https://www.marketresearchfuture.com/reports/india-ott-market-12696', confidence: 'estimate', group: 'sector', note: '~547M streaming users; ~100M paid subs' },
  { key: 'two-wheeler-unit-sales', label: 'Two-wheeler unit sales/yr', value: '~19.6 Million units', unit: 'count', asOf: 'FY2025', sourceName: 'SIAM', sourceUrl: 'https://www.siam.in/', confidence: 'verified', group: 'sector', note: 'Largest 2W market in the world' },
  { key: 'passenger-vehicle-unit-sales', label: 'Passenger vehicle (car) sales/yr', value: '~4.3 Million units', unit: 'count', asOf: 'FY2025', sourceName: 'SIAM', sourceUrl: 'https://www.siam.in/', confidence: 'verified', group: 'sector', note: 'Record; UVs ~65% of PV sales' },
  { key: 'marketplace-take-rates', label: 'Typical marketplace take rates', value: 'Food ~18-25% · E-comm ~5-20% · Ride-hailing ~20-25%', unit: '%', asOf: '2024-26', sourceName: 'Industry / trade press', sourceUrl: 'https://www.business-standard.com/companies/news/rapido-food-delivery-entry-low-restaurant-commission-zomato-swiggy-uber-ola-125060900238_1.html', confidence: 'estimate', group: 'sector', note: 'Food all-in (fees+GST) can reach 25-35%' },
];

export const INDIA_ANCHOR_COUNT = INDIA_ANCHORS.length;

/** Anchors in a given group. Pure + total. */
export function anchorsByGroup(group: AnchorGroup): IndiaAnchor[] {
  return INDIA_ANCHORS.filter((a) => a.group === group);
}

const GROUP_TITLES: Record<AnchorGroup, string> = {
  macro: 'MACRO & DEMOGRAPHICS',
  income: 'INCOME, CONSUMPTION & LABOUR',
  digital: 'DIGITAL & FINTECH PENETRATION',
  sector: 'SECTOR MARKET SIZES & BENCHMARKS',
};

/**
 * Compact prompt block of verified India anchors, for injection into
 * ideal-answer / crammer generation (NOT the live chat loop — token budget).
 * Total + fail-safe: returns '' if given an empty/garbage group filter.
 *
 * @param groups optional subset of groups to include (default: all).
 */
export function renderIndiaReferenceBlock(groups?: AnchorGroup[]): string {
  const wanted: AnchorGroup[] =
    Array.isArray(groups) && groups.length
      ? (groups.filter((g) => g in GROUP_TITLES) as AnchorGroup[])
      : (['macro', 'income', 'digital', 'sector'] as AnchorGroup[]);
  if (!wanted.length) return '';

  const lines: string[] = [
    'INDIA NUMBER BANK (verified anchors — prefer these over inventing figures).',
    `Provenance: each figure was source-checked on ${VERIFIED_ON}. Tags: [V]=verified primary source, [E]=estimate/report figure. When you cite an [E] figure, label it ESTIMATE; never state it as hard fact. NCCS income-class shares and tier-wise spend splits are deliberately ABSENT (no credible free source) — do NOT fabricate them.`,
  ];

  for (const g of wanted) {
    const rows = anchorsByGroup(g);
    if (!rows.length) continue;
    lines.push(`\n[${GROUP_TITLES[g]}]`);
    for (const a of rows) {
      const tag = a.confidence === 'verified' ? 'V' : 'E';
      const note = a.note ? ` — ${a.note}` : '';
      lines.push(`- ${a.label}: ${a.value} (${a.asOf}, ${a.sourceName}) [${tag}]${note}`);
    }
  }
  return lines.join('\n');
}
