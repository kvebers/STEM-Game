-- Leaderboard support + player-editable nicknames.

-- profiles is already publicly readable (see initial_schema.sql), so the
-- leaderboard just queries it directly ordered by current_elo; index that.
create index if not exists profiles_current_elo_idx on profiles (current_elo desc);

-- ---------------------------------------------------------------------------
-- profiles has deliberately no general UPDATE policy (Elly/hunger/unlocks
-- are only ever written by fn_apply_match_result / the decay job). This is
-- the one narrow, validated exception: a signed-in player may rename
-- themself, and nothing else on the row.
-- ---------------------------------------------------------------------------

create function fn_update_display_name(p_display_name text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(p_display_name);
  v_profile profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 20 then
    raise exception 'Nickname must be between 2 and 20 characters';
  end if;

  update profiles
  set display_name = v_name
  where id = auth.uid()
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke execute on function fn_update_display_name(text) from public, anon;
grant execute on function fn_update_display_name(text) to authenticated;
