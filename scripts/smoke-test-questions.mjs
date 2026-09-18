import { generateQuestionSet, SUBJECTS, checkAnswer } from '../shared/questions/index.js';

let failures = 0;

for (const subject of SUBJECTS) {
  for (let tier = 1; tier <= 10; tier++) {
    const seed = tier * 1000 + subject.sortOrder;
    const questions = generateQuestionSet(subject.id, tier, seed, 5);
    for (const q of questions) {
      const ok =
        typeof q.prompt === 'string' &&
        q.prompt.length > 0 &&
        typeof q.answer === 'string' &&
        q.answer.length > 0 &&
        checkAnswer(q, q.answer);
      if (!ok) {
        failures++;
        console.error(`FAIL [${subject.id} tier ${tier}]`, q);
      }
    }
  }
  // print one example per subject/tier=5 for manual sanity check
  const sample = generateQuestionSet(subject.id, 5, 42, 2);
  console.log(subject.id, 'tier 5 sample:', sample);
}

// Determinism check: same seed -> identical output
const a = generateQuestionSet('arithmetic', 8, 777, 5);
const b = generateQuestionSet('arithmetic', 8, 777, 5);
if (JSON.stringify(a) !== JSON.stringify(b)) {
  failures++;
  console.error('FAIL determinism check', a, b);
}

if (failures > 0) {
  console.error(`\n${failures} failures`);
  process.exit(1);
} else {
  console.log('\nAll question generators passed smoke test.');
}
