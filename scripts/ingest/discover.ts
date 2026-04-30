import { load } from 'cheerio';
import sources from './sources.json' with { type: 'json' };

const BLOCKED_TOKENS = ['login', 'auth', 'pay', 'subscribe', 'checkout'];

export function extractPdfLinks(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let abs: string;
    try {
      abs = new URL(href, baseUrl).toString();
    } catch {
      return;
    }
    if (!abs.toLowerCase().endsWith('.pdf')) return;
    if (BLOCKED_TOKENS.some((t) => abs.toLowerCase().includes(t))) return;
    links.push(abs);
  });
  return [...new Set(links)];
}

export async function discoverAll(): Promise<{ school: string; pdfUrl: string }[]> {
  const out: { school: string; pdfUrl: string }[] = [];
  for (const s of sources.sources) {
    try {
      const res = await fetch(s.url, { redirect: 'follow' });
      if (!res.ok) continue;
      const html = await res.text();
      for (const u of extractPdfLinks(html, s.url)) {
        out.push({ school: s.school, pdfUrl: u });
      }
    } catch (err) {
      console.error(`[discover] ${s.school} failed: ${(err as Error).message}`);
    }
  }
  for (const u of (sources as any).extra_pdf_urls ?? []) {
    out.push({ school: 'manual', pdfUrl: u });
  }
  return out;
}

import { pathToFileURL } from 'url';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  discoverAll().then((rows) => {
    console.log(JSON.stringify(rows, null, 2));
    console.error(`Found ${rows.length} PDF URLs.`);
  });
}
