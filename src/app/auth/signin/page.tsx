// /auth/signin — full HUPR landing composition with the email form dropped
// into the floating right-card slot of the hero.
//
// This page IS the landing page — every prospect lands here first. So it
// carries the full HUPR composition: marquee headline, stats carousel, 3
// sticky stacking colored service cards, spheres click-to-switch, news pair,
// 124×124 btn-square apply CTA, footer. Same component used at
// /design-lab/hupr; the only difference is this page passes <SignInCard />
// into the heroRightCard slot instead of the default "What we do / Learn
// more" card.
//
// Server action `directSignIn` is unchanged — auth flow identical to the
// previous signin (email-only allowlist; mints session immediately on
// match; redirects with ?error= on failure).

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LaunchLanding } from './_components/launch-landing';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; return_to?: string }>;
}) {
  const sp = await searchParams;
  const showSessionExpired = sp.error === 'expired' || !!sp.return_to;

  // If the visitor is already signed in, bounce them straight to /dashboard.
  // Pre-2026-05-29 the signin page rendered for everyone, so users who
  // clicked the logo (which took them to `/`, then "Sign in" in that menu)
  // would see an empty form and think "wait, I'm already signed in" before
  // re-submitting. The proxy doesn't gate /auth/* (matcher excludes it),
  // so the redirect lives here at the page level instead.
  //
  // Honors a `return_to` query param so a deep-link recovery flow doesn't
  // dump the user on /dashboard when they were trying to reach a specific
  // page that bounced them through signin.
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const safeReturnTo =
      sp.return_to &&
      sp.return_to.startsWith('/') &&
      !sp.return_to.startsWith('//') &&
      !sp.return_to.startsWith('/auth')
        ? sp.return_to
        : null;
    redirect(safeReturnTo ?? '/dashboard');
  }

  return (
    <LaunchLanding
      errorCode={sp.error}
      returnTo={sp.return_to}
      showSessionExpired={showSessionExpired}
    />
  );
}
