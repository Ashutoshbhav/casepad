'use client';

// RoughRect — wraps children with a hand-drawn rough.js rectangle border.
// Used inside /solve to make panels / cards feel like sketchpad blocks
// instead of CSS rectangles.
//
// The border is drawn into an absolutely-positioned <svg> over the wrapper.
// ResizeObserver redraws whenever the wrapper changes size so the sketch
// always matches the box.

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import rough from 'roughjs';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  bowing?: number;
  fill?: string;       // sketchy fill if provided
  fillStyle?: 'hachure' | 'cross-hatch' | 'solid' | 'dots' | 'zigzag';
  padding?: number;    // padding between content and border
}

export function RoughRect({
  children,
  className,
  style,
  stroke = '#323234',
  strokeWidth = 1.4,
  roughness = 1.6,
  bowing = 1.0,
  fill,
  fillStyle = 'hachure',
  padding = 8,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const svg = svgRef.current;
    if (!wrapper || !svg) return;

    const draw = () => {
      const rect = wrapper.getBoundingClientRect();
      const w = Math.max(0, rect.width);
      const h = Math.max(0, rect.height);
      svg.innerHTML = '';
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('width', String(w));
      svg.setAttribute('height', String(h));

      if (w < 2 || h < 2) return;

      const rc = rough.svg(svg);
      const node = rc.rectangle(2, 2, Math.max(0, w - 4), Math.max(0, h - 4), {
        stroke,
        strokeWidth,
        roughness,
        bowing,
        fill,
        fillStyle,
        fillWeight: 0.8,
        hachureGap: 6,
      });
      svg.appendChild(node);
    };

    draw();

    const ro = new ResizeObserver(() => draw());
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [stroke, strokeWidth, roughness, bowing, fill, fillStyle]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        position: 'relative',
        padding,
        ...style,
      }}
    >
      <svg
        ref={svgRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
