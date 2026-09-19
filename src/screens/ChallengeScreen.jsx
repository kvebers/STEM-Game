import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore, MATCH_TIME_LIMIT_SECONDS } from '../state/useMatchStore.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { QuestionCard } from '../components/QuestionCard.jsx';
import { RaceTrack } from '../components/RaceTrack.jsx';
import { ClimbTrack } from '../components/ClimbTrack.jsx';
import { FlappyTrack } from '../components/FlappyTrack.jsx';
import { Timer } from '../components/Timer.jsx';
import { useT } from '../i18n/translations.js';
import { useLanguageStore } from '../state/useLanguageStore.js';
import { localizeTopicName } from '../i18n/topicNames.js';

// How many trailing correct answers in a row, right now — resets to 0 the
// moment the most recent answer was wrong.
function trailingStreak(hits) {
  let streak = 0;
  for (let i = hits.length - 1; i >= 0 && hits[i]; i--) streak++;
  return streak;
}

// Same player/opponent progress numbers driving three different-looking
// visuals — picked once per match purely for variety, not a gameplay
// choice. Deterministic off matchId (rather than Math.random()) so the pick
// is a pure function of props, stable across re-renders of the same match.
const GAME_VISUAL_KEYS = ['race', 'climb', 'flappy'];

function pickVisualKey(matchId) {
  let hash = 0;
  for (let i = 0; i < matchId.length; i++) hash = (hash * 31 + matchId.charCodeAt(i)) | 0;
  return GAME_VISUAL_KEYS[Math.abs(hash) % GAME_VISUAL_KEYS.length];
}

export function ChallengeScreen() {
  const navigate = useNavigate();
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  // Bumped whenever a new answer lands, so QuestionCard can flash a brief
  // correct/wrong pulse without blocking the next question from appearing.
  const [feedback, setFeedback] = useState(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const prevHitsLenRef = useRef(0);
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
    reset,
  } = useMatchStore();
  const animals = useCollectionStore((s) => s.animals);
  const visualKey = useMemo(() => (matchId ? pickVisualKey(matchId) : 'race'), [matchId]);

  useEffect(() => {
    if (!matchId) navigate('/', { replace: true });
  }, [matchId, navigate]);

  useEffect(() => {
    if (result) navigate('/results', { replace: true });
  }, [result, navigate]);

  useEffect(() => {
    if (playerHits.length > prevHitsLenRef.current) {
      setFeedback({ correct: playerHits[playerHits.length - 1], key: playerHits.length });
    }
    prevHitsLenRef.current = playerHits.length;
  }, [playerHits]);

  if (!matchId || !questions.length) return <div className="spinner-row">{t('loadingChallenge')}</div>;

  const currentQuestion = questions[currentIndex];
  const playerAnimal = animals.find((a) => a.stage_tier === tier);
  const isPvp = mode === 'pvp';
  const streak = trailingStreak(playerHits);

  const handleQuit = () => {
    reset();
    navigate('/');
  };

  // AI mode's opponent sequence is precomputed for the whole match upfront,
  // so it's revealed in step with the player's own pace. PvP's opponentHits
  // already only contains what's actually happened live — no slicing.
  const revealedOpponentHits = isPvp ? opponentHits : aiHitSequence.slice(0, playerHits.length);

  const visualProps = {
    playerEmoji: playerAnimal?.art_key ?? '❓',
    playerName: playerAnimal?.name ?? t('you'),
    playerHits,
    opponentEmoji: isPvp ? opponentAnimal?.art_key ?? '❓' : '🤖',
    opponentName: isPvp ? opponentAnimal?.name ?? t('opponent') : t('ai'),
    opponentHits: revealedOpponentHits,
    questionCount: questions.length,
  };

  return (
    <div className="game-shell">
      <div className="game-header-row">
        <h2 className="section-title">{localizeTopicName(topicName, language)}</h2>
        {!isPvp && (
          <button type="button" className="btn-link" onClick={() => setConfirmQuit(true)}>
            {t('quitMatch')}
          </button>
        )}
      </div>
      {confirmQuit && (
        <div className="profile-overlay-backdrop" onClick={() => setConfirmQuit(false)}>
          <div className="card quit-confirm-card" onClick={(e) => e.stopPropagation()}>
            <p>{t('quitConfirm')}</p>
            <div className="quit-confirm-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmQuit(false)}>
                {t('cancel')}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleQuit}>
                {t('quitMatch')}
              </button>
            </div>
          </div>
        </div>
      )}
      <Timer startedAt={matchStartedAt} limitSeconds={MATCH_TIME_LIMIT_SECONDS} />
      {error && <p className="error-text">{error}</p>}
      {isPvp && opponentDisconnected && <p className="error-text">{t('opponentDisconnectedNotice')}</p>}
      {visualKey === 'climb' && <ClimbTrack {...visualProps} />}
      {visualKey === 'flappy' && <FlappyTrack {...visualProps} />}
      {visualKey === 'race' && <RaceTrack {...visualProps} />}
      <QuestionCard
        prompt={currentQuestion.prompt}
        options={currentQuestion.options}
        index={currentIndex}
        total={questions.length}
        submitting={submitting || finalizing}
        onSubmit={submitAnswer}
        feedback={feedback}
        streak={streak}
      />
      {finalizing && (
        <p className="muted spinner-row">
          {isPvp && currentIndex + 1 >= questions.length ? t('waitingOpponentFinish') : t('scoringRun')}
        </p>
      )}
    </div>
  );
}
