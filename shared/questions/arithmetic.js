import { randInt, pick } from './prng.js';

// Difficulty ramps from single-digit addition (tier 1) to multi-term mixed
// operations with parentheses / order-of-operations (tier 10).
const PARAMS = {
  1: { ops: ['+'], terms: 2, addMax: 9, mulMax: 9, nonNegative: true },
  2: { ops: ['+', '-'], terms: 2, addMax: 9, mulMax: 9, nonNegative: true },
  3: { ops: ['+', '-'], terms: 2, addMax: 50, mulMax: 10, nonNegative: true },
  4: { ops: ['+', '-'], terms: 2, addMax: 99, mulMax: 10, nonNegative: true },
  5: { ops: ['+', '-', '*'], terms: 2, addMax: 99, mulMax: 12, nonNegative: true },
  6: { ops: ['*', '/'], terms: 2, addMax: 99, mulMax: 12, nonNegative: true },
  7: { ops: ['+', '-', '*'], terms: 3, addMax: 200, mulMax: 15, nonNegative: true },
  8: { ops: ['+', '-', '*', '/'], terms: 3, addMax: 100, mulMax: 12, nonNegative: true, allowParens: true },
  9: { ops: ['+', '-', '*', '/'], terms: 3, addMax: 500, mulMax: 15, nonNegative: false, allowParens: true },
  10: { ops: ['+', '-', '*', '/'], terms: 4, addMax: 1000, mulMax: 20, nonNegative: false, allowParens: true },
};

const OP_SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' };

function evalStandard(values, ops) {
  const vals = values.slice();
  const opsArr = ops.slice();
  for (let i = 0; i < opsArr.length; ) {
    if (opsArr[i] === '*' || opsArr[i] === '/') {
      const result = opsArr[i] === '*' ? vals[i] * vals[i + 1] : vals[i] / vals[i + 1];
      vals.splice(i, 2, result);
      opsArr.splice(i, 1);
    } else {
      i++;
    }
  }
  let result = vals[0];
  for (let i = 0; i < opsArr.length; i++) {
    result = opsArr[i] === '+' ? result + vals[i + 1] : result - vals[i + 1];
  }
  return result;
}

function buildTerms(rng, params) {
  const count = params.terms;
  const ops = [];
  for (let i = 0; i < count - 1; i++) ops.push(pick(rng, params.ops));

  const values = new Array(count).fill(null);
  ops.forEach((op, i) => {
    if (op === '/') {
      const divisor = randInt(rng, 2, params.mulMax);
      const quotient = randInt(rng, 2, params.mulMax);
      values[i] = divisor * quotient;
      values[i + 1] = divisor;
    } else if (op === '*') {
      if (values[i] === null) values[i] = randInt(rng, 2, params.mulMax);
      if (values[i + 1] === null) values[i + 1] = randInt(rng, 2, params.mulMax);
    }
  });
  for (let i = 0; i < count; i++) {
    if (values[i] === null) values[i] = randInt(rng, 1, params.addMax);
  }
  return { values, ops };
}

function generateOnce(rng, tier, params) {
  const { values, ops } = buildTerms(rng, params);

  let parenIndex = -1;
  let answer;

  if (params.allowParens && params.terms >= 3 && rng() < 0.6) {
    parenIndex = randInt(rng, 0, ops.length - 1);
    const a = values[parenIndex];
    const b = values[parenIndex + 1];
    const op = ops[parenIndex];
    const subValue = op === '*' ? a * b : op === '/' ? a / b : op === '+' ? a + b : a - b;
    const reducedValues = values.slice(0, parenIndex).concat([subValue], values.slice(parenIndex + 2));
    const reducedOps = ops.slice(0, parenIndex).concat(ops.slice(parenIndex + 1));
    answer = evalStandard(reducedValues, reducedOps);
  } else {
    answer = evalStandard(values, ops);
  }

  if (params.nonNegative && answer < 0) return null;
  if (!Number.isInteger(answer)) return null;

  const parts = [];
  for (let i = 0; i < values.length; i++) {
    if (parenIndex >= 0 && i === parenIndex) parts.push(`(${values[i]}`);
    else if (parenIndex >= 0 && i === parenIndex + 1) parts.push(`${values[i]})`);
    else parts.push(String(values[i]));
    if (i < ops.length) parts.push(OP_SYMBOL[ops[i]]);
  }

  return {
    prompt: parts.join(' '),
    answer: String(answer),
    tier,
  };
}

export function generate(tier, rng) {
  const params = PARAMS[Math.min(10, Math.max(1, tier))];
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = generateOnce(rng, tier, params);
    if (result) return result;
  }
  // Fallback: trivial guaranteed-valid question, should be unreachable in practice.
  const a = randInt(rng, 1, 9);
  const b = randInt(rng, 1, 9);
  return { prompt: `${a} + ${b}`, answer: String(a + b), tier };
}
