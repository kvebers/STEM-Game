import { create } from 'zustand';
import { supabase, invokeFunction } from '../api/supabaseClient.js';

const initialState = {
  matchId: null,
  subjectId: null,
  stageTier: null,
  questions: [], // [{ index, prompt }] — no answer, that lives server-side only
  currentIndex: 0,
  questionStartedAt: null,
  submitting: false,
  finalizing: false,
  result: null, // { player1_score, player2_score, elo_delta_player1, winner_id }
  error: null,
};

export const useMatchStore = create((set, get) => ({
  ...initialState,

  startAiMatch: async ({ subjectId, stageTier, animalStageTier }) => {
    set({ ...initialState, submitting: true });
    try {
      const data = await invokeFunction('create-match', { subjectId, stageTier, animalStageTier });
      set({
        matchId: data.matchId,
        subjectId,
        stageTier,
        questions: data.questions,
        currentIndex: 0,
        questionStartedAt: Date.now(),
        submitting: false,
      });
    } catch (error) {
      set({ error: error.message, submitting: false });
    }
  },

  submitAnswer: async (answerText) => {
    const { matchId, currentIndex, questionStartedAt, questions } = get();
    if (!matchId) return;
    set({ submitting: true, error: null });

    const responseTimeMs = Date.now() - questionStartedAt;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('match_answers').insert({
      match_id: matchId,
      player_id: user.id,
      question_index: currentIndex,
      submitted_answer: answerText,
      response_time_ms: responseTimeMs,
    });

    if (error) {
      set({ error: error.message, submitting: false });
      return;
    }

    const isLastQuestion = currentIndex + 1 >= questions.length;
    if (isLastQuestion) {
      set({ finalizing: true, submitting: false });
      try {
        const { result } = await invokeFunction('submit-match-result', { matchId });
        set({ result, finalizing: false });
      } catch (finalizeError) {
        set({ error: finalizeError.message, finalizing: false });
      }
    } else {
      set({ currentIndex: currentIndex + 1, questionStartedAt: Date.now(), submitting: false });
    }
  },

  reset: () => set({ ...initialState }),
}));
