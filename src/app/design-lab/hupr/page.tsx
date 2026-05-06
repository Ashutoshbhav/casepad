// /design-lab/hupr — HUPR.ca faithful adaptation.
//
// Forensically reverse-engineered on 2026-05-06 from:
//   https://hupr.ca/en/                    (home)
//   https://hupr.ca/en/about/              (about)
//   https://hupr.ca/wp-content/themes/hupr/assets/dist/css/main.css
//   https://hupr.ca/wp-content/themes/hupr/assets/dist/input.css
//
// Replicated section sequence + behavior:
//   1. Header + slide-in menu drawer (open from right)
//   2. Hero — fullscreen photo + auto-scrolling marquee headline
//      crossing it + floating white "service offer" card
//   3. Stats carousel (auto-advance 5500ms) + giant billboard h1
//   4. Three sticky stacking colored service cards (warm sand /
//      terracotta / sage)
//   5. Spheres of innovation — click-to-switch image
//   6. News pair
//   7. Footer
//
// Behavior layer:
//   - marquee: 25s linear infinite x-translate
//   - sticky cards: top 0 / 70 / 140px stack
//   - stats auto-advance 5500ms with prev/next
//   - menu drawer: slide-in from right with cascading link reveal
//   - image-zoom: scale(1.3) blur(4px) → scale(1) blur(0) on enter
//   - anim-btn: hover swaps two text layers via translateY

import { requireAdminOrFallback } from '../_lib/admin-gate';
import { HuprDesign } from './_components/hupr-design';

export const metadata = {
  title: 'Design Lab · HUPR replica',
  robots: { index: false },
};

export default async function HuprPage() {
  const gate = await requireAdminOrFallback();
  if (!gate.ok) return gate.fallback;
  return <HuprDesign />;
}
