import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { adminClient, getAuthedUser } from '../_shared/supabaseClients.ts';
import { generateQuestionSetForNode, getTreeNode } from '../../../shared/questions/index.js';

const QUESTION_COUNT = 10;
const MIN_ELO_THRESHOLD = 1000; // root node, see shared/questions/index.js LEARNING_TREE
const MAX_ELO_THRESHOLD = 1525; // hardest capstone node

// AI baseline gets tougher the deeper into the tree a node sits. It's keyed
// off the node's Elly threshold (not the raw `tier`, which is just an
// opaque node id, not a linear difficulty rung): ~45% accuracy at the root,
// ~95% at the hardest capstone. Fixed at match creation so it can't be
// tuned after seeing the player's performance.
function aiBaselineScore(eloThreshold: number, questionCount: number) {
  const progress = (eloThreshold - MIN_ELO_THRESHOLD) / (MAX_ELO_THRESHOLD - MIN_ELO_THRESHOLD);
  const accuracy = 0.45 + Math.min(1, Math.max(0, progress)) * 0.5;
  return Math.round(questionCount * accuracy);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const user = await getAuthedUser(req);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: { tier?: number };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { tier } = body;
  if (!Number.isInteger(tier)) {
    return jsonResponse({ error: 'tier is required' }, 400);
  }

  const node = getTreeNode(tier);
  if (!node) return jsonResponse({ error: 'Unknown learning-tree node' }, 400);

  const db = adminClient();

  const { data: animal } = await db
    .from('user_animals')
    .select('unlocked')
    .eq('user_id', user.id)
    .eq('stage_tier', tier)
    .maybeSingle();

  // Dead animals are still playable — playing is the recovery path (a
  // completed match feeds/re-hatches via fn_apply_match_result). Gating on
  // `alive` here would let a player's only unlocked animal dying lock them
  // out of playing anything at all, with no way back in.
  if (!animal || !animal.unlocked) {
    return jsonResponse({ error: 'That animal is not currently unlocked for this player' }, 403);
  }

  const { data: stageAnimal } = await db.from('stage_animals').select('elo_threshold').eq('tier', tier).single();
  if (!stageAnimal) return jsonResponse({ error: 'Unknown learning-tree node' }, 400);

  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const questions = generateQuestionSetForNode(tier, seed, QUESTION_COUNT);
  const aiScore = aiBaselineScore(stageAnimal.elo_threshold, QUESTION_COUNT);

  const { data: match, error: matchError } = await db
    .from('matches')
    .insert({
      mode: 'ai',
      subject_id: node.subjectId,
      stage_tier: tier,
      status: 'active',
      seed,
      question_count: QUESTION_COUNT,
      player1_id: user.id,
      player1_animal_stage: tier,
      ai_baseline_score: aiScore,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (matchError || !match) {
    console.error(matchError);
    return jsonResponse({ error: 'Failed to create match' }, 500);
  }

  const { error: questionsError } = await db.from('match_questions').insert(
    questions.map((q, index) => ({ match_id: match.id, index, prompt: q.prompt })),
  );
  const { error: keysError } = await db.from('match_answer_keys').insert(
    questions.map((q, index) => ({ match_id: match.id, index, answer: q.answer })),
  );

  if (questionsError || keysError) {
    console.error(questionsError, keysError);
    return jsonResponse({ error: 'Failed to persist question set' }, 500);
  }

  return jsonResponse({
    matchId: match.id,
    topicName: node.topicName,
    questions: questions.map((q, index) => ({ index, prompt: q.prompt })),
    // Cosmetic only — drives the client-side race animation, not scoring
    // (that's already fixed server-side above). Safe to expose: it's the
    // AI's own aggregate target, not the player's answer key.
    aiBaselineScore: aiScore,
    seed,
  });
});
