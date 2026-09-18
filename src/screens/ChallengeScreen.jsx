import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore, MATCH_TIME_LIMIT_SECONDS } from '../state/useMatchStore.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { QuestionCard } from '../components/QuestionCard.jsx';
import { RaceTrack } from '../components/RaceTrack.jsx';
import { Timer } from '../components/Timer.jsx';

export function ChallengeScreen() {
  const navigate = useNavigate();
  const {
    mode,
    matchId,
    tier,
    topicName,
    questions,
    currentIndex,
    matchStartedAt,
    playerHits,
    aiHitSequence,
    opponentAnimal,
    opponentHits,
    opponentDisconnected,
    result,
    error,
    submitting,
    finalizing,
    submitAnswer,
  } = useMatchStore();
  const animals = useCollectionStore((s) => s.animals);

  useEffect(() => {
    if (!matchId) navigate('/', { replace: true });
  }, [matchId, navigate]);

  useEffect(() => {
    if (result) navigate('/results', { replace: true });
  }, [result, navigate]);

  if (!matchId || !questions.length) return <div className="spinner-row">Loading challenge…</div>;

  const currentQuestion = questions[currentIndex];
  const playerAnimal = animals.find((a) => a.stage_tier === tier);
  const isPvp = mode === 'pvp';

  // AI mode's opponent sequence is precomputed for the whole match upfront,
  // so it's revealed in step with the player's own pace. PvP's opponentHits
  // already only contains what's actually happened live — no slicing.
  const revealedOpponentHits = isPvp ? opponentHits : aiHitSequence.slice(0, playerHits.length);

  return (
    <div>
      <h2 className="section-title">{topicName}</h2>
      <Timer startedAt={matchStartedAt} limitSeconds={MATCH_TIME_LIMIT_SECONDS} />
      {error && <p className="error-text">{error}</p>}
      {isPvp && opponentDisconnected && (
        <p className="error-text">Your opponent seems to have disconnected, resolving shortly if they don't return…</p>
      )}
      <RaceTrack
        playerEmoji={playerAnimal?.art_key ?? '❓'}
        playerName={playerAnimal?.name ?? 'You'}
        playerHits={playerHits}
        opponentEmoji={isPvp ? opponentAnimal?.art_key ?? '❓' : '🤖'}
        opponentName={isPvp ? opponentAnimal?.name ?? 'Opponent' : 'AI'}
        opponentHits={revealedOpponentHits}
        questionCount={questions.length}
      />
      <QuestionCard
        prompt={currentQuestion.prompt}
        index={currentIndex}
        total={questions.length}
        submitting={submitting || finalizing}
        onSubmit={submitAnswer}
      />
      {finalizing && (
        <p className="muted spinner-row">
          {isPvp && currentIndex + 1 >= questions.length ? 'Waiting for your opponent to finish…' : 'Scoring your run…'}
        </p>
      )}
    </div>
  );
}
