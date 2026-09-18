import { randInt, shuffle, gcd } from './prng.js';

function reduceFraction(num, den) {
  const g = gcd(num, den);
  const n = num / g;
  const d = den / g;
  return d === 1 ? String(n) : `${n}/${d}`;
}

function meanDataset(rng, count, max) {
  // Build values that sum to a multiple of `count` so the mean is a whole number.
  const values = [];
  for (let i = 0; i < count - 1; i++) values.push(randInt(rng, 1, max));
  const partialSum = values.reduce((a, b) => a + b, 0);
  const mean = randInt(rng, 1, max);
  const last = mean * count - partialSum;
  values.push(last < 1 ? last + count * max : last);
  return { values: shuffle(rng, values), mean: values.reduce((a, b) => a + b, 0) / count };
}

function tier1(rng) {
  const { values, mean } = meanDataset(rng, 3, 15);
  return { prompt: `Find the mean of: ${values.join(', ')}`, answer: String(mean) };
}

function tier2(rng) {
  const { values, mean } = meanDataset(rng, 4, 20);
  return { prompt: `Find the mean of: ${values.join(', ')}`, answer: String(mean) };
}

function tier3(rng) {
  const values = shuffle(rng, Array.from({ length: 5 }, () => randInt(rng, 1, 50)));
  const sorted = values.slice().sort((a, b) => a - b);
  return { prompt: `Find the median of: ${values.join(', ')}`, answer: String(sorted[2]) };
}

function tier4(rng) {
  const pool = shuffle(rng, Array.from({ length: 5 }, () => randInt(rng, 1, 12)));
  const modeValue = pool[0];
  const values = shuffle(rng, [...pool, modeValue, modeValue]);
  return { prompt: `Find the mode of: ${values.join(', ')}`, answer: String(modeValue) };
}

function tier5(rng) {
  const values = shuffle(rng, Array.from({ length: 6 }, () => randInt(rng, 1, 100)));
  const max = Math.max(...values);
  const min = Math.min(...values);
  return { prompt: `Find the range of: ${values.join(', ')}`, answer: String(max - min) };
}

function tier6(rng) {
  const { values, mean } = meanDataset(rng, 7, 30);
  return { prompt: `Find the mean of: ${values.join(', ')}`, answer: String(mean) };
}

function tier7(rng) {
  // Even-length dataset: median is the average of the two middle values.
  // Pick those two middle values first (same parity so the average is a
  // whole number), then pick fillers strictly below/above them so their
  // rank in the sorted set is guaranteed.
  const m1 = randInt(rng, 10, 40);
  let m2 = randInt(rng, m1, m1 + 20);
  if ((m2 - m1) % 2 !== 0) m2 += 1;
  const below = [randInt(rng, 1, m1 - 1), randInt(rng, 1, m1 - 1)];
  const above = [randInt(rng, m2 + 1, m2 + 30), randInt(rng, m2 + 1, m2 + 30)];
  const dataset = shuffle(rng, [...below, m1, m2, ...above]);
  const median = (m1 + m2) / 2;
  return { prompt: `Find the median of: ${dataset.join(', ')}`, answer: String(median) };
}

function tier8(rng) {
  const scenarios = [
    () => ({ prompt: 'A fair 6-sided die is rolled once. What is the probability of rolling a 4?', num: 1, den: 6 }),
    () => {
      const red = randInt(rng, 2, 6);
      const blue = randInt(rng, 2, 6);
      return {
        prompt: `A bag has ${red} red and ${blue} blue marbles. One marble is drawn at random. What is the probability it is red?`,
        num: red,
        den: red + blue,
      };
    },
  ];
  const s = scenarios[randInt(rng, 0, scenarios.length - 1)]();
  return { prompt: s.prompt, answer: reduceFraction(s.num, s.den) };
}

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function tier9(rng) {
  if (rng() < 0.5) {
    const n = randInt(rng, 3, 6);
    return { prompt: `In how many different orders can ${n} distinct books be arranged on a shelf?`, answer: String(factorial(n)) };
  }
  const n = randInt(rng, 4, 8);
  const k = randInt(rng, 2, n - 1);
  const combinations = factorial(n) / (factorial(k) * factorial(n - k));
  return { prompt: `How many ways can you choose ${k} items from a group of ${n}?`, answer: String(combinations) };
}

function tier10(rng) {
  const red = randInt(rng, 3, 6);
  const blue = randInt(rng, 3, 6);
  const total = red + blue;
  const num = red * (red - 1);
  const den = total * (total - 1);
  return {
    prompt: `A bag has ${red} red and ${blue} blue marbles. Two marbles are drawn at random without replacement. What is the probability both are red?`,
    answer: reduceFraction(num, den),
  };
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
};

export function generate(tier, rng) {
  const fn = GENERATORS[Math.min(10, Math.max(1, tier))];
  const { prompt, answer } = fn(rng);
  return { prompt, answer, tier };
}
