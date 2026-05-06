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

import { HuprDesign } from '@/app/design-lab/hupr/_components/hupr-design';
import { SignInCard } from './_components/signin-card';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; return_to?: string }>;
}) {
  const sp = await searchParams;
  const showSessionExpired = sp.error === 'expired' || !!sp.return_to;

  return (
    <HuprDesign
      eyebrow="Cohort · May 2026"
      menuLinks={[
        { label: 'How it works', href: '#tracks' },
        { label: 'Cohort', href: '#spheres' },
        { label: 'News', href: '#news' },
      ]}
      heroRightCard={
        <SignInCard
          errorCode={sp.error}
          returnTo={sp.return_to}
          showSessionExpired={showSessionExpired}
        />
      }
    />
  );
}
