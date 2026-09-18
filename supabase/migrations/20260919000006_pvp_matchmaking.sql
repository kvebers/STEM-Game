-- Phase 3: real-time PvP matchmaking. The core risk is double-pairing under
-- concurrency — two callers both claiming the same waiting opponent, or a
-- player being claimed by someone else while mid-transaction deciding
-- whether to search for their own opponent. fn_join_queue closes both
-- paths: it locks the caller's own queue row (FOR UPDATE) before doing
-- anything else, so a concurrent opponent-search (which uses
-- FOR UPDATE SKIP LOCKED) can never claim that row while this call is in
-- flight; the opponent search itself also uses FOR UPDATE SKIP LOCKED, the
-- standard safe "claim one job from a queue" pattern.
--
-- Split of responsibility: this function does only the atomic part (claim
-- an opponent, create the `matches` row). Actually generating and
-- persisting the question set happens in JS (shared/questions) from the
-- join-queue Edge Function, right after this returns matched:true — see
-- that function for how it idempotently avoids double-setup.

create function fn_join_queue(p_user_id uuid, p_tier int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject_id text;
  v_elo int;
  v_status text;
  v_match_id uuid;
  v_queued_at timestamptz;
  v_band int;
  v_opponent_id uuid;
  v_opponent_tier int;
begin
  select current_elo into v_elo from profiles where id = p_user_id;
  if v_elo is null then
    raise exception 'Profile % not found', p_user_id;
  end if;

  select subject_id into v_subject_id from stage_animals where tier = p_tier;
  if v_subject_id is null then
    raise exception 'Unknown learning-tree node %', p_tier;
  end if;

  -- Ensure my row exists, then immediately lock it — this is what
  -- prevents another caller's opponent-search from claiming me while I'm
  -- deciding what to do next.
  insert into matchmaking_queue (user_id, subject_id, stage_tier, elo_at_queue, queued_at, status, match_id)
  values (p_user_id, v_subject_id, p_tier, v_elo, now(), 'waiting', null)
  on conflict (user_id) do nothing;

  select status, match_id, queued_at into v_status, v_match_id, v_queued_at
  from matchmaking_queue where user_id = p_user_id
  for update;

  if v_status = 'matched' then
    return jsonb_build_object('matched', true, 'matchId', v_match_id);
  end if;

  -- Refresh search parameters (in case this is a retry for a different
  -- tier/topic) while still holding the lock; queued_at is deliberately
  -- left untouched so wait-time-based band widening measures from the
  -- original join, not from this retry.
  update matchmaking_queue
  set subject_id = v_subject_id, stage_tier = p_tier, elo_at_queue = v_elo, status = 'waiting', match_id = null
  where user_id = p_user_id;

  -- Elly band widens the longer this player has been waiting (placeholder
  -- tuning, not balanced): +100 every 10s, capped at 600.
  v_band := least(600, 100 + floor(extract(epoch from (now() - v_queued_at)) / 10) * 100);

  select user_id, stage_tier into v_opponent_id, v_opponent_tier
  from matchmaking_queue
  where status = 'waiting'
    and user_id != p_user_id
    and stage_tier = p_tier
    and abs(elo_at_queue - v_elo) <= v_band
    and queued_at > now() - interval '90 seconds' -- ignore abandoned rows (closed tab, no leave-queue call)
  order by queued_at asc
  for update skip locked
  limit 1;

  if v_opponent_id is null then
    return jsonb_build_object('matched', false);
  end if;

  insert into matches (mode, subject_id, stage_tier, status, seed, question_count, player1_id, player2_id, player1_animal_stage, player2_animal_stage)
  values ('pvp', v_subject_id, p_tier, 'pending', 0, 10, p_user_id, v_opponent_id, p_tier, v_opponent_tier)
  returning id into v_match_id;

  update matchmaking_queue set status = 'matched', match_id = v_match_id where user_id = p_user_id;
  update matchmaking_queue set status = 'matched', match_id = v_match_id where user_id = v_opponent_id;

  return jsonb_build_object('matched', true, 'matchId', v_match_id);
end;
$$;

revoke execute on function fn_join_queue(uuid, int) from public, anon, authenticated;
grant execute on function fn_join_queue(uuid, int) to service_role;
