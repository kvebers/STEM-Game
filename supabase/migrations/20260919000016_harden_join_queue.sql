-- Defensive hardening: fn_join_queue used to `raise exception` on an
-- unrecognized tier or a missing profile, which aborts the whole call (and,
-- since the function body is one implicit transaction, rolls back the
-- initial "insert my waiting row" too) with a generic 500 all the way back
-- to the client. If the client and DB ever briefly disagree on which tiers
-- exist (e.g. a deploy that ships a newer learning tree to the client/edge
-- functions slightly ahead of its migration), this turned "no match yet"
-- into a hard failure instead of a graceful "try again". Return a tagged
-- matched:false instead so the search UI just keeps waiting/retrying rather
-- than dying.
create or replace function fn_join_queue(p_user_id uuid, p_tier int)
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
  v_match_tier int;
begin
  select current_elo into v_elo from profiles where id = p_user_id;
  if v_elo is null then
    return jsonb_build_object('matched', false, 'reason', 'profile_not_found');
  end if;

  select subject_id into v_subject_id from stage_animals where tier = p_tier;
  if v_subject_id is null then
    return jsonb_build_object('matched', false, 'reason', 'unknown_tier');
  end if;

  insert into matchmaking_queue (user_id, subject_id, stage_tier, elo_at_queue, queued_at, status, match_id)
  values (p_user_id, v_subject_id, p_tier, v_elo, now(), 'waiting', null)
  on conflict (user_id) do nothing;

  select status, match_id, queued_at into v_status, v_match_id, v_queued_at
  from matchmaking_queue where user_id = p_user_id
  for update;

  if v_status = 'matched' then
    return jsonb_build_object('matched', true, 'matchId', v_match_id);
  end if;

  update matchmaking_queue
  set subject_id = v_subject_id, stage_tier = p_tier, elo_at_queue = v_elo, status = 'waiting', match_id = null
  where user_id = p_user_id;

  v_band := least(600, 100 + floor(extract(epoch from (now() - v_queued_at)) / 10) * 100);

  select user_id, stage_tier into v_opponent_id, v_opponent_tier
  from matchmaking_queue
  where status = 'waiting'
    and user_id != p_user_id
    and subject_id = v_subject_id
    and abs(elo_at_queue - v_elo) <= v_band
    and queued_at > now() - interval '90 seconds'
  order by (stage_tier = p_tier) desc, queued_at asc
  for update skip locked
  limit 1;

  if v_opponent_id is null then
    return jsonb_build_object('matched', false, 'reason', 'no_opponent');
  end if;

  v_match_tier := least(p_tier, v_opponent_tier);

  insert into matches (mode, subject_id, stage_tier, status, seed, question_count, player1_id, player2_id, player1_animal_stage, player2_animal_stage)
  values ('pvp', v_subject_id, v_match_tier, 'pending', 0, 10, p_user_id, v_opponent_id, p_tier, v_opponent_tier)
  returning id into v_match_id;

  update matchmaking_queue set status = 'matched', match_id = v_match_id where user_id = p_user_id;
  update matchmaking_queue set status = 'matched', match_id = v_match_id where user_id = v_opponent_id;

  return jsonb_build_object('matched', true, 'matchId', v_match_id);
exception
  when others then
    -- Last-resort net: surface the real Postgres error text through the
    -- normal matched:false/reason path (edge function logs still get the
    -- full error separately) instead of a bare 500 that kills the search
    -- screen with no explanation.
    return jsonb_build_object('matched', false, 'reason', 'error', 'detail', sqlerrm);
end;
$$;

revoke execute on function fn_join_queue(uuid, int) from public, anon, authenticated;
grant execute on function fn_join_queue(uuid, int) to service_role;
