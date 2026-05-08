// Home page — HUPR landing composition. Mirrors /auth/signin's layout
// (marquee + stats + sticky tracks + spheres + news pair) but renders a
// marketing CTA card in the hero-right slot instead of the sign-in form.
//
// Public — no auth gate. Signed-in users see this page if they navigate
// here directly via the top-nav logo.

import { HuprDesign } from './design-lab/hupr/_components/hupr-design';
import { HomeHeroCard } from '@/components/home-hero-card';

export default function HomePage() {
  return (
    <HuprDesign
      eyebrow="Cohort case prep · 2026"
      menuLinks={[
        { label: 'How it works', href: '#tracks' },
        { label: 'Cohort', href: '#spheres' },
        { label: 'News', href: '#news' },
        { label: 'Sign in', href: '/auth/signin' },
      ]}
      heroRightCard={<HomeHeroCard />}
    />
  );
}
