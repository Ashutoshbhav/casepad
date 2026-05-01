import { PDFParse } from 'pdf-parse';
import { readFile } from 'fs/promises';

const MIN_CHARS_PER_PAGE = 200;

// Whole casebooks run 100k–1.4M chars; individual cases are typically 1k–20k.
// 50k is a generous ceiling — chunks above this almost certainly mean the
// header regex didn't fire and the whole document collapsed into one "chunk".
export const MAX_CASE_CHARS = 50_000;

// Matches the case-header conventions seen across the 126-PDF corpus:
//   Case 1:      Case 1 -      Case 1.       Case 1 (bare, ISB)
//   Case Study 5            Case No. 3      Case #7
//   Case I       Case II     CASE III       (roman, XLRI CRUX)
// Anchored at line start (with optional leading whitespace) so inline
// references like "in case 5 we saw..." don't false-trigger.
const CASE_HEADER_RE = /(?:^|\n)\s*Case\s+(?:Study\s+|No\.?\s*|#\s*)?(?:\d+|[IVXLCDM]+)\b/gi;

export function needsOcr(text: string, numPages: number): boolean {
  if (!numPages || numPages < 1) return text.length < 200;
  return text.length / numPages < MIN_CHARS_PER_PAGE;
}

export function splitIntoCaseChunks(text: string): string[] {
  const matches = [...text.matchAll(CASE_HEADER_RE)];
  if (matches.length === 0) return [text.trim()];
  const chunks: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
  }
  return chunks;
}

// True when a chunk is too large to plausibly be a single case — almost
// certainly the whole document because no case-header markers fired. The
// ingest orchestrator uses this to skip these so we don't waste LLM calls on
// whole-book text or, worse, write garbage rows from extract.ts's 8k slice.
export function isLikelyWholeDocument(chunk: string): boolean {
  return chunk.length > MAX_CASE_CHARS;
}

export async function parsePdfFile(localPath: string): Promise<{
  text: string;
  numPages: number;
  ocrUsed: boolean;
}> {
  const buf = await readFile(localPath);
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  if (!needsOcr(result.text, result.total)) {
    return { text: result.text, numPages: result.total, ocrUsed: false };
  }

  // OCR fallback (slow). For v1 we mark scanned PDFs as deferred — return what
  // we have and a flag. Rendering PDF pages to images requires pdfjs-dist + canvas
  // which is a bigger lift; deferred to a follow-up task.
  return { text: result.text, numPages: result.total, ocrUsed: true };
}
