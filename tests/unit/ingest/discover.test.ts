import { describe, it, expect } from 'vitest';
import { extractPdfLinks } from '../../../scripts/ingest/discover';
import { readFileSync } from 'fs';
import path from 'path';

const html = readFileSync(
  path.join(__dirname, 'fixtures/sample-discover-page.html'),
  'utf8'
);

describe('extractPdfLinks', () => {
  it('finds .pdf links and resolves relative paths against base', () => {
    const links = extractPdfLinks(html, 'https://iima.consultingclub.in/');
    expect(links).toContain('https://iima.consultingclub.in/casebooks/iima-2023.pdf');
    expect(links).toContain('https://iima.consultingclub.in/casebooks/iima-2022.pdf');
    expect(links).toContain('https://example.com/casebook.pdf');
  });

  it('excludes URLs that contain auth/login/pay markers', () => {
    const links = extractPdfLinks(html, 'https://iima.consultingclub.in/');
    expect(links.find((l) => l.includes('login'))).toBeUndefined();
  });
});
