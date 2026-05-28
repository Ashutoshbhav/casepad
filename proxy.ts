import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic =
    path.startsWith('/auth') ||
    path === '/' ||
    path.startsWith('/_next') ||
    path.startsWith('/api/auth');

  if (!user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/signin';
    return NextResponse.redirect(url);
  }

  // Signed-in users should not land back on the marketing page — every
  // path into `/` (the logo, deep-linking from outside, a stale bookmark)
  // would otherwise show them a hero with a "Sign in" CTA in the menu
  // and no sign-out drawer (the global TopNav is hidden on `/` to keep
  // the marketing layout clean). Redirect them home to /dashboard.
  if (user && path === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return res;
}

// Explicitly exclude /auth/signin and /auth/no-access. They are static pages
// (no auth check needed) and Vercel's adapter was failing the build with
// "Unable to find lambda for route: /auth/signin" because proxy-touched
// routes need lambdas, but these pages prerender to plain HTML.
// /auth/callback stays in — it's a route handler / lambda already.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/signin|auth/no-access).*)'],
};
