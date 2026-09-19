// A vertical re-skin of RaceTrack — same progress data (correct answers /
// questionCount), just climbing a tree toward the fruit instead of racing
// down a track. Kept as plain CSS/DOM (no react-three-fiber) since it's
// purely decorative variety, not a second game.
function Climber({ emoji, name, progress, finished }) {
  return (
    <div className="climb-lane">
      <div className="climb-trunk" />
      <div className={`climb-runner ${finished ? 'finished' : ''}`} style={{ bottom: `${progress * 78}%` }}>
        <div className="race-runner-badge">
          <div className="race-runner-emoji">{emoji}</div>
          <div className="race-runner-name">{name}</div>
        </div>
      </div>
    </div>
  );
}

export function ClimbTrack({ playerEmoji, playerName, playerHits, opponentEmoji, opponentName, opponentHits, questionCount }) {
  const playerProgress = playerHits.filter(Boolean).length / questionCount;
  const opponentProgress = opponentHits.filter(Boolean).length / questionCount;

  return (
    <div className="climb-visual">
      <div className="climb-prize">🍎</div>
      <div className="climb-lanes">
        <Climber emoji={playerEmoji} name={playerName} progress={playerProgress} finished={playerProgress >= 1} />
        <Climber emoji={opponentEmoji} name={opponentName} progress={opponentProgress} finished={opponentProgress >= 1} />
      </div>
    </div>
  );
}
