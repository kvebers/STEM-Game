import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../state/useMatchStore.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { QuestionCard } from '../components/QuestionCard.jsx';
import { RaceTrack } from '../components/RaceTrack.jsx';

export function AiChallengeScreen() {
  const navigate = useNavigate();
  const { matchId, tier, topicName, questions, currentIndex, playerHits, aiHitSequence, result, error, submitting, finalizing, submitAnswer } =
    useMatchStore();
  const animals = useCollectionStore((s) => s.animals);

  useEffect(() => {
    if (!matchId) navigate('/play', { replace: true });
  }, [matchId, navigate]);

  useEffect(() => {
    if (result) navigate('/results', { replace: true });
  }, [result, navigate]);

  if (!matchId || !questions.length) return <div className="spinner-row">Loading challenge…</div>;

  const currentQuestion = questions[currentIndex];
  const playerAnimal = animals.find((a) => a.stage_tier === tier);

  return (
    <div>
      <h2 className="section-title">{topicName}</h2>
      {error && <p className="error-text">{error}</p>}
      <RaceTrack
        playerEmoji={playerAnimal?.art_key ?? '❓'}
        playerName={playerAnimal?.name ?? 'You'}
        playerHits={playerHits}
        opponentEmoji="🤖"
        opponentName="AI"
        opponentHits={aiHitSequence}
        questionCount={questions.length}
      />
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
