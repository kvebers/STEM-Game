import * as THREE from 'three';
import { rand01 } from './seededRandom.js';

// Turns a flat list of animals (each with `stage_tier` + `parent_tier`,
// as returned by useCollectionStore) into 3D branch segments. The shape is
// entirely derived from parent_tier links — adding more stage_animals rows
// (more tiers, deeper chains, wider splits) grows the tree automatically,
// no hardcoded positions.
//
// Each node carries a `lean` (angle from vertical, radians) and `bearing`
// (compass angle around the trunk, radians). A single-child node inherits
// its parent's lean/bearing unchanged (plus a small per-node wobble) so a
// branch keeps heading the same general direction for its whole length
// instead of drifting back toward vertical. A branch POINT (multiple
// children) increases the lean and fans the children out across bearings,
// so the split is what actually pushes growth outward.
const BASE_LENGTH = 2.1;
const LENGTH_DECAY = 0.93;
const MIN_LENGTH = 1.05;
const BASE_RADIUS = 0.2;
const RADIUS_DECAY = 0.8;
const MIN_RADIUS = 0.035;
const MAX_LEAN = 1.3; // ~74 degrees from vertical
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function dirFromAngles(lean, bearing) {
  return new THREE.Vector3(Math.sin(lean) * Math.cos(bearing), Math.cos(lean), Math.sin(lean) * Math.sin(bearing));
}

export function buildTreeLayout(animals) {
  const byParent = new Map();
  for (const animal of animals) {
    const key = animal.parent_tier ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(animal);
  }
  byParent.forEach((list) => list.sort((a, b) => a.stage_tier - b.stage_tier));

  const nodes = [];

  function place(animal, position, lean, bearing, depth) {
    const children = byParent.get(animal.stage_tier) ?? [];
    const length = Math.max(MIN_LENGTH, BASE_LENGTH * LENGTH_DECAY ** depth);
    const radius = Math.max(MIN_RADIUS, BASE_RADIUS * RADIUS_DECAY ** depth);

    // Small per-segment wobble only — doesn't propagate to descendants.
    const wobbleLean = Math.max(0, lean + (rand01(animal.stage_tier * 13 + 1) - 0.5) * 0.12);
    const wobbleBearing = bearing + (rand01(animal.stage_tier * 13 + 2) - 0.5) * 0.3;

    const dir = dirFromAngles(wobbleLean, wobbleBearing);
    const to = position.clone().add(dir.multiplyScalar(length));

    nodes.push({
      animal,
      from: position.toArray(),
      to: to.toArray(),
      depth,
      radius,
      isTip: children.length === 0,
    });

    if (children.length === 0) return;

    if (children.length === 1) {
      // Straight continuation: trunk chain, or a branch running to its tip.
      place(children[0], to, lean, bearing, depth + 1);
      return;
    }

    // Branch point: fan children out to new bearings and lean them outward.
    const leanStep = Math.min(0.55, 0.4 + children.length * 0.04);
    const phiBase = rand01(animal.stage_tier * 13 + 4) * Math.PI * 2;
    children.forEach((child, i) => {
      const childBearing = phiBase + i * GOLDEN_ANGLE;
      const childLean = Math.min(MAX_LEAN, lean + leanStep);
      place(child, to, childLean, childBearing, depth + 1);
    });
  }

  const roots = byParent.get(null) ?? [];
  roots.forEach((root, i) => {
    const offsetX = (i - (roots.length - 1) / 2) * 2.8;
    place(root, new THREE.Vector3(offsetX, 0, 0), 0, 0, 0);
  });

  return nodes;
}

export function boundingSphere(nodes) {
  if (!nodes.length) return { center: [0, 1.2, 0], radius: 2.2 };
  const box = new THREE.Box3();
  nodes.forEach((n) => {
    box.expandByPoint(new THREE.Vector3(...n.from));
    box.expandByPoint(new THREE.Vector3(...n.to));
  });
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  return { center: sphere.center.toArray(), radius: Math.max(sphere.radius, 1.8) };
}
