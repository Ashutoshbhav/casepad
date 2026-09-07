// provider-circuit-breaker.ts — pure state machine deciding whether a given LLM
// provider should even be attempted right now, on top of llm-router.ts's existing
// per-request retry/fallback. Why this exists: the router already falls through to
// the next provider on a 429/5xx/timeout, but it re-attempts every provider from
// scratch on every single new request — if a provider is exhausted for the day
// (Groq's shared 100K-tokens/day cap, the real 2026-07-24 incident referenced in
// llm-router.ts's own header) or is hanging on every call (NVIDIA, same incident),
// every subsequent request still pays that provider's full CONNECT_TIMEOUT_MS
// before falling through, request after request, for as long as the outage lasts.
// A circuit breaker remembers recent failures and skips a provider outright for a
// cooldown window once it's crossed a failure threshold, so the cost of an ongoing
// outage is paid once (a short burst of failures) rather than on every request.
//
// Pure + timestamp-injected (no Date.now() inside), same convention as
// rambling-tracker.ts / barge-in-confirm.ts, so this is unit-testable with
// synthetic timestamps. llm-router.ts owns the actual module-level Map instance
// and wall-clock calls; this file only owns the decision logic.
//
// Honesty note for whoever wires this into a serverless deployment: this state
// lives in process memory, so it only helps within one warm function instance's
// lifetime, not guaranteed across cold starts or concurrent instances on Vercel.
// That's still a real, meaningful win (warm-instance reuse is the common case for
// a live interview session hitting the same route repeatedly) — just not a
// cross-instance guarantee, and never a substitute for the router's own per-request
// fallback, which stays authoritative regardless of this state.

// Consecutive failures before a provider's circuit opens (skipped outright).
// Low on purpose — this exists to catch a provider that is CURRENTLY down, not to
// second-guess a single transient blip, which the router's own per-request
// fallback already handles fine on its own.
export const FAILURE_THRESHOLD = 3;

// How long the circuit stays open once tripped, before the next request is
// allowed through as a probe. Short enough that a recovered provider isn't
// needlessly skipped for long, long enough that an exhausted daily quota or a
// genuine outage doesn't get re-probed on every single request in the meantime.
export const COOLDOWN_MS = 30_000;

export type CircuitState = {
  consecutiveFailures: number;
  openUntilMs: number | null;
};

export const initialCircuitState: CircuitState = {
  consecutiveFailures: 0,
  openUntilMs: null,
};

/** True if the circuit is currently open, i.e. this provider should be SKIPPED
 *  rather than attempted. A closed or half-open (cooldown elapsed) circuit lets
 *  the request through, which is what actually re-tests a recovered provider. */
export function isOpen(state: CircuitState, nowMs: number): boolean {
  return state.openUntilMs !== null && nowMs < state.openUntilMs;
}

/** Call after a provider attempt succeeds. Fully resets the circuit — one good
 *  response is enough to trust the provider again, deliberately not a gradual
 *  decay, so recovery is as fast as failure detection. */
export function onSuccess(): CircuitState {
  return initialCircuitState;
}

/** Call after a provider attempt fails (429, 5xx, timeout, thrown error). Trips
 *  the circuit open once FAILURE_THRESHOLD consecutive failures are reached. */
export function onFailure(
  state: CircuitState,
  nowMs: number,
  threshold: number = FAILURE_THRESHOLD,
  cooldownMs: number = COOLDOWN_MS
): CircuitState {
  const consecutiveFailures = state.consecutiveFailures + 1;
  if (consecutiveFailures >= threshold) {
    return { consecutiveFailures, openUntilMs: nowMs + cooldownMs };
  }
  return { consecutiveFailures, openUntilMs: null };
}
