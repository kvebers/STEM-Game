-- Postgres Changes (used to detect a queue pairing and a match transitioning
-- to active/completed) requires the table to be in the supabase_realtime
-- publication — not on by default for new tables.
alter publication supabase_realtime add table matchmaking_queue;
alter publication supabase_realtime add table matches;
