-- Requiring an exact tier match made PvP nearly impossible to trigger with
-- few concurrent players. Broadens fn_join_queue: prefer an exact topic
-- match, but fall back to anyone else queued in the same subject. Within a
-- subject, tiers form a straight ancestor chain in our tree (see
-- shared/questions/index.js LEARNING_TREE — e.g. arithmetic is exactly
-- 1->2->3->4->5), so the shallower tier is always already unlocked by
-- whoever's on the deeper one, safe to use as the actual match topic
-- without an unlock check. This does NOT broaden across a subject
-- boundary (e.g. arithmetic tier 5 <-> algebra tier 6, even though
-- they're adjacent in the real tree) — that needs full ancestor-chain
-- reasoning via the parent_tier column, judged not worth the added
-- complexity for v1.

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
    raise exception 'Profile % not found', p_user_id;
  end if;

  select subject_id into v_subject_id from stage_animals where tier = p_tier;
  if v_subject_id is null then
    raise exception 'Unknown learning-tree node %', p_tier;
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

  -- Same subject (not just exact tier), preferring an exact match first.
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
    return jsonb_build_object('matched', false);
  end if;

  -- Shallower tier = lower id within a subject's chain by construction of
  -- the tree — always unlocked by whoever's queued on the deeper one.
  v_match_tier := least(p_tier, v_opponent_tier);

  insert into matches (mode, subject_id, stage_tier, status, seed, question_count, player1_id, player2_id, player1_animal_stage, player2_animal_stage)
  values ('pvp', v_subject_id, v_match_tier, 'pending', 0, 10, p_user_id, v_opponent_id, p_tier, v_opponent_tier)
  returning id into v_match_id;

  update matchmaking_queue set status = 'matched', match_id = v_match_id where user_id = p_user_id;
  update matchmaking_queue set status = 'matched', match_id = v_match_id where user_id = v_opponent_id;

  return jsonb_build_object('matched', true, 'matchId', v_match_id);
end;
$$;

revoke execute on function fn_join_queue(uuid, int) from public, anon, authenticated;
grant execute on function fn_join_queue(uuid, int) to service_role;
