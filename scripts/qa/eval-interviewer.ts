// scripts/qa/eval-interviewer.ts
//
// Synthetic-candidate eval harness. Plays N representative cases end-to-end
// through the production chat pipeline, captures full transcripts, and runs
// all Tier-1 deterministic detectors per FAILURE-MODE-CATALOG.md.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/qa/eval-interviewer.ts
//
// Output: docs/eval-runs/RUN-{ISO}.md with per-case pass/fail + finding details.
//
// Exit code: 0 if all cases pass, 1 if any critical/high finding.

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { completeChat } from '../../src/lib/llm-router';
import { buildInterviewerMessages } from '../../src/lib/groq/interviewer';
import { isCannedTemplate } from '../../src/lib/canned-templates';
import { checkResponse, regenHintFor } from '../../src/lib/groq/guardrails';
import { staticChatTurnFallback } from '../../src/lib/groq/static-fallbacks';
import { retrievePlaybookFindings, formatFindingsForPrompt } from '../../src/lib/groq/playbook-retriever';
import { runAllDetectors, type EvalTurn, type FullDetectorReport } from '../../src/lib/eval/detectors';

// ============================================================================
// Configuration
// ============================================================================

const TURN_BUDGET = 12; // turns per session
const CASES_PER_TYPE = 1; // 1 of each type for the smoke run; bump for nightly

// Representative case types to test (eval coverage)
const TARGET_CASE_TYPES = ['profitability', 'market_entry', 'operations', 'estimation', 'mna'];

// ============================================================================
// Synthetic candidate persona
// ============================================================================

const SYNTHETIC_CANDIDATE_SYSTEM = `You are simulating a B-school student practicing case interviews. You're moderately good but not perfect. Mix of:
- Asking 1-2 clarifying questions early
- Proposing structures (sometimes vague, sometimes MECE)
- Stating hypotheses (sometimes weak, sometimes anchored)
- Doing math (sometimes with arithmetic errors)
- Pushing back occasionally
- Going silent / saying "what" when stuck

Your responses must be 1-3 sentences, candidate-realistic. Vary your behavior across the 12 turns:
- Turn 1-2: clarify
- Turn 3-4: propose structure
- Turn 5-7: do math (include 1 deliberate arithmetic error to test interviewer pushback)
- Turn 8-10: defend an answer / get pushed back
- Turn 11-12: synthesize

DO NOT pretend to be the interviewer. DO NOT apologize. DO NOT use markdown.
Reply with ONLY your candidate response — no role prefix, no preamble.`;

async function generateCandidateTurn(
  caseTitle: string,
  problemStatement: string,
  transcript: EvalTurn[],
  turnIndex: number
): Promise<string> {
  const transcriptStr = transcript
    .map((t) => `${t.role === 'user' ? 'CANDIDATE' : 'ASH'}: ${t.content}`)
    .join('\n\n');
  const userPrompt = `CASE: ${caseTitle}

PROBLEM:
${problemStatement}

CONVERSATION SO FAR:
${transcriptStr || '(none yet)'}

YOU ARE THE CANDIDATE. This is YOUR turn ${turnIndex + 1} of ${TURN_BUDGET}.
Reply with ONLY your candidate response (1-3 sentences):`;

  try {
    const r = await completeChat({
      messages: [
        { role: 'system', content: SYNTHETIC_CANDIDATE_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });
    return r.trim() || 'what';
  } catch (err) {
    console.warn(`[synthetic-candidate] generation failed: ${(err as Error).message}; defaulting to "what"`);
    return 'what';
  }
}

// ============================================================================
// Run interviewer turn (mirrors the production chat route logic)
// ============================================================================

async function generateInterviewerTurn(
  caseRow: any,
  transcript: EvalTurn[],
  candidateTurn: string
): Promise<string> {
  const disclosed = transcript.filter((t) => t.role === 'interviewer').map((t) => t.content);
  const withUser: any[] = [
    ...transcript.map((t) => ({ role: t.role, content: t.content, timestamp: '' })),
    { role: 'user', content: candidateTurn, timestamp: '' },
  ];
  const messages = buildInterviewerMessages(caseRow, disclosed, withUser as any);

  // Canned-template directive (mirrors route.ts)
  try {
    if (isCannedTemplate(candidateTurn) && messages.length > 0 && messages[0].role === 'system') {
      messages[0] = {
        ...messages[0],
        content: messages[0].content + '\n\n[canned-template directive elided in eval]',
      };
    }
  } catch {}

  // Playbook retrieval (mirrors route.ts)
  try {
    const recentText = withUser.slice(-4).map((t: any) => t.content).join(' ');
    const queryText = `${candidateTurn} ${recentText}`.slice(-1200);
    const findings = retrievePlaybookFindings(queryText, 3);
    if (findings.length > 0 && messages.length > 0 && messages[0].role === 'system') {
      const block = formatFindingsForPrompt(findings);
      if (block) messages[0] = { ...messages[0], content: messages[0].content + block };
    }
  } catch {}

  // Generate
  try {
    const draft = await completeChat({
      messages: messages as any,
      max_tokens: 300,
      temperature: 0.4,
    });

    // Guardrail check + regen-once
    const verdict = checkResponse(draft);
    if (!verdict.ok) {
      const hinted = [...messages, { role: 'system' as const, content: regenHintFor(verdict.failure) }];
      try {
        const retry = await completeChat({ messages: hinted as any, max_tokens: 300, temperature: 0.4 });
        if (checkResponse(retry).ok) return retry;
      } catch {}
    }
    return draft;
  } catch (err) {
    console.warn(`[interviewer] generation failed: ${(err as Error).message}; using static fallback`);
    return staticChatTurnFallback(transcript.length);
  }
}

// ============================================================================
// Run a single case
// ============================================================================

interface CaseResult {
  case_id: string;
  case_title: string;
  case_type: string;
  transcript: EvalTurn[];
  detector_report: FullDetectorReport;
  duration_ms: number;
  errored: boolean;
  error?: string;
}

async function runOneCase(caseRow: any): Promise<CaseResult> {
  const startMs = Date.now();
  const transcript: EvalTurn[] = [];

  // Synthetic interviewer opener (skip generateOpener for speed; use a stub)
  transcript.push({
    role: 'interviewer',
    content: `Let's work on this case. ${caseRow.problem_statement.slice(0, 200)}... Where would you like to start?`,
  });

  try {
    for (let i = 0; i < TURN_BUDGET; i++) {
      const candidateTurn = await generateCandidateTurn(
        caseRow.title,
        caseRow.problem_statement,
        transcript,
        i
      );
      transcript.push({ role: 'user', content: candidateTurn });

      const interviewerTurn = await generateInterviewerTurn(caseRow, transcript.slice(0, -1), candidateTurn);
      transcript.push({ role: 'interviewer', content: interviewerTurn });
    }
  } catch (err) {
    return {
      case_id: caseRow.id,
      case_title: caseRow.title,
      case_type: caseRow.case_type || 'unknown',
      transcript,
      detector_report: runAllDetectors(transcript),
      duration_ms: Date.now() - startMs,
      errored: true,
      error: (err as Error).message,
    };
  }

  return {
    case_id: caseRow.id,
    case_title: caseRow.title,
    case_type: caseRow.case_type || 'unknown',
    transcript,
    detector_report: runAllDetectors(transcript),
    duration_ms: Date.now() - startMs,
    errored: false,
  };
}

// ============================================================================
// Pick representative cases
// ============================================================================

async function pickCases(supabase: any) {
  const cases: any[] = [];
  for (const ct of TARGET_CASE_TYPES) {
    const { data } = await supabase
      .from('cases')
      .select('id, title, case_type, problem_statement, interviewer_notes')
      .eq('case_type', ct)
      .gte('problem_statement', '0') // any non-null
      .limit(CASES_PER_TYPE);
    if (data && data.length > 0) cases.push(...data);
  }
  return cases;
}

// ============================================================================
// Render Markdown report
// ============================================================================

function renderReport(results: CaseResult[]): { md: string; criticalFindings: number } {
  const ts = new Date().toISOString();
  const totalCritical = results.reduce(
    (s, r) => s + (r.detector_report.findings_by_severity.critical ?? 0),
    0
  );
  const totalHigh = results.reduce(
    (s, r) => s + (r.detector_report.findings_by_severity.high ?? 0),
    0
  );
  const totalAll = results.reduce((s, r) => s + r.detector_report.total_findings, 0);
  const passedCases = results.filter((r) => r.detector_report.passed).length;

  let md = `# CasePad Eval Run — ${ts}\n\n`;
  md += `**Cases run:** ${results.length} · **Passed:** ${passedCases}/${results.length} · `;
  md += `**Total findings:** ${totalAll} (critical: ${totalCritical}, high: ${totalHigh})\n\n`;

  md += `## Per-case summary\n\n`;
  md += `| Case | Type | Findings | Critical | High | Duration |\n`;
  md += `|---|---|---:|---:|---:|---:|\n`;
  for (const r of results) {
    md += `| ${r.case_title} | ${r.case_type} | ${r.detector_report.total_findings} | `;
    md += `${r.detector_report.findings_by_severity.critical ?? 0} | `;
    md += `${r.detector_report.findings_by_severity.high ?? 0} | `;
    md += `${(r.duration_ms / 1000).toFixed(1)}s |\n`;
  }
  md += `\n`;

  md += `## Findings by detector (aggregated across cases)\n\n`;
  const detectorAgg: Record<string, number> = {};
  for (const r of results) {
    for (const [name, info] of Object.entries(r.detector_report.per_detector)) {
      detectorAgg[name] = (detectorAgg[name] ?? 0) + info.finding_count;
    }
  }
  md += `| Detector | Findings |\n|---|---:|\n`;
  Object.entries(detectorAgg)
    .sort(([, a], [, b]) => b - a)
    .forEach(([name, count]) => {
      const marker = count > 0 ? '🔴' : '✅';
      md += `| ${marker} ${name} | ${count} |\n`;
    });
  md += `\n`;

  md += `## Per-case detail\n\n`;
  for (const r of results) {
    md += `### ${r.case_title} (${r.case_type})\n\n`;
    if (r.errored) md += `**ERRORED:** ${r.error}\n\n`;
    if (r.detector_report.findings.length === 0) {
      md += `_No findings._\n\n`;
    } else {
      for (const f of r.detector_report.findings) {
        md += `- **[${f.severity.toUpperCase()}]** ${f.detector} (turn ${f.turn_index ?? '-'}): ${f.evidence}\n`;
      }
      md += `\n`;
    }
    md += `<details><summary>Transcript</summary>\n\n`;
    r.transcript.forEach((t, i) => {
      const who = t.role === 'user' ? 'CANDIDATE' : 'ASH';
      md += `**[${i}] ${who}:** ${t.content}\n\n`;
    });
    md += `</details>\n\n`;
  }

  return { md, criticalFindings: totalCritical + totalHigh };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[eval] picking ${TARGET_CASE_TYPES.length * CASES_PER_TYPE} cases…`);
  const cases = await pickCases(supabase);
  console.log(`[eval] picked ${cases.length} cases`);

  const results: CaseResult[] = [];
  for (const c of cases) {
    console.log(`[eval] running case "${c.title}" (${c.case_type})…`);
    const r = await runOneCase(c);
    console.log(`[eval]   → ${r.detector_report.total_findings} findings (${r.detector_report.findings_by_severity.critical ?? 0} critical, ${r.detector_report.findings_by_severity.high ?? 0} high)`);
    results.push(r);
  }

  const { md, criticalFindings } = renderReport(results);

  const outDir = path.resolve(process.cwd(), 'docs', 'eval-runs');
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `RUN-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
  await writeFile(outPath, md, 'utf8');
  console.log(`[eval] wrote ${outPath}`);

  if (criticalFindings > 0) {
    console.error(`[eval] FAIL — ${criticalFindings} critical/high findings`);
    process.exit(1);
  }
  console.log(`[eval] PASS — no critical/high findings`);
}

main().catch((err) => {
  console.error('[eval] FATAL:', err);
  process.exit(1);
});
