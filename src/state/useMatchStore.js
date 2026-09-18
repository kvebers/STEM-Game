import { create } from 'zustand';
import { supabase, invokeFunction } from '../api/supabaseClient.js';
import { createRng, shuffle } from '../../shared/questions/prng.js';
import { subscribeToQueueRow, subscribeToMatchStatus, joinMatchChannel, broadcastAnswer } from '../realtime/pvp.js';

// Deterministic (same seed -> same result) sequence of which questions the
// AI "gets right", summing to exactly its fixed baseline score. Purely
// cosmetic — drives the race animation only; actual scoring already
// happened server-side from the real per-question answer log.
function buildAiHitSequence(seed, questionCount, hitCount) {
  const rng = createRng(seed);
  const hits = Array.from({ length: questionCount }, (_, i) => i < hitCount);
  return shuffle(rng, hits);
}

// Mirrors the 5-minute limit enforced server-side in
// fn_apply_match_result — this constant is purely for the countdown
// display, the real enforcement lives in SQL.
export const MATCH_TIME_LIMIT_SECONDS = 300;

const initialState = {
  mode: null, // 'ai' | 'pvp'
  matchId: null,
  tier: null, // the learning-tree node/animal being played
  topicName: null,
  questions: [], // [{ index, prompt }] — no answer, that lives server-side only
  currentIndex: 0,
  questionStartedAt: null,
  matchStartedAt: null,
  submitting: false,
  finalizing: false,
  result: null, // { player1_score, player2_score, elo_delta_player1, winner_id }
  error: null,
  playerHits: [], // bool per answered question so far (this player)
  aiHitSequence: [], // ai mode only: bool per question, precomputed for the whole match
  // PvP-only state
  pvpSearching: false,
  opponentAnimal: null, // { art_key, name } — the opponent's equipped animal
  opponentHits: [], // pvp mode only: revealed live via broadcast
  isPlayer1: null,
  opponentDisconnected: false,
};

// Realtime subscriptions/channels for the in-progress match — not React
// state (mutating a plain property on the object from get() wouldn't
// survive the next set() call, since zustand replaces state rather than
// mutating it), so these live as module-level refs instead.
let cleanupFns = [];
let pvpChannelRef = null;
function cleanup() {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  pvpChannelRef = null;
}

export const useMatchStore = create((set, get) => ({
  ...initialState,

  startAiMatch: async (tier) => {
    cleanup();
    set({ ...initialState, mode: 'ai', submitting: true });
    try {
      const data = await invokeFunction('create-match', { tier });
      set({
        matchId: data.matchId,
        tier,
        topicName: data.topicName,
        questions: data.questions,
        currentIndex: 0,
        questionStartedAt: Date.now(),
        matchStartedAt: Date.now(),
        submitting: false,
        aiHitSequence: buildAiHitSequence(data.seed, data.questions.length, data.aiBaselineScore),
      });
    } catch (error) {
      set({ error: error.message, submitting: false });
    }
  },

  startPvpSearch: async (tier) => {
    cleanup();
    set({ ...initialState, mode: 'pvp', tier, pvpSearching: true });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const attemptJoin = async () => {
      try {
        const data = await invokeFunction('join-queue', { tier });
        if (data.matched) {
          get()._onPvpMatched(data.matchId);
        }
      } catch (error) {
        set({ error: error.message, pvpSearching: false });
        cleanup();
      }
    };

    // Realtime is the primary signal; a slow poll is just a safety net in
    // case an event is missed. Re-invoking join-queue while still waiting
    // is safe/idempotent — see fn_join_queue.
    const unsubscribeQueue = subscribeToQueueRow(user.id, (matchId) => get()._onPvpMatched(matchId));
    const pollInterval = setInterval(attemptJoin, 8000);
    cleanupFns.push(unsubscribeQueue, () => clearInterval(pollInterval));

    await attemptJoin();
  },

  cancelPvpSearch: async () => {
    cleanup();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from('matchmaking_queue').delete().eq('user_id', user.id);
    set({ ...initialState });
  },

  _onPvpMatched: async (matchId) => {
    if (get().matchId === matchId) return; // already wired up (e.g. duplicate event)
    cleanup();

    const { data: match, error } = await supabase
      .from('matches')
      .select('status, stage_tier, player1_id, player2_id, player1_animal_stage, player2_animal_stage')
      .eq('id', matchId)
      .single();

    if (error || !match) {
      set({ error: error?.message ?? 'Match not found', pvpSearching: false });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isPlayer1 = match.player1_id === user.id;
    const opponentAnimalStage = isPlayer1 ? match.player2_animal_stage : match.player1_animal_stage;

    const { data: opponentAnimal } = await supabase
      .from('stage_animals')
      .select('art_key, name')
      .eq('tier', opponentAnimalStage)
      .single();

    set({ matchId, isPlayer1, opponentAnimal, pvpSearching: false });

    if (match.status === 'active') {
      await get()._beginPvpChallenge(matchId);
    } else {
      const unsubscribeStatus = subscribeToMatchStatus(matchId, {
        onActive: () => get()._beginPvpChallenge(matchId),
        onCompleted: (row) => get()._onPvpCompleted(row),
      });
      cleanupFns.push(unsubscribeStatus);
    }
  },

  _beginPvpChallenge: async (matchId) => {
    const { data: questions, error } = await supabase
      .from('match_questions')
      .select('index, prompt')
      .eq('match_id', matchId)
      .order('index');

    if (error || !questions?.length) {
      set({ error: error?.message ?? 'No questions found for match' });
      return;
    }

    const channel = joinMatchChannel(matchId, {
      onOpponentAnswer: ({ isCorrect }) =>
        set((s) => ({ opponentHits: [...s.opponentHits, isCorrect], opponentDisconnected: false })),
      onOpponentLeave: () => get()._onOpponentDisconnected(matchId),
    });
    pvpChannelRef = channel;
    cleanupFns.push(() => supabase.removeChannel(channel));

    const unsubscribeStatus = subscribeToMatchStatus(matchId, {
      onCompleted: (row) => get()._onPvpCompleted(row),
    });
    cleanupFns.push(unsubscribeStatus);

    set({
      questions,
      currentIndex: 0,
      questionStartedAt: Date.now(),
      matchStartedAt: Date.now(),
      finalizing: false,
    });
  },

  // Every downstream consumer (ResultsScreen) reads result.player1_score /
  // elo_delta_player1 as "my score/delta" — true by construction in AI mode
  // (I'm always the DB's player1 there), but in PvP I might actually be the
  // DB's player2, so both the score and elo fields need remapping to "my
  // perspective" here, not just elo_delta (a bug caught while wiring this
  // up: player1_score/player2_score were being left as raw DB perspective).
  _normalizePvpResult: (raw) => {
    const { isPlayer1 } = get();
    return {
      player1_score: isPlayer1 ? raw.player1_score : raw.player2_score,
      player2_score: isPlayer1 ? raw.player2_score : raw.player1_score,
      elo_delta_player1: isPlayer1 ? raw.elo_delta_player1 : raw.elo_delta_player2,
      winner_id: raw.winner_id,
    };
  },

  // Presence "leave" fired for the match channel — report it so the SQL
  // side starts a short (25s) grace period (fn_report_disconnect), then
  // try to resolve once that elapses. If they reconnect and keep
  // answering, onOpponentAnswer above clears the local flag; the grace
  // period itself isn't cancelled server-side, but if they've genuinely
  // finished by the time it elapses, scoring proceeds normally anyway (the
  // deadline is only ever a way to bypass a "not finished" block, never a
  // requirement).
  _onOpponentDisconnected: async (matchId) => {
    if (get().result || get().matchId !== matchId) return;
    set({ opponentDisconnected: true });
    try {
      const { data, error } = await supabase.rpc('fn_report_disconnect', { p_match_id: matchId });
      if (!error && data?.deadline) {
        const waitMs = new Date(data.deadline).getTime() - Date.now() + 500;
        setTimeout(() => get()._attemptForfeitResolution(matchId), Math.max(0, waitMs));
      }
    } catch (e) {
      console.error(e);
    }
  },

  // Opportunistic — if I haven't finished my own questions yet either,
  // this fails and that's fine, it'll resolve next time either of us
  // finishes or retries.
  _attemptForfeitResolution: async (matchId) => {
    if (get().result || get().matchId !== matchId) return;
    try {
      const { result } = await invokeFunction('submit-match-result', { matchId });
      set({ result: get()._normalizePvpResult(result), finalizing: false });
      cleanup();
    } catch {
      // Not resolvable yet — no-op.
    }
  },

  _onPvpCompleted: (row) => {
    if (get().result) return; // already resolved via our own submit-match-result call
    set({ finalizing: false, result: get()._normalizePvpResult(row) });
    cleanup();
  },

  submitAnswer: async (answerText) => {
    const { matchId, currentIndex, questionStartedAt, questions, playerHits, mode } = get();
    if (!matchId) return;
    set({ submitting: true, error: null });

    const responseTimeMs = Date.now() - questionStartedAt;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: inserted, error } = await supabase
      .from('match_answers')
      .insert({
        match_id: matchId,
        player_id: user.id,
        question_index: currentIndex,
        submitted_answer: answerText,
        response_time_ms: responseTimeMs,
      })
      .select('is_correct')
      .single();

    if (error) {
      set({ error: error.message, submitting: false });
      return;
    }

    if (mode === 'pvp' && pvpChannelRef) {
      broadcastAnswer(pvpChannelRef, currentIndex, inserted.is_correct);
    }

    const nextPlayerHits = [...playerHits, inserted.is_correct];
    const isLastQuestion = currentIndex + 1 >= questions.length;
    if (isLastQuestion) {
      set({ finalizing: true, submitting: false, playerHits: nextPlayerHits });
      try {
        const { result } = await invokeFunction('submit-match-result', { matchId });
        const normalized = mode === 'pvp' ? get()._normalizePvpResult(result) : result;
        set({ result: normalized, finalizing: false });
        cleanup();
      } catch (finalizeError) {
        if (mode === 'pvp' && /has not finished/i.test(finalizeError.message)) {
          // Opponent hasn't answered their last question yet — stay in the
          // "finalizing" state; the match-status subscription set up when
          // this match began will deliver the result once they finish.
          return;
        }
        set({ error: finalizeError.message, finalizing: false });
      }
    } else {
      set({
        currentIndex: currentIndex + 1,
        questionStartedAt: Date.now(),
        submitting: false,
        playerHits: nextPlayerHits,
      });
    }
  },

  reset: () => {
    cleanup();
    set({ ...initialState });
  },
}));
