import { randInt } from './prng.js';
import { phrases } from './i18n.js';

// Geometry branch: perimeter/area -> angles -> circles -> volume.
const GENERATORS = {
  1: tier1,
  2: tier2,
  3: tier3,
  4: tier4,
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

export function generate(tier, rng, locale = 'en') {
  const fn = GENERATORS[Math.min(4, Math.max(1, tier))];
  const { prompt, answer } = fn(rng, locale);
  return { prompt, answer: String(answer), tier };
}
