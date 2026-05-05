'use client';

// Cinematic Shell — Phase 0 Stage
//
// Full-bleed Three.js scene that demonstrates the "Bet 4" direction:
// the entire app sits inside a persistent 3D environment instead of
// flat HTML. This is a SINGLE STAGE preview — no flythrough between
// routes yet, just one stage rendered well so Ash can feel the visual
// language before we commit to Phase 1.
//
// Scene composition:
//   - Asterisk centerpiece, slowly rotating + breathing scale
//   - Floating 3D frame (the "case card" abstracted as geometry)
//   - Particle field for depth (200 cyan motes drifting)
//   - 3-point lighting: directional key (warm) + cool fill + accent point
//   - Subtle camera orbit driven by mouse position (parallax)
//
// Postprocessing intentionally omitted — emissive material + bloom-like
// glow comes from material settings + alpha blending. Earlier session
// found @react-three/postprocessing crashes under React 19 ref-as-prop.

import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ---- Asterisk geometry ------------------------------------------------
// 8-petal asterisk, ported from persistent-asterisk.tsx with simplified
// bevel for faster render. Cardinal petals are longer, diagonals shorter.
const PETAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
const CARDINAL_LEN = 1.0;
const DIAGONAL_LEN = CARDINAL_LEN / 1.14;

function buildPetalGeometry(length: number): THREE.ExtrudeGeometry {
  const halfBase = 0.18 * 0.5;
  const halfShoulder = 0.18 * 0.55 * 0.5;
  const shoulderY = length * 0.7;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(halfBase, shoulderY * 0.4, halfShoulder, shoulderY);
  shape.quadraticCurveTo(halfShoulder * 0.6, length, 0, length);
  shape.quadraticCurveTo(-halfShoulder * 0.6, length, -halfShoulder, shoulderY);
  shape.quadraticCurveTo(-halfBase, shoulderY * 0.4, 0, 0);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geom.translate(0, 0, -0.03);
  return geom;
}

function Asterisk() {
  const groupRef = useRef<THREE.Group>(null);
  const cardinalGeom = useMemo(() => buildPetalGeometry(CARDINAL_LEN), []);
  const diagonalGeom = useMemo(() => buildPetalGeometry(DIAGONAL_LEN), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#22D3EE', // cyan-400
        emissive: '#0EA5E9', // sky-500
        emissiveIntensity: 0.55,
        roughness: 0.32,
        metalness: 0.4,
      }),
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Slow rotation + breathing scale for ambient life.
    groupRef.current.rotation.z = t * 0.08;
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.15;
    const breath = 1 + Math.sin(t * 0.6) * 0.04;
    groupRef.current.scale.setScalar(breath);
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {PETAL_ANGLES.map((deg) => {
        const isCardinal = deg % 90 === 0;
        const geom = isCardinal ? cardinalGeom : diagonalGeom;
        return (
          <mesh
            key={deg}
            geometry={geom}
            material={material}
            rotation={[0, 0, (deg * Math.PI) / 180]}
          />
        );
      })}
    </group>
  );
}

// ---- Floating Frame ---------------------------------------------------
// A wireframe-y rectangular plane behind the asterisk that suggests the
// "case card" container. Subtle, rotating slowly on its own axis.
function FloatingFrame() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime;
    ref.current.rotation.x = Math.sin(t * 0.18) * 0.12;
    ref.current.rotation.y = Math.cos(t * 0.15) * 0.18;
  });
  return (
    <mesh ref={ref} position={[0, 0, -1.2]}>
      <ringGeometry args={[2.4, 2.45, 64]} />
      <meshBasicMaterial color="#22D3EE" transparent opacity={0.18} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---- Particle field ---------------------------------------------------
// 240 small motes drifting in a slab of space behind the asterisk. Gives
// the scene depth — the eye perceives parallax even though the camera
// barely moves.
function Particles() {
  const COUNT = 240;
  const geometry = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = -1 - Math.random() * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#67E8F9',
        size: 0.022,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const ref = useRef<THREE.Points>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.z = s.clock.elapsedTime * 0.012;
  });
  return <points ref={ref} geometry={geometry} material={material} />;
}

// ---- Camera parallax --------------------------------------------------
// Tracks mouse position and lerps the camera toward an offset position
// for a parallax-on-mouse effect. Subtle — peak offset is ~0.4 units.
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
  useFrame(() => {
    camera.position.x += (target.current.x * 0.4 - camera.position.x) * 0.04;
    camera.position.y += (-target.current.y * 0.25 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function CinematicStage() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      style={{
        background: 'radial-gradient(ellipse at center, #0F1729 0%, #050810 70%, #020308 100%)',
        width: '100%',
        height: '100%',
      }}
      events={undefined}
    >
      <ambientLight intensity={0.35} color="#7DD3FC" />
      <directionalLight position={[3, 4, 4]} intensity={0.9} color="#FFFFFF" />
      <directionalLight position={[-3, -2, 2]} intensity={0.4} color="#22D3EE" />
      <pointLight position={[0, 0, 2.5]} intensity={1.2} color="#22D3EE" distance={6} />

      <Particles />
      <FloatingFrame />
      <Asterisk />
      <CameraRig />
    </Canvas>
  );
}
