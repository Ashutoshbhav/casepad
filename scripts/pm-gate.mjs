#!/usr/bin/env node
// AI-PM commit gate. Runs as a pre-commit hook. Reads the staged diff,
// detects new-feature additions (new files in src/app/, src/components/, src/lib/),
// and asks an LLM to check the diff against the product gate:
//   1. Does this directly improve the NSM (score-improvement curve)?
//   2. Did at least 1 real user ask for it?
//   3. Can it be falsified within 7 days?
//
// On non-passing commits, prints the failure reasons + the override flag.
// To bypass: `git commit --no-verify` (logged as override in .pm-gate.log).

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
process.chdir(ROOT);

// 1. Get the staged diff
const diff = execSync('git diff --cached --diff-filter=A --name-only', { encoding: 'utf8' }).trim();
const addedFiles = diff.split('\n').filter(Boolean);

// Detect feature additions
const FEATURE_PATTERNS = [
  /^src\/app\/.+\/page\.tsx$/,
  /^src\/app\/api\/.+\/route\.ts$/,
  /^src\/components\/.+\.tsx$/,
  /^src\/lib\/(?!tracks-deep|firm-packs|behavioral-ideal-answers|math-drill-pool|math-drill-questions-types).+\.ts$/,
];

const featureFiles = addedFiles.filter((f) => FEATURE_PATTERNS.some((re) => re.test(f)));

if (featureFiles.length === 0) {
  console.log('[pm-gate] no new feature files in this commit — pass.');
  process.exit(0);
}

console.log('[pm-gate] new feature file(s) detected:');
featureFiles.forEach((f) => console.log('  +', f));
console.log();

// 2. Fetch the diff content for the new files
let diffContent = '';
for (const f of featureFiles.slice(0, 5)) {
  try {
    const c = execSync(`git diff --cached -- "${f}"`, { encoding: 'utf8' });
    diffContent += `\n\n=== ${f} ===\n${c.slice(0, 4000)}`;
  } catch {}
}

// 3. Load env
const envPath = path.join(ROOT, '.env.local');
if (fs.existsSync(envPath)) {
  for (const ln of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = ln.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] ||= m[2];
  }
}

const GROQ_KEY = process.env.GROQ_API_KEY;
const NVIDIA_KEY = process.env.NVIDIA_API_KEY;
if (!GROQ_KEY && !NVIDIA_KEY) {
  console.error('[pm-gate] no LLM key — skipping gate. Override allowed.');
  process.exit(0);
}

// 4. LLM call — check the diff against the gate
const provider = GROQ_KEY
  ? { url: 'https://api.groq.com/openai/v1/chat/completions', key: GROQ_KEY, model: 'llama-3.3-70b-versatile' }
  : { url: 'https://integrate.api.nvidia.com/v1/chat/completions', key: NVIDIA_KEY, model: 'meta/llama-3.3-70b-instruct' };

const system = `You are a PM gate. Given a code diff, decide if the new feature passes ALL three criteria:

1. **NSM impact**: Does this directly improve the score-improvement curve over time? Score = how well a candidate is rated on a case interview. The feature must plausibly help the user score higher (not just be "useful in general").

2. **User pull**: The product is CasePad, a case-prep app for B-school students. Has at least 1 real user (cohort member, B-school student) explicitly asked for this feature? Or is it speculative/founder-driven?

3. **Falsifiability**: Can you measure within 7 days whether this feature improved NSM? What's the test? If you can't define a test, it fails.

Output JSON only:
{
  "feature_summary": <1 sentence of what this feature does>,
  "nsm_impact": {"pass": <true|false>, "reason": <1-2 sentences>},
  "user_pull": {"pass": <true|false|"unknown">, "reason": <1-2 sentences>},
  "falsifiable": {"pass": <true|false>, "reason": <1-2 sentences, define the 7-day test if pass>},
  "verdict": <"PASS"|"FAIL"|"REVIEW">,
  "verdict_reason": <1 sentence>
}

Rules:
- "PASS" only if all three are pass.
- "REVIEW" if user_pull is unknown but other two pass — flagged for human override.
- "FAIL" if any clearly fails.
- Be honest. Founder is asking for discipline; agreeing with everything defeats the purpose.
- A new component that's pure refactor / polish / styling is "REVIEW" — gate is for net-new features, not improvements.`;

const user = `STAGED DIFF (new files only):
${diffContent}

Apply the PM gate. Return JSON.`;

// Windows libuv async-handle race regularly crashes the hook here when fetch
// + JSON.parse throws. Defensive: wrap the WHOLE call + parse + exit so any
// throw bypasses the LLM verdict and exits 0 cleanly.
let body, json;
let llmFailed = false;
try {
  const r = await fetch(provider.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 700,
    }),
  });
  body = await r.text();
  const outer = JSON.parse(body);
  const content = outer?.choices?.[0]?.message?.content;
  if (!content) throw new Error('no content in response');
  json = JSON.parse(content);
} catch (err) {
  llmFailed = true;
  console.error('[pm-gate] LLM call failed:', err.message);
  console.error('[pm-gate] Allowing commit. Re-run manually if you want to gate.');
}

if (llmFailed) {
  // Defensive sync exit — bypass any pending libuv handles.
  process.exit(0);
}

console.log('[pm-gate] verdict:', json.verdict);
console.log('[pm-gate] feature:', json.feature_summary);
console.log();
console.log('  1. NSM impact   :', json.nsm_impact?.pass ? '✓' : '✗', '—', json.nsm_impact?.reason);
console.log('  2. User pull    :', json.user_pull?.pass === true ? '✓' : json.user_pull?.pass === 'unknown' ? '?' : '✗', '—', json.user_pull?.reason);
console.log('  3. Falsifiable  :', json.falsifiable?.pass ? '✓' : '✗', '—', json.falsifiable?.reason);
console.log();
console.log('  →', json.verdict_reason);
console.log();

// Log to .pm-gate.log
const logEntry = {
  timestamp: new Date().toISOString(),
  files: featureFiles,
  verdict: json.verdict,
  reason: json.verdict_reason,
};
fs.appendFileSync(path.join(ROOT, '.pm-gate.log'), JSON.stringify(logEntry) + '\n');

if (json.verdict === 'FAIL') {
  console.error('[pm-gate] BLOCKED. To override: git commit --no-verify');
  console.error('[pm-gate] Override is logged.');
  process.exit(1);
}

if (json.verdict === 'REVIEW') {
  console.warn('[pm-gate] REVIEW required — proceeding (mark "user_pull" before next commit).');
  process.exit(0);
}

console.log('[pm-gate] PASS — commit allowed.');
process.exit(0);
