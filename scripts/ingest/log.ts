import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `ingest-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
let initialized = false;

async function ensure() {
  if (initialized) return;
  await mkdir(LOG_DIR, { recursive: true });
  initialized = true;
}

export async function log(level: 'info' | 'warn' | 'error', stage: string, msg: string, extra: Record<string, unknown> = {}) {
  await ensure();
  const line = JSON.stringify({ t: new Date().toISOString(), level, stage, msg, ...extra }) + '\n';
  await appendFile(LOG_FILE, line);
  const c = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[36m';
  console.log(`${c}[${stage}]\x1b[0m ${msg}`);
}
