// A horizontal re-skin of RaceTrack — same progress data as ClimbTrack and
// RaceTrack, flying toward the nest instead of climbing or racing.
function Flyer({ emoji, name, progress, finished }) {
  return (
    <div className="flappy-lane">
      <div className={`flappy-runner ${finished ? 'finished' : ''}`} style={{ left: `${progress * 82}%` }}>
        <div className="race-runner-badge">
          <div className="race-runner-emoji">{emoji}</div>
          <div className="race-runner-name">{name}</div>
        </div>
      </div>
    </div>
  );
}

export function FlappyTrack({ playerEmoji, playerName, playerHits, opponentEmoji, opponentName, opponentHits, questionCount }) {
  const playerProgress = playerHits.filter(Boolean).length / questionCount;
  const opponentProgress = opponentHits.filter(Boolean).length / questionCount;

  return (
    <div className="flappy-visual">
      <div className="flappy-goal">🪺</div>
      <div className="flappy-lanes">
        <Flyer emoji={playerEmoji} name={playerName} progress={playerProgress} finished={playerProgress >= 1} />
        <Flyer emoji={opponentEmoji} name={opponentName} progress={opponentProgress} finished={opponentProgress >= 1} />
      </div>
    </div>
  );
}
