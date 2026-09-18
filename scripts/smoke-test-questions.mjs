import { LEARNING_TREE, generateQuestionSetForNode, checkAnswer } from '../shared/questions/index.js';

let failures = 0;

// Tree-shape sanity: exactly one root, every non-root's parent exists, no cycles.
const byTier = new Map(LEARNING_TREE.map((n) => [n.tier, n]));
const roots = LEARNING_TREE.filter((n) => n.parentTier === null);
if (roots.length !== 1) {
  failures++;
  console.error('FAIL: expected exactly 1 root, found', roots.length);
}
for (const node of LEARNING_TREE) {
  if (node.parentTier !== null && !byTier.has(node.parentTier)) {
    failures++;
    console.error(`FAIL: node ${node.tier} (${node.topicName}) has missing parent ${node.parentTier}`);
  }
}

for (const node of LEARNING_TREE) {
  const seed = node.tier * 7919 + 13;
  const questions = generateQuestionSetForNode(node.tier, seed, 5);
  for (const q of questions) {
    const ok =
      typeof q.prompt === 'string' &&
      q.prompt.length > 0 &&
      typeof q.answer === 'string' &&
      q.answer.length > 0 &&
      checkAnswer(q, q.answer);
    if (!ok) {
      failures++;
      console.error(`FAIL [tier ${node.tier} - ${node.topicName}]`, q);
    }
  }
  console.log(`tier ${node.tier} (${node.topicName}):`, questions[0]);
}

// Determinism check: same seed -> identical output
const a = generateQuestionSetForNode(8, 777, 5);
const b = generateQuestionSetForNode(8, 777, 5);
if (JSON.stringify(a) !== JSON.stringify(b)) {
  failures++;
  console.error('FAIL determinism check', a, b);
}

if (failures > 0) {
  console.error(`\n${failures} failures`);
  process.exit(1);
} else {
  console.log('\nAll learning-tree question generators passed smoke test.');
}
