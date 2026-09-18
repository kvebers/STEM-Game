-- Phase 2: Elly decay, hunger, and animal death — plus a re-hatch bug fix
-- surfaced while building this (see below).
--
-- Tunable constants (placeholders per the plan, not tuned for real balance):
--   grace period      48h  — no decay/hunger for 2 days after last feeding
--   hunger ramp       168h — 7 more days to reach max hunger after grace
--   Elly decay rate    5/day past grace, floor 800
--   death chance      15%/day once hunger is maxed

alter table profiles add column elo_at_last_feed int not null default 1000;
update profiles set elo_at_last_feed = current_elo;

-- ---------------------------------------------------------------------------
-- Bug fix: fn_apply_match_result's re-hatch check compared against
-- peak_elo, which is a permanent high-water mark that never decreases —
-- once a tier was ever unlocked, that condition is true forever, so any
-- animal that died would silently revive on the very next match played,
-- regardless of subject/tier, with no need to actually re-earn anything.
-- This was unreachable pre-Phase-2 (nothing could ever die), so it's
-- caught here before the death mechanic goes live. Re-hatch now requires
-- *current* Elly back at the threshold (real re-earning); first-time
-- unlock is unchanged (still peak_elo, permanent). Also now stamps
-- elo_at_last_feed whenever last_fed_at is set, so the decay cron has a
-- fixed anchor to recompute from.
-- ---------------------------------------------------------------------------

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
      hunger = 0,
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

  -- Re-hatch: requires *current* Elly back at the threshold — real
  -- re-earning, not just the permanent peak (see bug-fix note above).
  update user_animals
  set alive = true
  where user_id = v_match.player1_id and unlocked = true and alive = false
    and stage_tier in (select tier from stage_animals where elo_threshold <= v_new_current1);

  if v_match.mode = 'pvp' then
    update profiles
    set current_elo = current_elo + v_delta2,
        peak_elo = greatest(peak_elo, current_elo + v_delta2),
        elo_at_last_feed = current_elo + v_delta2,
        hunger = 0,
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

    update user_animals
    set alive = true
    where user_id = v_match.player2_id and unlocked = true and alive = false
      and stage_tier in (select tier from stage_animals where elo_threshold <= v_new_current2);
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

-- ---------------------------------------------------------------------------
-- Daily decay: retroactively correct from elapsed time, not "one tick per
-- cron run" — see plan §"Decay / hunger / death cron".
-- ---------------------------------------------------------------------------

create function fn_run_daily_decay()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grace_hours int := 48;
  v_hunger_ramp_hours int := 168;
  v_elo_decay_rate_per_day numeric := 5;
  v_elo_floor int := 800;
  v_daily_death_chance numeric := 0.15;
  v_profiles_updated int;
  v_animals_died int;
begin
  -- Elly decay + hunger: pure functions of elapsed time since last_fed_at,
  -- anchored to elo_at_last_feed so repeated runs never double-decay.
  with computed as (
    select
      id,
      greatest(0, extract(epoch from (now() - last_fed_at)) / 3600 - v_grace_hours) as hours_past_grace
    from profiles
  )
  update profiles p
  set
    current_elo = greatest(v_elo_floor, p.elo_at_last_feed - round(v_elo_decay_rate_per_day * c.hours_past_grace / 24)),
    hunger = least(100, c.hours_past_grace / v_hunger_ramp_hours * 100)
  from computed c
  where p.id = c.id;
  get diagnostics v_profiles_updated = row_count;

  -- Death roll: only for the *new* elapsed window since last_decay_processed_at,
  -- and only once hunger has actually maxed (derived from last_fed_at, not
  -- stored separately). Closed-form multi-day survival probability so a
  -- missed cron run doesn't under- or over-apply risk, and the cursor
  -- ensures the same window is never re-rolled.
  with windows as (
    select
      id,
      last_fed_at + make_interval(hours => (v_grace_hours + v_hunger_ramp_hours)) as hunger_maxed_at,
      last_decay_processed_at
    from profiles
  ),
  eligible as (
    select id, greatest(hunger_maxed_at, last_decay_processed_at) as window_start
    from windows
    where now() > hunger_maxed_at
  ),
  rolls as (
    select id, extract(epoch from (now() - window_start)) / 86400 as days_in_window
    from eligible
    where now() > window_start
  )
  update user_animals ua
  set alive = false, died_at = now()
  from rolls r
  where ua.user_id = r.id
    and ua.unlocked = true
    and ua.alive = true
    and random() > power(1 - v_daily_death_chance, r.days_in_window);
  get diagnostics v_animals_died = row_count;

  update profiles set last_decay_processed_at = now();

  return jsonb_build_object('profiles_updated', v_profiles_updated, 'animals_died', v_animals_died);
end;
$$;

-- ---------------------------------------------------------------------------
-- Schedule: pg_cron calls the SQL function directly once a day — no HTTP
-- hop / Edge Function needed for the automated trigger, since the logic is
-- entirely self-contained in Postgres. The run-daily-decay Edge Function
-- still exists as a manually-invokable entry point for testing.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema extensions;

select cron.schedule('daily-decay', '0 0 * * *', $$select fn_run_daily_decay()$$);
