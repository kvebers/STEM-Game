-- In PvP, only whichever player's submit-match-result call actually wins
-- the race gets the score breakdown in its response. The other player
-- learns the match completed via Realtime, not their own call, so they
-- need to be able to read the scores back from the row itself.

alter table matches add column player1_score int;
alter table matches add column player2_score int;

create or replace function fn_apply_match_result(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match matches%rowtype;
  v_ai_threshold int;
  v_p1_score int;
  v_p2_score int;
  v_p1_elo int;
  v_p2_elo int;
  v_expected1 numeric;
  v_actual1 numeric;
  v_k int := 32;
  v_delta1 int;
  v_delta2 int;
  v_new_current1 int;
  v_new_peak1 int;
  v_new_current2 int;
  v_new_peak2 int;
  v_winner uuid;
  v_unlocked_count int;
begin
  select * into v_match from matches where id = p_match_id for update;

  if not found then
    raise exception 'Match % not found', p_match_id;
  end if;

  if v_match.status = 'completed' then
    return jsonb_build_object('already_completed', true);
  end if;

  if v_match.status <> 'active' then
    raise exception 'Match % is not active (status=%)', p_match_id, v_match.status;
  end if;

  select count(*) filter (where is_correct) into v_p1_score
  from match_answers where match_id = p_match_id and player_id = v_match.player1_id;

  if (select count(*) from match_answers where match_id = p_match_id and player_id = v_match.player1_id) < v_match.question_count then
    raise exception 'Player 1 has not finished match %', p_match_id;
  end if;

  if v_match.mode = 'ai' then
    select elo_threshold into v_ai_threshold from stage_animals where tier = v_match.stage_tier;
    select current_elo into v_p1_elo from profiles where id = v_match.player1_id;

    v_p2_score := v_match.ai_baseline_score;
    v_p2_elo := v_ai_threshold;
  else
    select count(*) filter (where is_correct) into v_p2_score
    from match_answers where match_id = p_match_id and player_id = v_match.player2_id;

    if (select count(*) from match_answers where match_id = p_match_id and player_id = v_match.player2_id) < v_match.question_count then
      raise exception 'Player 2 has not finished match %', p_match_id;
    end if;

    select current_elo into v_p1_elo from profiles where id = v_match.player1_id;
    select current_elo into v_p2_elo from profiles where id = v_match.player2_id;
  end if;

  v_actual1 := case
    when v_p1_score > v_p2_score then 1
    when v_p1_score < v_p2_score then 0
    else 0.5
  end;

  v_expected1 := 1.0 / (1.0 + power(10.0, (v_p2_elo - v_p1_elo) / 400.0));
  v_delta1 := round(v_k * (v_actual1 - v_expected1));
  v_delta2 := -v_delta1;

  update profiles
  set current_elo = current_elo + v_delta1,
      peak_elo = greatest(peak_elo, current_elo + v_delta1),
      elo_at_last_feed = current_elo + v_delta1,
      last_fed_at = now(),
      last_active_at = now()
  where id = v_match.player1_id
  returning current_elo, peak_elo into v_new_current1, v_new_peak1;

  loop
    with newly_unlocked as (
      update user_animals ua
      set unlocked = true, unlocked_at = now()
      from stage_animals sa
      where ua.stage_tier = sa.tier
        and ua.user_id = v_match.player1_id
        and ua.unlocked = false
        and sa.elo_threshold <= v_new_peak1
        and (
          sa.parent_tier is null
          or exists (
            select 1 from user_animals pa
            where pa.user_id = v_match.player1_id and pa.stage_tier = sa.parent_tier and pa.unlocked = true
          )
        )
      returning 1
    )
    select count(*) into v_unlocked_count from newly_unlocked;
    exit when v_unlocked_count = 0;
  end loop;

  update user_animals ua
  set alive = (v_new_current1 >= sa.elo_threshold),
      died_at = case when v_new_current1 < sa.elo_threshold and ua.alive then now() else ua.died_at end
  from stage_animals sa
  where ua.stage_tier = sa.tier and ua.user_id = v_match.player1_id and ua.unlocked = true;

  if v_match.mode = 'pvp' then
    update profiles
    set current_elo = current_elo + v_delta2,
        peak_elo = greatest(peak_elo, current_elo + v_delta2),
        elo_at_last_feed = current_elo + v_delta2,
        last_fed_at = now(),
        last_active_at = now()
    where id = v_match.player2_id
    returning current_elo, peak_elo into v_new_current2, v_new_peak2;

    loop
      with newly_unlocked as (
        update user_animals ua
        set unlocked = true, unlocked_at = now()
        from stage_animals sa
        where ua.stage_tier = sa.tier
          and ua.user_id = v_match.player2_id
          and ua.unlocked = false
          and sa.elo_threshold <= v_new_peak2
          and (
            sa.parent_tier is null
            or exists (
              select 1 from user_animals pa
              where pa.user_id = v_match.player2_id and pa.stage_tier = sa.parent_tier and pa.unlocked = true
            )
          )
        returning 1
      )
      select count(*) into v_unlocked_count from newly_unlocked;
      exit when v_unlocked_count = 0;
    end loop;

    update user_animals ua
    set alive = (v_new_current2 >= sa.elo_threshold),
        died_at = case when v_new_current2 < sa.elo_threshold and ua.alive then now() else ua.died_at end
    from stage_animals sa
    where ua.stage_tier = sa.tier and ua.user_id = v_match.player2_id and ua.unlocked = true;
  end if;

  v_winner := case
    when v_actual1 = 1 then v_match.player1_id
    when v_actual1 = 0 and v_match.mode = 'pvp' then v_match.player2_id
    else null
  end;

  update matches
  set status = 'completed',
      completed_at = now(),
      winner_id = v_winner,
      elo_delta_player1 = v_delta1,
      elo_delta_player2 = case when v_match.mode = 'pvp' then v_delta2 else null end,
      player1_score = v_p1_score,
      player2_score = v_p2_score
  where id = p_match_id;

  return jsonb_build_object(
    'player1_score', v_p1_score,
    'player2_score', v_p2_score,
    'elo_delta_player1', v_delta1,
    'elo_delta_player2', case when v_match.mode = 'pvp' then v_delta2 else null end,
    'winner_id', v_winner
  );
end;
$$;

revoke execute on function fn_apply_match_result(uuid) from public, anon, authenticated;
grant execute on function fn_apply_match_result(uuid) to service_role;
