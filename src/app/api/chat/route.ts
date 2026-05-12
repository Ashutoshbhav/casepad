// src/app/api/chat/route.ts
// Multi-provider chat with streaming. Tries Groq first (fast); falls through
// to NVIDIA NIM on 429 / 5xx so 10+ concurrent users don't all hit Groq's
// 6K TPM cap.

import { NextRequest } from 'next/server';
import { streamChat } from '@/lib/llm-router';
import { buildInterviewerMessages } from '@/lib/groq/interviewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isCannedTemplate } from '@/lib/canned-templates';
import { checkResponse, describeFailure, getGuardrailMode, regenHintFor } from '@/lib/groq/guardrails';
import { critiqueResponse, regenHintForCritic, shouldCritique } from '@/lib/groq/critic';
import { staticChatTurnFallback } from '@/lib/groq/static-fallbacks';
import { withRetry } from '@/lib/supabase/with-retry';
import { retrievePlaybookFindings, formatFindingsForPrompt, type RetrievedFinding } from '@/lib/groq/playbook-retriever';
import { buildRegistry, toSystemPromptBlock as registryBlock, checkDraftAgainstRegistry } from '@/lib/case-state/number-registry';
import { findArithmeticError, regenHintForArithmeticError } from '@/lib/case-state/arithmetic-verifier';
import { renderRecentTurnAwareness, findRepeatedPhrase, regenHintForPhraseRepeat } from '@/lib/groq/recent-turn-context';
import { renderDossierBlock, dossierIsUsable, loadDossier } from '@/lib/groq/dossier-context';
import { checkRateLimit } from '@/lib/rate-limit';
import { embedWatermark } from '@/lib/security/watermark';

// Single-turn directive prepended to the system prompt when we detect that
// the candidate's message is a VERBATIM paste of one of the chat-panel
// FIRST_TURN_SUGGESTIONS. The detection is exact-string equality only —
// students who add their own thought won't trigger this. Goal: behaviorally
// reinforce that "structure for structure's sake" doesn't satisfy a real EM.
const CANNED_TEMPLATE_DIRECTIVE = `

== COACHING-TEMPLATE DETECTED (this turn only) ==
The candidate just used a textbook coaching opener verbatim — they didn't author this thinking. Your response for THIS TURN ONLY must:
1. Briefly acknowledge the structural habit ("Good scoping habit" or similar — 1 short clause).
2. Push for THEIR original thinking — invite them to express it in their own words. Examples: "now in your own words, what's the first hypothesis you'd test?" / "good — but tell me what YOU actually think the answer is going to be."
3. Stay 2–3 sentences total. Don't lecture. Don't penalize them. Don't break character.
4. After this single nudge, return to normal interviewer behavior on subsequent turns.`;

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
  const sessionId = body?.sessionId;
  const userTurn = body?.userTurn;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return new Response(JSON.stringify({ error: 'sessionId (string, ≤100 chars) required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!userTurn || typeof userTurn !== 'string' || userTurn.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'userTurn (non-empty string) required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (userTurn.length > 10000) {
    return new Response(JSON.stringify({ error: 'userTurn too large (>10000 chars)' }), { status: 413, headers: { 'Content-Type': 'application/json' } });
  }
  // Strip control chars (keep \n, \r, \t) to defang weird unicode
  const safeUserTurn = userTurn.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (safeUserTurn.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'userTurn (non-empty after sanitization) required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const supabase = await createSupabaseServerClient();

  // P1-13: verify the requester owns this session. RLS should already prevent
  // cross-user reads, but a defense-in-depth check here makes the intent
  // explicit and surfaces a clean 403 instead of a silent 404 if RLS drifts.
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return new Response('unauthorized', { status: 401 });

  // 2026-05-12 — anti-scrape: per-user_id rate limit on chat. Real cohort
  // candidates type 1-3 messages/min. 30/min is well above natural use but
  // throttles authenticated scrapers iterating cases. Sliding 60s window.
  // Returns 429 with retry-after so legitimate retries still recover.
  const rlByUser = checkRateLimit(`chat:user:${authUser.id}`, 30, 60_000);
  if (!rlByUser.ok) {
    console.warn(`[chat] rate-limit user=${authUser.id} retry=${rlByUser.retryAfterSec}s`);
    return new Response(
      JSON.stringify({
        error: 'rate_limited',
        retry_after_sec: rlByUser.retryAfterSec,
        message: 'You\'re sending messages faster than a real interview pace. Wait a moment.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rlByUser.retryAfterSec),
        },
      }
    );
  }

  // Anti-scrape: per-session_id rate limit. Even within the per-user budget,
  // hammering a single session signals automated turn-by-turn scraping. 10
  // messages/min on a single session is the practical ceiling for a thinking
  // candidate; scrapers usually do 20+. Same sliding-window pattern.
  const rlBySession = checkRateLimit(`chat:session:${sessionId}`, 10, 60_000);
  if (!rlBySession.ok) {
    console.warn(`[chat] rate-limit session=${sessionId} retry=${rlBySession.retryAfterSec}s`);
    return new Response(
      JSON.stringify({
        error: 'rate_limited',
        retry_after_sec: rlBySession.retryAfterSec,
        message: 'Slow down — a real interview doesn\'t go this fast.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rlBySession.retryAfterSec),
        },
      }
    );
  }

  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('id, transcript, case_id, user_id')
    .eq('id', sessionId)
    .eq('user_id', authUser.id)
    .single();
  if (sErr || !session) return new Response('session not found', { status: 404 });

  const { data: caseRow, error: cErr } = await supabase
    .from('cases')
    .select('title, problem_statement, interviewer_notes')
    .eq('id', session.case_id)
    .single();
  if (cErr || !caseRow) return new Response('case not found', { status: 404 });

  // Stream-4 (2026-05-08 v2): load per-case dossier from filesystem
  // (data/dossiers/{case_id}.json). No DB migration needed. Defensive:
  // null when not yet enriched — chat continues with problem_statement
  // + interviewer_notes only.
  const dossier = await loadDossier(session.case_id);

  const transcriptIn = (session.transcript as { role: string; content: string; timestamp: string }[]) ?? [];

  // P0-4: idempotency guard. If the most recent user turn has the SAME content
  // as the incoming turn AND there's already an interviewer response after it,
  // this is a flaky-network retry (common on mobile). Replay the prior
  // interviewer response instead of re-calling the LLM + duplicating the turn.
  // Window: only the most-recent user turn — if user genuinely repeats themselves
  // 5 turns later, that's a real turn.
  //
  // KNOWN LIMITATION (DA-2): there's a race window of ~1.5s during the prior
  // turn's withRetry transcript-save where this guard reads stale state — a
  // duplicate arriving in that window would miss the dedup and hit the LLM
  // again, producing a duplicate user+interviewer turn pair. Real-world risk
  // is narrow (user must double-send within 1.5s of the LAST turn AND the dupe
  // request must beat the save commit). Full fix requires either (a) writing
  // the user turn before the LLM call, or (b) the deferred clientTurnId UUID
  // scheme. Acceptable v1 trade-off; revisit if cohort signal shows duplicates.
  const lastTwoTurns = transcriptIn.slice(-2);
  const isDuplicateRetry =
    lastTwoTurns.length === 2 &&
    lastTwoTurns[0].role === 'user' &&
    lastTwoTurns[0].content === safeUserTurn &&
    lastTwoTurns[1].role === 'interviewer';
  if (isDuplicateRetry) {
    const replayContent = lastTwoTurns[1].content;
    const encoderReplay = new TextEncoder();
    const replayStream = new ReadableStream({
      start(c) {
        c.enqueue(encoderReplay.encode(replayContent));
        c.close();
      },
    });
    return new Response(replayStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-CasePad-Replay': '1' },
    });
  }

  const withUser = [
    ...transcriptIn,
    { role: 'user', content: safeUserTurn, timestamp: new Date().toISOString() },
  ];
  const disclosed = withUser
    .filter((t) => t.role === 'interviewer')
    .map((t) => t.content);

  const messages = buildInterviewerMessages(caseRow as any, disclosed, withUser as any);

  // Detect verbatim coaching-template pastes. Append a one-turn directive to
  // the system prompt so Ash gently pushes for original thinking. We mutate
  // the messages array (not the persistent transcript / system builder), so
  // this only affects the current Groq call. Wrapped in try/catch so a
  // detection bug can never break the chat call.
  try {
    if (isCannedTemplate(safeUserTurn) && messages.length > 0 && messages[0].role === 'system') {
      messages[0] = {
        ...messages[0],
        content: messages[0].content + CANNED_TEMPLATE_DIRECTIVE,
      };
    }
  } catch {
    // fall through — never block the chat call on detection
  }

  // Week-2-3: Retrieve top-3 playbook findings relevant to the candidate's
  // last turn (+ recent transcript context). Injects them as guidance into
  // the system prompt so Ash's response is grounded in observed real-MBB
  // interviewer practice. retrievePlaybookFindings is FAIL-OPEN — returns []
  // on any internal error, so a retriever bug can never block the chat call.
  //
  // §7.1 Trust UX: ALSO capture findings here so we can persist them as
  // `citations` on the interviewer turn. The wire stream stays plain text
  // (no breaking change to the streaming contract) — citations live in
  // Postgres only and are read on the next /solve render.
  let turnFindings: RetrievedFinding[] = [];
  try {
    const recentText = withUser
      .slice(-4)
      .map((t) => t.content)
      .join(' ');
    const queryText = `${safeUserTurn} ${recentText}`.slice(-1200);
    const findings = retrievePlaybookFindings(queryText, 3);
    turnFindings = findings;
    if (findings.length > 0 && messages.length > 0 && messages[0].role === 'system') {
      const block = formatFindingsForPrompt(findings);
      if (block) {
        messages[0] = {
          ...messages[0],
          content: messages[0].content + block,
        };
      }
    }
  } catch {
    // fall through — playbook retrieval is an enhancement, not a requirement
    turnFindings = [];
  }

  // STREAM-4 (2026-05-08): Inject the per-case dossier (deep knowledge for
  // questions the casebook doesn't cover — industry benchmarks, common
  // mistakes, anticipated questions). Defensive: dossier is optional; if
  // absent or malformed, no block injected. Goes BEFORE registry/recent-turn
  // because dossier is grounding context, registry is current state.
  try {
    if (dossier && dossierIsUsable(dossier) && messages.length > 0 && messages[0].role === 'system') {
      const dBlock = renderDossierBlock(dossier);
      if (dBlock) {
        messages[0] = { ...messages[0], content: messages[0].content + dBlock };
      }
    }
  } catch {
    // fall through — dossier is enhancement, never blocks
  }

  // STREAM-2 + STREAM-3 (2026-05-08 post-research):
  //   - Number Registry: re-inject committed numbers at END of system prompt
  //     (highest-attention zone per Lost-in-the-Middle). Defeats math flip-flop.
  //   - Recent-Turn Awareness: inject Ash's last 3 turns w/ anti-repeat clause.
  //     Production case study (Tony Seah) cut repetition rate 15% → 0%.
  // Both fail-open: any error here returns the system prompt unchanged.
  const registry = (() => {
    try { return buildRegistry(withUser); } catch { return null; }
  })();
  try {
    if (messages.length > 0 && messages[0].role === 'system') {
      const recentBlock = renderRecentTurnAwareness(withUser);
      const regBlock = registry ? registryBlock(registry) : '';
      if (recentBlock || regBlock) {
        messages[0] = {
          ...messages[0],
          content: messages[0].content + recentBlock + regBlock,
        };
      }
    }
  } catch {
    // fall through — registry/recent-turn injection is enhancement, never blocks
  }

  const encoder = new TextEncoder();
  const guardrailMode = getGuardrailMode();

  const readable = new ReadableStream({
    async start(controller) {
      let full = '';
      let errored = false;

      // GATE mode: buffer the full response, validate, regen once on fail,
      // then ship to client. Loses live token streaming for ~1-2s of latency
      // but defends the system prompt deterministically.
      if (guardrailMode === 'gate') {
        try {
          for await (const delta of streamChat({
            messages: messages as any,
            max_tokens: 300,
            temperature: 0.4,
          })) {
            full += delta;
          }

          // Gate 1: deterministic guardrail (banned phrases + length cap)
          const verdict = checkResponse(full);
          if (!verdict.ok) {
            console.warn(`[guardrail] turn failed: ${describeFailure(verdict.failure)}`);
            const hintedMessages = [
              ...messages,
              { role: 'system' as const, content: regenHintFor(verdict.failure) },
            ];
            try {
              let retry = '';
              for await (const delta of streamChat({
                messages: hintedMessages as any,
                max_tokens: 300,
                temperature: 0.4,
              })) {
                retry += delta;
              }
              const retryVerdict = checkResponse(retry);
              if (retryVerdict.ok) {
                full = retry;
              } else {
                console.warn(`[guardrail] regen also failed: ${describeFailure(retryVerdict.failure)}; shipping original`);
              }
            } catch (regenErr) {
              console.warn(`[guardrail] regen call errored: ${(regenErr as Error).message}; shipping original`);
            }
          }

          // Gate 1.5 (NEW 2026-05-08): Number Registry + phrase-repeat checks.
          // These are deterministic and address the two highest-frequency bugs
          // from the eval baseline: math flip-flop (1 case in baseline) and
          // phrase repeat (28 cases in baseline). One regen attempt, then ship.
          const turnIdx = transcriptIn.length + 1; // turn index of THIS interviewer turn
          if (registry) {
            const regViolations = checkDraftAgainstRegistry(full, registry, turnIdx);
            const repeatedPhrase = findRepeatedPhrase(full, withUser);
            if (regViolations.length > 0 || repeatedPhrase) {
              const hintParts: string[] = [];
              if (regViolations.length > 0) {
                console.warn(`[registry] draft contradicts ${regViolations.length} committed metrics`);
                hintParts.push(
                  '== REGISTRY CONTRADICTION ==\n' +
                    regViolations
                      .map((v) => `  - ${v.evidence}`)
                      .join('\n') +
                    '\nEither (a) honor the registered values, or (b) explicitly say "I was wrong earlier" and explain.'
                );
              }
              if (repeatedPhrase) {
                console.warn(`[phrase-cooldown] draft repeats: "${repeatedPhrase}"`);
                hintParts.push(regenHintForPhraseRepeat(repeatedPhrase));
              }
              const hinted = [
                ...messages,
                { role: 'system' as const, content: hintParts.join('\n\n') },
              ];
              try {
                let retry = '';
                for await (const delta of streamChat({
                  messages: hinted as any,
                  max_tokens: 300,
                  temperature: 0.4,
                })) {
                  retry += delta;
                }
                // Re-check both — only swap if retry passes BOTH plus the original guardrail
                const retryReg = checkDraftAgainstRegistry(retry, registry, turnIdx);
                const retryPhrase = findRepeatedPhrase(retry, withUser);
                if (retry && retryReg.length === 0 && !retryPhrase && checkResponse(retry).ok) {
                  full = retry;
                } else {
                  console.warn(`[registry/phrase] regen failed too; shipping original`);
                }
              } catch (regenErr) {
                console.warn(`[registry/phrase] regen errored: ${(regenErr as Error).message}; shipping original`);
              }
            }
          }

          // Gate 1.6 (NEW 2026-05-08): Arithmetic verification.
          // Catches "125,000 × $1.50 = $200K" type errors via deterministic
          // server-side compute. Simpler than full Groq tool-use; catches ~80%
          // of arithmetic errors. One regen attempt with explicit correction.
          const arithErr = findArithmeticError(full);
          if (arithErr) {
            console.warn(`[arithmetic] error in draft: ${arithErr.evidence}`);
            const hinted = [
              ...messages,
              { role: 'system' as const, content: regenHintForArithmeticError(arithErr) },
            ];
            try {
              let retry = '';
              for await (const delta of streamChat({
                messages: hinted as any,
                max_tokens: 300,
                temperature: 0.4,
              })) {
                retry += delta;
              }
              // Only swap if retry passes arithmetic AND existing checks
              if (retry && !findArithmeticError(retry) && checkResponse(retry).ok) {
                full = retry;
              } else {
                console.warn(`[arithmetic] regen failed; shipping original`);
              }
            } catch (regenErr) {
              console.warn(`[arithmetic] regen errored: ${(regenErr as Error).message}`);
            }
          }

          // Gate 2: semantic critic (LLM-as-judge) — every Nth turn only.
          // Skipped on early turns (turnIndex 0,1) so the opener handoff
          // isn't gated; runs from turn 2 onward at CRITIC_TURN_INTERVAL cadence.
          // Fail-open on critic errors; never block the user on judge outage.
          const turnIndex = transcriptIn.length;
          if (turnIndex >= 2 && shouldCritique(turnIndex)) {
            try {
              const cv = await critiqueResponse(full, safeUserTurn);
              if (!cv.ok && cv.failures.length > 0) {
                console.warn(`[critic] turn ${turnIndex} failed: ${cv.failures.join(',')}`);
                const hintedMessages = [
                  ...messages,
                  { role: 'system' as const, content: regenHintForCritic(cv) },
                ];
                try {
                  let retry = '';
                  for await (const delta of streamChat({
                    messages: hintedMessages as any,
                    max_tokens: 300,
                    temperature: 0.4,
                  })) {
                    retry += delta;
                  }
                  // Re-run guardrail on critic-driven regen so we don't ship
                  // a banned-phrase-laden retry.
                  if (retry && checkResponse(retry).ok) {
                    full = retry;
                  } else {
                    console.warn(`[critic] regen failed guardrail or empty; shipping original`);
                  }
                } catch (regenErr) {
                  console.warn(`[critic] regen call errored: ${(regenErr as Error).message}; shipping original`);
                }
              }
            } catch (criticErr) {
              // critiqueResponse already fails open internally, but defensive double-catch
              console.warn(`[critic] outer catch: ${(criticErr as Error).message}`);
            }
          }

          // 2026-05-12 — embed steganographic watermark before shipping.
          // Invisible to readers; identifies the leaking account if a
          // transcript shows up externally. See src/lib/security/watermark.ts.
          full = embedWatermark(full, authUser.id);

          controller.enqueue(encoder.encode(full));
        } catch (err) {
          // P0-3: Never poison the transcript with "[Service is busy...]" text.
          // When all 4 LLM providers fail, ship a static-fallback Ash probe
          // that keeps the conversation valid. The candidate sees a real probe
          // and the next turn's LLM context is clean — not corrupted by an
          // error string masquerading as the prior interviewer turn.
          errored = true;
          console.warn(`[chat] all providers failed: ${(err as Error).message.slice(0, 120)}; using static fallback`);
          full = embedWatermark(staticChatTurnFallback(transcriptIn.length), authUser.id);
          controller.enqueue(encoder.encode(full));
        }
      } else {
        // MONITOR or OFF: stream optimistically. In MONITOR we still log
        // failures after the stream completes, so we get visibility without
        // sacrificing UX. OFF skips even the post-stream check.
        try {
          for await (const delta of streamChat({
            messages: messages as any,
            max_tokens: 300,
            temperature: 0.4,
          })) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        } catch (err) {
          // P0-3 + DA-1 fix: in monitor mode, partial deltas have ALREADY been
          // enqueued to the client during the for-await loop. We must NOT
          // re-enqueue the full string (would duplicate bytes the client
          // already received). Two cases:
          //   (a) partial is meaningful (>=10 chars): leave it as-is for both
          //       client UX and transcript persistence — user sees what they
          //       saw, no contradiction.
          //   (b) partial is trivial / empty: enqueue ONLY the fallback (the
          //       NEW content the user hasn't seen) and use it as the
          //       persisted turn.
          errored = true;
          console.warn(`[chat] all providers failed (monitor): ${(err as Error).message.slice(0, 120)}`);
          if (!full || full.trim().length < 10) {
            const fallback = staticChatTurnFallback(transcriptIn.length);
            controller.enqueue(encoder.encode(fallback));
            full = fallback;
          }
          // else: keep partial — already streamed AND already in `full`.
        }
        if (guardrailMode === 'monitor' && !errored) {
          const verdict = checkResponse(full);
          if (!verdict.ok) {
            console.warn(`[guardrail:monitor] turn failed: ${describeFailure(verdict.failure)}`);
          }
        }
        // Note: monitor mode streams deltas live to client BEFORE we can
        // watermark, so we only watermark the persisted transcript copy.
        // Better defense for monitor mode = use gate (default) which buffers.
        if (!errored && full) {
          full = embedWatermark(full, authUser.id);
        }
      }

      // §7.1 Trust UX — surface the playbook findings that grounded Ash's
      // turn as `citations`. Trim text to 200 chars (display preview only;
      // sourceUrl carries the full link). Field is optional, so legacy
      // transcripts without it round-trip cleanly.
      const turnCitations = turnFindings.map((f) => ({
        section: f.section,
        sourceUrl: f.sourceUrl,
        text: f.text.slice(0, 200),
      }));
      const interviewerTurn: {
        role: 'interviewer';
        content: string;
        timestamp: string;
        citations?: { section: string; sourceUrl?: string; text: string }[];
      } = {
        role: 'interviewer',
        content: full,
        timestamp: new Date().toISOString(),
      };
      if (turnCitations.length > 0) interviewerTurn.citations = turnCitations;
      const finalTranscript = [...withUser, interviewerTurn];

      // P0-2: retry transcript save with exponential backoff; on residual
      // failure log loudly so we have telemetry. Never throw — controller
      // must close cleanly so the client doesn't hang.
      try {
        const { error: saveErr } = await withRetry(() =>
          supabase.from('sessions').update({ transcript: finalTranscript }).eq('id', sessionId)
        );
        if (saveErr) {
          console.error(`[chat] transcript save FAILED after retries for session ${sessionId}: ${JSON.stringify(saveErr).slice(0, 200)}`);
        }
      } catch (saveThrow) {
        console.error(`[chat] transcript save THREW for session ${sessionId}: ${(saveThrow as Error).message.slice(0, 200)}`);
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
