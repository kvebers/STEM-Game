import { createRng } from './prng.js';
import { generate as generateArithmetic } from './arithmetic.js';
import { generate as generateAlgebra } from './algebra.js';
import { generate as generateFractionsDecimals } from './fractionsDecimals.js';
import { generate as generateStatistics } from './statistics.js';
import { generate as generateGeometry } from './geometry.js';
import { distractorsFor } from './distractors.js';

export const SUBJECTS = [
  { id: 'arithmetic', name: 'Arithmetic', sortOrder: 1 },
  { id: 'algebra', name: 'Algebra', sortOrder: 2 },
  { id: 'fractions_decimals', name: 'Fractions & Decimals', sortOrder: 3 },
  { id: 'statistics', name: 'Statistics', sortOrder: 4 },
  { id: 'geometry', name: 'Geometry', sortOrder: 5 },
];

const GENERATORS = {
  arithmetic: generateArithmetic,
  algebra: generateAlgebra,
  fractions_decimals: generateFractionsDecimals,
  statistics: generateStatistics,
  geometry: generateGeometry,
};

/**
 * The learning tree: one node per animal/tier. `tier` is an opaque node id
 * (not a linear difficulty rung — depth/order comes from `parentTier`).
 * `subjectId`+`internalTier` point at a specific difficulty point inside an
 * existing subject generator, reused as-is. This is the single source of
 * truth for tree shape — the DB migration mirrors it into `stage_animals`,
 * and this array is what actually drives question generation.
 */
export const LEARNING_TREE = [
  { tier: 1, topicName: 'Addition', subjectId: 'arithmetic', internalTier: 1, parentTier: null },
  { tier: 2, topicName: 'Addition & Subtraction', subjectId: 'arithmetic', internalTier: 2, parentTier: 1 },
  // Numbers path (longer branch, ends in the exponential-equation capstone)
  { tier: 3, topicName: 'Multiplication', subjectId: 'arithmetic', internalTier: 11, parentTier: 2 },
  { tier: 4, topicName: 'Division', subjectId: 'arithmetic', internalTier: 12, parentTier: 3 },
  { tier: 5, topicName: 'Order of Operations', subjectId: 'arithmetic', internalTier: 8, parentTier: 4 },
  { tier: 6, topicName: 'Basic Algebra', subjectId: 'algebra', internalTier: 1, parentTier: 5 },
  { tier: 7, topicName: 'Two-Step Equations', subjectId: 'algebra', internalTier: 5, parentTier: 6 },
  { tier: 8, topicName: 'Advanced Equations', subjectId: 'algebra', internalTier: 10, parentTier: 7 },
  { tier: 13, topicName: 'Quadratic Equations', subjectId: 'algebra', internalTier: 11, parentTier: 8 },
  { tier: 14, topicName: 'Exponential Equations', subjectId: 'algebra', internalTier: 12, parentTier: 13 },
  // Quantities path (shorter branch, ends in the standard-deviation capstone)
  { tier: 9, topicName: 'Fractions', subjectId: 'fractions_decimals', internalTier: 1, parentTier: 2 },
  { tier: 10, topicName: 'Decimals', subjectId: 'fractions_decimals', internalTier: 6, parentTier: 9 },
  { tier: 11, topicName: 'Percentages', subjectId: 'fractions_decimals', internalTier: 8, parentTier: 10 },
  { tier: 12, topicName: 'Statistics & Probability', subjectId: 'statistics', internalTier: 10, parentTier: 11 },
  { tier: 15, topicName: 'Ratios & Proportions', subjectId: 'fractions_decimals', internalTier: 11, parentTier: 12 },
  { tier: 16, topicName: 'Standard Deviation', subjectId: 'statistics', internalTier: 11, parentTier: 15 },
  // Geometry path (new branch, forking off the shared trunk)
  { tier: 17, topicName: 'Perimeter & Area', subjectId: 'geometry', internalTier: 1, parentTier: 2 },
  { tier: 18, topicName: 'Angles', subjectId: 'geometry', internalTier: 2, parentTier: 17 },
  { tier: 19, topicName: 'Circles', subjectId: 'geometry', internalTier: 3, parentTier: 18 },
  { tier: 20, topicName: 'Volume & Surface Area', subjectId: 'geometry', internalTier: 4, parentTier: 19 },
  // Advanced (12th-grade) continuations past each branch's prior capstone
  { tier: 21, topicName: 'Logarithms', subjectId: 'algebra', internalTier: 13, parentTier: 14 },
  { tier: 22, topicName: 'Systems of Equations', subjectId: 'algebra', internalTier: 14, parentTier: 21 },
  { tier: 23, topicName: 'Z-Scores', subjectId: 'statistics', internalTier: 12, parentTier: 16 },
  { tier: 24, topicName: 'Trigonometric Ratios', subjectId: 'geometry', internalTier: 5, parentTier: 20 },
  { tier: 25, topicName: 'Law of Cosines', subjectId: 'geometry', internalTier: 6, parentTier: 24 },
];

export function getTreeNode(tier) {
  return LEARNING_TREE.find((n) => n.tier === tier);
}

/**
 * Deterministically generates `count` questions for a subject + difficulty
 * tier from a single seed. Kept as a low-level primitive; the Edge Function
 * calls `generateQuestionSetForNode` below, which is what actually gets
 * persisted — this function is never re-run per-client to derive the "real"
 * question set. See plan §4.
 */
export function generateQuestionSet(subjectId, tier, seed, count = 10, locale = 'en') {
  const generator = GENERATORS[subjectId];
  if (!generator) throw new Error(`Unknown subject: ${subjectId}`);
  const rng = createRng(seed);
  const questions = [];
  for (let i = 0; i < count; i++) {
    const q = generator(tier, rng, locale);
    // Derived purely from the final answer string, not drawn from `rng` —
    // adding this never shifts the deterministic sequence of subsequent
    // questions in the set.
    questions.push({ ...q, distractors: distractorsFor(q.answer) });
  }
  return questions;
}

/** Generates a question set for a learning-tree node (by its tier/node id). */
export function generateQuestionSetForNode(tier, seed, count = 10, locale = 'en') {
  const node = getTreeNode(tier);
  if (!node) throw new Error(`Unknown learning-tree node: ${tier}`);
  return generateQuestionSet(node.subjectId, node.internalTier, seed, count, locale);
}

export function checkAnswer(question, submitted) {
  const normalize = (v) => String(v).trim().replace(/\s+/g, '');
  return normalize(question.answer) === normalize(submitted);
}
