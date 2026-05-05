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

import { useEffect, useRef, useState } from 'react';
import rough from 'roughjs';

interface Props {
  // Stroke color for the tree (typically white at low alpha on photo)
  stroke?: string;
  // 1 = sketchy, 0 = clean. Rough.js default is 1; we want subtle.
  roughness?: number;
  // Bowing amount — how much the lines curve as if hand-drawn
  bowing?: number;
  // Optional deterministic seed for the tree pick. When undefined, a
  // random tree is picked on the client per visit.
  seed?: number;
}

// Tree topology library — 5 canonical case-prep frameworks. One picked
// at random per visit so the overlay feels alive. ViewBox is 800×500.
type TreeNode = { id: string; x: number; y: number; label: string; size?: number };
type TreeShape = { name: string; nodes: TreeNode[]; edges: Array<[string, string]> };

const TREES: TreeShape[] = [
  {
    name: 'Profitability',
    nodes: [
      { id: 'root', x: 400, y: 60, label: 'Profit Δ', size: 12 },
      { id: 'rev', x: 240, y: 200, label: 'Revenue', size: 10 },
      { id: 'cost', x: 560, y: 200, label: 'Cost', size: 10 },
      { id: 'vol', x: 140, y: 360, label: 'Volume', size: 8 },
      { id: 'price', x: 320, y: 360, label: 'Price', size: 8 },
      { id: 'var', x: 480, y: 360, label: 'Variable', size: 8 },
      { id: 'fixed', x: 640, y: 360, label: 'Fixed', size: 8 },
    ],
    edges: [
      ['root', 'rev'], ['root', 'cost'],
      ['rev', 'vol'], ['rev', 'price'],
      ['cost', 'var'], ['cost', 'fixed'],
    ],
  },
  {
    name: 'Market Entry',
    nodes: [
      { id: 'root', x: 400, y: 60, label: 'Enter?', size: 12 },
      { id: 'mkt', x: 200, y: 200, label: 'Market', size: 10 },
      { id: 'comp', x: 400, y: 200, label: 'Competition', size: 10 },
      { id: 'cap', x: 600, y: 200, label: 'Capability', size: 10 },
      { id: 'size', x: 120, y: 360, label: 'Size', size: 8 },
      { id: 'grow', x: 280, y: 360, label: 'Growth', size: 8 },
      { id: 'rivals', x: 400, y: 360, label: 'Rivals', size: 8 },
      { id: 'fit', x: 560, y: 360, label: 'Fit', size: 8 },
      { id: 'cost2', x: 680, y: 360, label: 'Cost', size: 8 },
    ],
    edges: [
      ['root', 'mkt'], ['root', 'comp'], ['root', 'cap'],
      ['mkt', 'size'], ['mkt', 'grow'],
      ['comp', 'rivals'],
      ['cap', 'fit'], ['cap', 'cost2'],
    ],
  },
  {
    name: 'M&A',
    nodes: [
      { id: 'root', x: 400, y: 60, label: 'Synergy', size: 12 },
      { id: 'rev', x: 250, y: 200, label: 'Revenue +', size: 10 },
      { id: 'cost', x: 550, y: 200, label: 'Cost −', size: 10 },
      { id: 'cross', x: 160, y: 360, label: 'Cross-sell', size: 8 },
      { id: 'pricing', x: 340, y: 360, label: 'Pricing', size: 8 },
      { id: 'hq', x: 460, y: 360, label: 'HQ ops', size: 8 },
      { id: 'supply', x: 640, y: 360, label: 'Supply', size: 8 },
    ],
    edges: [
      ['root', 'rev'], ['root', 'cost'],
      ['rev', 'cross'], ['rev', 'pricing'],
      ['cost', 'hq'], ['cost', 'supply'],
    ],
  },
  {
    name: 'Pricing',
    nodes: [
      { id: 'root', x: 400, y: 60, label: 'Price?', size: 12 },
      { id: 'cost', x: 220, y: 200, label: 'Cost-plus', size: 10 },
      { id: 'value', x: 400, y: 200, label: 'Value', size: 10 },
      { id: 'comp', x: 580, y: 200, label: 'Competitive', size: 10 },
      { id: 'cogs', x: 180, y: 360, label: 'COGS', size: 8 },
      { id: 'wtp', x: 380, y: 360, label: 'WTP', size: 8 },
      { id: 'switch', x: 480, y: 360, label: 'Switch', size: 8 },
      { id: 'undercut', x: 620, y: 360, label: 'Undercut', size: 8 },
    ],
    edges: [
      ['root', 'cost'], ['root', 'value'], ['root', 'comp'],
      ['cost', 'cogs'],
      ['value', 'wtp'], ['value', 'switch'],
      ['comp', 'undercut'],
    ],
  },
  {
    name: 'GTM',
    nodes: [
      { id: 'root', x: 400, y: 60, label: 'Channel', size: 12 },
      { id: 'direct', x: 220, y: 200, label: 'Direct', size: 10 },
      { id: 'partner', x: 400, y: 200, label: 'Partner', size: 10 },
      { id: 'mp', x: 580, y: 200, label: 'Marketplace', size: 10 },
      { id: 'sales', x: 140, y: 360, label: 'Sales', size: 8 },
      { id: 'self', x: 300, y: 360, label: 'Self-serve', size: 8 },
      { id: 'distrib', x: 420, y: 360, label: 'Distrib.', size: 8 },
      { id: 'brand', x: 540, y: 360, label: 'Brand', size: 8 },
      { id: 'fee', x: 660, y: 360, label: 'Fee', size: 8 },
    ],
    edges: [
      ['root', 'direct'], ['root', 'partner'], ['root', 'mp'],
      ['direct', 'sales'], ['direct', 'self'],
      ['partner', 'distrib'], ['partner', 'brand'],
      ['mp', 'fee'],
    ],
  },
];

// Pick a tree topology — caller can pass a seed (e.g. day-of-year so
// each daily visit gets a different tree predictably) or leave undefined
// to get a true random pick per render.
function pickTree(seed?: number): TreeShape {
  const idx = seed != null ? Math.abs(seed) % TREES.length : Math.floor(Math.random() * TREES.length);
  return TREES[idx];
}

export function DecisionTreeOverlay({
  stroke = 'rgba(255, 255, 255, 0.78)',
  roughness = 1.4,
  bowing = 1.6,
  seed,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  // Pick the tree once on mount — useState lazy initializer keeps the
  // random draw client-side and stable across re-renders.
  const [tree] = useState<TreeShape>(() => pickTree(seed));
  const [labelName] = useState<string>(() => tree.name);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous renders (in case props change)
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);

    // Edges first (so nodes draw on top)
    tree.edges.forEach(([a, b]) => {
      const na = tree.nodes.find((n) => n.id === a)!;
      const nb = tree.nodes.find((n) => n.id === b)!;
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
    tree.nodes.forEach((n) => {
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
    const root = tree.nodes[0];
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
    tree.nodes.forEach((n) => {
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

    // Framework name caption — small mono caps in the lower-right of
    // the tree, like a research-paper figure label
    const caption = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    caption.setAttribute('x', '740');
    caption.setAttribute('y', '460');
    caption.setAttribute('fill', stroke);
    caption.setAttribute('text-anchor', 'end');
    caption.setAttribute('font-family', 'var(--font-v2-mono), monospace');
    caption.setAttribute('font-size', '10');
    caption.setAttribute('letter-spacing', '0.18em');
    caption.textContent = `FRAMEWORK · ${labelName.toUpperCase()}`;
    svg.appendChild(caption);
  }, [stroke, roughness, bowing, tree, labelName]);

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
