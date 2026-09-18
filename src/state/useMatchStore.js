import { create } from 'zustand';
import { supabase, invokeFunction } from '../api/supabaseClient.js';
import { createRng, shuffle } from '../../shared/questions/prng.js';

// Deterministic (same seed -> same result) sequence of which questions the
// AI "gets right", summing to exactly its fixed baseline score. Purely
// cosmetic — drives the race animation only; actual scoring already
// happened server-side from the real per-question answer log.
function buildAiHitSequence(seed, questionCount, hitCount) {
  const rng = createRng(seed);
  const hits = Array.from({ length: questionCount }, (_, i) => i < hitCount);
  return shuffle(rng, hits);
}

const initialState = {
  matchId: null,
  tier: null, // the learning-tree node/animal being played
  topicName: null,
  questions: [], // [{ index, prompt }] — no answer, that lives server-side only
  currentIndex: 0,
  questionStartedAt: null,
  submitting: false,
  finalizing: false,
  result: null, // { player1_score, player2_score, elo_delta_player1, winner_id }
  error: null,
  // Race visualization state
  playerHits: [], // bool per answered question so far (this player)
  aiHitSequence: [], // bool per question, precomputed for the whole match
};

export const useMatchStore = create((set, get) => ({
  ...initialState,

  startAiMatch: async (tier) => {
    set({ ...initialState, submitting: true });
    try {
      const data = await invokeFunction('create-match', { tier });
      set({
        matchId: data.matchId,
        tier,
        topicName: data.topicName,
        questions: data.questions,
        currentIndex: 0,
        questionStartedAt: Date.now(),
        submitting: false,
        aiHitSequence: buildAiHitSequence(data.seed, data.questions.length, data.aiBaselineScore),
      });
    } catch (error) {
      set({ error: error.message, submitting: false });
    }
  },

  submitAnswer: async (answerText) => {
    const { matchId, currentIndex, questionStartedAt, questions, playerHits } = get();
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

    const nextPlayerHits = [...playerHits, inserted.is_correct];
    const isLastQuestion = currentIndex + 1 >= questions.length;
    if (isLastQuestion) {
      set({ finalizing: true, submitting: false, playerHits: nextPlayerHits });
      try {
        const { result } = await invokeFunction('submit-match-result', { matchId });
        set({ result, finalizing: false });
      } catch (finalizeError) {
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

  reset: () => set({ ...initialState }),
}));
