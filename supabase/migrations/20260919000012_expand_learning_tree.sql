-- Expands the learning tree with 8 more nodes: two more topics past the
-- Numbers branch's Advanced Equations capstone, two more past the
-- Quantities branch's Statistics & Probability capstone, and a new 4-node
-- Geometry branch forking off the shared trunk (parent_tier 2), alongside
-- Numbers and Quantities. Mirrors the LEARNING_TREE additions in
-- shared/questions/index.js exactly (same tier ids, same parent structure).

insert into subjects (id, name, sort_order) values
  ('geometry', 'Geometry', 5);

alter table stage_animals drop constraint stage_animals_tier_check;
alter table stage_animals add constraint stage_animals_tier_check check (tier between 1 and 20);

insert into stage_animals (tier, parent_tier, elo_threshold, slug, name, art_key, flavor_text, subject_id, internal_tier, topic_name) values
  -- Numbers branch, continued past the Advanced Equations capstone
  (13, 8, 1600, 'blazing_phoenix', 'Blazing Phoenix', '🐦‍🔥', 'Rises from every failed factoring attempt.', 'algebra', 11, 'Quadratic Equations'),
  (14, 13, 1675, 'abyssal_kraken', 'Abyssal Kraken', '🐙', 'Wraps its arms around exponents twice as big.', 'algebra', 12, 'Exponential Equations'),
  -- Quantities branch, continued past the Statistics & Probability capstone
  (15, 12, 1450, 'crystal_swan', 'Crystal Swan', '🦢', 'Glides between equivalent ratios without a ripple.', 'fractions_decimals', 11, 'Ratios & Proportions'),
  (16, 15, 1525, 'deep_whale', 'Deep Whale', '🐋', 'Measures how far a dataset really spreads out.', 'statistics', 11, 'Standard Deviation'),
  -- Geometry branch, a new fork off the shared trunk
  (17, 2, 1150, 'garden_tortoise', 'Garden Tortoise', '🐢', 'Paces off every perimeter one steady step at a time.', 'geometry', 1, 'Perimeter & Area'),
  (18, 17, 1225, 'desert_scorpion', 'Desert Scorpion', '🦂', 'Snaps its pincers shut on the missing angle.', 'geometry', 2, 'Angles'),
  (19, 18, 1300, 'spiral_nautilus', 'Spiral Nautilus', '🐌', 'Its shell is a circle, and it knows all their secrets.', 'geometry', 3, 'Circles'),
  (20, 19, 1375, 'boulder_rhino', 'Boulder Rhino', '🦏', 'Solid enough to fill in for any volume problem.', 'geometry', 4, 'Volume & Surface Area');

-- Backfill user_animals for every existing profile against the new nodes
-- (handle_new_user already covers future signups since it selects all of
-- stage_animals dynamically), then run the same parent-chain-aware unlock
-- fixpoint the previous learning-tree migration used, so any profile that
-- already qualifies unlocks immediately instead of waiting for its next match.
insert into user_animals (user_id, stage_tier)
select p.id, sa.tier from profiles p cross join stage_animals sa
where sa.tier > 12
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
