'use client';

// Sketchy primitives — Rough.js building blocks reused across all v2
// surfaces so the hand-drawn instrumentation grammar runs through
// every page (Ash's brief: "want that theme to be present across the
// site"). Photos stay reserved for /signin only; the SKETCHY
// LANGUAGE persists everywhere as the continuous brand thread.

import { useEffect, useRef } from 'react';
import rough from 'roughjs';

// ----------------------------------------------------------------------
// SketchyLine — horizontal hand-drawn line. Replaces clean 1px hairlines.
// ----------------------------------------------------------------------
export function SketchyLine({
  stroke = 'rgb(50,50,52)',
  strokeWidth = 1.4,
  roughness = 1.6,
  bowing = 1,
  className,
  style,
}: {
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  bowing?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const w = svg.clientWidth || 800;
    svg.setAttribute('viewBox', `0 0 ${w} 12`);
    svg.appendChild(rc.line(4, 6, w - 4, 6, {
      stroke, strokeWidth, roughness, bowing, seed: 42,
    }));
  }, [stroke, strokeWidth, roughness, bowing]);
  return (
    <svg
      ref={ref}
      preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height: 12, ...style }}
      className={className}
      aria-hidden="true"
    />
  );
}

// ----------------------------------------------------------------------
// SketchyCircle — hand-drawn ring or filled dot, used for streak markers.
// ----------------------------------------------------------------------
export function SketchyCircle({
  size = 72,
  filled = false,
  stroke = 'rgb(50,50,52)',
  fillColor,
  roughness = 1.4,
  className,
  style,
  children,
}: {
  size?: number;
  filled?: boolean;
  stroke?: string;
  fillColor?: string;
  roughness?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    const c = rc.circle(size / 2, size / 2, size - 6, {
      stroke,
      strokeWidth: 1.6,
      roughness,
      fill: filled ? (fillColor ?? stroke) : 'none',
      fillStyle: filled ? 'solid' : undefined,
      seed: Math.floor(size * 7),
    });
    svg.appendChild(c);
  }, [size, filled, stroke, fillColor, roughness]);
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <svg
        ref={ref}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-hidden="true"
      />
      {children && (
        <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// SketchyConnector — short horizontal hand-drawn line used between
// streak circles to suggest the days are connected (a thread).
// ----------------------------------------------------------------------
export function SketchyConnector({
  width = 14,
  stroke = 'rgba(50,50,52,0.45)',
  className,
  style,
}: {
  width?: number;
  stroke?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    svg.setAttribute('viewBox', `0 0 ${width} 8`);
    svg.appendChild(rc.line(0, 4, width, 4, {
      stroke,
      strokeWidth: 1.2,
      roughness: 1.8,
      bowing: 0,
      seed: width * 3,
    }));
  }, [width, stroke]);
  return (
    <svg
      ref={ref}
      preserveAspectRatio="none"
      style={{ display: 'inline-block', width, height: 8, ...style }}
      className={className}
      aria-hidden="true"
    />
  );
}

// ----------------------------------------------------------------------
// SketchyUnderline — big squiggly hand-drawn line used as an
// editorial underline beneath display headlines (debrief score).
// ----------------------------------------------------------------------
export function SketchyUnderline({
  stroke = 'rgb(50,50,52)',
  strokeWidth = 4,
  roughness = 2.2,
  bowing = 3,
  className,
  style,
}: {
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  bowing?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const w = svg.clientWidth || 600;
    svg.setAttribute('viewBox', `0 0 ${w} 24`);
    svg.appendChild(rc.line(8, 14, w - 8, 14, {
      stroke, strokeWidth, roughness, bowing, seed: 1729,
    }));
  }, [stroke, strokeWidth, roughness, bowing]);
  return (
    <svg
      ref={ref}
      preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height: 24, ...style }}
      className={className}
      aria-hidden="true"
    />
  );
}

// ----------------------------------------------------------------------
// SketchyProgressBar — hand-drawn stroked rectangle with a partial
// fill bar inside. Used for sub-score bars on /debrief.
// ----------------------------------------------------------------------
export function SketchyProgressBar({
  pct,
  height = 28,
  stroke = 'rgb(50,50,52)',
  fillColor = 'rgb(50,50,52)',
  roughness = 1.6,
}: {
  pct: number; // 0..100
  height?: number;
  stroke?: string;
  fillColor?: string;
  roughness?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const w = svg.clientWidth || 400;
    svg.setAttribute('viewBox', `0 0 ${w} ${height}`);
    // Outer rectangle
    svg.appendChild(rc.rectangle(2, 2, w - 4, height - 4, {
      stroke,
      strokeWidth: 1.6,
      roughness,
      fill: 'none',
      seed: 7,
    }));
    // Inner fill bar
    const fillW = Math.max(0, ((w - 8) * Math.min(100, Math.max(0, pct))) / 100);
    if (fillW > 4) {
      svg.appendChild(rc.rectangle(4, 4, fillW, height - 8, {
        stroke: fillColor,
        strokeWidth: 1,
        fill: fillColor,
        fillStyle: 'hachure',
        hachureGap: 4,
        hachureAngle: -45,
        roughness: 1.2,
        seed: Math.round(pct * 13),
      }));
    }
  }, [pct, height, stroke, fillColor, roughness]);
  return (
    <svg
      ref={ref}
      preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height }}
      aria-hidden="true"
    />
  );
}

// ----------------------------------------------------------------------
// SketchyCornerTick — small angle-bracket mark in the corner of a card.
// Used as decorative "this thing exists" instrumentation on case cards.
// ----------------------------------------------------------------------
export function SketchyCornerTick({
  size = 18,
  stroke = '#FFFFFF',
  strokeWidth = 1.4,
  className,
  style,
}: {
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    // Two strokes forming a corner bracket (top-right)
    svg.appendChild(rc.line(2, 2, size - 2, 2, {
      stroke, strokeWidth, roughness: 1.4, seed: 11,
    }));
    svg.appendChild(rc.line(size - 2, 2, size - 2, size - 2, {
      stroke, strokeWidth, roughness: 1.4, seed: 13,
    }));
  }, [size, stroke, strokeWidth]);
  return (
    <svg
      ref={ref}
      style={{ width: size, height: size, ...style }}
      className={className}
      aria-hidden="true"
    />
  );
}
