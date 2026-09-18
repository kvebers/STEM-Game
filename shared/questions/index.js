import { createRng } from './prng.js';
import { generate as generateArithmetic } from './arithmetic.js';
import { generate as generateAlgebra } from './algebra.js';
import { generate as generateFractionsDecimals } from './fractionsDecimals.js';
import { generate as generateStatistics } from './statistics.js';

export const SUBJECTS = [
  { id: 'arithmetic', name: 'Arithmetic', sortOrder: 1 },
  { id: 'algebra', name: 'Algebra', sortOrder: 2 },
  { id: 'fractions_decimals', name: 'Fractions & Decimals', sortOrder: 3 },
  { id: 'statistics', name: 'Statistics', sortOrder: 4 },
];

const GENERATORS = {
  arithmetic: generateArithmetic,
  algebra: generateAlgebra,
  fractions_decimals: generateFractionsDecimals,
  statistics: generateStatistics,
};

/**
 * Deterministically generates `count` questions for a subject + difficulty
 * tier from a single seed. The caller (an Edge Function at match-creation
 * time) persists the result — this function is never re-run per-client to
 * derive the "real" question set, only used to produce it once. See plan §4.
 */
export function generateQuestionSet(subjectId, tier, seed, count = 10) {
  const generator = GENERATORS[subjectId];
  if (!generator) throw new Error(`Unknown subject: ${subjectId}`);
  const rng = createRng(seed);
  const questions = [];
  for (let i = 0; i < count; i++) {
    questions.push(generator(tier, rng));
  }
  return questions;
}

export function checkAnswer(question, submitted) {
  const normalize = (v) => String(v).trim().replace(/\s+/g, '');
  return normalize(question.answer) === normalize(submitted);
}
