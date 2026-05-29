// Exhibit schema for case-interview simulation.
//
// An exhibit = a chart/table/data block the interviewer "hands over" mid-case.
// MBB cases push ~12 exhibits in 40 min; CasePad's 20-min cases target 3-5
// per case. Each exhibit is gated by trigger_keywords — the AI only hands
// one over when the candidate's question semantically matches, simulating
// the real "withhold data until they ask the right question" dynamic.
//
// Stored as filesystem JSON files (data/exhibits/{caseId}/exhibit-N.json),
// matching the Stream-4-v2 dossier pattern. No DB column, no migration.
//
// V1 supports `table` and `text` render types only. `bar` / `line` / `pie`
// come in V2 once we have a chart library wired (recharts is the leading
// candidate — keep that out of dependencies until needed).

export type ExhibitRenderType = 'table' | 'text';

export interface ExhibitTableData {
  /** Column headers — left-to-right. */
  headers: string[];
  /**
   * Row data — each row matches `headers.length`. Cells are strings OR
   * numbers; numbers get right-aligned + thousand-separated in the UI.
   * Use null for genuinely missing cells (rendered as "—").
   */
  rows: Array<Array<string | number | null>>;
  /**
   * Optional row labels for the leftmost column when it's structurally a
   * header (e.g. row 1 = "Premium segment"). If set, the renderer styles
   * column 0 bold + left-aligned regardless of value type.
   */
  leftmostIsLabel?: boolean;
}

export interface ExhibitTextData {
  /** Plain text (no markdown rendering — XSS-safe by default). */
  body: string;
}

export type ExhibitData = ExhibitTableData | ExhibitTextData;

export interface Exhibit {
  /** Unique within a case, e.g. "exhibit-1". Used in [EXHIBIT:id] markers. */
  id: string;
  /** Required — shown as the panel headline. */
  title: string;
  /** Optional secondary line ("All values in ₹ crore", "FY22–FY24"). */
  subtitle?: string;
  /** How to render. V1: table or text. */
  type: ExhibitRenderType;
  /** Shape determined by `type`. Table for tables, text for narrative blocks. */
  data: ExhibitData;
  /**
   * Words / phrases that, when the candidate's recent turns match them, are
   * the cue for the AI to hand this exhibit over. Lowercased + stemmed
   * loosely by humans; the AI does the semantic match in its own prompt
   * (NOT a server-side regex), so phrasing variations work.
   *
   * Example: ["revenue", "segment", "customer breakdown", "by segment"].
   */
  trigger_keywords: string[];
  /**
   * One-line phrase the AI says when handing over the exhibit. Optional —
   * if omitted, the AI generates one. Used to keep the hand-off voice
   * consistent with the Ash persona ("here's the segment breakdown — what
   * jumps out?").
   */
  interviewer_intro?: string;
  /**
   * Where the underlying numbers came from. Required so we can audit and
   * defend the "real cases only" rule. Free text: "Wharton 2019 casebook —
   * DataCo case", "Adapted from case dossier real_world_numbers", etc.
   */
  source_note: string;
}

/** Returned by loader when a case has zero exhibits. Sentinel, not error. */
export const NO_EXHIBITS: readonly Exhibit[] = Object.freeze([]);

/**
 * Type guard — narrows ExhibitData to the table shape. The renderer
 * branches on `exhibit.type` for the discriminator, but `data` is a
 * union, so this guard keeps the cast explicit at the boundary.
 */
export function isTableData(
  type: ExhibitRenderType,
  data: ExhibitData
): data is ExhibitTableData {
  return type === 'table' && 'headers' in data && Array.isArray((data as ExhibitTableData).headers);
}

export function isTextData(
  type: ExhibitRenderType,
  data: ExhibitData
): data is ExhibitTextData {
  return type === 'text' && 'body' in data && typeof (data as ExhibitTextData).body === 'string';
}
