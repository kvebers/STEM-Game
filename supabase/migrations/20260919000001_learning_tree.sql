-- Restructures stage_animals from a linear 1-10 ladder into a branching
-- learning tree: a shared trunk (Addition -> Addition & Subtraction), then
-- two independent branches ("Numbers": Multiplication..Advanced Equations,
-- "Quantities": Fractions..Statistics & Probability). `tier` is now an
-- opaque node id, not a difficulty rung — depth/order comes from
-- parent_tier. This mirrors shared/questions/index.js's LEARNING_TREE
-- exactly (same tier ids, same parent structure) — that array is the
-- source of truth for question generation, this table drives unlocking
-- and display.

alter table stage_animals drop constraint stage_animals_tier_check;
alter table stage_animals add constraint stage_animals_tier_check check (tier between 1 and 12);

alter table stage_animals add column parent_tier int references stage_animals (tier);
alter table stage_animals add column subject_id text references subjects (id);
alter table stage_animals add column internal_tier int not null default 1;
alter table stage_animals add column topic_name text;

-- Existing user_animals/matches rows FK-reference the old stage_animals
-- tiers, so they must go before we can replace the reference table.
-- Pre-launch, this only affects whatever test accounts already exist —
-- user_animals is reseeded below from each profile's current peak_elo, so
-- no real progress is silently lost. match_questions/match_answer_keys/
-- match_answers cascade-delete with their parent matches row.
delete from user_animals;
delete from matches;
delete from stage_animals;

insert into stage_animals (tier, parent_tier, elo_threshold, slug, name, art_key, flavor_text, subject_id, internal_tier, topic_name) values
  (1, null, 1000, 'field_mouse', 'Field Mouse', '🐭', 'Small, quick, always nibbling on something.', 'arithmetic', 1, 'Addition'),
  (2, 1, 1075, 'red_squirrel', 'Red Squirrel', '🐿️', 'Stashes acorns and easy wins alike.', 'arithmetic', 2, 'Addition & Subtraction'),
  -- Numbers path (longer branch, ends in the quadratic-equation capstone)
  (3, 2, 1150, 'cottontail_rabbit', 'Cottontail Rabbit', '🐰', 'Hops through times tables in a hurry.', 'arithmetic', 11, 'Multiplication'),
  (4, 3, 1225, 'sly_fox', 'Sly Fox', '🦊', 'Clever enough to split anything evenly.', 'arithmetic', 12, 'Division'),
  (5, 4, 1300, 'timber_wolf', 'Timber Wolf', '🐺', 'Knows exactly which move to make first.', 'arithmetic', 8, 'Order of Operations'),
  (6, 5, 1375, 'shadow_panther', 'Shadow Panther', '🐈‍⬛', 'Silent, focused, and finds x every time.', 'algebra', 1, 'Basic Algebra'),
  (7, 6, 1450, 'bengal_tiger', 'Bengal Tiger', '🐅', 'Powers through two steps without blinking.', 'algebra', 5, 'Two-Step Equations'),
  (8, 7, 1525, 'ember_dragon', 'Ember Dragon', '🐉', 'Legendary. Feeds only on the hardest equations.', 'algebra', 10, 'Advanced Equations'),
  -- Quantities path (shorter branch, ends in the statistics capstone)
  (9, 2, 1150, 'barn_owl', 'Barn Owl', '🦉', 'Sees the bigger picture, one slice at a time.', 'fractions_decimals', 1, 'Fractions'),
  (10, 9, 1225, 'honey_badger', 'Honey Badger', '🦡', 'Digs into decimals fearlessly.', 'fractions_decimals', 6, 'Decimals'),
  (11, 10, 1300, 'golden_eagle', 'Golden Eagle', '🦅', 'Swoops in for exactly the right percentage.', 'fractions_decimals', 8, 'Percentages'),
  (12, 11, 1375, 'rainbow_unicorn', 'Rainbow Unicorn', '🦄', 'Mythically good at reading the odds.', 'statistics', 10, 'Statistics & Probability');

-- Reseed user_animals for every existing profile against the new tree, then
-- backfill unlock/alive state from each profile's current peak_elo using
-- the same parent-chain-aware fixpoint logic fn_apply_match_result uses.
insert into user_animals (user_id, stage_tier)
select p.id, sa.tier from profiles p cross join stage_animals sa;

do $$
declare
  v_count int;
begin
  loop
    with newly_unlocked as (
      update user_animals ua
      set unlocked = true, unlocked_at = now(), alive = true
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

-- Replace the unlock portion of fn_apply_match_result: unlocking a node now
-- also requires its parent node to already be unlocked, not just the Elly
-- threshold. Re-hatch (reviving an already-unlocked-but-dead animal) still
-- only needs the threshold — `unlocked` is a permanent historical fact once
-- true, so it doesn't get re-gated by the parent chain.
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
  v_new_peak1 int;
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
      hunger = 0,
      last_fed_at = now(),
      last_active_at = now()
  where id = v_match.player1_id
  returning peak_elo into v_new_peak1;

  -- Fixpoint loop: a node unlocks once its parent is unlocked AND the
  -- threshold is met. Looping until no more rows change lets a single big
  -- Elly jump cascade through consecutive nodes correctly, rather than only
  -- ever unlocking one node per match.
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

  update user_animals
  set alive = true
  where user_id = v_match.player1_id and unlocked = true and alive = false
    and stage_tier in (select tier from stage_animals where elo_threshold <= v_new_peak1);

  if v_match.mode = 'pvp' then
    update profiles
    set current_elo = current_elo + v_delta2,
        peak_elo = greatest(peak_elo, current_elo + v_delta2),
        hunger = 0,
        last_fed_at = now(),
        last_active_at = now()
    where id = v_match.player2_id
    returning peak_elo into v_new_peak2;

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
      and stage_tier in (select tier from stage_animals where elo_threshold <= v_new_peak2);
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
