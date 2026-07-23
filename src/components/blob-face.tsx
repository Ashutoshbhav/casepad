'use client';

// BlobFace — a hand-drawn (rough.js) anime facial-expression overlay on top
// of the iridescent 3D blob (live-interview-scene.tsx). The blob carries
// mood through color; this carries it through full anime expression
// vocabulary — not conservative brow-tweaks but the actual genre shorthand:
//
//   idle        content ^ ^ closed eyes + blush marks, and every few
//               seconds it "wakes up" and glances around (pupil wander)
//   ai          determined angled brows, alert eyes; mouth snaps to a real
//               OPEN talking mouth driven by live speech amplitude, brows
//               pop upward on loud emphasis
//   candidate   sparkle eyes (the "ooh, interesting" star-eye trope) +
//               raised brows + slow lean-in nod while you talk
//   processing  narrowed glancing eyes + head tilt + sweat drop + an
//               animated "…" thought-dots cluster
//   error       squeezed > < eyes + zigzag worried mouth + sweat drop +
//               a visible tremble
//
// Rendering: same rough.svg() pattern as solve/rough-rect.tsx (the app's
// established hand-drawn signature). Strokes use a TIME-STEPPED SEED —
// rough.js re-randomizes every call, so redrawing at 60fps un-seeded makes
// the lines vibrate frantically; a fixed seed per ~180ms window keeps
// frames stable while still giving the classic hand-drawn "boil" when the
// seed steps. (Options.seed confirmed in roughjs/bin/core.d.ts.)
//
// Whole-face motion (breathe / nod / tilt / tremble) is applied as a CSS
// transform each frame — the breathe term uses the SAME formula as the 3D
// blob's scale pulse so face and body move in lockstep. Per-frame loop, not
// React state: routing 60fps decorative updates through setState would
// re-render the whole session component continuously.

import { useEffect, useRef, type RefObject } from 'react';
import rough from 'roughjs';
import type { GlowState } from './live-interview-session';

type EyeShape = 'open' | 'happy' | 'squeezed' | 'sparkle';
type MouthStyle = 'curve' | 'zigzag';

type Expression = {
  browL: [number, number, number, number];
  browR: [number, number, number, number];
  eyeShape: EyeShape;
  eyeW: number;
  eyeH: number;
  pupilDx: number;
  pupilDy: number;
  mouthStyle: MouthStyle;
  mouth: [number, number][];
  sweatDrop: boolean;
  blush: boolean;
  thinkingDots: boolean;
  tiltDeg: number;
};

const BROW_Y = 74;
const EYE_Y = 94;
const EYE_L_X = 78;
const EYE_R_X = 122;
const SWEAT_X = 146;
const SWEAT_Y = 62;

const EXPRESSIONS: Record<GlowState, Expression> = {
  idle: {
    browL: [66, BROW_Y, 90, BROW_Y - 3],
    browR: [110, BROW_Y - 3, 134, BROW_Y],
    eyeShape: 'happy',
    eyeW: 12,
    eyeH: 9,
    pupilDx: 0,
    pupilDy: 0,
    mouthStyle: 'curve',
    mouth: [[82, 117], [100, 123], [118, 117]],
    sweatDrop: false,
    blush: true,
    thinkingDots: false,
    tiltDeg: 0,
  },
  ai: {
    // Determined/engaged — brows angled hard in toward center, the anime
    // "I'm about to grill you" look. Mouth baseline is closed; the live
    // amplitude drives a real open talking mouth per-frame below.
    browL: [62, BROW_Y - 1, 90, BROW_Y - 11],
    browR: [110, BROW_Y - 11, 138, BROW_Y - 1],
    eyeShape: 'open',
    eyeW: 13,
    eyeH: 13,
    pupilDx: 0,
    pupilDy: 0,
    mouthStyle: 'curve',
    mouth: [[87, 117], [100, 119], [113, 117]],
    sweatDrop: false,
    blush: false,
    thinkingDots: false,
    tiltDeg: -2,
  },
  candidate: {
    // "Ooh, tell me more" — sparkle star-eyes, brows lifted high, warm
    // smile, gentle lean-in (tilt) + nod loop applied in the frame loop.
    browL: [66, BROW_Y - 6, 90, BROW_Y - 9],
    browR: [110, BROW_Y - 9, 134, BROW_Y - 6],
    eyeShape: 'sparkle',
    eyeW: 13,
    eyeH: 13,
    pupilDx: 0,
    pupilDy: 0,
    mouthStyle: 'curve',
    mouth: [[80, 115], [100, 125], [120, 115]],
    sweatDrop: false,
    blush: true,
    thinkingDots: false,
    tiltDeg: 3,
  },
  processing: {
    // Deep in thought — one brow up, narrowed eyes glancing up-and-away,
    // head tilted, sweat drop, animated "…" cluster.
    browL: [66, BROW_Y - 12, 90, BROW_Y - 6],
    browR: [110, BROW_Y, 134, BROW_Y + 4],
    eyeShape: 'open',
    eyeW: 12,
    eyeH: 6,
    pupilDx: 4,
    pupilDy: -3,
    mouthStyle: 'curve',
    mouth: [[87, 121], [100, 118], [112, 122]],
    sweatDrop: true,
    blush: false,
    thinkingDots: true,
    tiltDeg: 6,
  },
  error: {
    // Full anime "yikes" — squeezed > < eyes, inner-up worried brows,
    // zigzag mouth, sweat drop; tremble applied in the frame loop.
    browL: [66, BROW_Y - 2, 90, BROW_Y + 8],
    browR: [110, BROW_Y + 8, 134, BROW_Y - 2],
    eyeShape: 'squeezed',
    eyeW: 11,
    eyeH: 8,
    pupilDx: 0,
    pupilDy: 0,
    mouthStyle: 'zigzag',
    mouth: [[84, 120], [100, 120], [116, 120]],
    sweatDrop: true,
    blush: false,
    thinkingDots: false,
    tiltDeg: -3,
  },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Discrete fields (eye/mouth shape, marks) switch at the transition
// midpoint — they're drawn with entirely different primitives and can't
// tween; continuous fields lerp so expressions shift rather than cut.
function lerpExpression(a: Expression, b: Expression, t: number): Expression {
  return {
    browL: a.browL.map((v, i) => lerp(v, b.browL[i], t)) as Expression['browL'],
    browR: a.browR.map((v, i) => lerp(v, b.browR[i], t)) as Expression['browR'],
    eyeShape: t < 0.5 ? a.eyeShape : b.eyeShape,
    eyeW: lerp(a.eyeW, b.eyeW, t),
    eyeH: lerp(a.eyeH, b.eyeH, t),
    pupilDx: lerp(a.pupilDx, b.pupilDx, t),
    pupilDy: lerp(a.pupilDy, b.pupilDy, t),
    mouthStyle: t < 0.5 ? a.mouthStyle : b.mouthStyle,
    mouth: a.mouth.map(([x, y], i) => [lerp(x, b.mouth[i][0], t), lerp(y, b.mouth[i][1], t)]),
    sweatDrop: t < 0.5 ? a.sweatDrop : b.sweatDrop,
    blush: t < 0.5 ? a.blush : b.blush,
    thinkingDots: t < 0.5 ? a.thinkingDots : b.thinkingDots,
    tiltDeg: lerp(a.tiltDeg, b.tiltDeg, t),
  };
}

export function BlobFace({ glowState, ampRef }: { glowState: GlowState; ampRef: RefObject<number> }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const currentRef = useRef<Expression>(EXPRESSIONS.idle);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rc = rough.svg(svg);

    const draw = (
      e: Expression,
      blinkAmount: number,
      talkOpen: number,
      sweatT: number,
      dotCount: number,
      browPop: number,
      wanderDx: number,
      seed: number
    ) => {
      const ink = { stroke: 'rgba(238, 240, 244, 0.85)', strokeWidth: 2.4, roughness: 1.7, bowing: 1.3, seed };
      const inkFill = { ...ink, strokeWidth: 1, fill: 'rgba(238, 240, 244, 0.9)', fillStyle: 'solid' as const };
      const soft = { stroke: 'rgba(244, 175, 180, 0.6)', strokeWidth: 2, roughness: 1.9, seed };
      const sweat = { stroke: 'rgba(147, 197, 253, 0.8)', strokeWidth: 1.8, roughness: 1.8, bowing: 1.4, seed };

      svg.innerHTML = '';

      // Brows — browPop lifts both on loud speech emphasis.
      svg.appendChild(rc.line(e.browL[0], e.browL[1] - browPop, e.browL[2], e.browL[3] - browPop, ink));
      svg.appendChild(rc.line(e.browR[0], e.browR[1] - browPop, e.browR[2], e.browR[3] - browPop, ink));

      // Eyes
      for (const [cx, side] of [[EYE_L_X, -1], [EYE_R_X, 1]] as const) {
        if (e.eyeShape === 'happy') {
          svg.appendChild(rc.curve([[cx - e.eyeW, EYE_Y + 2], [cx, EYE_Y - e.eyeH], [cx + e.eyeW, EYE_Y + 2]], ink));
        } else if (e.eyeShape === 'squeezed') {
          // "> <" — two angled lines meeting toward the face's center.
          const tip = cx + side * -e.eyeW * 0.55;
          svg.appendChild(rc.line(cx + side * e.eyeW, EYE_Y - e.eyeH, tip, EYE_Y, ink));
          svg.appendChild(rc.line(cx + side * e.eyeW, EYE_Y + e.eyeH, tip, EYE_Y, ink));
        } else if (e.eyeShape === 'sparkle') {
          // Star-eye — a filled 4-point star, the "fascinated" trope.
          const r = e.eyeW * 0.85;
          const s = r * 0.28;
          svg.appendChild(
            rc.polygon(
              [
                [cx, EYE_Y - r], [cx + s, EYE_Y - s], [cx + r, EYE_Y], [cx + s, EYE_Y + s],
                [cx, EYE_Y + r], [cx - s, EYE_Y + s], [cx - r, EYE_Y], [cx - s, EYE_Y - s],
              ],
              inkFill
            )
          );
        } else {
          const h = Math.max(1.2, e.eyeH * (1 - blinkAmount));
          svg.appendChild(rc.ellipse(cx, EYE_Y, e.eyeW, h, ink));
          if (blinkAmount < 0.6) {
            svg.appendChild(
              rc.circle(cx + e.pupilDx + wanderDx, EYE_Y + e.pupilDy, Math.min(e.eyeW, h) * 0.55, inkFill)
            );
          }
        }
      }

      // Blush — two short diagonal strokes under each eye, warm pink.
      if (e.blush) {
        for (const cx of [64, 128]) {
          svg.appendChild(rc.line(cx, 110, cx + 7, 106, soft));
          svg.appendChild(rc.line(cx + 5, 112, cx + 12, 108, soft));
        }
      }

      // Mouth — a genuinely OPEN ellipse while talking loudly (classic
      // anime talking mouth), otherwise the expression's own style.
      if (talkOpen > 2.5) {
        svg.appendChild(rc.ellipse(100, 121, 12 + talkOpen * 0.9, talkOpen * 1.7, ink));
      } else if (e.mouthStyle === 'zigzag') {
        const [[x1, y1], , [x3]] = e.mouth;
        const midY = e.mouth[1][1];
        svg.appendChild(
          rc.linearPath(
            [[x1, y1], [x1 + 8, midY - 4], [x1 + 16, midY + 3], [x3 - 8, midY - 4], [x3, y1]],
            ink
          )
        );
      } else {
        const pts: [number, number][] = e.mouth.map(([x, y], i) => (i === 1 ? [x, y + talkOpen] : [x, y]));
        svg.appendChild(rc.curve(pts, ink));
      }

      // Sweat drop
      if (sweatT > 0.15) {
        svg.appendChild(
          rc.path(
            `M ${SWEAT_X} ${SWEAT_Y} C ${SWEAT_X - 6} ${SWEAT_Y + 9}, ${SWEAT_X - 6} ${SWEAT_Y + 16}, ${SWEAT_X} ${SWEAT_Y + 18} C ${SWEAT_X + 6} ${SWEAT_Y + 16}, ${SWEAT_X + 6} ${SWEAT_Y + 9}, ${SWEAT_X} ${SWEAT_Y} Z`,
            sweat
          )
        );
      }

      // Animated "…" — dots appear one at a time while thinking.
      if (e.thinkingDots) {
        for (let i = 0; i < dotCount; i++) {
          svg.appendChild(rc.circle(148 + i * 11, 44 - i * 3, 4.5, inkFill));
        }
      }
    };

    let startTime: number | null = null;
    const BLINK_CYCLE_S = 4.5;
    const BLINK_DURATION_S = 0.14;
    let sweatT = 0;
    // Redraw throttle — regenerating ~10 rough.js shapes + replacing the
    // SVG's children EVERY frame (the first version of this loop) is real,
    // constant main-thread load, enough to visibly starve the actual turn
    // pipeline (transcribe upload, /api/chat fetch handling, React
    // updates) and make "processing" drag. Since strokes are seeded per
    // ~180ms window anyway, most of those 60 redraws/second produced
    // byte-identical output. Now: rebuild the sketch ONLY when its inputs
    // change (seed step, blink edge, expression still in transition,
    // bucketed mouth/wander movement, dot cycle); the cheap CSS transform
    // (breathe/nod/tilt/tremble) still updates every frame so motion stays
    // 60fps-smooth.
    let lastDrawKey = '';

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const t = (now - startTime) / 1000;

      const target = EXPRESSIONS[glowState];
      currentRef.current = lerpExpression(currentRef.current, target, 0.08);
      sweatT = lerp(sweatT, target.sweatDrop ? 1 : 0, 0.08);
      const e = currentRef.current;

      const amp = Math.max(0, Math.min(1, ampRef.current ?? 0));

      // Idle micro-behavior: every ~7s the happy-closed eyes open for ~1.8s
      // and the pupils wander sideways — "just checking on you."
      let wanderDx = 0;
      let effectiveShape = e.eyeShape;
      if (glowState === 'idle' && t % 7 > 5.2) {
        effectiveShape = 'open';
        wanderDx = Math.sin(t * 1.4) * 3.5;
      }

      const timeSinceBlink = t % BLINK_CYCLE_S;
      const rawBlink = timeSinceBlink < BLINK_DURATION_S ? 1 : 0;
      const blinkAmount = effectiveShape === 'open' ? rawBlink : 0;

      // Talking mouth + emphasis brow-pop, driven by the live interviewer
      // amplitude (see startAudioElementAmplitude / synthetic fallback in
      // live-interview-session.tsx).
      const talkOpen = glowState === 'ai' ? amp * 11 : 0;
      const browPop = glowState === 'ai' ? amp * 4 : 0;

      // "…" cycles 0→3 dots.
      const dotCount = Math.floor((t * 2.2) % 4);

      // Whole-face motion — breathe matches the 3D blob's formula exactly;
      // nod (listening lean-in), tremble (error), tilt (per expression).
      const breathe = 1 + Math.sin(t * 0.6) * 0.015 + amp * 0.1;
      const nodY = glowState === 'candidate' ? Math.sin(t * 1.9) * 3 : 0;
      const trembleX = glowState === 'error' ? Math.sin(t * 42) * 1.4 : 0;
      if (svgRef.current) {
        svgRef.current.style.transform =
          `translate(${trembleX}px, ${nodY}px) rotate(${e.tiltDeg}deg) scale(${breathe})`;
      }

      // Seed steps every ~180ms — stable strokes between steps (no 60fps
      // vibration), a gentle hand-drawn "boil" when it steps.
      const seed = 1 + (Math.floor(t / 0.18) % 1000);

      // Expression settled = the lerp has effectively converged AND the
      // discrete shape already matches; while transitioning we redraw
      // every frame so the tween stays smooth (transitions only last
      // ~0.5s, so the cost window is tiny).
      const settled =
        e.eyeShape === target.eyeShape &&
        Math.abs(e.browL[1] - target.browL[1]) < 0.4 &&
        Math.abs(e.mouth[1][1] - target.mouth[1][1]) < 0.4 &&
        Math.abs(e.tiltDeg - target.tiltDeg) < 0.3;
      const drawKey = settled
        ? `${seed}|${effectiveShape}|${blinkAmount}|${Math.round(talkOpen)}|${Math.round(browPop)}|${Math.round(wanderDx)}|${dotCount}|${sweatT > 0.15 ? 1 : 0}`
        : `transitioning-${now}`;
      if (drawKey !== lastDrawKey) {
        lastDrawKey = drawKey;
        draw({ ...e, eyeShape: effectiveShape }, blinkAmount, talkOpen, sweatT, dotCount, browPop, wanderDx, seed);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glowState]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 200"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        transformOrigin: 'center',
      }}
    />
  );
}
