'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
// NOTE: @react-three/postprocessing intentionally NOT imported. Its
// wrapEffect helper does `JSON.stringify(props)` inside a useMemo dep array,
// which throws "Converting circular structure to JSON" the moment any
// Three.js object lands in props (e.g. via React 19's ref-as-prop). That
// error tipped the entire app into the error boundary on every route nav.
// Self-emissive material on the asterisk gives enough glow without bloom.
import { useAsteriskSceneStore } from '@/lib/stores/asterisk-scene';

// PersistentAsterisk — the single, layout-level WebGL canvas that holds the
// 3D coral asterisk for the entire app. Mounted ONCE in app/layout.tsx and
// never unmounts on route change. Each route declares its preset via the
// `useAsteriskScene` hook; the useFrame loop here lerps current state
// toward the store's `target` every frame. The lerp IS the route
// transition.
//
// Eligibility (skip canvas entirely): no WebGL2, prefers-reduced-motion.
// In those cases routes render the 2D <AshMark> fallback themselves.

// ---- Petal geometry (ported from ash-mark-3d.tsx) ----------------------

const CARDINAL_LENGTH = 0.8;
const DIAGONAL_LENGTH = CARDINAL_LENGTH / 1.14;
const PETAL_WIDTH = 0.15;
const PETAL_DEPTH = 0.05;
const PETAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

function buildPetalShape(length: number): THREE.Shape {
  const halfBase = PETAL_WIDTH * 0.5;
  const halfShoulder = PETAL_WIDTH * 0.55 * 0.5;
  const shoulderY = length * 0.7;
  const tipY = length;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(halfBase, shoulderY * 0.4, halfShoulder, shoulderY);
  shape.quadraticCurveTo(halfShoulder * 0.6, tipY, 0, tipY);
  shape.quadraticCurveTo(-halfShoulder * 0.6, tipY, -halfShoulder, shoulderY);
  shape.quadraticCurveTo(-halfBase, shoulderY * 0.4, 0, 0);
  return shape;
}

function buildPetalGeometry(length: number): THREE.ExtrudeGeometry {
  const shape = buildPetalShape(length);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: PETAL_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geom.translate(0, 0, -PETAL_DEPTH / 2);
  return geom;
}

// ---- Shatter fragments ------------------------------------------------
//
// At scroll-end on /signin the big asterisk shatters into N smaller
// asterisks scattered across the viewport. On scroll-up they converge back
// into the central asterisk. Drives off scrollProgress: shatter starts at
// SHATTER_START (0.65), fully expanded at SHATTER_END (0.95). Below
// SHATTER_START the fragments are scale 0 at world origin (invisible);
// above SHATTER_END they're at full scale on their home position.

const FRAGMENT_COUNT = 12;
const SHATTER_START = 0.65;
const SHATTER_END = 0.95;

interface FragmentHome {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotSpeed: number;
  // Phase offset so each fragment tumbles at a different angle
  rotPhaseX: number;
  rotPhaseY: number;
  rotPhaseZ: number;
  // Per-fragment launch delay (0..0.3 of shatter timeline) — staggers the
  // burst so fragments don't all leave the origin in lockstep. Deterministic
  // (derived from index) so it's stable across re-renders.
  delayPhase: number;
}

const FRAGMENT_HOMES: FragmentHome[] = (() => {
  const homes: FragmentHome[] = [];
  for (let i = 0; i < FRAGMENT_COUNT; i++) {
    // Distribute around two concentric rings + slight z variation. The
    // angle is offset between rings so fragments don't all align.
    const ring = i % 2 === 0 ? 0 : 1;
    const angleOffset = ring * (Math.PI / FRAGMENT_COUNT);
    const angle = (i / FRAGMENT_COUNT) * Math.PI * 2 + angleOffset;
    const r = ring === 0 ? 3.5 : 5.2;
    // Stagger delays: distribute across 0..0.3 with a deterministic shuffle
    // (golden-ratio mod) so neighbours on the ring don't all launch together.
    const shuffled = (i * 0.6180339887) % 1;
    homes.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r * 0.55,
      z: -0.5 + Math.sin(angle * 2) * 1.5,
      scale: 0.22 + (i % 3) * 0.05, // 0.22, 0.27, 0.32, repeating
      rotSpeed: 0.04 + (i % 4) * 0.015,
      rotPhaseX: (i * 0.83) % (Math.PI * 2),
      rotPhaseY: (i * 1.27) % (Math.PI * 2),
      rotPhaseZ: (i * 0.51) % (Math.PI * 2),
      delayPhase: shuffled * 0.3,
    });
  }
  return homes;
})();

// ---- Lerp helpers ------------------------------------------------------
//
// LERP_FACTOR controls the route-transition feel. ln(1 - 0.06) ≈ -0.062 per
// frame; at 60fps a 95% settle takes ~50 frames (~830ms wall-clock), but the
// visible "snap" of the first 60% lands inside ~280ms. Tuning higher reads
// as twitchy; lower reads as syrup. 0.06 is the sweet spot.

const LERP_FACTOR = 0.06;
// Cursor parallax lerp — slightly faster than the route lerp so the tilt
// tracks pointer motion without feeling laggy. Same units (per-frame).
const CURSOR_LERP = 0.08;
// Particle disperse on celebrating — fast outward burst. Higher than route
// lerp; the burst should land in well under 500ms.
const BURST_LERP = 0.15;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function viewportToWorld(nx: number, ny: number, aspect: number): { x: number; y: number } {
  const halfV = 5 * Math.tan((45 * Math.PI) / 180 / 2);
  const halfH = halfV * aspect;
  return { x: nx * halfH, y: ny * halfV };
}

// ---- Custom shader — coral asterisk material -------------------------

const ASTERISK_NOISE_FRAGMENT = /* glsl */ `
  float casepad_hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float casepad_noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = casepad_hash(i + vec3(0,0,0));
    float n100 = casepad_hash(i + vec3(1,0,0));
    float n010 = casepad_hash(i + vec3(0,1,0));
    float n110 = casepad_hash(i + vec3(1,1,0));
    float n001 = casepad_hash(i + vec3(0,0,1));
    float n101 = casepad_hash(i + vec3(1,0,1));
    float n011 = casepad_hash(i + vec3(0,1,1));
    float n111 = casepad_hash(i + vec3(1,1,1));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }
  float casepad_fbm(vec3 p) {
    float a = 0.5;
    float v = 0.0;
    for (int i = 0; i < 4; i++) {
      v += a * casepad_noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }
`;

interface AsteriskMaterialUniforms {
  uTime: { value: number };
  uIsMobile: { value: number };
  uIridescence: { value: number };
  uNoiseScale: { value: number };
}

function buildAsteriskMaterial(isMobile: boolean): {
  material: THREE.MeshStandardMaterial;
  uniforms: AsteriskMaterialUniforms;
} {
  const material = new THREE.MeshStandardMaterial({
    // Anthropic coral, brand-locked.
    color: '#d97757',
    // Slightly more reflective + subtle metallic so the key light grazes
    // the petals dramatically against the black space backdrop.
    roughness: 0.45,
    metalness: 0.25,
    emissive: '#d97757',
    // Emissive boosted because the only light against pure black is the
    // sun directional + the asterisk's own glow. With Bloom this gives
    // the "object glowing in space" feel.
    emissiveIntensity: 0.35,
  });

  const uniforms: AsteriskMaterialUniforms = {
    uTime: { value: 0 },
    uIsMobile: { value: isMobile ? 1 : 0 },
    uIridescence: { value: 0.65 },
    uNoiseScale: { value: 6.0 },
  };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uIsMobile = uniforms.uIsMobile;
    shader.uniforms.uIridescence = uniforms.uIridescence;
    shader.uniforms.uNoiseScale = uniforms.uNoiseScale;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      /* glsl */ `
      #include <common>
      varying vec3 vCasepadObjectPos;
      `
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      /* glsl */ `
      #include <begin_vertex>
      vCasepadObjectPos = position;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      /* glsl */ `
      #include <common>
      uniform float uTime;
      uniform float uIsMobile;
      uniform float uIridescence;
      uniform float uNoiseScale;
      varying vec3 vCasepadObjectPos;
      ${ASTERISK_NOISE_FRAGMENT}
      `
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      /* glsl */ `
      #include <color_fragment>

      float n = casepad_fbm(vCasepadObjectPos * uNoiseScale + uTime * 0.05);
      diffuseColor.rgb *= mix(0.88, 1.10, n);

      vec3 viewDir = normalize(vViewPosition);
      float fres = pow(1.0 - clamp(dot(viewDir, normalize(vNormal)), 0.0, 1.0), 2.5);
      vec3 goldTint = vec3(0.96, 0.71, 0.42);
      diffuseColor.rgb = mix(diffuseColor.rgb, goldTint, fres * uIridescence);

      if (uIsMobile < 0.5) {
        float ab = fres * 0.18;
        diffuseColor.r *= (1.0 + ab);
        diffuseColor.b *= (1.0 - ab * 0.7);
      }
      `
    );
  };

  return { material, uniforms };
}

// ---- Atmospheric particles (mini-asterisks) ---------------------------

// Particles are tiny coral asterisk shapes — each one a constellation
// companion to the central mark. Reinforces the brand identity (you don't
// just see ONE asterisk, you see a sky of them) and gives the cursor-repel
// interaction something visually relevant to scatter. The texture is
// drawn procedurally to a 64×64 canvas at module load time.

let _ASTERISK_TEXTURE: THREE.Texture | null = null;
function getAsteriskTexture(): THREE.Texture {
  if (_ASTERISK_TEXTURE) return _ASTERISK_TEXTURE;
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }
  // 512×512 — 64x more detail than the prior 64×64; reads sharp at any
  // expected sprite size (sprites are ~0.16 world units = ~30-40px on
  // screen at common zooms, so 512 has plenty of headroom).
  const SIZE = 512;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(SIZE / 2, SIZE / 2);
  // Star-in-space look: bright white core, soft coral glow halo. Particles
  // read as distant stars with subtle warm refraction, not opaque coral.
  // Outer halo (soft glow) — additive-blended in the material.
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, SIZE * 0.5);
  halo.addColorStop(0, 'rgba(217, 119, 87, 0.55)');
  halo.addColorStop(0.4, 'rgba(217, 119, 87, 0.15)');
  halo.addColorStop(1, 'rgba(217, 119, 87, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);
  // 8-petal asterisk — bright center, coral tips. High curveSegments for
  // crisp edges at the new texture resolution.
  ctx.fillStyle = '#fff5ed'; // warm cream center (white-ish star)
  const cardinalLen = SIZE * 0.42;
  const diagonalLen = cardinalLen / 1.14;
  const halfBase = SIZE * 0.018;
  for (let i = 0; i < 8; i++) {
    const isCardinal = i % 2 === 0;
    const len = isCardinal ? cardinalLen : diagonalLen;
    const angle = (i * 45 * Math.PI) / 180;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-halfBase, 0);
    ctx.quadraticCurveTo(-halfBase * 0.65, -len * 0.55, 0, -len);
    ctx.quadraticCurveTo(halfBase * 0.65, -len * 0.55, halfBase, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Bright pinpoint center (the "star" core)
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, SIZE * 0.08);
  core.addColorStop(0, 'rgba(255, 250, 240, 1)');
  core.addColorStop(1, 'rgba(255, 245, 237, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  _ASTERISK_TEXTURE = texture;
  return texture;
}

interface ParticlesHandle {
  group: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  origin: Float32Array;
  outward: Float32Array;
}

// Stars-in-space distribution: spread across the whole visible viewport
// (and beyond, for parallax depth). At camera z=5 fov=45, the visible
// world is ~±5.5 horizontal × ±2.0 vertical at z=0. Pad outward so
// particles fill the screen at all common aspects, and vary z so DOF + bloom
// give natural depth cues.
function buildParticles(count: number): ParticlesHandle {
  const positions = new Float32Array(count * 3);
  const origin = new Float32Array(count * 3);
  const outward = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const HALF_W = 9;
  const HALF_H = 5.5;
  const Z_MIN = -4;
  const Z_MAX = 0.5;
  for (let i = 0; i < count; i++) {
    // Uniform random across a wide rectangular volume — stars feel
    // randomly scattered, not orbital.
    const x = (Math.random() * 2 - 1) * HALF_W;
    const y = (Math.random() * 2 - 1) * HALF_H;
    const z = Z_MIN + Math.random() * (Z_MAX - Z_MIN);
    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    origin[i * 3 + 0] = x;
    origin[i * 3 + 1] = y;
    origin[i * 3 + 2] = z;
    // Outward direction (used by celebration burst) — radial from origin
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    outward[i * 3 + 0] = x / len;
    outward[i * 3 + 1] = y / len;
    outward[i * 3 + 2] = z / len;
    seeds[i] = Math.random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.PointsMaterial({
    // Tint white-ish so the texture's coral halo dominates the warm glow
    // and the cream center reads as a true star. Additive blending tints
    // toward warm regardless.
    color: '#fff5ed',
    size: 0.22,
    map: getAsteriskTexture(),
    alphaTest: 0.01,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  return { group: points, geometry, material, origin, outward };
}

// ---- Device tier ------------------------------------------------------
//
// Particle counts gated on BOTH cores AND deviceMemory (where available)
// for a more accurate hardware tier than cores-alone. deviceMemory is
// reported in GB and is widely supported on Chromium/Android; Safari
// returns undefined and we default to 4 (mid-tier) so iOS doesn't get
// pessimistically downgraded.
//
// Mobile branches early since GPU bandwidth — not core count — is the
// real bottleneck on phones, so a 4GB iPhone still gets 1500 particles.

function getParticleCount(isMobile: boolean): number {
  if (typeof navigator === 'undefined') return 1000;
  if (isMobile) {
    const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
    return mem >= 4 ? 500 : 300;
  }
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
  // Capped at 1000 — Ash's reference machine dropped frames at 10k.
  // Tiered down on weaker hardware so old laptops still hit 60fps.
  if (cores >= 8 && mem >= 8) return 1000;
  if (cores >= 4 && mem >= 4) return 700;
  return 400;
}

// ---- Volumetric fog backdrop -----------------------------------------

function buildFog(): {
  mesh: THREE.Mesh;
  geometry: THREE.SphereGeometry;
  material: THREE.ShaderMaterial;
} {
  const geometry = new THREE.SphereGeometry(8, 32, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uIntensity: { value: 0 },
      uColor: { value: new THREE.Color('#d97757') },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uIntensity;
      uniform vec3 uColor;
      varying vec3 vWorldPos;
      void main() {
        float d = length(vWorldPos.xy);
        float a = smoothstep(8.0, 1.5, d) * uIntensity * 0.35;
        gl_FragColor = vec4(uColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return { mesh, geometry, material };
}

// ---- Scene component (inside <Canvas>) ---------------------------------

function Scene({ isMobile, reducedMotion }: { isMobile: boolean; reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const fragmentRefs = useRef<(THREE.Group | null)[]>([]);
  const { size } = useThree();

  // Built-once geometries / materials.
  const cardinalGeom = useMemo(() => buildPetalGeometry(CARDINAL_LENGTH), []);
  const diagonalGeom = useMemo(() => buildPetalGeometry(DIAGONAL_LENGTH), []);
  const { material, uniforms } = useMemo(() => buildAsteriskMaterial(isMobile), [isMobile]);

  // Particles + fog removed — Ash wants the asterisk to stand alone in
  // black space with realistic lighting. No ambient scatter, no atmospheric
  // companions, no haze. The asterisk + bloom is the entire scene.

  const celebrationStartRef = useRef<number>(-1);
  const lastAiStateRef = useRef<string>('idle');
  const pulseTimeRef = useRef<number>(0);
  // For timed states (approving, concerned, celebrating). When the elapsed
  // clock time crosses this value, the loop force-reverts to 'idle'. Set on
  // state-change; -1 means "no expiration scheduled."
  const stateExpiresAtRef = useRef<number>(-1);
  // Cached emissive base color so we can switch between coral / cooler /
  // warmer per-state without re-creating materials. Color set imperatively
  // each frame via material.emissive.set().
  const baseEmissive = useMemo(() => new THREE.Color('#d97757'), []);
  const coolerEmissive = useMemo(() => new THREE.Color('#c66f4d'), []);
  const warmerEmissive = useMemo(() => new THREE.Color('#e88d6a'), []);

  // Theme-aware solid color (asterisk's diffuse fill, separate from emissive
  // glow). Light mode reads themeMode and lerps the diffuse color toward
  // a deeper coral so the mark holds on paper instead of fading. Dark mode
  // stays on the standard brand coral.
  const darkColor = useMemo(() => new THREE.Color('#d97757'), []);
  const lightColor = useMemo(() => new THREE.Color('#c4623a'), []);

  const cursor = useRef({ nx: 0, ny: 0 });
  useEffect(() => {
    if (isMobile) return;
    const onMove = (e: MouseEvent) => {
      cursor.current.nx = (e.clientX / window.innerWidth) * 2 - 1;
      cursor.current.ny = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [isMobile]);

  // Mood-driven random wander — replaces the predictable sin/sin Lissajous.
  // Treat Ash like a person: pick a target, decide a mood (roam / idle /
  // follow cursor / dart), commit for a randomised dwell, then re-roll.
  // Per-leg lerp speed varies 0.005..0.10 so movement reads as uneven
  // (lazy drift, then a sudden dart, then a pause). Refs mutate; they
  // don't trigger React renders. Initialised so the first frame
  // immediately schedules a new mode (nextChangeAt = 0 < clock.elapsed).
  const wanderTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wanderCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wanderSpeedRef = useRef<number>(0.015);
  const wanderModeRef = useRef<'roam' | 'follow' | 'dart' | 'idle'>('roam');
  const wanderNextChangeAtRef = useRef<number>(0);

  // Per-frame perf: track whether fragments are currently parked at scale 0.
  // When true, the per-fragment lerp/tumble loop is skipped entirely — saves
  // 12× position/scale lerps + 3× rotation math every frame on /cases,
  // /solve, /dashboard, and /signin pre-shatter. Reset to false the moment
  // shatter > 0 (or scrollChoreography is on AND scrollProgress hits the
  // shatter threshold), so the next frame re-enters the loop.
  const fragmentsParkedRef = useRef<boolean>(false);

  // Cap delta when the tab unpauses. Three.js's Clock keeps wall-clock time
  // even while document.hidden, so when we resume from a long background
  // pause delta can be 30s+ — that desyncs particle drift, blasts the pulse
  // accumulator into a random sin phase, and overshoots every lerp. Clamp
  // to one frame's budget on resume so motion picks up cleanly.
  const wasHiddenRef = useRef<boolean>(false);

  // The frame loop reads many store fields, mutates refs, and runs custom
  // shader math. Any unguarded throw here propagates into React's render
  // path and tips the whole app into error.tsx. Wrap the entire body in a
  // try/catch so a transient bad frame degrades gracefully — we just skip
  // that tick instead of blowing up the page.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const frameErrorOnceRef = useRef<boolean>(false);
  useFrame((_state, delta) => {
    try {
    if (typeof document !== 'undefined' && document.hidden) {
      wasHiddenRef.current = true;
      return;
    }
    // Cache store snapshot once per frame; cheap but avoids 4× getState().
    const storeState = useAsteriskSceneStore.getState();
    if (!storeState || !storeState.target) return;
    const { target, paused, scrollProgress, aiState } = storeState;
    if (paused) return;

    const g = groupRef.current;
    if (!g) return;

    // Hidden-scene fast-path: when the active preset is 'hidden' (scale → 0)
    // AND the group has lerped to ~0 AND we're idle, skip all per-frame work.
    // Saves ~the entire useFrame body on /admin, /drills, and any route that
    // declares `hidden`. We still tick once a frame to drift the group scale
    // toward 0 via lerp; once it's close enough we exit early. Re-enters on
    // any preset change since target.scale > 0 wakes the group up.
    if (
      target.scale < 0.001 &&
      g.scale.x < 0.0015 &&
      aiState === 'idle' &&
      !target.scrollChoreography
    ) {
      // Make sure we're at exact 0 (avoid lingering subpixel residue).
      g.scale.setScalar(0);
      return;
    }

    // Resume-from-hidden: the first frame after a tab unpause clamps delta
    // and resets the pulse phase so the celebrating/listening sin-pulse
    // doesn't jump.
    let effDelta = delta;
    if (wasHiddenRef.current) {
      effDelta = 1 / 60;
      pulseTimeRef.current = 0;
      wasHiddenRef.current = false;
    }

    uniforms.uTime.value += effDelta;

    // Phase-preserve on aiState change — the pulse accumulator drives a sin
    // wave whose phase is implicit in pulseTimeRef. When state changes we
    // reset to 0 so the new state starts clean (idle's slow breath, then
    // thinking's fast pulse, then back) instead of inheriting the previous
    // accumulator and jumping mid-cycle. Also schedule auto-revert for
    // timed states.
    if (aiState !== lastAiStateRef.current) {
      pulseTimeRef.current = 0;
      const now = _state.clock.elapsedTime;
      if (aiState === 'celebrating') {
        celebrationStartRef.current = now;
        stateExpiresAtRef.current = now + 1.5;
      } else if (aiState === 'approving') {
        stateExpiresAtRef.current = now + 1.5;
      } else if (aiState === 'concerned') {
        stateExpiresAtRef.current = now + 2.0;
      } else {
        // No timer for idle / anticipating / thinking / listening — those
        // are caller-controlled (chat, drawer, mic).
        stateExpiresAtRef.current = -1;
      }
      lastAiStateRef.current = aiState;
    }
    pulseTimeRef.current += effDelta;

    // Auto-revert for timed states. force=true so we can downgrade past
    // the priority gate (e.g. celebrating > idle).
    if (stateExpiresAtRef.current > 0 && _state.clock.elapsedTime >= stateExpiresAtRef.current) {
      stateExpiresAtRef.current = -1;
      useAsteriskSceneStore.getState().setAiState('idle', { force: true });
    }

    let effScale = target.scale;
    let effPosX = target.position.x;
    let effPosY = target.position.y;
    if (isMobile) {
      const isCasesPreset = Math.abs(target.scale - 0.35) < 0.001 && target.position.x < 0;
      // /solve preset bumped 2026-05-04 (0.10 → 0.22); on mobile that
      // overlaps the chat tab content. Trim back so the asterisk reads
      // present-but-not-blocking on phone-sized viewports.
      const isSolvePreset = Math.abs(target.scale - 0.22) < 0.001 && target.position.x < 0;
      if (isCasesPreset) {
        effScale = 0.25;
        effPosX = -0.6;
        effPosY = 0.5;
      } else if (isSolvePreset) {
        effScale = 0.16;
        effPosX = -0.62;
        effPosY = 0.66;
      }
    }

    let scrollRotMult = 1;
    let scrollScaleMult = 1;
    if (target.scrollChoreography) {
      const p = scrollProgress;
      scrollRotMult = 1 + p * 0.5;
      if (p < 0.5) {
        scrollScaleMult = 1 + (p / 0.5) * 0.15;
      } else {
        scrollScaleMult = 1.15 - ((p - 0.5) / 0.5) * 0.25;
      }
      // scrollDriftMult removed — particles + fog are gone, no consumer.
    }

    // 7 emotional states. Each state writes:
    //   aiScaleMult        scalar modulation on top of preset scale
    //   aiEmissiveMult     scalar modulation on emissive intensity
    //   aiRotMult          scalar on z-axis rotation speed (1 = base)
    //   aiZOffset          additional z position toward/away from camera
    //   aiWobbleZ          extra rotation.z oscillation (radians)
    //   pickedEmissive     coral / cooler / warmer color choice
    //
    // Mobile dampens amplitudes ~30% to keep CPU happy. Fragments + scroll
    // multipliers are unaffected.
    let aiScaleMult = 1;
    let aiEmissiveMult = 1;
    let aiRotMult = 1;
    let aiZOffset = 0;
    let aiWobbleZ = 0;
    let pickedEmissive = baseEmissive;
    const amp = isMobile ? 0.7 : 1.0;
    if (aiState === 'anticipating') {
      // User is composing input — slight forward lean + tiny scale-up
      aiScaleMult = 1 + 0.02 * amp;
      aiEmissiveMult = 1.1;
      aiZOffset = 0.3 * amp;
      pickedEmissive = baseEmissive;
    } else if (aiState === 'thinking') {
      const phase = (pulseTimeRef.current / 1.2) * Math.PI * 2;
      aiScaleMult = 1 + Math.sin(phase) * 0.04 * amp;
      aiEmissiveMult = 1.4;
      aiRotMult = 2;
    } else if (aiState === 'listening') {
      const phase = (pulseTimeRef.current / 0.6) * Math.PI * 2;
      aiScaleMult = 0.95;
      aiEmissiveMult = 1 + (Math.sin(phase) * 0.5 + 0.5) * 1.0 * amp;
      aiRotMult = 0.5;
      pickedEmissive = coolerEmissive;
    } else if (aiState === 'approving') {
      // Quick warm pulse — repeats 2× over the 1.5s window. The state
      // auto-reverts after 1.5s via stateExpiresAtRef.
      const phase = (pulseTimeRef.current / 0.4) * Math.PI;
      const env = Math.sin(phase);
      aiScaleMult = 1 + env * 0.06 * amp;
      aiEmissiveMult = 1.6;
      aiRotMult = 1.5;
      pickedEmissive = warmerEmissive;
    } else if (aiState === 'concerned') {
      // Slow wobble + dimmer glow. The wobble adds an oscillation on top
      // of the base z-spin so the petals visibly tilt back and forth.
      const wobblePhase = (pulseTimeRef.current / 2.0) * Math.PI * 2;
      aiWobbleZ = Math.sin(wobblePhase) * (5 * Math.PI / 180) * amp;
      aiScaleMult = 1;
      aiEmissiveMult = 0.7;
      aiRotMult = 0.7;
      pickedEmissive = coolerEmissive;
    } else if (aiState === 'celebrating') {
      const since = _state.clock.elapsedTime - celebrationStartRef.current;
      if (since >= 0 && since < 1.5) {
        const t = since / 1.5;
        aiScaleMult = 1 + Math.sin(t * Math.PI) * 0.1 * amp;
        aiEmissiveMult = 1 + Math.sin(t * Math.PI) * 0.8;
        aiRotMult = 2.5;
      }
    }

    const aspect = size.width / size.height;
    const worldPos = viewportToWorld(effPosX, effPosY, aspect);

    // Wander — mood-driven random walk. Each leg picks a fresh target,
    // mood, lerp-speed, and dwell time. Targets cover the whole visible
    // viewport (no orbital bias), per-leg lerp varies an order of magnitude
    // (0.005 lazy drift → 0.10 dart) so apparent speed reads as a real
    // person — sometimes ambling, sometimes pausing, occasionally darting
    // to a corner, occasionally tracking the cursor. Disabled during
    // signin shatter (scroll choreography owns motion) and on hidden
    // presets.
    const wanderActive = !target.scrollChoreography && target.scale > 0.001;
    if (wanderActive) {
      const tw = _state.clock.elapsedTime;
      const halfV = 5 * Math.tan((45 * Math.PI) / 180 / 2);
      const halfH = halfV * aspect;
      const ampMul = isMobile ? 0.55 : 1.0;

      // Mood swing — re-roll target/mode/speed/dwell when the timer expires.
      if (tw >= wanderNextChangeAtRef.current) {
        const r = Math.random();
        let mode: 'roam' | 'follow' | 'dart' | 'idle';
        let dwell: number;
        if (r < 0.50)      { mode = 'roam';   dwell = 1.8 + Math.random() * 2.5; }
        else if (r < 0.70) { mode = 'idle';   dwell = 0.8 + Math.random() * 2.0; }
        else if (r < 0.90) { mode = 'follow'; dwell = 1.0 + Math.random() * 1.2; }
        else               { mode = 'dart';   dwell = 0.4 + Math.random() * 0.5; }
        wanderModeRef.current = mode;
        wanderNextChangeAtRef.current = tw + dwell;

        if (mode === 'dart')        wanderSpeedRef.current = 0.08 + Math.random() * 0.04;
        else if (mode === 'roam')   wanderSpeedRef.current = 0.010 + Math.random() * 0.012;
        else if (mode === 'follow') wanderSpeedRef.current = 0.030 + Math.random() * 0.020;
        else                        wanderSpeedRef.current = 0.004 + Math.random() * 0.004;

        if (mode === 'idle') {
          // Sit still — target ≈ current with a sliver of jitter.
          wanderTargetRef.current.x = wanderCurrentRef.current.x + (Math.random() - 0.5) * 0.4;
          wanderTargetRef.current.y = wanderCurrentRef.current.y + (Math.random() - 0.5) * 0.25;
        } else if (mode === 'follow' && !isMobile) {
          // Steer toward cursor — initial set; live tracking updates each frame below.
          const c = viewportToWorld(cursor.current.nx, cursor.current.ny, aspect);
          wanderTargetRef.current.x = c.x - worldPos.x;
          wanderTargetRef.current.y = c.y - worldPos.y;
        } else {
          // roam / dart (or follow on mobile, no cursor) — restricted to the
          // outer 40% of viewport. Cohort feedback: wide wander sent the
          // asterisk over chat content. Reining in to ~0.4 of half-extent
          // keeps it as ambient corner motion, not a competing focal element.
          const xRange = halfH * 0.45 * ampMul;
          const yRange = halfV * 0.40 * ampMul;
          wanderTargetRef.current.x = (Math.random() * 2 - 1) * xRange;
          wanderTargetRef.current.y = (Math.random() * 2 - 1) * yRange;
        }
      }

      // Live cursor tracking while in 'follow' mode — target chases the
      // pointer instead of being a one-shot snapshot. Lerp speed (~0.05)
      // gives a perceptible follow-lag, not a glued-to-cursor feel.
      if (wanderModeRef.current === 'follow' && !isMobile) {
        const c = viewportToWorld(cursor.current.nx, cursor.current.ny, aspect);
        wanderTargetRef.current.x = c.x - worldPos.x;
        wanderTargetRef.current.y = c.y - worldPos.y;
      }

      // Lerp current toward target at the per-leg speed.
      const sp = wanderSpeedRef.current;
      wanderCurrentRef.current.x = lerp(wanderCurrentRef.current.x, wanderTargetRef.current.x, sp);
      wanderCurrentRef.current.y = lerp(wanderCurrentRef.current.y, wanderTargetRef.current.y, sp);

      // Apply offset, then soft-clamp so he never sails off-screen.
      const margin = 0.6;
      const finalX = worldPos.x + wanderCurrentRef.current.x;
      const finalY = worldPos.y + wanderCurrentRef.current.y;
      worldPos.x = Math.max(-halfH + margin, Math.min(halfH - margin, finalX));
      worldPos.y = Math.max(-halfV + margin, Math.min(halfV - margin, finalY));
    }

    // Shatter — only on signin scene (target.scrollChoreography). When
    // scrollProgress crosses SHATTER_START, the main asterisk shrinks to 0
    // while fragments lerp out to their home positions. Reverse-scrolling
    // is automatic since shatter is derived directly from scrollProgress.
    let shatter = 0;
    if (target.scrollChoreography) {
      const raw = (scrollProgress - SHATTER_START) / (SHATTER_END - SHATTER_START);
      shatter = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    }

    // ---------- Dramatic 4-phase choreography ----------
    // Phase 1 (0..0.15)  — Anticipation: main compresses-then-stretches windup
    // Phase 2 (0.15..0.55) — Explosion: main shrinks to 0; fragments burst
    // Phase 3 (0.55..0.85) — Settle: fragments arrive, jelly-wobble
    // Phase 4 (0.85..1.0) — Breathe: at-rest scale ±2% breath
    //
    // Reduced motion fallback: linear ease, no flash/wobble/overshoot.

    // Main asterisk scale modulation across phases (drives finalScaleTarget).
    let mainScaleMod: number;
    let mainShatterFade: number; // 0 = full size, 1 = gone
    if (reducedMotion) {
      const e = shatter * shatter * (3 - 2 * shatter);
      mainScaleMod = 1;
      mainShatterFade = e;
    } else if (shatter < 0.15) {
      // Anticipation: compress→stretch wave (sin from 0..π peaks at 1.13).
      // Visually: tiny squish, then wind-up stretch.
      mainScaleMod = 1 + Math.sin((shatter / 0.15) * Math.PI) * 0.13;
      mainShatterFade = 0;
    } else if (shatter < 0.55) {
      // Explosion: rapid shrink. Cubic-eased so it goes fast then settles.
      const t01 = (shatter - 0.15) / 0.40;
      mainScaleMod = 1 - t01;
      mainShatterFade = t01 * t01;
    } else {
      mainScaleMod = 0;
      mainShatterFade = 1;
    }

    // Main asterisk emissive flash at the windup peak (~shatter 0.10).
    // Gaussian bump centered at 0.10, width 0.04 → spike of +1.5x intensity.
    let flash = 0;
    if (!reducedMotion && shatter > 0 && shatter < 0.18) {
      const z = (shatter - 0.10) / 0.04;
      flash = Math.exp(-z * z) * 1.5;
    }

    // Reform overshoot — when scrolling UP, at the moment the main
    // re-materializes (shatter ~0.5 → 0.15) the scale should briefly
    // overshoot 1.0. We layer this on the main's "back-from-zero" arc:
    // when 0.15 < shatter < 0.55 (still in shrink window) and shatter is
    // small (closer to 0.15), the scale natively heads back to 1; we add
    // a small overshoot bump near the threshold.
    // Direction-agnostic: always adds a 0..0.08 pulse based on local position.
    let reformBump = 0;
    if (!reducedMotion && shatter > 0.10 && shatter < 0.20) {
      // peaks around shatter=0.15
      const z = (shatter - 0.15) / 0.04;
      reformBump = Math.exp(-z * z) * 0.08;
    }

    const finalScaleTarget =
      effScale * scrollScaleMult * aiScaleMult * mainScaleMod * (1 - mainShatterFade) +
      effScale * scrollScaleMult * aiScaleMult * reformBump * (1 - mainShatterFade);
    const newScale = lerp(g.scale.x, finalScaleTarget, LERP_FACTOR);
    g.scale.setScalar(newScale);
    g.position.x = lerp(g.position.x, worldPos.x, LERP_FACTOR);
    g.position.y = lerp(g.position.y, worldPos.y, LERP_FACTOR);
    // aiZOffset leans Ash toward camera on 'anticipating'. Lerps off
    // smoothly when the state ends.
    g.position.z = lerp(g.position.z, target.position.z + aiZOffset, LERP_FACTOR);

    // ---------- Fragments: per-fragment ease-out with overshoot, tumble, wobble, breathe ----------
    const t = _state.clock.elapsedTime;
    // Faster lerp factor during shatter so the easing-driven targets land
    // responsively; the easing curve does the heavy lifting on motion shape.
    const FRAG_LERP = 0.18;
    // Per-frame perf — fragments are scale-0 and at world origin on every
    // route except /signin past SHATTER_START. Skip the entire 12-iteration
    // loop when:
    //   * scrollChoreography is off (every non-signin route), AND
    //   * fragments have already been parked at scale 0
    // On the first frame after a transition where shatter would re-trigger,
    // fragmentsParkedRef is reset to false so we re-enter the loop and
    // park them. Total saving: ~12 lerps × 4 ops + 3 rotations + 4 trig
    // operations per frame on /cases, /solve, /dashboard, /admin.
    const fragmentsActive = target.scrollChoreography && shatter > 0;
    if (!fragmentsActive && fragmentsParkedRef.current) {
      // Skip the loop entirely — saves the per-fragment computation.
    } else {
    if (!fragmentsActive) {
      // Park each fragment back at origin scale 0 with one cheap pass.
      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        const f = fragmentRefs.current[i];
        if (!f) continue;
        f.position.x = 0;
        f.position.y = 0;
        f.position.z = 0;
        f.scale.setScalar(0);
      }
      fragmentsParkedRef.current = true;
    } else {
    fragmentsParkedRef.current = false;
    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      const f = fragmentRefs.current[i];
      if (!f) continue;
      const home = FRAGMENT_HOMES[i];

      let easeT: number; // 0..1 along this fragment's flight
      let overshootEase: number; // for position
      let scaleAmt: number;
      let wobbleX = 0;
      let wobbleY = 0;
      let breathScale = 1;

      if (reducedMotion) {
        // Linear smoothstep, no drama.
        const e = shatter * shatter * (3 - 2 * shatter);
        easeT = e;
        overshootEase = e;
        scaleAmt = e;
      } else {
        // Each fragment's local timeline starts at delayPhase and ends at 1.
        const localT = (shatter - home.delayPhase) / (1 - home.delayPhase);
        easeT = localT < 0 ? 0 : localT > 1 ? 1 : localT;
        // Cubic ease-out: fast launch, slow approach
        const eo = 1 - Math.pow(1 - easeT, 3);
        // Position overshoot near landing (sine bump in last 15% of arc)
        if (eo < 0.85) {
          overshootEase = eo;
        } else {
          overshootEase = eo + Math.sin(((eo - 0.85) / 0.15) * Math.PI) * 0.15;
        }
        // Scale: 0 → overshoot to 1.3 → settle to 1.0 across the arc
        if (eo < 0.85) {
          scaleAmt = (eo / 0.85) * 1.3;
        } else {
          // ease back from 1.3 to 1.0 over the last 15%
          const k = (eo - 0.85) / 0.15;
          scaleAmt = 1.3 - k * 0.3;
        }

        // Settle wobble — kicks in once the fragment is mostly there.
        // Decays as easeT → 1. Frequency ~6Hz; per-fragment phase from
        // delayPhase keeps neighbours out of sync.
        if (eo > 0.7) {
          const decay = 1 - eo; // 0.3 at 0.7 → 0 at 1.0
          const wobAmp = decay * 0.3;
          const wobPhase = t * 6 + home.delayPhase * 10;
          wobbleX = Math.sin(wobPhase) * wobAmp;
          wobbleY = Math.cos(wobPhase * 1.13) * wobAmp;
        }

        // Breathe at rest — only when fully landed.
        if (easeT > 0.95) {
          breathScale = 1 + Math.sin(t * 1.5 + i) * 0.02;
        }
      }

      const targetX = home.x * overshootEase + wobbleX;
      const targetY = home.y * overshootEase + wobbleY;
      const targetZ = home.z * overshootEase;
      const targetScale = home.scale * scaleAmt * breathScale;

      f.position.x = lerp(f.position.x, targetX, FRAG_LERP);
      f.position.y = lerp(f.position.y, targetY, FRAG_LERP);
      f.position.z = lerp(f.position.z, targetZ, FRAG_LERP);
      f.scale.setScalar(lerp(f.scale.x, targetScale, FRAG_LERP));

      // Tumble: 8x speed during flight (easeT low), normal at home (easeT=1).
      const tumbleMult = reducedMotion ? 1 : 1 + (1 - easeT) * 7;
      f.rotation.x = home.rotPhaseX + t * home.rotSpeed * Math.PI * 2 * 0.4 * tumbleMult;
      f.rotation.y = home.rotPhaseY + t * home.rotSpeed * Math.PI * 2 * 0.5 * tumbleMult;
      f.rotation.z = home.rotPhaseZ + t * home.rotSpeed * Math.PI * 2 * 0.6 * tumbleMult;
    }
    } // end of "fragmentsActive" inner else
    } // end of outer parked/active branch

    // Continuous spin is now around Z (in-plane pinwheel) so the asterisk
    // always reads as a clean 8-pointed star to the camera. Previously this
    // was rotation.y (globe-spin), which made the petals foreshorten through
    // most of the cycle — half the time it looked like a broken cross.
    // aiRotMult is set per-state (thinking ×2, listening ×0.5, approving
    // ×1.5, concerned ×0.7, celebrating ×2.5, idle/anticipating ×1).
    const rotMult = scrollRotMult * aiRotMult;
    const baseRot = isMobile ? Math.min(target.rotationSpeed, 0.04) : target.rotationSpeed;
    g.rotation.z += effDelta * Math.PI * 2 * baseRot * rotMult;
    // aiWobbleZ — additive sine oscillation for 'concerned' (a small
    // back-and-forth tilt on top of the base spin). Set to 0 in all other
    // states so it lerps cleanly off when the state changes.
    g.rotation.z += aiWobbleZ;

    // Cursor parallax tilts the asterisk in/out of screen depth (rotation.x
    // for up/down cursor, rotation.y for left/right cursor). These don't
    // fight the continuous z-spin since they're orthogonal axes.
    if (target.enableParallax && !isMobile) {
      const MAX_TILT = (12 * Math.PI) / 180;
      const tx = cursor.current.ny * MAX_TILT;
      const ty = -cursor.current.nx * MAX_TILT;
      g.rotation.x = lerp(g.rotation.x, tx, CURSOR_LERP);
      g.rotation.y = lerp(g.rotation.y, ty, CURSOR_LERP);
    } else {
      g.rotation.x = lerp(g.rotation.x, 0, LERP_FACTOR);
      g.rotation.y = lerp(g.rotation.y, 0, LERP_FACTOR);
    }

    // Emissive base lowered ~30% so the asterisk reads as ambient warmth in
    // the backdrop, not a focal "pop". aiEmissiveMult drives per-state
    // intensity; pickedEmissive picks coral / warmer / cooler color.
    // `flash` adds the windup spike at shatter ≈ 0.10.
    //
    // Theme: light mode kills emissive (no glow on paper — the mark would
    // read as a smudge) and lerps diffuse color toward the deeper coral
    // tuned for paper. Dark mode keeps full emissive choreography.
    const themeMode = useAsteriskSceneStore.getState().themeMode;
    const themeEmissiveMult = themeMode === 'light' ? 0.05 : 1.0;
    material.emissiveIntensity =
      (0.03 + target.keyLightIntensity * 0.10) *
      (aiEmissiveMult + flash) *
      themeEmissiveMult;
    material.emissive.lerp(pickedEmissive, LERP_FACTOR);
    // Diffuse color: lerp toward theme-appropriate coral. Light mode
    // anchors at deeper #c4623a so the asterisk reads as a solid mark
    // against paper; dark mode stays on standard coral.
    material.color.lerp(themeMode === 'light' ? lightColor : darkColor, LERP_FACTOR);

    if (keyLightRef.current) {
      keyLightRef.current.intensity = lerp(
        keyLightRef.current.intensity,
        target.keyLightIntensity,
        LERP_FACTOR
      );
    }

    // Particles + fog removed — asterisk stands alone in space.
    } catch (err) {
      // Defensive: log once and swallow. A bad frame must not tip the app
      // into the error boundary.
      if (!frameErrorOnceRef.current) {
        frameErrorOnceRef.current = true;
        console.warn('[persistent-asterisk] frame error swallowed:', err);
      }
    }
  });

  useEffect(() => {
    return () => {
      cardinalGeom.dispose();
      diagonalGeom.dispose();
      material.dispose();
    };
  }, [cardinalGeom, diagonalGeom, material]);

  return (
    <>
      {/* Space lighting — vacuum has near-zero ambient scatter, so the
          shadow side of the asterisk is almost black. One strong distant
          "sun" from upper-left + a soft cool rim light from below-right
          for separation against the black backdrop. */}
      <ambientLight intensity={0.05} />
      <directionalLight
        ref={keyLightRef}
        position={[-3, 4, 4]}
        intensity={2.2}
        color="#fff5ed"
      />
      <directionalLight position={[3, -3, -1]} intensity={0.7} color="#a8b8ff" />

      {/* Primary asterisk — full-size, scaled/positioned/rotated per frame. */}
      <group ref={groupRef}>
        {PETAL_ANGLES.map((deg) => {
          const isCardinal = deg % 90 === 0;
          const geom = isCardinal ? cardinalGeom : diagonalGeom;
          const rotZ = (-deg * Math.PI) / 180;
          return (
            <mesh
              key={deg}
              geometry={geom}
              material={material}
              rotation={[0, 0, rotZ]}
            />
          );
        })}
      </group>

      {/* Shatter fragments — N smaller asterisks that scatter outward as
          the user scrolls past SHATTER_START on /signin. Driven by
          scrollProgress in the useFrame loop above. */}
      {FRAGMENT_HOMES.map((_, i) => (
        <group
          key={`frag-${i}`}
          ref={(el) => {
            fragmentRefs.current[i] = el;
          }}
          scale={0}
        >
          {PETAL_ANGLES.map((deg) => {
            const isCardinal = deg % 90 === 0;
            const geom = isCardinal ? cardinalGeom : diagonalGeom;
            const rotZ = (-deg * Math.PI) / 180;
            return (
              <mesh
                key={`f${i}-${deg}`}
                geometry={geom}
                material={material}
                rotation={[0, 0, rotZ]}
              />
            );
          })}
        </group>
      ))}

      <ResizeListener />
    </>
  );
}

function ResizeListener() {
  const [, setN] = useState(0);
  useEffect(() => {
    const on = () => setN((n) => n + 1);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return null;
}

// ---- Outer wrapper -----------------------------------------------------

// ---- Postprocessing intentionally REMOVED ----------------------------
// See import-block note for rationale. Asterisk material has emissive
// boost (line ~196) which provides the visible "glow in space" feel
// without needing a Bloom pass.

function PersistentAsteriskInner() {
  const [eligible, setEligible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const themeMode = useAsteriskSceneStore((s) => s.themeMode);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      if (gl) {
        setIsMobile(window.matchMedia('(max-width: 768px)').matches);
        setReducedMotion(reduced);
        setEligible(true);
      }
    } catch {
      // unsupported → leave eligible=false
    }
  }, []);

  // Theme awareness: seed the store from <html data-theme=...> on mount
  // and observe attribute changes so external toggles (theme-toggle button,
  // cross-tab localStorage syncs) flow into the asterisk's material.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const read = (): 'dark' | 'light' =>
      (html.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
    useAsteriskSceneStore.getState().setThemeMode(read());
    const obs = new MutationObserver(() => {
      useAsteriskSceneStore.getState().setThemeMode(read());
    });
    obs.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  if (!eligible) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        // Cohort feedback: the wandering asterisk was disrupting the foreground —
        // sometimes drifting over chat content. Cap wrapper opacity so it reads
        // as a subtle ambient layer, not a competing focal element.
        // Light mode bumps to 0.55 so the asterisk has presence on paper
        // (without the dark canvas + bloom, the same 0.4 reads as a smudge);
        // dark mode stays at 0.4 — bloom + emissive carry visibility.
        opacity: contextLost ? 0 : themeMode === 'light' ? 0.55 : 0.4,
        transition: 'opacity 240ms ease-out',
      }}
      aria-hidden="true"
    >
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={isMobile ? [1, 1] : [1, 2]}
        camera={{ position: [0, 0, 5], fov: 45 }}
        // pointer-events: none is CRITICAL. r3f's Canvas defaults to
        // pointer-events: auto on the inner <canvas> so users can click
        // 3D meshes (raycasting). We don't have any clickable meshes —
        // every click should pass through to the page underneath. Without
        // this override the fixed inset-0 canvas eats every click site-wide
        // and makes the entire app feel "dead." The wrapper div's
        // `pointer-events-none` class doesn't help because the inner canvas
        // explicitly re-enables pointer events.
        style={{ background: 'transparent', width: '100%', height: '100%', pointerEvents: 'none' }}
        // Disable r3f's event manager entirely — we don't use onClick/onPointerOver
        // on any mesh, so the picking machinery is pure overhead AND the source
        // of the click-stealing bug above.
        events={undefined}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          // Belt-and-braces — also set the attribute imperatively in case
          // r3f reconciles the style prop and drops our override.
          canvas.style.pointerEvents = 'none';
          const onLost = (e: Event) => {
            e.preventDefault();
            setContextLost(true);
          };
          canvas.addEventListener('webglcontextlost', onLost);
        }}
      >
        <Scene isMobile={isMobile} reducedMotion={reducedMotion} />
        {/* Postprocessing pass intentionally absent — see import note. */}
      </Canvas>
    </div>
  );
}

const PersistentAsteriskClient = dynamic(
  () => Promise.resolve(PersistentAsteriskInner),
  { ssr: false }
);

export default function PersistentAsterisk() {
  return <PersistentAsteriskClient />;
}
