import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, PerspectiveCamera, Sparkles } from '@react-three/drei';
import { rand01 } from '../lib/seededRandom.js';

const TRACK_LENGTH = 9;
const LANE_X = 1.15;
const GROUND_COLOR = '#4a3620';
const PATH_COLOR = '#6b4a26';
const FOG_COLOR = '#2e2110';
const HOP_DURATION = 0.4;
const HOP_HEIGHT = 0.32;

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0.15, -TRACK_LENGTH * 0.58);
  }, [camera]);
  return null;
}

function Clutter({ seed }) {
  const tufts = useMemo(() => {
    const count = 16;
    return Array.from({ length: count }).map((_, i) => {
      const base = seed * 19 + i * 7;
      const side = rand01(base + 1) > 0.5 ? 1 : -1;
      return {
        position: [
          side * (LANE_X * 1.9 + rand01(base + 2) * 0.8),
          0.06,
          -rand01(base + 3) * TRACK_LENGTH,
        ],
        scale: 0.12 + rand01(base + 4) * 0.14,
      };
    });
  }, [seed]);

  return (
    <>
      {tufts.map((t, i) => (
        <mesh key={i} position={t.position} scale={t.scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#3a6b2f" roughness={0.9} flatShading />
        </mesh>
      ))}
    </>
  );
}

function Lane({ x }) {
  return (
    <mesh position={[x, 0.005, -TRACK_LENGTH / 2 + 0.5]} receiveShadow>
      <boxGeometry args={[0.9, 0.01, TRACK_LENGTH + 1]} />
      <meshStandardMaterial color={PATH_COLOR} roughness={1} />
    </mesh>
  );
}

/**
 * One runner riding along its lane. Position eases toward `progress`
 * (0..1) every frame rather than snapping, and a correct answer (progress
 * moving forward) triggers a short hop — detected by comparing `progress`
 * to its previous value inside the frame loop, so no extra state/props are
 * needed just to animate a hit.
 */
function Runner({ emoji, name, progress, laneX, finished }) {
  const group = useRef();
  const z = useRef(0.5);
  const prevProgress = useRef(progress);
  const hopStart = useRef(null);

  useFrame((state, delta) => {
    if (progress !== prevProgress.current) {
      if (progress > prevProgress.current) hopStart.current = state.clock.elapsedTime;
      prevProgress.current = progress;
    }

    const targetZ = 0.5 - progress * TRACK_LENGTH;
    z.current += (targetZ - z.current) * Math.min(1, delta * 6);

    let hop = 0;
    if (hopStart.current !== null) {
      const t = state.clock.elapsedTime - hopStart.current;
      if (t < HOP_DURATION) {
        hop = Math.sin((t / HOP_DURATION) * Math.PI) * HOP_HEIGHT;
      } else {
        hopStart.current = null;
      }
    }

    if (group.current) {
      group.current.position.set(laneX, hop, z.current);
    }
  });

  return (
    <group ref={group}>
      <Html center distanceFactor={5.2} zIndexRange={[10, 0]}>
        <div className="race-runner-badge">
          <div className="race-runner-emoji">{emoji}</div>
          <div className="race-runner-name">{name}</div>
        </div>
      </Html>
      {finished && <Sparkles count={30} scale={1.4} size={4} speed={0.6} color="#f2b134" />}
    </group>
  );
}

function Scene({ playerEmoji, playerName, playerProgress, opponentEmoji, opponentName, opponentProgress }) {
  return (
    <>
      <PerspectiveCamera makeDefault fov={48} position={[0, 2.3, 3.6]} />
      <CameraRig />

      <fog attach="fog" args={[FOG_COLOR, 4, TRACK_LENGTH + 4]} />

      <ambientLight intensity={0.4} color="#caa25c" />
      <directionalLight position={[3, 4.5, 2]} intensity={0.8} color="#e2a75c" castShadow />
      <hemisphereLight args={['#8a6a34', '#241708', 0.35]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -TRACK_LENGTH / 2]} receiveShadow>
        <planeGeometry args={[LANE_X * 2 + 3, TRACK_LENGTH + 3]} />
        <meshStandardMaterial color={GROUND_COLOR} roughness={1} />
      </mesh>

      <Lane x={-LANE_X} />
      <Lane x={LANE_X} />
      <Clutter seed={7} />

      <Html position={[0, 0.4, 0.5 - TRACK_LENGTH]} center distanceFactor={5.2} zIndexRange={[10, 0]}>
        <div className="race-finish-badge">🍖</div>
      </Html>

      <Runner
        emoji={playerEmoji}
        name={playerName}
        progress={playerProgress}
        laneX={-LANE_X}
        finished={playerProgress >= 1}
      />
      <Runner
        emoji={opponentEmoji}
        name={opponentName}
        progress={opponentProgress}
        laneX={LANE_X}
        finished={opponentProgress >= 1}
      />
    </>
  );
}

/**
 * A 3D race toward the food: each correct answer hops the runner forward.
 * `opponentHits` is taken as-is — for AI mode the caller passes an
 * already-revealed slice (in sync with the player's own pace, since the
 * full sequence is precomputed upfront); for PvP it's the opponent's real
 * live progress, which must NOT be capped to the player's own pace or a
 * faster opponent's real lead would be hidden.
 */
export function RaceTrack({ playerEmoji, playerName, playerHits, opponentEmoji, opponentName, opponentHits, questionCount }) {
  const playerProgress = playerHits.filter(Boolean).length / questionCount;
  const opponentProgress = opponentHits.filter(Boolean).length / questionCount;

  return (
    <div className="race-track-canvas">
      <Canvas shadows dpr={[1, 2]}>
        <Scene
          playerEmoji={playerEmoji}
          playerName={playerName}
          playerProgress={playerProgress}
          opponentEmoji={opponentEmoji}
          opponentName={opponentName}
          opponentProgress={opponentProgress}
        />
      </Canvas>
    </div>
  );
}
