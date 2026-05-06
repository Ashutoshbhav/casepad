'use client';

// Mounts a single IntersectionObserver that watches every .hupr-image-zoom
// and .hupr-fade-up element on the page and adds .is-in when they enter the
// viewport. One-shot reveal: unobserves after first intersection.
//
// prefers-reduced-motion → instant .is-in (skip animation).
// IntersectionObserver missing → instant .is-in (graceful fallback).
//
// Drop this component once anywhere on a page that uses the HUPR reveal
// classes. Reusable across cases / dashboard / drills / cheatsheet / solve /
// debrief — all of which compose HUPR primitives but need the observer.

import { useEffect } from 'react';

export function HuprObserveReveals() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const targets = document.querySelectorAll<HTMLElement>(
      '.hupr-image-zoom, .hupr-fade-up'
    );

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    targets.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return null;
}
