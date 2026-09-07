// src/app/api/admin/canary/route.ts
//
// Fast synthetic canary for the LLM router. PRD v3.1 Stage-0: "synthetic
// canary from an EXTERNAL scheduler + fallback-rate alarm paging within
// 30 min." Every prior LLM outage (2026-07-24 x2, 2026-09-07 dead model IDs)
// was silent until a human ran a check by hand — the router keeps returning
// 200s while quietly degrading down its fallback chain, or serving canned
// static fallbacks.
//
// This is the LIGHT check (one tiny completion per tier, echo-token asserted),
// meant to run every ~15 min from .github/workflows/canary.yml. It is NOT the
// heavy /api/admin/smoke-check (full signed-in case session, daily) — the two
// are complementary.
//
// What it catches that a plain 200-check does not:
//   - the first-choice provider silently stopped serving (idx > 0)
//   - the whole primary chain is struggling (idx >= 2)  -> alarm
//   - a tier returned but it's a static-fallback string, not a live model
//   - a provider key vanished from the environment
//
// Status contract (so `curl -f` alone is meaningful, and the workflow can be
// dumb):
//   200  every tier served by its first-choice provider (idx 0)
//   200 + degraded:true   one fallthrough somewhere (idx 1) — logged, not paged
//   503 + alarm:true      idx >= 2, a tier hard-failed, or a fallback reply

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { completeChat, type ServedInfo } from '@/lib/llm-router';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Two tiers probed in parallel; a bad-luck run can try 2 providers in one
// tier at 30s each before it gives up. 60s is the plan ceiling and matches
// the chat route in vercel.json.
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

interface TierResult {
  ok: boolean;
  provider: string | null;
  idx: number | null;
  ms: number | null;
  note?: string;
}

async function probeTier(tier: 'primary' | 'aux'): Promise<TierResult> {
  // A token the model can only produce by actually generating text we asked
  // for — a static-fallback string or an empty reply will not contain it.
  const token = `CANARY-${tier}-${Math.random().toString(36).slice(2, 10)}`;
  const box: { served?: ServedInfo } = {};
  const t0 = Date.now();
  try {
    const reply = await completeChat({
      tier,
      messages: [
        {
          role: 'user',
          content: `This is an automated health check. Reply with exactly this token and nothing else: ${token}`,
        },
      ],
      max_tokens: 400, // headroom: reasoning models spend hidden tokens first
      temperature: 0,
      onServed: (info) => {
        box.served = info;
      },
    });
    const ms = Date.now() - t0;
    const base = { provider: box.served?.provider ?? null, idx: box.served?.idx ?? null, ms };
    if (!reply.includes(token)) {
      return {
        ok: false,
        ...base,
        note: `reply did not echo the canary token (got: ${JSON.stringify(reply.slice(0, 120))})`,
      };
    }
    return { ok: true, ...base };
  } catch (e) {
    return {
      ok: false,
      provider: box.served?.provider ?? null,
      idx: box.served?.idx ?? null,
      ms: Date.now() - t0,
      note: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function GET(req: NextRequest) {
  const accepted = [process.env.SMOKE_CHECK_TOKEN, process.env.CRON_SECRET].filter(
    (v): v is string => !!v,
  );
  if (accepted.length === 0) {
    return jsonError(501, 'neither SMOKE_CHECK_TOKEN nor CRON_SECRET configured on this deployment');
  }
  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!provided || !accepted.some((tok) => safeEqual(provided, tok))) {
    return jsonError(401, 'unauthorized');
  }

  const rl = checkRateLimit('canary', 20, 60 * 60 * 1000);
  if (!rl.ok) return jsonError(429, `rate limited — retry after ${rl.retryAfterSec}s`);

  // Which providers are even wired up on this deployment — a key silently
  // dropping out of the env is itself worth surfacing.
  const configured = [
    process.env.LLM_BASE_URL && 'local',
    (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) && 'gemini',
    process.env.GROQ_API_KEY && 'groq',
    process.env.CEREBRAS_API_KEY && 'cerebras',
    process.env.GROQ_API_KEY && 'groq-qwen',
    process.env.OPENROUTER_API_KEY && 'openrouter',
  ].filter((v): v is string => !!v);

  const [primary, aux] = await Promise.all([probeTier('primary'), probeTier('aux')]);

  const tiers = { primary, aux };
  const worstIdx = Math.max(primary.idx ?? 99, aux.idx ?? 99);
  const anyFailed = !primary.ok || !aux.ok;
  const degraded = worstIdx >= 1;
  const alarm = anyFailed || worstIdx >= 2;

  const body = {
    ok: !anyFailed,
    checkedAt: new Date().toISOString(),
    configured,
    tiers,
    degraded,
    alarm,
    summary:
      `primary=${primary.provider ?? 'FAIL'}(idx${primary.idx ?? '?'},${primary.ms ?? '?'}ms) ` +
      `aux=${aux.provider ?? 'FAIL'}(idx${aux.idx ?? '?'},${aux.ms ?? '?'}ms)` +
      (alarm ? ' ALARM' : degraded ? ' degraded' : ' ok'),
  };

  return NextResponse.json(body, {
    status: alarm ? 503 : 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
