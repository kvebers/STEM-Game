import { randInt } from './prng.js';
import { phrases } from './i18n.js';

function signedTerm(n) {
  return n >= 0 ? ` + ${n}` : ` - ${Math.abs(n)}`;
}

function tier1(rng) {
  const a = randInt(rng, 1, 12);
  const x = randInt(rng, 1, 20);
  return { prompt: `x + ${a} = ${a + x}`, answer: x };
}

function tier2(rng) {
  if (rng() < 0.5) {
    const a = randInt(rng, 1, 20);
    const x = randInt(rng, 1, 20);
    return { prompt: `x - ${a} = ${x - a}`, answer: x };
  }
  const x = randInt(rng, 1, 20);
  const a = randInt(rng, x, x + 20);
  return { prompt: `${a} - x = ${a - x}`, answer: x };
}

function tier3(rng) {
  const a = randInt(rng, 2, 12);
  const x = randInt(rng, 1, 12);
  return { prompt: `${a}x = ${a * x}`, answer: x };
}

function tier4(rng) {
  const a = randInt(rng, 2, 12);
  const b = randInt(rng, 1, 12);
  return { prompt: `x ÷ ${a} = ${b}`, answer: a * b };
}

function tier5(rng) {
  const a = randInt(rng, 2, 10);
  const x = randInt(rng, 1, 15);
  const b = randInt(rng, 1, 50);
  return { prompt: `${a}x + ${b} = ${a * x + b}`, answer: x };
}

function tier6(rng) {
  const a = randInt(rng, 2, 10);
  const x = randInt(rng, 2, 15);
  const b = randInt(rng, 1, Math.min(50, a * x - 1));
  return { prompt: `${a}x - ${b} = ${a * x - b}`, answer: x };
}

function tier7(rng) {
  const a = rng() < 0.5 ? randInt(rng, 2, 10) : -randInt(rng, 2, 10);
  const x = randInt(rng, 1, 15);
  const b = randInt(rng, -30, 30);
  const c = a * x + b;
  return { prompt: `${a}x${signedTerm(b)} = ${c}`, answer: x };
}

function bothSides(rng, coeffRange, constRange) {
  const x = randInt(rng, -coeffRange, coeffRange) || 1;
  let a = randInt(rng, 1, coeffRange);
  let c = randInt(rng, 1, coeffRange);
  if (rng() < 0.5) a = -a;
  if (a === c) c += 1; // ensure a distinct coefficient so a unique solution exists
  const b = randInt(rng, -constRange, constRange);
  const d = (a - c) * x + b;
  const lhs = `${a}x${signedTerm(b)}`;
  const rhs = `${c}x${signedTerm(d)}`;
  return { prompt: `${lhs} = ${rhs}`, answer: x };
}

function tier10(rng, locale) {
  const x = randInt(rng, 2, 15);
  return { prompt: `x² = ${x * x}  ${phrases(locale).positiveConstraint()}`, answer: x };
}

// Factorable quadratic (x - r)(x + s) = x² + (s-r)x - rs = 0, roots r and -s.
// Asks for the positive root so the answer stays a single number.
function tier11(rng, locale) {
  const r = randInt(rng, 2, 12);
  const s = randInt(rng, 2, 12);
  const b = s - r;
  const c = -r * s;
  return {
    prompt: `x²${signedTerm(b)}x${signedTerm(c)} = 0  ${phrases(locale).positiveSolutionNote()}`,
    answer: r,
  };
}

function tier12(rng) {
  const base = randInt(rng, 2, 6);
  const x = randInt(rng, 1, 6);
  return { prompt: `${base}^x = ${base ** x}`, answer: x };
}

const GENERATORS = {
  1: tier1,
  2: tier2,
  3: tier3,
  4: tier4,
  5: tier5,
  6: tier6,
  7: tier7,
  8: (rng) => bothSides(rng, 10, 30),
  9: (rng) => bothSides(rng, 15, 60),
  10: tier10,
  11: tier11,
  12: tier12,
};

export function generate(tier, rng, locale = 'en') {
  const fn = GENERATORS[Math.min(12, Math.max(1, tier))];
  const { prompt, answer } = fn(rng, locale);
  return { prompt: phrases(locale).solveForX(prompt), answer: String(answer), tier };
}
