-- Elly initial schema.
-- Rating terminology: player-facing name is "Elly"; columns/formula stay
-- `elo`/`ELO` internally (see plan doc note on naming).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Static reference data
-- ---------------------------------------------------------------------------

create table subjects (
  id text primary key,
  name text not null,
  sort_order int not null
);

-- Stages and animals are permanently 1:1, so they're one table rather than
-- two joined tables (see plan §"Data model" simplification note).
create table stage_animals (
  tier int primary key check (tier between 1 and 10),
  elo_threshold int not null,
  slug text not null unique,
  name text not null,
  art_key text not null,
  flavor_text text
);

-- ---------------------------------------------------------------------------
-- User data
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  current_elo int not null default 1000,
  peak_elo int not null default 1000,
  hunger numeric(5, 2) not null default 0,
  last_fed_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  last_decay_processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Per-animal lifecycle only; hunger is global on `profiles` since feeding
-- always affects every owned animal identically.
create table user_animals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  stage_tier int not null references stage_animals (tier),
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  alive boolean not null default false,
  died_at timestamptz,
  unique (user_id, stage_tier)
);

-- ---------------------------------------------------------------------------
-- Match data
-- ---------------------------------------------------------------------------

create table matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('ai', 'pvp')),
  subject_id text not null references subjects (id),
  stage_tier int not null references stage_animals (tier),
  status text not null default 'pending' check (status in ('pending', 'active', 'completed', 'abandoned')),
  seed bigint not null,
  question_count int not null default 10,
  player1_id uuid not null references profiles (id),
  player2_id uuid references profiles (id),
  player1_animal_stage int not null,
  player2_animal_stage int,
  ai_baseline_score int,
  winner_id uuid references profiles (id),
  elo_delta_player1 int,
  elo_delta_player2 int,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  check (mode = 'ai' or player2_id is not null)
);

-- Only the prompt is stored here (participant-readable). The answer key is
-- kept in a separate table with no client-facing RLS policy at all, so a
-- participant can never read the correct answer via the client SDK before
-- submitting — see the split from `submit-match-result` design.
create table match_questions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  index int not null,
  prompt text not null,
  unique (match_id, index)
);

create table match_answer_keys (
  match_id uuid not null references matches (id) on delete cascade,
  index int not null,
  answer text not null,
  primary key (match_id, index)
);

-- Audit log the scoring function trusts; is_correct is always recomputed
-- server-side by the trigger below, never taken from the client as-is.
create table match_answers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  player_id uuid not null references profiles (id),
  question_index int not null,
  submitted_answer jsonb not null,
  is_correct boolean,
  response_time_ms int,
  submitted_at timestamptz not null default now(),
  unique (match_id, player_id, question_index)
);

create table matchmaking_queue (
  user_id uuid primary key references profiles (id) on delete cascade,
  subject_id text not null references subjects (id),
  stage_tier int not null references stage_animals (tier),
  elo_at_queue int not null,
  queued_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled')),
  match_id uuid references matches (id)
);

-- ---------------------------------------------------------------------------
-- New-user bootstrap: create a profile + all 10 user_animals rows, with
-- tier 1 pre-unlocked (its threshold equals the starting Elly).
-- ---------------------------------------------------------------------------

create function handle_new_user()
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
    tier = 1,
    case when tier = 1 then now() else null end,
    tier = 1
  from stage_animals;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- match_answers correctness trigger: never trust client-supplied is_correct.
-- ---------------------------------------------------------------------------

create function set_answer_correctness()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected text;
begin
  select answer
  into v_expected
  from match_answer_keys
  where match_id = new.match_id and index = new.question_index;

  if v_expected is null then
    raise exception 'No question found for match % index %', new.match_id, new.question_index;
  end if;

  new.is_correct := (
    regexp_replace(lower(trim(v_expected)), '\s+', '', 'g')
    = regexp_replace(lower(trim(new.submitted_answer #>> '{}')), '\s+', '', 'g')
  );

  return new;
end;
$$;

create trigger before_insert_match_answer
  before insert on match_answers
  for each row execute function set_answer_correctness();

-- ---------------------------------------------------------------------------
-- Server-side scoring + unlock/re-hatch, invoked via RPC from the
-- submit-match-result Edge Function using the service role. Idempotent and
-- shared by both AI and PvP modes (see plan §5).
-- ---------------------------------------------------------------------------

create function fn_apply_match_result(p_match_id uuid)
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

  update user_animals
  set unlocked = true, unlocked_at = now()
  where user_id = v_match.player1_id and unlocked = false
    and stage_tier in (select tier from stage_animals where elo_threshold <= v_new_peak1);

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

    update user_animals
    set unlocked = true, unlocked_at = now()
    where user_id = v_match.player2_id and unlocked = false
      and stage_tier in (select tier from stage_animals where elo_threshold <= v_new_peak2);

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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table subjects enable row level security;
alter table stage_animals enable row level security;
alter table profiles enable row level security;
alter table user_animals enable row level security;
alter table matches enable row level security;
alter table match_questions enable row level security;
alter table match_answer_keys enable row level security;
alter table match_answers enable row level security;
alter table matchmaking_queue enable row level security;

create policy "subjects are public read" on subjects for select using (true);
create policy "stage_animals are public read" on stage_animals for select using (true);

-- Non-sensitive fields are broadly readable so an opponent's card can be
-- rendered in PvP; no client UPDATE policy exists at all — Elly/hunger/unlock
-- writes only ever happen through fn_apply_match_result / the decay job.
create policy "profiles are public read" on profiles for select using (true);

create policy "user_animals are readable by owner" on user_animals for select using (auth.uid() = user_id);

create policy "matches are readable by participants" on matches for select
  using (auth.uid() = player1_id or auth.uid() = player2_id);

create policy "match_questions are readable by participants" on match_questions for select
  using (exists (
    select 1 from matches m
    where m.id = match_questions.match_id
      and (m.player1_id = auth.uid() or m.player2_id = auth.uid())
  ));

-- match_answer_keys intentionally has zero policies: RLS is enabled with no
-- grants, so no client role (authenticated or anon) can ever SELECT it.
-- Only SECURITY DEFINER functions (set_answer_correctness) and the
-- service-role Edge Function that inserts it can touch this table.

create policy "match_answers are readable by their author" on match_answers for select
  using (auth.uid() = player_id);

create policy "match_answers are insertable by participants during an active match" on match_answers for insert
  with check (
    auth.uid() = player_id
    and exists (
      select 1 from matches m
      where m.id = match_answers.match_id
        and m.status = 'active'
        and (m.player1_id = auth.uid() or m.player2_id = auth.uid())
    )
  );

-- Deliberately no UPDATE policy: the waiting -> matched transition (and its
-- match_id) is only ever written by join-queue via the service role, so a
-- client can never self-report a pairing. Select/insert/delete cover
-- "see my queue status" / "join" / "leave".
create policy "matchmaking_queue is selectable by its owner" on matchmaking_queue for select
  using (auth.uid() = user_id);

create policy "matchmaking_queue is insertable by its owner" on matchmaking_queue for insert
  with check (auth.uid() = user_id);

create policy "matchmaking_queue is deletable by its owner" on matchmaking_queue for delete
  using (auth.uid() = user_id);
