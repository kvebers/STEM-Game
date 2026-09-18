import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { adminClient, getAuthedUser } from '../_shared/supabaseClients.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const user = await getAuthedUser(req);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: { matchId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.matchId) return jsonResponse({ error: 'matchId is required' }, 400);

  const db = adminClient();

  // The caller only nudges scoring to happen — fn_apply_match_result itself
  // trusts nothing but persisted match_answers/match_answer_keys, and is
  // idempotent, so this participant check is just to avoid handing out free
  // "score this match" calls to non-participants, not the scoring logic.
  const { data: match } = await db
    .from('matches')
    .select('player1_id, player2_id')
    .eq('id', body.matchId)
    .maybeSingle();

  if (!match) return jsonResponse({ error: 'Match not found' }, 404);
  if (match.player1_id !== user.id && match.player2_id !== user.id) {
    return jsonResponse({ error: 'Not a participant in this match' }, 403);
  }

  const { data, error } = await db.rpc('fn_apply_match_result', { p_match_id: body.matchId });

  if (error) {
    console.error(error);
    const status = /has not finished/.test(error.message) ? 409 : 500;
    return jsonResponse({ error: error.message }, status);
  }

  return jsonResponse({ result: data });
});
