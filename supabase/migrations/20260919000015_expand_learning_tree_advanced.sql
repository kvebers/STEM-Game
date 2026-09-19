-- Expands the learning tree with 5 more advanced (12th-grade-level) nodes,
-- continuing past each branch's prior capstone instead of forking a new
-- branch: two more past the Numbers branch's Exponential Equations
-- capstone, one more past the Quantities branch's Standard Deviation
-- capstone, and two more past the Geometry branch's Volume & Surface Area
-- capstone. Mirrors the LEARNING_TREE additions in shared/questions/index.js
-- exactly (same tier ids, same parent structure).

alter table stage_animals drop constraint stage_animals_tier_check;
alter table stage_animals add constraint stage_animals_tier_check check (tier between 1 and 25);

insert into stage_animals (tier, parent_tier, elo_threshold, slug, name, art_key, flavor_text, subject_id, internal_tier, topic_name) values
  -- Numbers branch, continued past the Exponential Equations capstone
  (21, 14, 1750, 'silver_owl', 'Silver Owl', '🦉', 'Unwinds any exponential knot back to the power that tied it.', 'algebra', 13, 'Logarithms'),
  (22, 21, 1825, 'twin_viper', 'Twin Viper', '🐍', 'Strikes from two directions until both paths agree.', 'algebra', 14, 'Systems of Equations'),
  -- Quantities branch, continued past the Standard Deviation capstone
  (23, 16, 1600, 'murmuration_starling', 'Murmuration Starling', '🐦', 'Its flock spreads out exactly like data around a mean.', 'statistics', 12, 'Z-Scores'),
  -- Geometry branch, continued past the Volume & Surface Area capstone
  (24, 20, 1450, 'sundial_gecko', 'Sundial Gecko', '🦎', 'Reads every triangle''s angles like a shadow on a sundial.', 'geometry', 5, 'Trigonometric Ratios'),
  (25, 24, 1525, 'astrolabe_falcon', 'Astrolabe Falcon', '🦅', 'Charts the third side of any triangle from two sides and the angle between.', 'geometry', 6, 'Law of Cosines');

-- Backfill user_animals for every existing profile against the new nodes
-- (handle_new_user already covers future signups since it selects all of
-- stage_animals dynamically), then run the same parent-chain-aware unlock
-- fixpoint the previous learning-tree migrations used, so any profile that
-- already qualifies unlocks immediately instead of waiting for its next match.
insert into user_animals (user_id, stage_tier)
select p.id, sa.tier from profiles p cross join stage_animals sa
where sa.tier > 20
on conflict (user_id, stage_tier) do nothing;

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
