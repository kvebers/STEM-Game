import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../state/useMatchStore.js';
import { QuestionCard } from '../components/QuestionCard.jsx';

export function AiChallengeScreen() {
  const navigate = useNavigate();
  const { matchId, questions, currentIndex, result, error, submitting, finalizing, submitAnswer } = useMatchStore();

  useEffect(() => {
    if (!matchId) navigate('/play', { replace: true });
  }, [matchId, navigate]);

  useEffect(() => {
    if (result) navigate('/results', { replace: true });
  }, [result, navigate]);

  if (!matchId || !questions.length) return <div className="spinner-row">Loading challenge…</div>;

  const currentQuestion = questions[currentIndex];

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      <QuestionCard
        prompt={currentQuestion.prompt}
        index={currentIndex}
        total={questions.length}
        submitting={submitting || finalizing}
        onSubmit={submitAnswer}
      />
      {finalizing && <p className="muted spinner-row">Scoring your run…</p>}
    </div>
  );
}
