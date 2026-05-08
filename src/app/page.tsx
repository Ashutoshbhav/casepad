// Home page — public marketing landing. Uses HuprDesign's stats / tracks
// / spheres / news / footer composition but swaps in a custom HomeHero
// instead of the signin-shaped marquee+right-card hero. That keeps the
// home page visually distinct from /auth/signin.

import { HuprDesign } from './design-lab/hupr/_components/hupr-design';
import { HomeHero } from '@/components/home-hero';

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
      customHero={<HomeHero />}
    />
  );
}
