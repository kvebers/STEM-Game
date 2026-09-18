import { useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import { AnimalCard } from './AnimalCard.jsx';
import { buildTreeLayout, boundingSphere } from '../lib/treeLayout.js';
import { rand01 } from '../lib/seededRandom.js';

const LEAF_COLORS = ['#1e4a20', '#255c29', '#2f6b34', '#3a7a3e', '#4c8f4f'];
const SKY_COLOR = '#4a3216';

function Branch({ from, to, radius }) {
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const dir = end.clone().sub(start);
    const len = dir.length();
    dir.normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    return { position: mid.toArray(), quaternion: quat, length: len };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <cylinderGeometry args={[Math.max(radius * 0.7, 0.02), radius, length, 7]} />
      <meshStandardMaterial color="#7a5233" roughness={0.92} />
    </mesh>
  );
}

function LeafCluster({ position, seed, scale = 1 }) {
  const puffs = useMemo(() => {
    const count = 5 + Math.floor(rand01(seed) * 3);
    return Array.from({ length: count }).map((_, i) => {
      const base = seed * 31 + i * 7;
      return {
        offset: [
          (rand01(base + 1) - 0.5) * 0.85,
          (rand01(base + 2) - 0.25) * 0.7,
          (rand01(base + 3) - 0.5) * 0.85,
        ],
        size: 0.24 + rand01(base + 4) * 0.2,
        color: LEAF_COLORS[Math.floor(rand01(base + 5) * LEAF_COLORS.length)],
      };
    });
  }, [seed]);

  return (
    <group position={position} scale={scale}>
      {puffs.map((p, i) => (
        <mesh key={i} position={p.offset} castShadow>
          <icosahedronGeometry args={[p.size, 0]} />
          <meshStandardMaterial color={p.color} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function AnimalNode({ node, selectable, selected, onSelect, alwaysClickable }) {
  return (
    <Html position={node.to} center distanceFactor={6.4} zIndexRange={[20, 0]}>
      <div className="tree-animal-badge">
        <AnimalCard
          animal={node.animal}
          selectable={selectable}
          selected={selected}
          onSelect={() => onSelect(node.animal)}
          alwaysClickable={alwaysClickable}
        />
      </div>
    </Html>
  );
}

function Scene({ nodes, selectable, selectedTier, onSelect, alwaysClickable }) {
  const { center, radius } = useMemo(() => boundingSphere(nodes), [nodes]);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={40}
        position={[center[0] + radius * 1.5, center[1] + radius * 0.55, center[2] + radius * 2.5]}
      />
      <OrbitControls
        target={center}
        enablePan={false}
        minDistance={radius * 1.6}
        maxDistance={radius * 4.2}
        maxPolarAngle={Math.PI * 0.52}
        autoRotate={!selectable}
        autoRotateSpeed={0.5}
      />

      <fog attach="fog" args={[SKY_COLOR, radius * 1.8, radius * 5.5]} />

      <ambientLight intensity={0.32} color="#caa25c" />
      <directionalLight
        position={[center[0] + radius * 2, center[1] + radius * 3.2, center[2] + radius * 1.3]}
        intensity={0.85}
        color="#e2a75c"
        castShadow
      />
      <hemisphereLight args={['#8a6a34', '#3a2a12', 0.3]} />

      <mesh position={[center[0], -0.02, center[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius * 2.3, 48]} />
        <meshStandardMaterial color="#5c4324" roughness={1} />
      </mesh>

      {nodes.map((node) => (
        <group key={node.animal.stage_tier}>
          <Branch from={node.from} to={node.to} radius={node.radius} />
          {node.depth > 0 && (
            <LeafCluster position={node.to} seed={node.animal.stage_tier} scale={node.isTip ? 1.15 : 0.9} />
          )}
          <AnimalNode
            node={node}
            selectable={selectable}
            selected={selectedTier === node.animal.stage_tier}
            onSelect={onSelect}
            alwaysClickable={alwaysClickable}
          />
        </group>
      ))}
    </>
  );
}

export function AnimalTree({ animals, selectable = false, selectedTier = null, onSelect = () => {}, alwaysClickable = false }) {
  const nodes = useMemo(() => buildTreeLayout(animals), [animals]);

  if (!nodes.length) return null;

  return (
    <div className="animal-tree-canvas">
      <Canvas shadows dpr={[1, 2]}>
        <Scene
          nodes={nodes}
          selectable={selectable}
          selectedTier={selectedTier}
          onSelect={onSelect}
          alwaysClickable={alwaysClickable}
        />
      </Canvas>
    </div>
  );
}
