// Programmatic detector for the systematic bad-extraction patterns surfaced
// in the 30-case manual audit. Each rule is a function that returns a flag
// + reason string when the case fails. Dry-run by default; pass --apply to
// actually delete from the cases table.
import { createClient } from '@supabase/supabase-js';

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');

const NON_CASE_TITLE_RE = /\b(interview experience|career|consulting career|guide to|introduction|preparation tips|how to|tips for|cracking the)\b/i;
const NON_CASE_PROBLEM_RE = /\b(students interested|need a strong foundation|understand the company|consider factors such as|review and assess|when advising|which pieces of information)\b/i;
const ILLICIT_RE = /\b(cocaine|mafia|drug cartel|narcotic|illicit drug|smuggl|bribery|bribe the)\b/i;
const META_TITLE_RE = /^(case\s+\d+\s*[-–—:]|analyze\s+(any|two)\s+(industries|companies))/i;

function detect(c) {
  const reasons = [];

  // Rule 1 — title looks like a non-case PDF section
  if (NON_CASE_TITLE_RE.test(c.title || '') ||
      NON_CASE_PROBLEM_RE.test((c.problem_statement || '').slice(0, 300))) {
    reasons.push('title/problem reads like a guide section, not a case');
  }
  if (META_TITLE_RE.test(c.title || '')) {
    reasons.push('title is "Case N – ..." with no concrete subject');
  }

  // Rule 2 — broken extraction: any single trigger or reveal > 800 chars
  const notes = Array.isArray(c.interviewer_notes) ? c.interviewer_notes : [];
  for (const n of notes) {
    const trig = (n.trigger_keywords || []).join(', ');
    const rev = n.reveal_text || '';
    if (trig.length > 600) { reasons.push(`trigger field is ${trig.length} chars (whole transcript dumped)`); break; }
    if (rev.length > 1500) { reasons.push(`reveal field is ${rev.length} chars (whole transcript dumped)`); break; }
  }

  // Rule 3 — too thin: empty notes AND empty branches
  const branches = c.ideal_structure?.branches;
  const branchCount = Array.isArray(branches) ? branches.length : 0;
  if (notes.length === 0 && branchCount === 0) {
    reasons.push('no interviewer notes AND no structure branches');
  }

  // Rule 4 — illicit content
  const blob = `${c.title} ${c.problem_statement} ${JSON.stringify(notes)}`.toLowerCase();
  if (ILLICIT_RE.test(blob)) {
    reasons.push('contains illicit-content keywords');
  }

  // Rule 5 — [object Object] serialization bug in structure subnodes
  const struct = JSON.stringify(c.ideal_structure || {});
  if (struct.includes('[object Object]')) {
    reasons.push('structure contains "[object Object]" serialization bug');
  }

  // Rule 6 — problem statement is suspiciously short (< 60 chars after trim)
  const ps = (c.problem_statement || '').trim();
  if (ps.length < 60) {
    reasons.push(`problem statement too short (${ps.length} chars)`);
  }

  return reasons;
}

const { data: cases, error } = await supa
  .from('cases')
  .select('id,title,problem_statement,interviewer_notes,ideal_structure,casebook_id,provenance');

if (error) { console.error(error); process.exit(1); }

console.log(`Scanning ${cases.length} cases for systematic bad patterns...\n`);

// Pass 1: rule-based flagging
const flagged = [];
for (const c of cases) {
  const reasons = detect(c);
  if (reasons.length) flagged.push({ c, reasons });
}

// Pass 2: cross-casebook duplicate detection (group by problem_statement prefix)
const byPS = new Map();
for (const c of cases) {
  const key = (c.problem_statement || '').slice(0, 150).trim().toLowerCase();
  if (!key) continue;
  if (!byPS.has(key)) byPS.set(key, []);
  byPS.get(key).push(c);
}
for (const group of byPS.values()) {
  if (group.length > 1) {
    // Keep the FIRST one (shortest casebook id maybe — for stability, just keep group[0])
    for (const dup of group.slice(1)) {
      // If already flagged, append the duplicate reason
      const existing = flagged.find((f) => f.c.id === dup.id);
      const reason = `cross-casebook duplicate of "${group[0].title}" (kept under casebook ${group[0].casebook_id})`;
      if (existing) existing.reasons.push(reason);
      else flagged.push({ c: dup, reasons: [reason] });
    }
  }
}

console.log(`Flagged ${flagged.length} of ${cases.length} cases (${(flagged.length / cases.length * 100).toFixed(0)}%)\n`);

// Group reasons for at-a-glance breakdown
const reasonCounts = {};
for (const f of flagged) {
  for (const r of f.reasons) {
    const key = r.replace(/\d+/g, 'N').slice(0, 60);
    reasonCounts[key] = (reasonCounts[key] || 0) + 1;
  }
}
console.log('Reason breakdown:');
for (const [r, n] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(3)}× ${r}`);
}

console.log(`\nSample of flagged cases:`);
for (const f of flagged.slice(0, 10)) {
  console.log(`  - ${f.c.id.slice(0, 8)} "${f.c.title.slice(0, 60)}" — ${f.reasons[0]}`);
}

if (!apply) {
  console.log(`\n[dry-run] Would delete ${flagged.length} cases. Re-run with --apply.`);
  process.exit(0);
}

const ids = flagged.map((f) => f.c.id);
const { error: delErr, count } = await supa.from('cases').delete({ count: 'exact' }).in('id', ids);
if (delErr) {
  console.error('Deletion failed:', delErr.message);
  process.exit(1);
}
console.log(`\nDeleted ${count} cases. Remaining: ${cases.length - count}`);
