'use client';

// DecisionTreeOverlay — the signature element of the HUPR-flavor design.
// Renders a hand-drawn-style decision tree using Rough.js, positioned
// absolutely over the empty-boardroom photo at the spot where a
// candidate's notebook would lie on the table.
//
// CONCEPT (post-research): HUPR overlays motion-capture dots on an
// athlete photo to *instrument* physical movement. CasePad overlays a
// decision-tree on an empty-boardroom photo to instrument *mental*
// movement. Same visual grammar (small dot endpoints + thin connector
// lines), different domain. The empty room amplifies the absence — the
// user mentally inserts themselves into the chair.
//
// Tree structure shown is the canonical "Profitability Framework":
//   Root: Profit drop
//   ├ Revenue side
//   │  ├ Volume
//   │  └ Price
//   └ Cost side
//      ├ Variable
//      └ Fixed
//
// Anyone in B-school case prep recognizes this immediately. That's the
// point — the overlay is *content*, not decoration.

import { useEffect, useRef } from 'react';
import rough from 'roughjs';

interface Props {
  // Stroke color for the tree (typically white at low alpha on photo)
  stroke?: string;
  // 1 = sketchy, 0 = clean. Rough.js default is 1; we want subtle.
  roughness?: number;
  // Bowing amount — how much the lines curve as if hand-drawn
  bowing?: number;
}

// Tree topology — viewBox is 800×500. Root at top-center, branches fan
// down. All coordinates in the SVG viewBox space.
const NODES: Array<{ id: string; x: number; y: number; label: string; size?: number }> = [
  { id: 'root', x: 400, y: 60, label: 'Profit Δ', size: 12 },
  { id: 'rev', x: 240, y: 200, label: 'Revenue', size: 10 },
  { id: 'cost', x: 560, y: 200, label: 'Cost', size: 10 },
  { id: 'vol', x: 140, y: 360, label: 'Volume', size: 8 },
  { id: 'price', x: 320, y: 360, label: 'Price', size: 8 },
  { id: 'var', x: 480, y: 360, label: 'Variable', size: 8 },
  { id: 'fixed', x: 640, y: 360, label: 'Fixed', size: 8 },
];

const EDGES: Array<[string, string]> = [
  ['root', 'rev'],
  ['root', 'cost'],
  ['rev', 'vol'],
  ['rev', 'price'],
  ['cost', 'var'],
  ['cost', 'fixed'],
];

export function DecisionTreeOverlay({
  stroke = 'rgba(255, 255, 255, 0.78)',
  roughness = 1.4,
  bowing = 1.6,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous renders (in case props change)
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);

    // Edges first (so nodes draw on top)
    EDGES.forEach(([a, b]) => {
      const na = NODES.find((n) => n.id === a)!;
      const nb = NODES.find((n) => n.id === b)!;
      const line = rc.line(na.x, na.y, nb.x, nb.y, {
        stroke,
        strokeWidth: 1.2,
        roughness,
        bowing,
        seed: a.charCodeAt(0) + b.charCodeAt(0),
      });
      svg.appendChild(line);
    });

    // Nodes — small filled rectangles (HUPR's mocap-dot grammar)
    NODES.forEach((n) => {
      const s = n.size ?? 8;
      const node = rc.rectangle(n.x - s / 2, n.y - s / 2, s, s, {
        stroke,
        strokeWidth: 1.4,
        fill: stroke,
        fillStyle: 'solid',
        roughness: 0.6,
        seed: n.id.charCodeAt(0) * 7,
      });
      svg.appendChild(node);
    });

    // Tiny circle outline at the root for variation (HUPR mixes shapes)
    const root = NODES[0];
    const ring = rc.circle(root.x, root.y, 24, {
      stroke,
      strokeWidth: 1.0,
      fill: 'none',
      roughness: 1.6,
      seed: 999,
    });
    svg.appendChild(ring);

    // Hand-drawn labels next to each node — appended as plain SVG text
    // (Rough.js doesn't draw text; we add it ourselves at the right
    // baseline-aligned offset, using the page's mono font.)
    NODES.forEach((n) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(n.x + 14));
      text.setAttribute('y', String(n.y + 4));
      text.setAttribute('fill', stroke);
      text.setAttribute('font-family', 'var(--font-v2-mono), monospace');
      text.setAttribute('font-size', '11');
      text.setAttribute('letter-spacing', '0.04em');
      text.textContent = n.label;
      svg.appendChild(text);
    });
  }, [stroke, roughness, bowing]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}
