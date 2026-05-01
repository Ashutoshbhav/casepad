// Per-track evaluator. Replaces the single generic scoring with the rubric
// dimensions defined for each track in src/lib/tracks.ts.

import type { Track, TrackDef } from '../tracks';
import { TRACKS } from '../tracks';

export function buildTrackEvaluatorMessages(
  track: Track,
  transcript: any,
  idealStructure: any,
  cheatSheet: any,
  elapsedSec: number
) {
  const def: TrackDef = TRACKS[track];
  const rubricList = def.rubric
    .map((r, i) => `${i + 1}. ${r.dimension} (${r.weight}%) — ${r.description}`)
    .join('\n');
  const dimensionsObject = def.rubric
    .map((r) => `"${r.dimension.toLowerCase().replace(/\s+/g, '_')}": <0-${r.weight}>`)
    .join(',\n  ');

  const system = `You are a ${def.label} interviewer giving a structured debrief on the candidate's performance.

TRACK: ${def.label}
TRACK RUBRIC (weights total to 100):
${rubricList}

Score each dimension on its own scale (0 to its weight). Total 0-100.

Output JSON only:
{
  "track": "${track}",
  ${dimensionsObject},
  "total": <sum 0-100>,
  "strengths": [<2-4 specific things they did well, citing the transcript>],
  "gaps": [<2-4 specific things that cost them points, citing what they missed>],
  "spike_moments": [<things they did that elevated 3→4: catching their own error, pivoting on data, top-down synthesis with $-figures, recovery moves>],
  "below_3_flags": [<dimensions scored below 60% of weight — these are auto-rejects>],
  "insufficient_data": <true if transcript too short to score>
}

Rules:
- Be specific. Cite phrases or moments from the transcript.
- A 3→4 spike requires CONCRETE evidence (e.g., "candidate pivoted from cost analysis to revenue when realizing fixed costs weren't the issue").
- below_3_flags is critical — at MBB, scoring below 3 (60% of weight) on ANY dimension = reject regardless of others.
- Don't fabricate. If a dimension wasn't tested, give it the median weight value but flag insufficient_data.`;

  const user = `TRANSCRIPT:
${JSON.stringify(transcript, null, 2)}

IDEAL STRUCTURE (from casebook):
${JSON.stringify(idealStructure, null, 2)}

CHEAT SHEET CAPTURED DURING SOLVE:
${JSON.stringify(cheatSheet, null, 2)}

ELAPSED TIME: ${elapsedSec}s

Score the candidate.`;

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ];
}
