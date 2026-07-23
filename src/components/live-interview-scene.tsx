'use client';

// LiveInterviewScene — reactive 3D centerpiece for the live-interview screen.
// Rebuilt around a reference the user pointed to directly: a restrained,
// single hero "AI blob" — an irregular (not perfectly spherical), liquid-
// chrome, iridescent object against near-black, reacting to voice and
// showing "personality" through color mood, with almost no surrounding
// chrome. Two prior structural attempts here (a glass orb with instrument
// rings, then a hard-edged NERV-style dial) were both rejected — the
// through-line both times was "too much decorative HUD around a busy
// centerpiece." This version has exactly one 3D object and three lights.
//
// Shape: a smooth, static icosahedron — an earlier pass displaced vertices
// per-frame with Perlin noise for an organic "wobble," but a 2D face overlay
// (blob-face.tsx) sits on top in flat screen-space and has no way to track
// true per-vertex 3D bulging; the mismatch read as the face floating over a
// separately-morphing body. Motion now comes entirely from a uniform
// breathing scale pulse the face overlay mirrors exactly, so body and
// expression always move together.
//
// "Shows personality": rather than one flat isolated color per state (the
// NERV mistake — that reference's own blob clearly shows multiple
// simultaneous hues, not a single tint), each GlowState drives a 3-color
// light trio that smoothly cross-fades. The iridescent material picks up all
// three at once, so the surface always shows a multi-hue swirl, and the
// dominant mood shifts with the conversation.
//
// Reacts to two live inputs from <LiveInterviewSession>:
//   - `glowState`: which side "has the mic" (idle / ai / candidate /
//     processing / error) — drives the light-trio color mood.
//   - `ampRef`: a mutable ref (NOT React state) updated at ~30Hz by
//     <LiveMicInput>'s onAmplitude callback — read directly inside useFrame
//     so voice-reactive wobble never triggers a React re-render.

import { useMemo, useRef, useEffect, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as THREE from 'three';
import type { GlowState } from './live-interview-session';

// Each state's 3-light color trio — always three simultaneous hues, never
// one isolated tint, so the surface reads as a living swirl (per the
// reference) instead of a flat glow.
const STATE_LIGHTS: Record<GlowState, [THREE.Color, THREE.Color, THREE.Color]> = {
  idle: [new THREE.Color('#38bdf8'), new THREE.Color('#6366f1'), new THREE.Color('#e0e7ff')],
  ai: [new THREE.Color('#f59e0b'), new THREE.Color('#ec4899'), new THREE.Color('#22d3ee')],
  candidate: [new THREE.Color('#4ade80'), new THREE.Color('#22d3ee'), new THREE.Color('#e0f2fe')],
  processing: [new THREE.Color('#8b5cf6'), new THREE.Color('#3b82f6'), new THREE.Color('#d946ef')],
  error: [new THREE.Color('#ef4444'), new THREE.Color('#f97316'), new THREE.Color('#7f1d1d')],
};

// Subtle emissive undertone per state — kept low so it never overrides the
// iridescent multi-hue material identity, just nudges the overall mood.
const STATE_EMISSIVE: Record<GlowState, THREE.Color> = {
  idle: new THREE.Color('#16324f'),
  ai: new THREE.Color('#4a2a0d'),
  candidate: new THREE.Color('#123a24'),
  processing: new THREE.Color('#2a1a4a'),
  error: new THREE.Color('#4a1414'),
};

// Liquid blob — a smooth, static icosahedron (no per-vertex wobble; see
// below for why). "Alive" motion is now entirely the uniform breathing
// scale pulse + gentle sway, both mirrored exactly by the 2D face overlay
// (blob-face.tsx) so body and face always move together — expression is
// where "personality" lives now, not surface deformation.
function LiquidBlob({ glowState, ampRef }: { glowState: GlowState; ampRef: RefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const emissiveColor = useRef(new THREE.Color('#16324f'));

  // mergeVertices welds coincident vertices into a real shared-index mesh —
  // IcosahedronGeometry's subdivision otherwise leaves adjacent faces with
  // their own separate copies of "shared" corner positions, so
  // computeVertexNormals() (which averages by vertex INDEX, not by
  // position) can't blend across them and the surface stays visibly
  // faceted. Still needed even with no per-frame animation, since the base
  // geometry itself needs this one-time smoothing pass.
  const geometry = useMemo(() => {
    const geo = mergeVertices(new THREE.IcosahedronGeometry(1.05, 4));
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const amp = Math.max(0, Math.min(1, ampRef.current ?? 0));

    emissiveColor.current.lerp(STATE_EMISSIVE[glowState], 0.04);
    if (materialRef.current) {
      materialRef.current.emissive.copy(emissiveColor.current);
      materialRef.current.emissiveIntensity = 0.5 + amp * 0.6;
    }
    if (meshRef.current) {
      // Oscillating sway, not continuous rotation — a face overlay needs
      // the blob to keep facing the camera; a full accumulating spin (the
      // first version of this) would eventually turn the "face" away from
      // the viewer with no way for the flat 2D overlay to follow.
      meshRef.current.rotation.y = Math.sin(t * 0.12) * 0.1;
      meshRef.current.rotation.x = Math.sin(t * 0.09) * 0.04;
      // Uniform breathing pulse — the real "alive" motion now that per-
      // vertex wobble is faint. blob-face.tsx mirrors this exact formula
      // (idle sine + amplitude term) so the face scales in lockstep with
      // the body instead of floating over it at a different rate.
      const breathe = 1 + Math.sin(t * 0.6) * 0.015 + amp * 0.1;
      meshRef.current.scale.setScalar(breathe);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      {/* Low metalness is the key fix over the first pass: metalness near 1
          with no environment map has nothing ambient to reflect, so it only
          catches tight specular hotspots from the point lights (two hard
          triangular "stickers," not a color wash). At low metalness the
          material has a real Lambertian diffuse response, so all three
          mood-lights blend continuously across the whole surface based on
          local normal direction — that's what produces the swirl. */}
      <meshPhysicalMaterial
        ref={materialRef}
        color="#141418"
        metalness={0.15}
        roughness={0.6}
        iridescence={0.6}
        iridescenceIOR={1.3}
        iridescenceThicknessRange={[100, 400]}
        clearcoat={0.4}
        clearcoatRoughness={0.3}
        envMapIntensity={0.8}
        emissive="#16324f"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

// Three colored point lights whose hues cross-fade to the active state's
// trio — this, not the material, is what carries "personality." The
// iridescent surface reflects whichever lights are live, so the blob always
// shows a multi-hue blend, shifting mood as glowState changes.
function MoodLights({ glowState }: { glowState: GlowState }) {
  const refA = useRef<THREE.PointLight>(null);
  const refB = useRef<THREE.PointLight>(null);
  const refC = useRef<THREE.PointLight>(null);
  const colorA = useRef(STATE_LIGHTS.idle[0].clone());
  const colorB = useRef(STATE_LIGHTS.idle[1].clone());
  const colorC = useRef(STATE_LIGHTS.idle[2].clone());

  useFrame(() => {
    const [a, b, c] = STATE_LIGHTS[glowState];
    colorA.current.lerp(a, 0.035);
    colorB.current.lerp(b, 0.035);
    colorC.current.lerp(c, 0.035);
    if (refA.current) refA.current.color.copy(colorA.current);
    if (refB.current) refB.current.color.copy(colorB.current);
    if (refC.current) refC.current.color.copy(colorC.current);
  });

  return (
    // Evenly spaced ~120° apart in azimuth, all on the camera-facing
    // hemisphere (positive z) — the first pass put one light fully behind
    // the sphere (z: -2.8), so it only ever grazed the silhouette as a thin
    // rim highlight instead of contributing real coverage on the visible
    // face. All three now share the front equally.
    <>
      <pointLight ref={refA} position={[0, 3.1, 2.4]} intensity={30} distance={22} decay={1} />
      <pointLight ref={refB} position={[-2.9, -1.7, 2.1]} intensity={30} distance={22} decay={1} />
      <pointLight ref={refC} position={[2.9, -1.7, 2.1]} intensity={30} distance={22} decay={1} />
    </>
  );
}

// Sparse drifting dust — depth for the otherwise-empty black backdrop.
// Positions computed once at module load (fixed field, never regenerated
// per-render); the only per-frame work is one rotation assignment on a
// single Points draw call, so this adds nothing measurable to the frame
// budget the recent perf pass just reclaimed.
const DUST_COUNT = 220;
const DUST_POSITIONS = (() => {
  const positions = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i += 1) {
    const r = 3.2 + Math.random() * 6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
    positions[i * 3 + 2] = r * Math.cos(phi) - 2.5;
  }
  return positions;
})();

function DustField({ glowState, ampRef }: { glowState: GlowState; ampRef: RefObject<number> }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(DUST_POSITIONS, 3));
    return geo;
  }, []);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#aab4c4',
        size: 0.018,
        transparent: true,
        opacity: 0.4,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    []
  );
  const ref = useRef<THREE.Points>(null);
  const colorRef = useRef(new THREE.Color('#aab4c4'));
  const tint = useRef(new THREE.Color());
  useFrame((s, delta) => {
    if (!ref.current) return;
    const amp = Math.max(0, Math.min(1, ampRef.current ?? 0));
    // Dust stirs faster and brightens while anyone is speaking, and drifts
    // toward the active mood color — the background listening along.
    ref.current.rotation.y += delta * (0.012 + amp * 0.12);
    tint.current.copy(STATE_LIGHTS[glowState][0]).lerp(new THREE.Color('#aab4c4'), 0.55);
    colorRef.current.lerp(tint.current, 0.03);
    material.color.copy(colorRef.current);
    material.opacity = 0.35 + amp * 0.15;
  });
  return <points ref={ref} geometry={geometry} material={material} />;
}

// Radial-gradient sprite texture, generated once — no external asset.
function makeHaloTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  if (!g) return null;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

// Soft halo behind the blob — follows the mood color and SWELLS with live
// voice amplitude, so the space around the blob visibly reacts to whoever
// is speaking rather than sitting inert.
function BackgroundHalo({ glowState, ampRef }: { glowState: GlowState; ampRef: RefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const colorRef = useRef(STATE_LIGHTS.idle[0].clone());
  const texture = useMemo(() => makeHaloTexture(), []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const amp = Math.max(0, Math.min(1, ampRef.current ?? 0));
    colorRef.current.lerp(STATE_LIGHTS[glowState][0], 0.035);
    if (materialRef.current) {
      materialRef.current.color.copy(colorRef.current);
      materialRef.current.opacity = 0.055 + amp * 0.09 + Math.sin(t * 0.6) * 0.01;
    }
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + amp * 0.28 + Math.sin(t * 0.6) * 0.015);
    }
  });
  if (!texture) return null;
  return (
    <mesh ref={meshRef} position={[0, 0, -1.7]}>
      <planeGeometry args={[5, 5]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0.14}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Expanding ripple rings radiating from behind the blob — barely-there
// pulses at rest, surging outward with speech. Three recycled meshes, no
// allocation per ripple.
function RippleRings({ glowState, ampRef }: { glowState: GlowState; ampRef: RefObject<number> }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const phases = useRef([0, 0.34, 0.67]);
  const colorRef = useRef(STATE_LIGHTS.idle[0].clone());
  useFrame((_, delta) => {
    const amp = Math.max(0, Math.min(1, ampRef.current ?? 0));
    colorRef.current.lerp(STATE_LIGHTS[glowState][0], 0.035);
    for (let i = 0; i < 3; i++) {
      const mesh = refs.current[i];
      if (!mesh) continue;
      phases.current[i] += delta * (0.16 + amp * 0.75);
      if (phases.current[i] > 1) phases.current[i] -= 1;
      const p = phases.current[i];
      mesh.scale.setScalar(1.5 + p * 2.6);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(colorRef.current);
      mat.opacity = (1 - p) * (0.025 + amp * 0.09);
    }
  });
  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[0, 0, -1.5]}
        >
          <ringGeometry args={[0.985, 1, 64]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}

// Real (procedurally generated, no external asset) environment reflections
// — the "more realistic" fix. A pure point-light material with no
// environment map can only ever show what those lights directly hit; a
// baked environment map gives the physical material genuine ambient
// reflections to work with (subtle neutral highlights, real Fresnel
// falloff at grazing angles), the difference between "three colored dots
// of light" and something that reads as an actually-lit physical object.
// RoomEnvironment + PMREMGenerator is three.js's own standard technique for
// this — no HDRI file, no extra network request.
function SceneEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    return () => {
      scene.environment = null;
      envMap.dispose();
      pmremGenerator.dispose();
    };
  }, [gl, scene]);
  return null;
}

function CameraRig() {
  const { camera, size } = useThree();
  const target = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = (e.clientX / size.width) * 2 - 1;
      target.current.y = (e.clientY / size.height) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [size.width, size.height]);
  // react-hooks/purity + react-hooks/immutability both flag this as
  // mutating a hook-returned value outside render — that's react-three-fiber's
  // whole model for useFrame (a per-frame imperative escape hatch outside
  // React's render cycle, not a render-phase call). Same pattern already
  // exists, and already trips the same two rules, in the only other r3f
  // scene in this codebase (design-lab/cinematic-shell/_components/stage.tsx).
  /* eslint-disable react-hooks/immutability */
  useFrame(() => {
    camera.position.x += (target.current.x * 0.35 - camera.position.x) * 0.03;
    camera.position.y += (-target.current.y * 0.2 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
  });
  /* eslint-enable react-hooks/immutability */
  return null;
}

export function LiveInterviewScene({ glowState, ampRef }: { glowState: GlowState; ampRef: RefObject<number> }) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6.6], fov: 40 }}
      style={{ width: '100%', height: '100%' }}
      events={undefined}
    >
      <ambientLight intensity={0.35} color="#ffffff" />
      <SceneEnvironment />
      <BackgroundHalo glowState={glowState} ampRef={ampRef} />
      <RippleRings glowState={glowState} ampRef={ampRef} />
      <DustField glowState={glowState} ampRef={ampRef} />
      <MoodLights glowState={glowState} />
      <LiquidBlob glowState={glowState} ampRef={ampRef} />
      <CameraRig />
      <EffectComposer>
        {/* Soft, restrained bloom — unlike a hard-edge HUD, a liquid/organic
            hero object legitimately reads as premium with a gentle ambient
            glow (the reference itself shows soft light bleeding around the
            blob against black). Tight threshold so only genuine highlights
            bloom, not the whole surface. */}
        <Bloom intensity={0.45} luminanceThreshold={0.6} luminanceSmoothing={0.3} mipmapBlur radius={0.35} />
      </EffectComposer>
    </Canvas>
  );
}
