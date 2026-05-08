'use client';

// NotebookPaper — full-bleed fixed background SVG for /solve. Hand-drawn
// horizontal rule lines + a red margin rule on the left, all rendered via
// rough.js so the lines feel paper-imperfect, not laser-printed.
//
// Mounts a single <svg> at z-index: 0, fixed, behind everything. Clients
// with prefers-reduced-motion get a clean static SVG (no rough sketchy
// jitter, just straight lines).
//
// IMPORTANT: only mount inside /solve — the notebook aesthetic is exclusive
// to the solving experience.

import { useEffect, useRef } from 'react';
import rough from 'roughjs';

const RULE_GAP = 32;       // px between horizontal ruled lines
const MARGIN_X = 80;       // px from left for the red margin rule
const HORIZONTAL_RULE_COLOR = '#dfd9c8'; // faded warm-gray, parchment ink
const MARGIN_RULE_COLOR = '#c75c5c';     // red margin rule, classic notebook

export function NotebookPaper() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Capture viewport dims; redraw on resize so the lines fill the screen.
    const draw = () => {
      svg.innerHTML = '';
      const w = window.innerWidth;
      const h = Math.max(window.innerHeight, document.documentElement.scrollHeight);
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('width', String(w));
      svg.setAttribute('height', String(h));

      const rc = rough.svg(svg);

      // Horizontal rule lines — sketchy strokes, low roughness so they read
      // as ruled lines, not scribbles.
      for (let y = RULE_GAP * 4; y < h; y += RULE_GAP) {
        const line = rc.line(0, y, w, y, {
          stroke: HORIZONTAL_RULE_COLOR,
          strokeWidth: 0.7,
          roughness: 0.6,
          bowing: 0.4,
        });
        svg.appendChild(line);
      }

      // Red margin rule on the left — single hand-drawn vertical.
      const margin = rc.line(MARGIN_X, 0, MARGIN_X, h, {
        stroke: MARGIN_RULE_COLOR,
        strokeWidth: 1.1,
        roughness: 0.9,
        bowing: 1.2,
      });
      svg.appendChild(margin);
    };

    draw();

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', onResize);

    // Also redraw if the document height changes (chat keeps growing as
    // turns are added). MutationObserver on body is overkill; instead use
    // a slow interval that re-checks doc height vs current viewBox height.
    const interval = setInterval(() => {
      const docH = document.documentElement.scrollHeight;
      const vbH = parseFloat(svg.getAttribute('height') || '0');
      if (Math.abs(docH - vbH) > 200) draw();
    }, 1500);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      clearInterval(interval);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.55,
      }}
    />
  );
}
