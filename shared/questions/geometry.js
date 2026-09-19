import { randInt, pick, shuffle, gcd } from './prng.js';
import { phrases } from './i18n.js';

function reduceFraction(num, den) {
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
}

// Geometry branch: perimeter/area -> angles -> circles -> volume ->
// trig ratios -> law of cosines.
const GENERATORS = {
  1: tier1,
  2: tier2,
  3: tier3,
  4: tier4,
  5: tier5,
  6: tier6,
};

function tier1(rng, locale) {
  const l = randInt(rng, 2, 20);
  const w = randInt(rng, 2, 20);
  if (rng() < 0.5) {
    return { prompt: phrases(locale).rectPerimeter(l, w), answer: 2 * (l + w) };
  }
  return { prompt: phrases(locale).rectArea(l, w), answer: l * w };
}

function tier2(rng, locale) {
  if (rng() < 0.5) {
    const a = randInt(rng, 20, 90);
    const b = randInt(rng, 20, 180 - a - 10);
    const c = 180 - a - b;
    return { prompt: phrases(locale).triangleThirdAngle(a, b), answer: c };
  }
  const a = randInt(rng, 10, 170);
  return { prompt: phrases(locale).straightLineAngle(a), answer: 180 - a };
}

function tier3(rng, locale) {
  // r kept a multiple of 50 so 2 * 3.14 * r lands on a whole number exactly.
  const k = randInt(rng, 1, 5);
  const r = 50 * k;
  return { prompt: phrases(locale).circleCircumference(r), answer: 314 * k };
}

function tier4(rng, locale) {
  const l = randInt(rng, 2, 12);
  const w = randInt(rng, 2, 12);
  const h = randInt(rng, 2, 12);
  return { prompt: phrases(locale).prismVolume(l, w, h), answer: l * w * h };
}

// Pythagorean triples, scaled, so every triangle has whole-number sides.
const RIGHT_TRIANGLE_TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [9, 40, 41],
  [20, 21, 29],
];

function tier5(rng, locale) {
  const [legA, legB, hypBase] = pick(rng, RIGHT_TRIANGLE_TRIPLES);
  const k = randInt(rng, 1, 4);
  const hyp = hypBase * k;
  const [opp, adj] = shuffle(rng, [legA * k, legB * k]);
  const ratio = pick(rng, ['sin', 'cos', 'tan']);
  const answer =
    ratio === 'sin' ? reduceFraction(opp, hyp) : ratio === 'cos' ? reduceFraction(adj, hyp) : reduceFraction(opp, adj);
  return { prompt: phrases(locale).rightTriangleRatio(ratio, opp, adj, hyp), answer };
}

// Eisenstein triples (a, b, c) satisfying c² = a² + b² + ab, i.e. the
// Law of Cosines with a 120° angle between sides a and b, so the third
// side comes out a whole number.
const LAW_OF_COSINES_TRIPLES = [
  [3, 5, 7],
  [7, 8, 13],
  [5, 16, 19],
  [11, 24, 31],
  [9, 56, 61],
];

function tier6(rng, locale) {
  const [a, b, c] = pick(rng, LAW_OF_COSINES_TRIPLES);
  const k = randInt(rng, 1, 3);
  return { prompt: phrases(locale).lawOfCosines(a * k, b * k, 120), answer: c * k };
}

export function generate(tier, rng, locale = 'en') {
  const fn = GENERATORS[Math.min(6, Math.max(1, tier))];
  const { prompt, answer } = fn(rng, locale);
  return { prompt, answer: String(answer), tier };
}
