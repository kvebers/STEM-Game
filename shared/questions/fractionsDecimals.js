import { randInt, pick, gcd } from './prng.js';
import { phrases } from './i18n.js';

function reduceFraction(num, den) {
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  const n = num / g;
  const d = den / g;
  return d === 1 ? String(n) : `${n}/${d}`;
}

function tier1(rng) {
  const d = randInt(rng, 2, 10);
  const a = randInt(rng, 1, d - 1);
  const b = randInt(rng, 1, d - 1);
  return { prompt: `${a}/${d} + ${b}/${d}`, answer: reduceFraction(a + b, d) };
}

function tier2(rng) {
  const d = randInt(rng, 2, 10);
  const a = randInt(rng, 1, d - 1);
  const b = randInt(rng, 1, a);
  return { prompt: `${a}/${d} - ${b}/${d}`, answer: reduceFraction(a - b, d) };
}

function tier3(rng) {
  const d1 = randInt(rng, 2, 8);
  let d2 = randInt(rng, 2, 8);
  while (d2 === d1) d2 = randInt(rng, 2, 8);
  const a = randInt(rng, 1, d1 - 1);
  const b = randInt(rng, 1, d2 - 1);
  const op = pick(rng, ['+', '-']);
  const num = op === '+' ? a * d2 + b * d1 : a * d2 - b * d1;
  const symbol = op === '+' ? '+' : '−';
  return { prompt: `${a}/${d1} ${symbol} ${b}/${d2}`, answer: reduceFraction(num, d1 * d2) };
}

function tier4(rng) {
  const a = randInt(rng, 1, 9);
  const b = randInt(rng, 2, 10);
  const c = randInt(rng, 1, 9);
  const d = randInt(rng, 2, 10);
  return { prompt: `${a}/${b} × ${c}/${d}`, answer: reduceFraction(a * c, b * d) };
}

function tier5(rng) {
  const a = randInt(rng, 1, 9);
  const b = randInt(rng, 2, 10);
  const c = randInt(rng, 1, 9);
  const d = randInt(rng, 2, 10);
  return { prompt: `${a}/${b} ÷ ${c}/${d}`, answer: reduceFraction(a * d, b * c) };
}

const FINITE_DENOMS = [2, 4, 5, 8, 10, 20, 25, 50, 100];

function tier6(rng, locale) {
  const d = pick(rng, FINITE_DENOMS);
  const n = randInt(rng, 1, d - 1);
  const decimal = n / d;
  return { prompt: phrases(locale).writeAsDecimal(n, d), answer: trimDecimal(decimal) };
}

function trimDecimal(value) {
  return String(Math.round(value * 1000) / 1000);
}

function tier7(rng, locale) {
  const places = pick(rng, [1, 2]);
  const den = places === 1 ? 10 : 100;
  const num = randInt(rng, 1, den - 1);
  const decimalStr = (num / den).toFixed(places);
  return { prompt: phrases(locale).writeAsFraction(decimalStr), answer: reduceFraction(num, den) };
}

function tier8(rng, locale) {
  const p = randInt(rng, 1, 19) * 5;
  const k = randInt(rng, 2, 50);
  const n = k * 20;
  const result = (p / 5) * k;
  return { prompt: phrases(locale).percentOf(p, n), answer: String(result) };
}

function tier9(rng, locale) {
  const p = randInt(rng, 1, 19) * 5;
  const k = randInt(rng, 2, 50);
  const n = k * 20;
  const change = (p / 5) * k;
  const increase = rng() < 0.5;
  const result = increase ? n + change : n - change;
  return {
    prompt: phrases(locale).changedByPercent(n, increase, p),
    answer: String(result),
  };
}

function tier10(rng, locale) {
  const fracNum = randInt(rng, 1, 4);
  const fracDen = randInt(rng, fracNum + 1, fracNum + 4);
  const p = randInt(rng, 1, 19) * 5;
  const k = randInt(rng, 2, 20) * fracDen; // keep divisible by fracDen after percent step
  const n = k * 20;
  const percentResult = (p * n) / 100;
  const result = (percentResult * fracNum) / fracDen;
  return { prompt: phrases(locale).fractionOfPercentOf(fracNum, fracDen, p, n), answer: trimDecimal(result) };
}

// Solve a proportion a/b = c/x for x, scaled up from a/b by an integer
// factor so x always comes out whole.
function tier11(rng, locale) {
  const a = randInt(rng, 1, 12);
  const b = randInt(rng, 2, 12);
  const k = randInt(rng, 2, 6);
  const c = a * k;
  const x = b * k;
  return { prompt: phrases(locale).solveProportion(a, b, c), answer: String(x) };
}

const GENERATORS = {
  1: tier1,
  2: tier2,
  3: tier3,
  4: tier4,
  5: tier5,
  6: tier6,
  7: tier7,
  8: tier8,
  9: tier9,
  10: tier10,
  11: tier11,
};

export function generate(tier, rng, locale = 'en') {
  const fn = GENERATORS[Math.min(11, Math.max(1, tier))];
  const { prompt, answer } = fn(rng, locale);
  return { prompt, answer, tier };
}
