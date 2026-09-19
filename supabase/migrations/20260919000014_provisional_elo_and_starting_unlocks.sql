-- Provisional-period Elly: a player's first 10 games (AI or PvP, both count)
-- swing harder in either direction so a new player's rating finds its real
-- level fast, then settle to a slower K once they're past that window. K is
-- looked up per player from their own games_played, so in PvP a provisional
-- player and an established opponent get different-sized deltas from the
-- same match.
alter table profiles add column games_played int not null default 0;

create or replace function fn_apply_match_result(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match matches%rowtype;
  v_time_limit interval := '5 minutes';
  v_timed_out boolean;
  v_ai_threshold int;
  v_p1_score int;
  v_p2_score int;
  v_p1_time_ms int;
  v_p2_time_ms int;
  v_p1_elo int;
  v_p2_elo int;
  v_p1_games int;
  v_p2_games int;
  v_expected1 numeric;
  v_actual1 numeric;
  v_k_provisional int := 64;
  v_k_established int := 16;
  v_k_games int := 10;
  v_k1 int;
  v_k2 int;
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

  v_timed_out := (v_match.started_at is not null and now() - v_match.started_at > v_time_limit)
    or (v_match.forfeit_deadline is not null and now() > v_match.forfeit_deadline);

  select count(*) filter (where is_correct), coalesce(sum(response_time_ms), 0)
  into v_p1_score, v_p1_time_ms
  from match_answers where match_id = p_match_id and player_id = v_match.player1_id;

  if not v_timed_out and (select count(*) from match_answers where match_id = p_match_id and player_id = v_match.player1_id) < v_match.question_count then
    raise exception 'Player 1 has not finished match %', p_match_id;
  end if;

  if v_match.mode = 'ai' then
    select elo_threshold into v_ai_threshold from stage_animals where tier = v_match.stage_tier;
    select current_elo, games_played into v_p1_elo, v_p1_games from profiles where id = v_match.player1_id;

    v_p2_score := v_match.ai_baseline_score;
    v_p2_elo := v_ai_threshold;
    -- AI has no real per-question timing; give it a flat nominal pace so a
    -- score tie still has something to break it against.
    v_p2_time_ms := v_match.question_count * 6000;
  else
    select count(*) filter (where is_correct), coalesce(sum(response_time_ms), 0)
    into v_p2_score, v_p2_time_ms
    from match_answers where match_id = p_match_id and player_id = v_match.player2_id;

    if not v_timed_out and (select count(*) from match_answers where match_id = p_match_id and player_id = v_match.player2_id) < v_match.question_count then
      raise exception 'Player 2 has not finished match %', p_match_id;
    end if;

    select current_elo, games_played into v_p1_elo, v_p1_games from profiles where id = v_match.player1_id;
    select current_elo, games_played into v_p2_elo, v_p2_games from profiles where id = v_match.player2_id;
  end if;

  -- Correctness decides it outright; total time only breaks a genuine tie
  -- on score, so speed is a tiebreaker, not a way to out-score accuracy.
  v_actual1 := case
    when v_p1_score > v_p2_score then 1
    when v_p1_score < v_p2_score then 0
    when v_p1_time_ms < v_p2_time_ms then 1
    when v_p1_time_ms > v_p2_time_ms then 0
    else 0.5
  end;

  v_expected1 := 1.0 / (1.0 + power(10.0, (v_p2_elo - v_p1_elo) / 400.0));

  v_k1 := case when v_p1_games < v_k_games then v_k_provisional else v_k_established end;
  v_delta1 := round(v_k1 * (v_actual1 - v_expected1));

  if v_match.mode = 'pvp' then
    v_k2 := case when v_p2_games < v_k_games then v_k_provisional else v_k_established end;
    v_delta2 := round(v_k2 * ((1 - v_actual1) - (1 - v_expected1)));
  else
    v_delta2 := -v_delta1;
  end if;

  update profiles
  set current_elo = current_elo + v_delta1,
      peak_elo = greatest(peak_elo, current_elo + v_delta1),
      elo_at_last_feed = current_elo + v_delta1,
      games_played = games_played + 1,
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
        games_played = games_played + 1,
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
      player2_score = v_p2_score,
      player1_time_ms = v_p1_time_ms,
      player2_time_ms = case when v_match.mode = 'pvp' then v_p2_time_ms else null end
  where id = p_match_id;

  return jsonb_build_object(
    'player1_score', v_p1_score,
    'player2_score', v_p2_score,
    'player1_time_ms', v_p1_time_ms,
    'player2_time_ms', case when v_match.mode = 'pvp' then v_p2_time_ms else null end,
    'elo_delta_player1', v_delta1,
    'elo_delta_player2', case when v_match.mode = 'pvp' then v_delta2 else null end,
    'winner_id', v_winner,
    'timed_out', v_timed_out
  );
end;
$$;

revoke execute on function fn_apply_match_result(uuid) from public, anon, authenticated;
grant execute on function fn_apply_match_result(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- More starting unlocks: a brand-new player previously only got the trunk
-- root (tier 1). Pre-unlock the whole shared trunk (tier 1 -> tier 2) so
-- there's a second animal/topic to play immediately, before any rating has
-- moved.
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.raw_user_meta_data ->> 'avatar_url');

  insert into user_animals (user_id, stage_tier, unlocked, unlocked_at, alive)
  select
    new.id,
    tier,
    tier in (1, 2),
    case when tier in (1, 2) then now() else null end,
    tier in (1, 2)
  from stage_animals;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- One-time catch-up for players who already exist: give everyone +500 Elly
-- so existing accounts aren't left behind the faster-moving provisional
-- ratings new signups will now get, then re-run the same unlock/alive logic
-- the match trigger uses so the boost actually opens up tiers instead of
-- just sitting as a number.
-- ---------------------------------------------------------------------------

update profiles
set current_elo = current_elo + 500,
    peak_elo = peak_elo + 500,
    elo_at_last_feed = elo_at_last_feed + 500;

do $$
declare
  v_count int;
begin
  loop
    with newly_unlocked as (
      update user_animals ua
      set unlocked = true, unlocked_at = now()
      from stage_animals sa, profiles p
      where ua.stage_tier = sa.tier
        and ua.user_id = p.id
        and ua.unlocked = false
        and sa.elo_threshold <= p.peak_elo
        and (
          sa.parent_tier is null
          or exists (
            select 1 from user_animals pa
            where pa.user_id = ua.user_id and pa.stage_tier = sa.parent_tier and pa.unlocked = true
          )
        )
      returning 1
    )
    select count(*) into v_count from newly_unlocked;
    exit when v_count = 0;
  end loop;
end $$;

update user_animals ua
set alive = (p.current_elo >= sa.elo_threshold),
    died_at = case when p.current_elo < sa.elo_threshold and ua.alive then now() else ua.died_at end
from stage_animals sa, profiles p
where ua.stage_tier = sa.tier and ua.user_id = p.id and ua.unlocked = true;
