// CaseVisual — a designed, per-case-type placard backdrop. Replaces the stock
// photo on case cards / hero / solve header.
//
// WHY (decided 2026-06-02): B-school case titles ("IT Services", "Customer
// Value Proposition") are abstract — stock-photo search returned irrelevant
// junk (a salad for a LinkedIn case, a muscle car for an IT case). A designed
// type-based visual is never wrong, never random, and reads premium. Each
// case_type gets a deep cinematic gradient (Superhuman anchor: warm focused
// cockpit) + a quiet geometric motif. Deterministic per caseId so a card is
// always the same, with subtle gradient-angle variety so a list of same-type
// cases isn't pixel-identical.
//
// Pure server component — no external image, no event handlers, no client JS.

type TypeVisual = { from: string; to: string; motif: 'bars' | 'globe' | 'gears' | 'grid' | 'tag' | 'merge' | 'launch' | 'mark' };

// Deep, white-text-safe gradients in a coherent warm-cinematic family.
const TYPE_VISUAL: Record<string, TypeVisual> = {
  profitability: { from: '#6b4a2f', to: '#342315', motif: 'bars' },     // warm cognac / money
  market_entry:  { from: '#8a5a3c', to: '#3f2818', motif: 'globe' },    // terracotta / expansion
  operations:    { from: '#46584e', to: '#212c26', motif: 'gears' },    // deep sage / industrial
  estimation:    { from: '#3d4654', to: '#20262f', motif: 'grid' },     // slate / analytical
  pricing:       { from: '#7a4332', to: '#3a1f18', motif: 'tag' },      // deep terra / retail
  mna:           { from: '#4a4038', to: '#241e18', motif: 'merge' },    // warm charcoal / boardroom
  gtm:           { from: '#4a6168', to: '#243035', motif: 'launch' },   // teal-slate / launch
  other:         { from: '#3b3a3c', to: '#1f1e20', motif: 'mark' },     // neutral warm-dark
};

function visualFor(caseType: string): TypeVisual {
  return TYPE_VISUAL[caseType] ?? TYPE_VISUAL.other;
}

// FNV-1a → stable angle in a tasteful band, so same-type cards vary subtly.
function angleFor(caseId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < caseId.length; i++) {
    h ^= caseId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 112 + ((h >>> 0) % 46); // 112°–158°
}

// Quiet geometric motifs — single-stroke, large, bleeding off the bottom-right
// corner. Low opacity so they sit under the eyebrow + label, never compete.
function Motif({ kind }: { kind: TypeVisual['motif'] }) {
  const common = {
    fill: 'none',
    stroke: '#FFFFFF',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  let body: React.ReactNode = null;
  switch (kind) {
    case 'bars': // rising columns + trend line
      body = (
        <>
          <line x1="14" y1="78" x2="86" y2="78" {...common} />
          <rect x="20" y="56" width="12" height="22" {...common} />
          <rect x="40" y="44" width="12" height="34" {...common} />
          <rect x="60" y="28" width="12" height="50" {...common} />
          <path d="M20 50 L46 38 L66 22 L82 14" {...common} strokeWidth={2.4} />
        </>
      );
      break;
    case 'globe': // circle + meridians
      body = (
        <>
          <circle cx="50" cy="50" r="34" {...common} />
          <ellipse cx="50" cy="50" rx="14" ry="34" {...common} />
          <line x1="16" y1="50" x2="84" y2="50" {...common} />
          <path d="M22 34 Q50 44 78 34" {...common} />
          <path d="M22 66 Q50 56 78 66" {...common} />
        </>
      );
      break;
    case 'gears': // nodes + links (ops flow)
      body = (
        <>
          <circle cx="30" cy="36" r="9" {...common} />
          <circle cx="70" cy="30" r="9" {...common} />
          <circle cx="58" cy="70" r="9" {...common} />
          <line x1="39" y1="36" x2="61" y2="31" {...common} />
          <line x1="66" y1="39" x2="60" y2="61" {...common} />
          <line x1="34" y1="44" x2="52" y2="64" {...common} />
        </>
      );
      break;
    case 'grid': // estimation grid + ticks
      body = (
        <>
          <path d="M20 24 V80 H86" {...common} />
          {[36, 50, 64, 78].map((y) => (
            <line key={y} x1="20" y1={y} x2="86" y2={y} {...common} strokeWidth={1} />
          ))}
          {[36, 52, 68].map((x) => (
            <line key={x} x1={x} y1="24" x2={x} y2="80" {...common} strokeWidth={1} />
          ))}
        </>
      );
      break;
    case 'tag': // price tag
      body = (
        <>
          <path d="M30 22 H58 L82 46 L56 72 L30 46 Z" {...common} />
          <circle cx="44" cy="38" r="5" {...common} />
        </>
      );
      break;
    case 'merge': // two arrows converging (M&A)
      body = (
        <>
          <path d="M16 26 H44 L58 50" {...common} />
          <path d="M16 74 H44 L58 50" {...common} />
          <path d="M58 50 H86" {...common} strokeWidth={2.4} />
          <path d="M76 42 L86 50 L76 58" {...common} />
        </>
      );
      break;
    case 'launch': // upward arrow burst (GTM)
      body = (
        <>
          <path d="M50 16 L66 56 L50 46 L34 56 Z" {...common} />
          <line x1="50" y1="62" x2="50" y2="82" {...common} />
          <path d="M30 70 L24 84" {...common} strokeWidth={1.4} />
          <path d="M70 70 L76 84" {...common} strokeWidth={1.4} />
        </>
      );
      break;
    case 'mark': // CasePad asterisk
    default:
      body = (
        <>
          <line x1="50" y1="20" x2="50" y2="80" {...common} />
          <line x1="24" y1="34" x2="76" y2="66" {...common} />
          <line x1="76" y1="34" x2="24" y2="66" {...common} />
        </>
      );
      break;
  }
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{
        position: 'absolute',
        right: '-12%',
        bottom: '-14%',
        width: '64%',
        height: '64%',
        opacity: 0.16,
        transform: 'rotate(-6deg)',
      }}
    >
      {body}
    </svg>
  );
}

export function CaseVisual({ caseType, caseId }: { caseType: string; caseId: string }) {
  const v = visualFor(caseType);
  const angle = angleFor(caseId);
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background: `linear-gradient(${angle}deg, ${v.from} 0%, ${v.to} 100%)`,
        overflow: 'hidden',
      }}
    >
      <Motif kind={v.motif} />
    </div>
  );
}
