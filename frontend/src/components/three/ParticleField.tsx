"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ count = 2000 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null!);
  const time = useRef(0);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const gold = new THREE.Color("#C9A96E");
    const goldLight = new THREE.Color("#E8D5A3");
    const white = new THREE.Color("#F0EAE0");

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 8;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const t = Math.random();
      const c = t < 0.4 ? gold : t < 0.7 ? goldLight : white;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((_, delta) => {
    time.current += delta * 0.08;
    if (mesh.current) {
      mesh.current.rotation.y = time.current * 0.3;
      mesh.current.rotation.x = Math.sin(time.current * 0.2) * 0.1;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function GlobeRing() {
  const ring = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (ring.current) {
      ring.current.rotation.z = state.clock.elapsedTime * 0.15;
      ring.current.rotation.x = Math.PI / 4 + Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <mesh ref={ring}>
      <torusGeometry args={[3.5, 0.008, 2, 120]} />
      <meshBasicMaterial color="#C9A96E" transparent opacity={0.25} />
    </mesh>
  );
}

function GlobeRing2() {
  const ring = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (ring.current) {
      ring.current.rotation.z = -state.clock.elapsedTime * 0.1;
      ring.current.rotation.y = Math.PI / 3 + Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    }
  });

  return (
    <mesh ref={ring}>
      <torusGeometry args={[4.2, 0.006, 2, 120]} />
      <meshBasicMaterial color="#E8D5A3" transparent opacity={0.15} />
    </mesh>
  );
}

export default function ParticleField({ className }: { className?: string }) {
  return (
    <div className={className} style={{ pointerEvents: "none" }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <Particles count={2500} />
        <GlobeRing />
        <GlobeRing2 />
      </Canvas>
    </div>
  );
}
