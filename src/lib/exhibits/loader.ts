// Filesystem loader for case exhibits.
//
// Mirrors src/lib/groq/dossier-context.ts — reads JSON files at
// data/exhibits/{caseId}/*.json, validates the shape, returns a typed
// Exhibit[]. Defensive by design: missing directory, parse failure, or
// invalid schema all degrade silently to NO_EXHIBITS so a malformed
// exhibit can never break chat. Failures are logged with the caseId
// so they surface in Vercel logs without screaming at the user.
//
// Server-only (Node `fs/promises`). Don't import from client components.

import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  type Exhibit,
  type ExhibitRenderType,
  NO_EXHIBITS,
} from './types';

const EXHIBITS_ROOT = path.join(process.cwd(), 'data', 'exhibits');

const VALID_TYPES: ReadonlySet<ExhibitRenderType> = new Set<ExhibitRenderType>([
  'table',
  'text',
]);

/**
 * Validates a parsed JSON blob against the Exhibit schema. Returns the
 * typed Exhibit if valid, null otherwise (with a console warning).
 *
 * We don't use zod for v1 to keep the dependency surface flat — the
 * schema is simple enough that explicit checks are clearer. If we need
 * many more validators across the app later, lift to zod.
 */
function validateExhibit(raw: unknown, contextLabel: string): Exhibit | null {
  if (!raw || typeof raw !== 'object') {
    console.warn(`[exhibits] ${contextLabel}: not an object`);
    return null;
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.id !== 'string' || !r.id) {
    console.warn(`[exhibits] ${contextLabel}: missing id`);
    return null;
  }
  if (typeof r.title !== 'string' || !r.title) {
    console.warn(`[exhibits] ${contextLabel}: missing title`);
    return null;
  }
  if (typeof r.type !== 'string' || !VALID_TYPES.has(r.type as ExhibitRenderType)) {
    console.warn(`[exhibits] ${contextLabel}: invalid type "${r.type}"`);
    return null;
  }
  if (!Array.isArray(r.trigger_keywords) || r.trigger_keywords.some((k) => typeof k !== 'string')) {
    console.warn(`[exhibits] ${contextLabel}: trigger_keywords must be string[]`);
    return null;
  }
  if (typeof r.source_note !== 'string' || !r.source_note) {
    console.warn(`[exhibits] ${contextLabel}: missing source_note`);
    return null;
  }
  if (!r.data || typeof r.data !== 'object') {
    console.warn(`[exhibits] ${contextLabel}: missing data`);
    return null;
  }

  const type = r.type as ExhibitRenderType;
  const data = r.data as Record<string, unknown>;

  if (type === 'table') {
    if (!Array.isArray(data.headers) || data.headers.some((h) => typeof h !== 'string')) {
      console.warn(`[exhibits] ${contextLabel}: table.headers must be string[]`);
      return null;
    }
    if (!Array.isArray(data.rows)) {
      console.warn(`[exhibits] ${contextLabel}: table.rows must be array`);
      return null;
    }
    // Every row should match headers.length and be (string|number|null)[].
    const colCount = data.headers.length;
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      if (!Array.isArray(row) || row.length !== colCount) {
        console.warn(`[exhibits] ${contextLabel}: row ${i} has ${(row as unknown[])?.length} cells, expected ${colCount}`);
        return null;
      }
      for (const cell of row as unknown[]) {
        if (cell !== null && typeof cell !== 'string' && typeof cell !== 'number') {
          console.warn(`[exhibits] ${contextLabel}: row ${i} has non-string/number/null cell`);
          return null;
        }
      }
    }
  } else if (type === 'text') {
    if (typeof data.body !== 'string') {
      console.warn(`[exhibits] ${contextLabel}: text.body must be string`);
      return null;
    }
  }

  return raw as Exhibit;
}

/**
 * Load every exhibit for a case. Reads all JSON files in
 * data/exhibits/{caseId}/ — sorted by filename so exhibit-1 always
 * appears before exhibit-2 in the system prompt.
 *
 * Returns NO_EXHIBITS (empty frozen array) on any failure path so
 * callers can safely spread / iterate without null guards.
 */
export async function loadExhibits(caseId: string): Promise<readonly Exhibit[]> {
  // Defensive: caseId may come from user input via session row. Strip
  // anything that could escape the filesystem path. UUIDs are
  // [0-9a-f-] only; reject anything else.
  if (!/^[a-z0-9-]+$/i.test(caseId)) {
    console.warn(`[exhibits] rejected caseId with suspicious chars: ${caseId}`);
    return NO_EXHIBITS;
  }

  const dir = path.join(EXHIBITS_ROOT, caseId);

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    // ENOENT = case has no exhibits yet. Normal, not an error.
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'ENOENT') {
      return NO_EXHIBITS;
    }
    console.warn(`[exhibits] readdir failed for ${caseId}:`, err);
    return NO_EXHIBITS;
  }

  const jsonFiles = entries.filter((f) => f.endsWith('.json')).sort();
  if (jsonFiles.length === 0) return NO_EXHIBITS;

  const results: Exhibit[] = [];
  for (const fname of jsonFiles) {
    const fpath = path.join(dir, fname);
    let raw: unknown;
    try {
      const text = await fs.readFile(fpath, 'utf8');
      raw = JSON.parse(text);
    } catch (err) {
      console.warn(`[exhibits] read/parse failed for ${caseId}/${fname}:`, err);
      continue;
    }
    const validated = validateExhibit(raw, `${caseId}/${fname}`);
    if (validated) results.push(validated);
  }

  return results.length > 0 ? results : NO_EXHIBITS;
}

/**
 * Load a single exhibit by id for the given case. Used when the chat
 * panel detects an [EXHIBIT:id] marker and needs to fetch the full
 * data. Returns null on any failure path.
 *
 * Implementation note: we re-use loadExhibits + filter instead of
 * direct file read so id-to-filename mapping stays a single source of
 * truth (filenames are sorted, the id is inside the file).
 */
export async function loadExhibitById(
  caseId: string,
  exhibitId: string
): Promise<Exhibit | null> {
  if (!/^[a-z0-9-]+$/i.test(exhibitId)) {
    console.warn(`[exhibits] rejected exhibitId with suspicious chars: ${exhibitId}`);
    return null;
  }
  const all = await loadExhibits(caseId);
  return all.find((e) => e.id === exhibitId) ?? null;
}
