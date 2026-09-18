-- Postgres grants EXECUTE on new functions to PUBLIC by default, which
-- means every SECURITY DEFINER function created so far has been callable
-- directly via PostgREST RPC by any anon/authenticated client — bypassing
-- the participant checks that live in the Edge Functions, not the SQL
-- functions themselves. Caught while testing fn_run_daily_decay directly.
--
-- fn_apply_match_result: a caller could force-score any match by id (though
-- the completion guard and deterministic persisted-answer scoring limit the
-- damage, it's not a path that should be open at all).
-- fn_run_daily_decay: any client could force early decay/death rolls for
-- every user.
-- Trigger functions (handle_new_user, set_answer_correctness) don't need
-- direct-call access either — triggers invoke them via the function owner's
-- rights regardless of grants to other roles, so revoking here doesn't
-- break anything.

revoke execute on function fn_apply_match_result(uuid) from public, anon, authenticated;
revoke execute on function fn_run_daily_decay() from public, anon, authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function set_answer_correctness() from public, anon, authenticated;

grant execute on function fn_apply_match_result(uuid) to service_role;
grant execute on function fn_run_daily_decay() to service_role;
