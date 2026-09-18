-- Supabase's safeupdate guard rejects UPDATE statements with no WHERE
-- clause at all, even when the intent is genuinely "every row" (advancing
-- every profile's decay cursor). `where true` satisfies the guard while
-- keeping the original unconditional semantics. Found by actually invoking
-- fn_run_daily_decay() rather than just reading the SQL.

create or replace function fn_run_daily_decay()
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

  update profiles set last_decay_processed_at = now() where true;

  return jsonb_build_object('profiles_updated', v_profiles_updated, 'animals_died', v_animals_died);
end;
$$;

revoke execute on function fn_run_daily_decay() from public, anon, authenticated;
grant execute on function fn_run_daily_decay() to service_role;
