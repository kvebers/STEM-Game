import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { adminClient, getAuthedUser } from '../_shared/supabaseClients.ts';
import { generateQuestionSet } from '../../../shared/questions/index.js';

const QUESTION_COUNT = 10;

// AI baseline gets tougher with stage tier: ~50% accuracy at tier 1, ~90% at
// tier 10. It's fixed at match creation so it can't be tuned after seeing
// the player's performance.
function aiBaselineScore(tier: number, questionCount: number) {
  const accuracy = Math.min(0.95, 0.45 + tier * 0.045);
  return Math.round(questionCount * accuracy);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const user = await getAuthedUser(req);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: { subjectId?: string; stageTier?: number; animalStageTier?: number };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { subjectId, stageTier, animalStageTier } = body;
  if (!subjectId || !Number.isInteger(stageTier) || !Number.isInteger(animalStageTier)) {
    return jsonResponse({ error: 'subjectId, stageTier, animalStageTier are required' }, 400);
  }
  if (stageTier < 1 || stageTier > 10 || animalStageTier < 1 || animalStageTier > 10) {
    return jsonResponse({ error: 'stageTier/animalStageTier must be between 1 and 10' }, 400);
  }
  if (stageTier > animalStageTier) {
    return jsonResponse({ error: 'stageTier cannot exceed the equipped animal\'s tier' }, 400);
  }

  const db = adminClient();

  const { data: subject } = await db.from('subjects').select('id').eq('id', subjectId).maybeSingle();
  if (!subject) return jsonResponse({ error: 'Unknown subject' }, 400);

  const { data: animal } = await db
    .from('user_animals')
    .select('unlocked, alive')
    .eq('user_id', user.id)
    .eq('stage_tier', animalStageTier)
    .maybeSingle();

  if (!animal || !animal.unlocked || !animal.alive) {
    return jsonResponse({ error: 'That animal is not currently unlocked and alive for this player' }, 403);
  }

  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const questions = generateQuestionSet(subjectId, stageTier, seed, QUESTION_COUNT);

  const { data: match, error: matchError } = await db
    .from('matches')
    .insert({
      mode: 'ai',
      subject_id: subjectId,
      stage_tier: stageTier,
      status: 'active',
      seed,
      question_count: QUESTION_COUNT,
      player1_id: user.id,
      player1_animal_stage: animalStageTier,
      ai_baseline_score: aiBaselineScore(stageTier, QUESTION_COUNT),
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
    questions: questions.map((q, index) => ({ index, prompt: q.prompt })),
  });
});
