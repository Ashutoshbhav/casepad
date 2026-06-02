'use client';

// IssueTreeSketch — a hand-drawn (Rough.js), top-down VISUAL issue tree for the
// debrief's "ideal answer". Root at top, branches fanning downward as sketched
// boxes connected by hand-drawn lines, with text wrapped in each box AND a
// small "note" under each node (the assumption / reasoning for digging there —
// e.g. "price is contract-fixed → it's volume-led"). Horizontally scrollable.
//
// Reuses the Rough.js + SVG + halo-text recipe from DecisionTreeOverlay, but
// computes node positions dynamically from the generated tree.

import { useEffect, useRef } from 'react';
import rough from 'roughjs';

export type SketchNode = { label: string; note?: string; children?: SketchNode[] };

// Accept either the new {label, note, children} shape or legacy {node, subnodes}.
function normalize(input: unknown): SketchNode[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw): SketchNode => {
      if (typeof raw === 'string') return { label: raw };
      const n = (raw ?? {}) as Record<string, unknown>;
      const label = String(n.label ?? n.node ?? '').trim();
      const note = typeof n.note === 'string' && n.note.trim() ? n.note.trim() : undefined;
      const children = normalize((n.children ?? n.subnodes ?? []) as unknown);
      const out: SketchNode = children.length ? { label, children } : { label };
      if (note) out.note = note;
      return out;
    })
    .filter((n) => n.label.length > 0);
}

// ── layout constants ──────────────────────────────────────────────────────
const BOX_W = 156;
const BOX_H = 44;
const H_GAP = 36;
const V_GAP = 124; // room for a box + a 2-line note + connector
const SLOT = BOX_W + H_GAP;
const PAD = 18;
const NOTE_LH = 12;

function wrapText(label: string, maxChars: number, maxLines: number): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) cur = (cur + ' ' + w).trim();
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].slice(0, maxChars - 1) + '…';
    return kept;
  }
  return lines.length ? lines : [label];
}

type Placed = {
  lines: string[];
  noteLines: string[];
  x: number;
  y: number;        // box top
  bottomY: number;  // where outgoing connectors start (below box + note)
  depth: number;
};

export function IssueTreeSketch({
  root,
  branches,
  stroke = 'var(--color-accent, #b45309)',
}: {
  root: string;
  branches: unknown;
  stroke?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const tree: SketchNode = { label: root || 'Root question', children: normalize(branches) };

  const placed: Placed[] = [];
  const edges: Array<[number, number]> = [];
  let nextLeaf = 0;
  let maxDepth = 0;

  function place(node: SketchNode, depth: number): { idx: number; cx: number } {
    maxDepth = Math.max(maxDepth, depth);
    const kids = node.children ?? [];
    const noteLines = node.note ? wrapText(node.note, 30, 2) : [];
    const y = PAD + depth * V_GAP;
    const bottomY = y + BOX_H + (noteLines.length ? 4 + noteLines.length * NOTE_LH : 0);
    let cx: number;
    let childResults: Array<{ idx: number; cx: number }> = [];
    if (!kids.length) {
      cx = PAD + nextLeaf * SLOT + BOX_W / 2;
      nextLeaf += 1;
    } else {
      childResults = kids.map((k) => place(k, depth + 1));
      cx = childResults.reduce((s, c) => s + c.cx, 0) / childResults.length;
    }
    const idx = placed.length;
    placed.push({ lines: wrapText(node.label, 22, 2), noteLines, x: cx, y, bottomY, depth });
    childResults.forEach((c) => edges.push([idx, c.idx]));
    return { idx, cx };
  }
  place(tree, 0);

  const width = Math.max(PAD * 2 + nextLeaf * SLOT, BOX_W + PAD * 2);
  const height = PAD * 2 + (maxDepth + 1) * V_GAP;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);

    // Connectors first (from below parent's note → child box top).
    edges.forEach(([from, to], i) => {
      const a = placed[from];
      const b = placed[to];
      svg.appendChild(
        rc.line(a.x, a.bottomY, b.x, b.y, {
          stroke, strokeWidth: 1.3, roughness: 1.1, bowing: 1.2, seed: i + 1,
        })
      );
    });

    // Node boxes.
    placed.forEach((p, i) => {
      svg.appendChild(
        rc.rectangle(p.x - BOX_W / 2, p.y, BOX_W, BOX_H, {
          stroke,
          strokeWidth: p.depth === 0 ? 1.9 : 1.3,
          roughness: 1.15,
          bowing: 1,
          fill: 'var(--color-bg-elevated, #faf8f5)',
          fillStyle: 'solid',
          seed: 100 + i,
        })
      );
    });

    const mkText = (x: number, y: number, opts: { size: number; weight: string; fill: string; italic?: boolean }) => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', String(x));
      t.setAttribute('y', String(y));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-family', 'var(--font-body), monospace');
      t.setAttribute('font-size', String(opts.size));
      t.setAttribute('font-weight', opts.weight);
      if (opts.italic) t.setAttribute('font-style', 'italic');
      t.setAttribute('fill', opts.fill);
      t.setAttribute('stroke', 'var(--color-bg-elevated, #faf8f5)');
      t.setAttribute('stroke-width', '3');
      t.setAttribute('stroke-linejoin', 'round');
      t.setAttribute('paint-order', 'stroke fill');
      return t;
    };

    // Labels (inside box).
    placed.forEach((p) => {
      const startY = p.y + BOX_H / 2 - ((p.lines.length - 1) * 13) / 2 + 4;
      const t = mkText(p.x, startY, {
        size: p.depth === 0 ? 13 : 12,
        weight: p.depth === 0 ? '600' : '500',
        fill: 'var(--color-text-primary, #1c1c1c)',
      });
      p.lines.forEach((ln, li) => {
        const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        ts.setAttribute('x', String(p.x));
        ts.setAttribute('dy', li === 0 ? '0' : '13');
        ts.textContent = ln;
        t.appendChild(ts);
      });
      svg.appendChild(t);
    });

    // Notes (the assumption/reasoning) — small + muted, just under each box.
    placed.forEach((p) => {
      if (!p.noteLines.length) return;
      const t = mkText(p.x, p.y + BOX_H + 12, {
        size: 9.5,
        weight: '400',
        fill: 'var(--color-text-muted, #8a8378)',
        italic: true,
      });
      p.noteLines.forEach((ln, li) => {
        const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        ts.setAttribute('x', String(p.x));
        ts.setAttribute('dy', li === 0 ? '0' : String(NOTE_LH));
        ts.textContent = li === 0 ? `“${ln}` : ln;
        if (li === p.noteLines.length - 1) ts.textContent += '”';
        t.appendChild(ts);
      });
      svg.appendChild(t);
    });
  }, [stroke, root, branches]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block', maxWidth: 'none' }}
        role="img"
        aria-label={`Issue tree for: ${root}`}
      />
    </div>
  );
}
