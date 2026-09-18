import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { adminClient, getAuthedUser } from '../_shared/supabaseClients.ts';

// The automated daily trigger is pg_cron calling fn_run_daily_decay()
// directly in Postgres (see supabase/migrations) — no HTTP hop needed since
// the logic is entirely self-contained in SQL. This function exists purely
// as a manually-invokable entry point for testing/ops, gated on requiring
// any authenticated caller (not just anon) as a light sanity check, not a
// real authorization boundary — the RPC itself is service_role-only either
// way.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const user = await getAuthedUser(req);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const db = adminClient();
  const { data, error } = await db.rpc('fn_run_daily_decay');

  if (error) {
    console.error(error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ result: data });
});
