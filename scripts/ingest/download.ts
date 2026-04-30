import { mkdir, writeFile, stat } from 'fs/promises';
import path from 'path';

const RAW_DIR = path.resolve(process.cwd(), 'casebooks/raw');

export function localPathFor(school: string, pdfUrl: string): string {
  const filename = path.basename(new URL(pdfUrl).pathname).replace(/[^A-Za-z0-9._-]/g, '_');
  return path.join(RAW_DIR, `${school.replace(/[^A-Za-z0-9_-]/g, '_')}__${filename}`);
}

export async function downloadOne(school: string, pdfUrl: string): Promise<{
  status: 'downloaded' | 'skipped' | 'failed';
  localPath: string;
  reason?: string;
}> {
  const localPath = localPathFor(school, pdfUrl);
  await mkdir(RAW_DIR, { recursive: true });
  try {
    await stat(localPath);
    return { status: 'skipped', localPath, reason: 'already exists' };
  } catch {}

  try {
    const res = await fetch(pdfUrl, { redirect: 'follow' });
    if (!res.ok) return { status: 'failed', localPath, reason: `http ${res.status}` };
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) return { status: 'failed', localPath, reason: 'html, not pdf' };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) return { status: 'failed', localPath, reason: 'too small' };
    if (buf.slice(0, 4).toString('utf8') !== '%PDF') return { status: 'failed', localPath, reason: 'not a PDF' };
    await writeFile(localPath, buf);
    return { status: 'downloaded', localPath };
  } catch (err) {
    return { status: 'failed', localPath, reason: (err as Error).message };
  }
}
