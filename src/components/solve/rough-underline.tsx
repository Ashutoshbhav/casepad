'use client';

// RoughUnderline — single hand-drawn underline under a heading or label.
// Pairs with the notebook-paper aesthetic in /solve. Renders an SVG flush
// to the bottom of its parent at the parent's full width.

import { useEffect, useRef } from 'react';
import rough from 'roughjs';

interface Props {
  width?: number | string;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  bowing?: number;
  className?: string;
}

export function RoughUnderline({
  width = '100%',
  height = 10,
  stroke = '#323234',
  strokeWidth = 1.6,
  roughness = 1.4,
  bowing = 1.5,
  className,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const svg = svgRef.current;
    if (!wrapper || !svg) return;

    const draw = () => {
      const w = wrapper.getBoundingClientRect().width;
      svg.innerHTML = '';
      svg.setAttribute('viewBox', `0 0 ${w} ${height}`);
      svg.setAttribute('width', String(w));
      svg.setAttribute('height', String(height));

      if (w < 2) return;

      const rc = rough.svg(svg);
      const line = rc.line(2, height / 2, w - 2, height / 2, {
        stroke,
        strokeWidth,
        roughness,
        bowing,
      });
      svg.appendChild(line);
    };

    draw();
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [stroke, strokeWidth, roughness, bowing, height]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ width, height, lineHeight: 0 }}
    >
      <svg ref={svgRef} aria-hidden="true" style={{ display: 'block' }} />
    </div>
  );
}
