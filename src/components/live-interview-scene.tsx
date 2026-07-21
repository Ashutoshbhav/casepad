'use client';

// LiveInterviewScene — reactive 3D HUD centerpiece for the live-interview
// screen, replacing a flat CSS panel per Ash's call ("the design is basic as
// fuck"). Reuses the visual language already established and vetted in
// src/app/design-lab/cinematic-shell/_components/stage.tsx (same cyan
// emissive-material glow, additive-blended particle field, camera
// parallax) rather than inventing a new one — that file's header notes
// @react-three/postprocessing crashes under React 19's ref-as-prop, so glow
// here comes from material settings + additive blending only, same as there,
// never from a postprocessing bloom pass.
//
// Reacts to two live inputs from <LiveInterviewSession>:
//   - `glowState`: which side "has the mic" (idle / ai / candidate /
//     processing) — drives a smoothly-lerped color across the whole scene.
//   - `ampRef`: a mutable ref (NOT React state) updated at ~30Hz by
//     <LiveMicInput>'s onAmplitude callback — read directly inside useFrame
//     so voice-reactive pulsing never triggers a React re-render.

import { useMemo, useRef, useEffect, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GlowState } from './live-interview-session';

const STATE_COLOR: Record<GlowState, THREE.Color> = {
  idle: new THREE.Color('#3fa9c9'),
  ai: new THREE.Color('#22d3ee'),
  candidate: new THREE.Color('#f2b84b'),
  processing: new THREE.Color('#8b7bf0'),
};

const STATE_INTENSITY: Record<GlowState, number> = {
  idle: 0.5,
  ai: 1.1,
  candidate: 1.0,
  processing: 0.75,
};

function CoreOrb({ glowState, ampRef }: { glowState: GlowState; ampRef: RefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const currentColor = useRef(new THREE.Color('#3fa9c9'));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const amp = Math.max(0, Math.min(1, ampRef.current ?? 0));
    const targetColor = STATE_COLOR[glowState];
    const targetIntensity = STATE_INTENSITY[glowState];

    currentColor.current.lerp(targetColor, 0.06);
    if (materialRef.current) {
      materialRef.current.color.copy(currentColor.current);
      materialRef.current.emissive.copy(currentColor.current);
      const breath = 1 + Math.sin(t * (glowState === 'processing' ? 3.2 : 0.8)) * 0.06;
      materialRef.current.emissiveIntensity = targetIntensity * breath + amp * 1.4;
    }
    if (meshRef.current) {
      const scale = 1 + amp * 0.22 + Math.sin(t * 0.7) * 0.02;
      meshRef.current.scale.setScalar(scale);
      meshRef.current.rotation.y = t * 0.12;
      meshRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y = -t * 0.05;
      wireRef.current.rotation.z = t * 0.03;
      wireRef.current.scale.setScalar(1.55 + amp * 0.1);
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#3fa9c9"
          emissive="#3fa9c9"
          emissiveIntensity={0.5}
          roughness={0.25}
          metalness={0.55}
        />
      </mesh>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#8fe3ff" wireframe transparent opacity={0.16} />
      </mesh>
    </group>
  );
}

function HudRings({ glowState }: { glowState: GlowState }) {
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const colorRef = useRef(new THREE.Color('#3fa9c9'));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    colorRef.current.lerp(STATE_COLOR[glowState], 0.05);
    if (ringA.current) {
      ringA.current.rotation.z = t * 0.15;
      (ringA.current.material as THREE.MeshBasicMaterial).color.copy(colorRef.current);
    }
    if (ringB.current) {
      ringB.current.rotation.z = -t * 0.09;
      ringB.current.rotation.x = 1.2 + Math.sin(t * 0.1) * 0.1;
      (ringB.current.material as THREE.MeshBasicMaterial).color.copy(colorRef.current);
    }
  });

  return (
    <>
      <mesh ref={ringA} rotation={[Math.PI / 2.3, 0, 0]}>
        <ringGeometry args={[2.1, 2.14, 96]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.28} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringB} rotation={[1.2, 0, 0.4]}>
        <ringGeometry args={[2.6, 2.62, 128]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.14} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

// Computed once at module load, not inside a component — a fixed field of
// scattered points read every frame but never regenerated per-render, so
// there's no need (and no React-purity issue) with pulling randomness in
// during render.
const PARTICLE_COUNT = 320;
const PARTICLE_POSITIONS = (() => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const r = 3 + Math.random() * 5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    positions[i * 3 + 2] = r * Math.cos(phi) - 2;
  }
  return positions;
})();

function Particles() {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(PARTICLE_POSITIONS, 3));
    return geo;
  }, []);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#67e8f9',
        size: 0.02,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const ref = useRef<THREE.Points>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.015;
  });
  return <points ref={ref} geometry={geometry} material={material} />;
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
      camera={{ position: [0, 0, 6], fov: 42 }}
      style={{ width: '100%', height: '100%' }}
      events={undefined}
    >
      <ambientLight intensity={0.3} color="#7dd3fc" />
      <directionalLight position={[3, 4, 4]} intensity={0.7} color="#ffffff" />
      <pointLight position={[0, 0, 3]} intensity={1.4} color="#22d3ee" distance={8} />
      <Particles />
      <HudRings glowState={glowState} />
      <CoreOrb glowState={glowState} ampRef={ampRef} />
      <CameraRig />
    </Canvas>
  );
}
