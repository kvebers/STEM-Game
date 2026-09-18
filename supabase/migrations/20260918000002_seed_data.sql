insert into subjects (id, name, sort_order) values
  ('arithmetic', 'Arithmetic', 1),
  ('algebra', 'Algebra', 2),
  ('fractions_decimals', 'Fractions & Decimals', 3),
  ('statistics', 'Statistics', 4);

-- Elly thresholds start at the default starting rating (1000) so tier 1 is
-- unlocked immediately for a new player, then step up by 100 per tier.
-- art_key is an emoji placeholder until real art assets exist.
insert into stage_animals (tier, elo_threshold, slug, name, art_key, flavor_text) values
  (1, 1000, 'field_mouse', 'Field Mouse', '🐭', 'Small, quick, always nibbling on something.'),
  (2, 1100, 'red_squirrel', 'Red Squirrel', '🐿️', 'Stashes acorns and easy wins alike.'),
  (3, 1200, 'cottontail_rabbit', 'Cottontail Rabbit', '🐰', 'Hops through problems in a hurry.'),
  (4, 1300, 'sly_fox', 'Sly Fox', '🦊', 'Clever enough to spot the trick question.'),
  (5, 1400, 'timber_wolf', 'Timber Wolf', '🐺', 'Hunts in packs; good with a study group.'),
  (6, 1500, 'shadow_panther', 'Shadow Panther', '🐈‍⬛', 'Silent, focused, rarely misses.'),
  (7, 1600, 'brown_bear', 'Brown Bear', '🐻', 'Big appetite for big numbers.'),
  (8, 1700, 'bengal_tiger', 'Bengal Tiger', '🐅', 'Fierce on fractions and decimals alike.'),
  (9, 1800, 'mountain_lion', 'Mountain Lion', '🦁', 'Apex of the ladder, rarely challenged.'),
  (10, 1900, 'ember_dragon', 'Ember Dragon', '🐉', 'Legendary. Feeds only on the hardest problems.');
