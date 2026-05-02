// Thin retry wrapper for Supabase calls.
//
// Retries transient failures (network errors / 5xx / rate limits) with
// exponential backoff. Does NOT retry on 4xx client errors — those won't
// change on retry (auth, not found, validation, RLS denies).
//
// Usage:
//   const { data, error } = await withRetry(() =>
//     supabase.from('cases').select('*').eq('id', id).single()
//   );
//
// The fn must be a thunk so each retry re-executes the query builder.

const DELAYS_MS = [200, 600, 1500];

// Accepts any Supabase/PostgREST query builder (a PromiseLike) or a real
// Promise. We use `unknown` + cast internally because the heterogeneous
// PostgREST builder generics defeat strict inference at call sites; users
// should still get the same `{ data, error }` runtime shape.
export async function withRetry<T = any>(
  fn: () => PromiseLike<{ data: T; error: any }>
): Promise<{ data: T; error: any }> {
  let lastResult: { data: T; error: any } = { data: null as any, error: null };

  for (let attempt = 0; attempt <= DELAYS_MS.length; attempt++) {
    let result: { data: T; error: any };
    try {
      // Wrap in Promise.resolve so PromiseLike thenables become real Promises.
      result = await Promise.resolve(fn() as any);
    } catch (err: any) {
      result = { data: null as any, error: err };
    }

    if (!result.error) return result;
    lastResult = result;

    if (!isRetryable(result.error)) return result;
    if (attempt === DELAYS_MS.length) return result;

    await sleep(DELAYS_MS[attempt]);
  }

  return lastResult;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: any): boolean {
  if (!error) return false;

  // PostgREST / Supabase shape: { status, code, message }
  const status: number | undefined =
    typeof error.status === 'number' ? error.status : undefined;
  if (status !== undefined) {
    if (status >= 500 && status < 600) return true; // 5xx
    if (status === 429) return true; // rate limit
    if (status === 408) return true; // request timeout
    if (status >= 400 && status < 500) return false; // other 4xx — don't retry
  }

  // Network-level failures from undici / fetch
  const message = String(error.message ?? error ?? '').toLowerCase();
  if (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('socket hang up') ||
    message.includes('enotfound') ||
    message.includes('eai_again') ||
    message.includes('aborted') ||
    message.includes('timeout')
  ) {
    return true;
  }

  // Node fetch errors expose a `cause` with the underlying TypeError
  if (error.cause) {
    const causeMsg = String(error.cause.message ?? error.cause ?? '').toLowerCase();
    if (
      causeMsg.includes('fetch failed') ||
      causeMsg.includes('network') ||
      causeMsg.includes('econnreset') ||
      causeMsg.includes('etimedout') ||
      causeMsg.includes('socket hang up') ||
      causeMsg.includes('enotfound')
    ) {
      return true;
    }
  }

  return false;
}
