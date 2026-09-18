-- Simplifies Phase 2: drop the separate hunger meter and probabilistic
-- death roll entirely. Death is now fully deterministic and derived:
-- an unlocked animal is alive iff current Elly >= that tier's threshold.
-- No more randomness, so no more retroactive-survival-probability math and
-- no more decay-processed cursor — decay itself was always safely
-- idempotent from elo_at_last_feed + elapsed time alone.
--
-- The elo floor is raised to 1000 (tier 1's own threshold), which
-- guarantees the root topic can never die from decay — there's always at
-- least one animal available to play and earn Elly back with.

alter table profiles drop column hunger;
alter table profiles drop column last_decay_processed_at;

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

  -- First-time unlock: permanent, gated on peak_elo (fixpoint loop so a big
  -- jump can cascade through consecutive nodes correctly).
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

  -- Aliveness is fully derived from current Elly vs threshold — recompute
  -- for every unlocked animal, since one match's swing can revive or kill
  -- more than just the tier that was played.
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
      elo_delta_player2 = case when v_match.mode = 'pvp' then v_delta2 else null end
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

create or replace function fn_run_daily_decay()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grace_hours int := 48;
  v_elo_decay_rate_per_day numeric := 5;
  v_elo_floor int := 1000; -- tier 1's threshold: the lowest topic is always available
  v_profiles_updated int;
  v_animals_died int;
begin
  -- Pure function of elapsed time since last_fed_at, anchored to
  -- elo_at_last_feed so repeated runs never double-decay.
  with computed as (
    select
      id,
      greatest(0, extract(epoch from (now() - last_fed_at)) / 3600 - v_grace_hours) as hours_past_grace
    from profiles
  )
  update profiles p
  set current_elo = greatest(v_elo_floor, p.elo_at_last_feed - round(v_elo_decay_rate_per_day * c.hours_past_grace / 24))
  from computed c
  where p.id = c.id;
  get diagnostics v_profiles_updated = row_count;

  -- Kill any unlocked animal whose tier threshold decay just dropped below.
  -- (No symmetric "revive" step here: decay only ever decreases current_elo,
  -- so revival only ever happens by playing, in fn_apply_match_result.)
  with dead as (
    update user_animals ua
    set alive = false, died_at = now()
    from stage_animals sa, profiles p
    where ua.stage_tier = sa.tier
      and ua.user_id = p.id
      and ua.unlocked = true
      and ua.alive = true
      and p.current_elo < sa.elo_threshold
    returning 1
  )
  select count(*) into v_animals_died from dead;

  return jsonb_build_object('profiles_updated', v_profiles_updated, 'animals_died', v_animals_died);
end;
$$;

revoke execute on function fn_apply_match_result(uuid) from public, anon, authenticated;
revoke execute on function fn_run_daily_decay() from public, anon, authenticated;
grant execute on function fn_apply_match_result(uuid) to service_role;
grant execute on function fn_run_daily_decay() to service_role;
