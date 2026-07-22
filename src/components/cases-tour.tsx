'use client';

import { TourOverlay, type TourStep } from './tour-overlay';

const STEPS: TourStep[] = [
  {
    target: 'cases-track',
    title: 'Your track',
    body: 'CasePad supports consulting, IB, PM, marketing, and strategy tracks. Your active track filters which cases show up here. Switch via /onboarding/track anytime.',
  },
  {
    target: 'cases-filters',
    title: 'Filter the library',
    body: '1,100+ real cases. Filter by industry, type (profitability, market entry, M&A, …), and difficulty. Search by keyword.',
  },
  {
    target: 'cases-card',
    title: 'Click a card to start',
    body: 'A case drops you straight into a live voice interview with Ash — talk through it hands-free, same as the real thing. Prefer to type it out instead? Every card has a small "read + type it out" link too.',
  },
  {
    target: 'cases-tutorial-btn',
    title: 'First time? Take a guided case',
    body: 'Want a hand-held walkthrough on a curated easy case? Click "Take me through a case" — we point at every feature as you go.',
  },
  {
    target: 'topnav-drills',
    title: 'Drills + dashboard',
    body: 'Top bar has Drills (math / behavioral / recovery), Cheats (frameworks + scoring rubric), and Dashboard (your score curve over time). Always available from any page.',
  },
];

export function CasesTour() {
  return <TourOverlay steps={STEPS} storageKey="casepad-tour-seen" />;
}
