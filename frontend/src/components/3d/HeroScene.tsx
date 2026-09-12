import { useRef, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

interface SkillNodeProps {
  position: [number, number, number];
  color: string;
  size?: number;
  speed?: number;
}

/**
 * 3D Skill Sphere with Primitive Colliders (Rapier) & Decoupled 3D Loop (R3F)
 */
function SkillNode({ position, color, size = 0.65, speed = 1 }: SkillNodeProps) {
  // Mutable ref for Three.js object transforms — NO setState inside useFrame()
  const meshRef = useRef<THREE.Mesh>(null!);
  const initialY = position[1];

  // Geometries and materials instantiated with lifecycle cleanup on unmount
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.SphereGeometry(size, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.25,
      metalness: 0.15,
      emissive: new THREE.Color(color).multiplyScalar(0.15),
    });
    return { geometry: geo, material: mat };
  }, [color, size]);

  useEffect(() => {
    return () => {
      // Asset Lifecycle Management: explicitly dispose geometries and materials
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // 3D Loop Decoupling: mutate transforms directly via mutable refs, never invoke setState
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime() * speed;
    meshRef.current.position.y = initialY + Math.sin(t) * 0.25;
    meshRef.current.rotation.x = t * 0.2;
    meshRef.current.rotation.y = t * 0.3;
  });

  return (
    <RigidBody colliders="ball" position={position} type="dynamic" restitution={0.7}>
      <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />
    </RigidBody>
  );
}

/**
 * Interactive Center Ring
 */
function CentralCore() {
  const coreRef = useRef<THREE.Mesh>(null!);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.TorusGeometry(1.4, 0.08, 16, 100);
    const mat = new THREE.MeshStandardMaterial({
      color: '#1C3A28',
      roughness: 0.3,
      metalness: 0.4,
    });
    return { geometry: geo, material: mat };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state) => {
    if (!coreRef.current) return;
    const t = state.clock.getElapsedTime();
    coreRef.current.rotation.x = Math.sin(t * 0.5) * 0.4;
    coreRef.current.rotation.y = t * 0.4;
  });

  return <mesh ref={coreRef} geometry={geometry} material={material} />;
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <pointLight position={[-4, -2, -2]} intensity={0.5} color="#BDD0B4" />

      {/* Simplified Physics with Rapier primitive boundaries */}
      <Physics gravity={[0, -0.5, 0]}>
        {/* Invisible floor collider */}
        <CuboidCollider position={[0, -3.5, 0]} args={[10, 0.5, 10]} />

        <CentralCore />

        {/* Floating Cordian Skill Nodes with primitive sphere colliders */}
        <SkillNode position={[-1.8, 0.5, 0]} color="#1C3A28" size={0.55} speed={1.1} />
        <SkillNode position={[1.8, -0.4, 0.5]} color="#BDD0B4" size={0.65} speed={0.9} />
        <SkillNode position={[0.2, 1.6, -0.8]} color="#C4622A" size={0.5} speed={1.3} />
        <SkillNode position={[-0.8, -1.5, 0.6]} color="#274F37" size={0.6} speed={0.8} />
        <SkillNode position={[1.2, 1.2, 0.8]} color="#A8BF9E" size={0.45} speed={1.0} />
      </Physics>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 1.7}
        minPolarAngle={Math.PI / 2.5}
      />
    </>
  );
}

export function HeroScene() {
  return (
    <div className="w-full h-full min-h-90 md:min-h-110 relative">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border border-dashed border-sand-dark animate-spin opacity-40" />
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 5.5], fov: 45 }}
          className="w-full h-full"
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        >
          <SceneContent />
        </Canvas>
      </Suspense>
    </div>
  );
}
