// Shared auth + rate-limit gate for /api/* routes.
//
// Replaces a repeated boilerplate that was applied inconsistently across the
// 11 route handlers (some had auth, some didn't; only /api/chat had rate
// limits). Going into a public LinkedIn launch, every authenticated route
// MUST be rate-limited per-user to cap money loss if an account is abused,
// and every expensive route MUST require auth to prevent anonymous abuse
// of paid APIs (Groq, Tavily).
//
// Usage in a route handler:
//
//   const gate = await gateRequest({ routeName: 'crammer', perUserPerMinute: 10 });
//   if (!gate.ok) return gate.response;
//   const { user, supabase } = gate;
//
// For routes with a session axis (chat-turn scoped), pass both limits:
//
//   const gate = await gateRequest({
//     routeName: 'cheatsheet', perUserPerMinute: 60,
//     sessionId, perSessionPerMinute: 30,
//   });

import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export interface GateOptions {
  /** Stable namespace for rate-limit keys + log lines. e.g. 'crammer'. */
  routeName: string;
  /** Hard cap per authenticated user, sliding 60-second window by default. */
  perUserPerMinute: number;
  /** Optional second axis — pass the session id from the request body. */
  sessionId?: string;
  /** When sessionId is provided, the per-session cap also applies. */
  perSessionPerMinute?: number;
  /** Override the default 60_000ms window. Rarely useful. */
  windowMs?: number;
}

export type GateResult =
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; response: Response };

export async function gateRequest(opts: GateOptions): Promise<GateResult> {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userData?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }
  const user = userData.user;

  const windowMs = opts.windowMs ?? 60_000;

  const rlUser = checkRateLimit(
    `${opts.routeName}:user:${user.id}`,
    opts.perUserPerMinute,
    windowMs
  );
  if (!rlUser.ok) {
    console.warn(
      `[${opts.routeName}] rate-limit user=${user.id} retry=${rlUser.retryAfterSec}s`
    );
    return rateLimited(rlUser.retryAfterSec, 'user');
  }

  if (opts.sessionId && typeof opts.perSessionPerMinute === 'number') {
    const rlSession = checkRateLimit(
      `${opts.routeName}:session:${opts.sessionId}`,
      opts.perSessionPerMinute,
      windowMs
    );
    if (!rlSession.ok) {
      console.warn(
        `[${opts.routeName}] rate-limit session=${opts.sessionId} retry=${rlSession.retryAfterSec}s`
      );
      return rateLimited(rlSession.retryAfterSec, 'session');
    }
  }

  return { ok: true, user, supabase };
}

function rateLimited(retryAfterSec: number, axis: 'user' | 'session'): GateResult {
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: 'rate_limited',
        scope: axis,
        retry_after_sec: retryAfterSec,
        message:
          axis === 'user'
            ? 'You\'re sending requests faster than a real user — slow down.'
            : 'Too many requests on this session — slow down.',
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSec) },
      }
    ),
  };
}
