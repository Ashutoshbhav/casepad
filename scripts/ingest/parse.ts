import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';

const MIN_CHARS_PER_PAGE = 200;
const CASE_HEADER_RE = /(?:^|\n)\s*Case\s+\d+\s*[:\-—]/gi;

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

export async function parsePdfFile(localPath: string): Promise<{
  text: string;
  numPages: number;
  ocrUsed: boolean;
}> {
  const buf = await readFile(localPath);
  const result = await pdfParse(buf);
  if (!needsOcr(result.text, result.numpages)) {
    return { text: result.text, numPages: result.numpages, ocrUsed: false };
  }

  // OCR fallback (slow). For v1 we mark scanned PDFs as deferred — return what
  // we have and a flag. Rendering PDF pages to images requires pdfjs-dist + canvas
  // which is a bigger lift; deferred to a follow-up task.
  return { text: result.text, numPages: result.numpages, ocrUsed: true };
}
