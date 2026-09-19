import { gcd } from './prng.js';

function reduceFraction(num, den) {
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
}

function normalize(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, '');
}

function parseAnswer(answer) {
  if (answer.includes('/')) {
    const [num, den] = answer.split('/').map(Number);
    return { type: 'fraction', num, den };
  }
  if (answer.includes('.')) {
    return { type: 'decimal', value: Number(answer), decimals: answer.split('.')[1].length };
  }
  return { type: 'integer', value: Number(answer) };
}

/**
 * Generates plausible wrong-answer strings for a multiple-choice option
 * set, derived purely from an already-computed final `answer` string (an
 * integer, a reduced fraction "n/d", or a trimmed decimal — the three
 * formats every shared/questions/*.js generator's `answer` ends up in).
 * Deliberately generic instead of tier-aware: every subject already
 * produces one of these three string shapes by the time `generate()`
 * returns, so this can sit as a single post-processing step in
 * generateQuestionSet without needing changes inside each generator.
 */
export function distractorsFor(answer, count = 3) {
  const parsed = parseAnswer(answer);
  const seen = new Set([normalize(answer)]);
  const out = [];

  function tryAdd(str) {
    const norm = normalize(str);
    if (seen.has(norm)) return;
    seen.add(norm);
    out.push(str);
  }

  if (parsed.type === 'integer') {
    for (const d of [1, -1, 2, -2, 3, -3, 5, -5, 10, -10]) {
      if (out.length >= count) break;
      const v = parsed.value + d;
      if (v < 0 && parsed.value >= 0) continue; // keep sign plausible
      tryAdd(String(v));
    }
    let pad = 11;
    while (out.length < count) tryAdd(String(parsed.value + pad++));
  } else if (parsed.type === 'fraction') {
    for (const d of [1, -1, 2, -2]) {
      if (out.length >= count) break;
      if (parsed.num + d > 0) tryAdd(reduceFraction(parsed.num + d, parsed.den));
    }
    for (const d of [1, -1, 2, -2]) {
      if (out.length >= count) break;
      if (parsed.den + d > 0) tryAdd(reduceFraction(parsed.num, parsed.den + d));
    }
    if (out.length < count && parsed.num !== parsed.den) {
      tryAdd(reduceFraction(parsed.den, parsed.num)); // classic swapped-fraction mistake
    }
    let pad = 3;
    while (out.length < count) tryAdd(reduceFraction(parsed.num + pad, parsed.den + pad++));
  } else {
    const step = 1 / 10 ** parsed.decimals;
    for (const d of [step, -step, step * 2, -step * 2, step * 5, -step * 5]) {
      if (out.length >= count) break;
      const v = Math.round((parsed.value + d) * 10 ** parsed.decimals) / 10 ** parsed.decimals;
      if (v < 0 && parsed.value >= 0) continue;
      tryAdd(String(v));
    }
    let pad = 7;
    while (out.length < count) {
      const v = Math.round((parsed.value + pad * step) * 10 ** parsed.decimals) / 10 ** parsed.decimals;
      tryAdd(String(v));
      pad++;
    }
  }

  return out.slice(0, count);
}
