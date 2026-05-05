import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Shared admin check for every Design Lab v2 route. Server-side: redirects to
// /auth/signin if no session, returns a JSX fallback if the user isn't the
// configured ADMIN_EMAIL. The page caller decides whether to render or return
// the fallback.

export async function requireAdminOrFallback() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/auth/signin');

  const isAdmin =
    session.user.email?.toLowerCase() ===
    process.env.ADMIN_EMAIL?.toLowerCase();

  if (!isAdmin) {
    return {
      ok: false as const,
      fallback: (
        <main className="min-h-screen p-8 max-w-2xl mx-auto">
          <Link
            href="/cases"
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            &larr; back to cases
          </Link>
          <h1 className="text-2xl font-semibold mt-3">Not admin.</h1>
        </main>
      ),
    };
  }

  return { ok: true as const, email: session.user.email };
}
