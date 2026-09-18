-- Real disconnect detection for PvP, on top of the 5-minute time-limit
-- safety valve added earlier. When a client's Presence "leave" fires for
-- the match channel, the remaining player calls fn_report_disconnect
-- directly (no Edge Function needed — auth.uid() inside a SECURITY
-- DEFINER function is exactly what RLS-style client RPC calls are for).
-- That starts a short (25s) grace period on the match row; if the
-- disconnected player hasn't finished by the time it elapses,
-- fn_apply_match_result's timeout escape hatch now also accepts "past
-- forfeit_deadline" as a valid reason to proceed, not just "past the
-- absolute 5-minute limit" — so a genuine disconnect resolves in ~25s
-- instead of however much of the 5 minutes happened to be left.

alter table matches add column forfeit_deadline timestamptz;

create function fn_report_disconnect(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match matches%rowtype;
  v_grace interval := '25 seconds';
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from matches where id = p_match_id for update;

  if not found then
    raise exception 'Match % not found', p_match_id;
  end if;

  if v_match.player1_id <> v_caller and v_match.player2_id <> v_caller then
    raise exception 'Not a participant in match %', p_match_id;
  end if;

  if v_match.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', v_match.status);
  end if;

  -- Idempotent: only the first report starts the clock, so a flaky
  -- connection blipping leave/join repeatedly doesn't keep pushing the
  -- deadline out.
  if v_match.forfeit_deadline is null then
    update matches set forfeit_deadline = now() + v_grace where id = p_match_id;
    select forfeit_deadline into v_match.forfeit_deadline from matches where id = p_match_id;
  end if;

  return jsonb_build_object('ok', true, 'deadline', v_match.forfeit_deadline);
end;
$$;

grant execute on function fn_report_disconnect(uuid) to authenticated;

-- Speed bonus: response_time_ms was captured per answer but never used.
-- Correctness stays primary (a 7/10 always beats a 6/10 regardless of
-- speed) — total time only breaks a tie on score, so speed matters
-- exactly when it's genuinely a close call, rather than letting a fast
-- guesser out-score a slower-but-more-accurate player. AI mode gets a
-- flat nominal pace (6s/question) as its "speed" for the same tiebreak,
-- since it has no real per-question timing. Total time is persisted on
-- the row so results screens can actually show it, not just use it
-- invisibly.
alter table matches add column player1_time_ms int;
alter table matches add column player2_time_ms int;

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
    select current_elo into v_p1_elo from profiles where id = v_match.player1_id;

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

    select current_elo into v_p1_elo from profiles where id = v_match.player1_id;
    select current_elo into v_p2_elo from profiles where id = v_match.player2_id;
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
