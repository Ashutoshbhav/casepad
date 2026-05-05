// Design Lab v2 — token bundles for the 3 full-page treatments.
//
// Each treatment is a real scrollable experience at its own route. Tokens are
// applied as inline CSS custom properties at each route's root container so
// none of them inherits the global "War Room" Tailwind theme.
//
// Sample case titles and score numbers below are intentionally drawn from real
// CasePad cases (or plausible real cases). NO fabricated stats — see project
// memory: feedback_no_assumptions.

export type TreatmentId =
  | 'boardroom-brass'
  | 'liquid-tutor'
  | 'casebook-manuscript';

export type TreatmentTokens = {
  id: TreatmentId;
  name: string;
  vibe: string;
  bg: string;
  elevated: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentInk: string; // text on accent button
  accentGlow?: string;
  border: string;
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
};

export const TREATMENTS: Record<TreatmentId, TreatmentTokens> = {
  'boardroom-brass': {
    id: 'boardroom-brass',
    name: 'Boardroom Brass',
    vibe: "A real Mumbai partner's cabin at 9pm. Editorial gravitas with brass-rule accents.",
    bg: '#0B1220',
    elevated: '#111A2E',
    textPrimary: '#F5F1E8',
    textSecondary: '#9AA3B2',
    accent: '#B68A4C',
    accentInk: '#0B1220',
    border: '#1F2A44',
    fontDisplay: '"Fraunces", Georgia, serif',
    fontBody: '"Inter Tight", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
  },
  'liquid-tutor': {
    id: 'liquid-tutor',
    name: 'Liquid Tutor',
    vibe: "Ash isn't a face — he's a presence. Anthropic palette: warm cream + coral.",
    bg: '#faf9f5',
    elevated: '#ffffff',
    textPrimary: '#141413',
    textSecondary: '#8a8985',
    accent: '#d97757',
    accentInk: '#ffffff',
    accentGlow: 'rgba(217, 119, 87, 0.18)',
    border: '#e8e6dc',
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontBody: '"Geist", system-ui, sans-serif',
    fontMono: '"Geist Mono", ui-monospace, monospace',
  },
  'casebook-manuscript': {
    id: 'casebook-manuscript',
    name: 'Casebook Manuscript',
    vibe: 'A Harvard casebook turned interactive. Editorial paper, but type kicks like Lusion.',
    bg: '#F4EFE6',
    elevated: '#FBF7EF',
    textPrimary: '#2A2417',
    textSecondary: '#6B604E',
    accent: '#7A2E2E',
    accentInk: '#FBF7EF',
    border: '#D9CFB9',
    fontDisplay: '"Newsreader", Georgia, serif',
    fontBody: '"Source Serif 4", Georgia, serif',
    fontMono: '"IBM Plex Mono", ui-monospace, monospace',
  },
};

// Liquid Tutor palette variants — flip between Claude Light (default — Anthropic's
// iconic warm cream + coral), Claude Dark (Anthropic dark mode), and the original
// sand exploration. Verified palette: https://www.loftlyy.com/en/anthropic
// (Anthropic Light #faf9f5, Dark #141413, Mid Gray #b0aea5, Light Gray #e8e6dc,
// Orange #d97757).

export type LiquidTutorVariantId = 'claude-light' | 'claude-dark' | 'original-sand';

export const LIQUID_TUTOR_VARIANTS: Record<LiquidTutorVariantId, TreatmentTokens> = {
  'claude-light': {
    id: 'liquid-tutor',
    name: 'Claude Light',
    vibe: "Anthropic's iconic warm cream + coral. Calm, distinctive in category.",
    bg: '#faf9f5',
    elevated: '#ffffff',
    textPrimary: '#141413',
    textSecondary: '#8a8985',
    accent: '#d97757',
    accentInk: '#ffffff',
    accentGlow: 'rgba(217, 119, 87, 0.18)',
    border: '#e8e6dc',
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontBody: '"Geist", system-ui, sans-serif',
    fontMono: '"Geist Mono", ui-monospace, monospace',
  },
  'claude-dark': {
    id: 'liquid-tutor',
    name: 'Claude Dark',
    vibe: "Anthropic dark mode. Coral on warm-black.",
    bg: '#141413',
    elevated: '#1f1e1c',
    textPrimary: '#faf9f5',
    textSecondary: '#b0aea5',
    accent: '#d97757',
    accentInk: '#141413',
    accentGlow: 'rgba(217, 119, 87, 0.22)',
    border: '#2a2826',
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontBody: '"Geist", system-ui, sans-serif',
    fontMono: '"Geist Mono", ui-monospace, monospace',
  },
  'original-sand': {
    id: 'liquid-tutor',
    name: 'Original Sand',
    vibe: 'The first exploration — deep ink + warm sand. For comparison.',
    bg: '#0F0E14',
    elevated: '#1A1822',
    textPrimary: '#F2EEE7',
    textSecondary: '#8A8593',
    accent: '#E8C9A0',
    accentInk: '#0F0E14',
    accentGlow: 'rgba(232, 201, 160, 0.3)',
    border: '#2A2630',
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontBody: '"Geist", system-ui, sans-serif',
    fontMono: '"Geist Mono", ui-monospace, monospace',
  },
};

// Real-ish case titles — drawn from the existing CasePad DB sample set.
export const SAMPLE_CASES = [
  {
    title: 'Estimating Instagram Photo Uploads',
    school: 'HBS',
    year: 2019,
    type: 'Market Sizing',
    blurb:
      'A guesstimate prompt — defend your number with a tree, not a guess.',
  },
  {
    title: 'DigiBooks Tablet Launch',
    school: 'IVEY',
    year: 2021,
    type: 'Market Entry',
    blurb:
      'Should DigiBooks ship its consumer tablet into a saturated category?',
  },
  {
    title: 'Precious Metals South America Expansion',
    school: 'DARDEN',
    year: 2018,
    type: 'Profitability',
    blurb:
      'Margins compressing in core LATAM markets — diagnose, then prescribe.',
  },
] as const;

export const SAMPLE_DEBRIEF_SCORE = 67;
