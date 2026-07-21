// Copies the VAD model + onnxruntime-web WASM runtime out of node_modules
// into public/vad/ so the browser can fetch them as static assets. These are
// binary build artifacts (~40MB across all wasm variants), not source — kept
// out of git (see .gitignore) and regenerated on every `npm install` via the
// postinstall hook instead. Safe to re-run any time; only ever copies files.

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'public', 'vad');

const vadDist = join(root, 'node_modules', '@ricky0123', 'vad-web', 'dist');
const ortDist = join(root, 'node_modules', 'onnxruntime-web', 'dist');

if (!existsSync(vadDist) || !existsSync(ortDist)) {
  console.warn('[setup-vad-assets] @ricky0123/vad-web or onnxruntime-web not installed — skipping (voice barge-in will fall back to push-to-talk).');
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

let copied = 0;
const copy = (fromDir, filename) => {
  const src = join(fromDir, filename);
  if (!existsSync(src)) return;
  copyFileSync(src, join(outDir, filename));
  copied += 1;
};

// Only the v5 model (skip the legacy model — not used).
copy(vadDist, 'silero_vad_v5.onnx');
copy(vadDist, 'vad.worklet.bundle.min.js');

// Every ort-wasm* runtime file: onnxruntime-web resolves the exact variant it
// needs (SIMD/threaded/jsep/...) at runtime from wasmPaths, so we copy the
// full set rather than guessing which one the browser will pick.
for (const f of readdirSync(ortDist)) {
  if (f.startsWith('ort-wasm') || f.startsWith('ort.wasm')) copy(ortDist, f);
}

console.log(`[setup-vad-assets] copied ${copied} files to public/vad/`);
