// Probe a PDF for various case-header patterns. Tries multiple regex candidates
// and reports how many matches each one produces — guides the new splitter.
import { PDFParse } from 'pdf-parse';
import { readFile } from 'fs/promises';
import path from 'path';

const file = process.argv[2];
if (!file) { console.error('Usage: node probe-headers.mjs <file.pdf>'); process.exit(1); }

const buf = await readFile(path.resolve('casebooks/raw', file));
const text = (await new PDFParse({ data: buf }).getText()).text;

const PATTERNS = {
  'Case N: / Case N -':                     /(?:^|\n)\s*Case\s+\d+\s*[:\-—]/gi,
  'Case N (any/none, full word at line start)': /(?:^|\n)\s*Case\s+\d+\b/gi,
  'Case Study N':                           /(?:^|\n)\s*Case\s+Study\s+\d+/gi,
  'Case No N':                              /(?:^|\n)\s*Case\s+No\.?\s*\d+/gi,
  'CASE roman numerals':                    /(?:^|\n)\s*Case\s+[IVXLCDM]+\b/gi,
  'Problem N':                              /(?:^|\n)\s*Problem\s+\d+\s*[:\-—]/gi,
  'Numbered TOC entry "1. Title"':          /(?:^|\n)\s*\d{1,3}\.\s+[A-Z][A-Za-z][^\n]{4,80}\n/g,
  'Numbered "<num>. <Title>" with Case word nearby': /(?:^|\n)\s*\d{1,3}\.\s+[A-Z][^\n]{0,80}(?=\n.{0,200}(?:client|industry|profitability|growth|revenue))/gis,
  '"Q.N" Question marker':                  /(?:^|\n)\s*Q\.\s*\d+/gi,
  'Page break "-- N of M --"':              /-- \d+ of \d+ --/g,
  '"Question N" full':                      /(?:^|\n)\s*Question\s+\d+/gi,
  'Round N':                                /(?:^|\n)\s*Round\s+\d+/gi,
  'Sector + Type lines (TOC style)':        /(?:^|\n)\s*\d{1,3}\.\s+[A-Z][^\n]{4,120}(?:Easy|Moderate|Challenging|Difficult|Hard)\b/g,
};

const lines = text.split(/\r?\n/);
console.log(`Total chars: ${text.length}, lines: ${lines.length}`);
for (const [name, re] of Object.entries(PATTERNS)) {
  const matches = [...text.matchAll(re)];
  console.log(`${matches.length.toString().padStart(5)}  ${name}`);
  if (matches.length > 0 && matches.length < 200) {
    const samples = matches.slice(0, 5).map(m => m[0].replace(/\n/g, '⏎').slice(0, 80));
    for (const s of samples) console.log('       ', s);
  }
}
