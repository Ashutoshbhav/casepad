// Shared helper for the "table doesn't exist yet" fail-open pattern.
// Pure logic — safe to import from client OR server (no I/O, no env access),
// so we deliberately omit the `server-only` guard.
//
// Used by every read/write path that touches a table whose migration may
// not have been applied in Supabase Studio yet (the project ships migrations
// as SQL files; humans paste them by hand). Before this helper existed, the
// same Postgres error code was inspected in 3 places with subtly different
// idioms (try/catch vs error.code vs message-substring), one of which was
// dead code because supabase-js doesn't actually throw on PostgREST 4xx.
//
// PostgREST returns 42P01 (undefined_table) as a structured error on the
// `{data, error}` shape — never a thrown exception. Some legacy paths
// surface the same condition only via the error message, so we check both.

export function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code === '42P01') return true; // undefined_table — PostgREST canonical
  const msg = String(e.message ?? '').toLowerCase();
  // Defensive: some PostgREST proxies / wrappers strip the code but keep
  // the Postgres message text. Both "does not exist" and the relation-
  // mention form show up in the wild.
  return (
    msg.includes('does not exist') ||
    msg.includes('relation') && msg.includes('not found')
  );
}
