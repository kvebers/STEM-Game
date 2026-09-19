import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { adminClient, getAuthedUser } from '../_shared/supabaseClients.ts';
import { generateQuestionSetForNode, getTreeNode } from '../../../shared/questions/index.js';

const QUESTION_COUNT = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const user = await getAuthedUser(req);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: { tier?: number; locale?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { tier } = body;
  if (!Number.isInteger(tier)) return jsonResponse({ error: 'tier is required' }, 400);
  const locale = body.locale === 'fr' ? 'fr' : 'en';

  const node = getTreeNode(tier);
  if (!node) return jsonResponse({ error: 'Unknown learning-tree node' }, 400);

  const db = adminClient();

  const { data: animal } = await db
    .from('user_animals')
    .select('unlocked')
    .eq('user_id', user.id)
    .eq('stage_tier', tier)
    .maybeSingle();

  // Dead-but-unlocked animals can still queue — same reasoning as create-match.
  if (!animal || !animal.unlocked) {
    return jsonResponse({ error: 'That animal is not currently unlocked for this player' }, 403);
  }

  // The atomic pairing/claim happens entirely in SQL (fn_join_queue) — see
  // that migration for why (double-pairing race under concurrency).
  const { data: pairing, error: pairingError } = await db.rpc('fn_join_queue', {
    p_user_id: user.id,
    p_tier: tier,
  });

  if (pairingError) {
    console.error(pairingError);
    return jsonResponse({ error: pairingError.message }, 500);
  }

  if (!pairing.matched) {
    return jsonResponse({ matched: false });
  }

  const matchId = pairing.matchId;

  // Only the call that actually finds the pairing (this one) is responsible
  // for generating the question set — the other player learns about the
  // match via Realtime and just waits for status to flip to 'active'. If
  // this ever raced with another setup attempt, the unique constraint on
  // match_questions(match_id, index) rejects the second writer, and the
  // conditional status update below only succeeds once.
  const { data: match } = await db.from('matches').select('status, stage_tier').eq('id', matchId).single();

  if (match?.status === 'pending') {
    // fn_join_queue may have resolved the match to a *different* tier than
    // either player individually requested (broadened matching pairs
    // players across a shared subject, not just an exact tier) — the
    // question set must be generated for the match's real topic, not the
    // raw request.
    // Only one player's call reaches here (the one that completed the
    // pairing) — its locale decides the prompt language for both players in
    // this match, since prompt text is generated once and shared.
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const questions = generateQuestionSetForNode(match.stage_tier, seed, QUESTION_COUNT, locale);

    // Every other question renders as multiple-choice instead of free-text
    // — see the matching comment in create-match/index.ts for why the real
    // answer necessarily appears among `options`.
    const optionsByIndex = questions.map((q, index) =>
      index % 2 === 1 ? [q.answer, ...q.distractors].sort(() => Math.random() - 0.5) : null,
    );

    const { error: questionsError } = await db
      .from('match_questions')
      .insert(questions.map((q, index) => ({ match_id: matchId, index, prompt: q.prompt, options: optionsByIndex[index] })));

    if (!questionsError) {
      await db
        .from('match_answer_keys')
        .insert(questions.map((q, index) => ({ match_id: matchId, index, answer: q.answer })));

      await db
        .from('matches')
        .update({ seed, status: 'active', started_at: new Date().toISOString() })
        .eq('id', matchId)
        .eq('status', 'pending');
    }
    // A questionsError here means another concurrent call already set this
    // match up (unique-constraint conflict) — nothing to do, fall through.
  }

  return jsonResponse({ matched: true, matchId });
});
