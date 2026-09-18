function Lane({ label, emoji, progress }) {
  return (
    <div className="race-lane">
      <div className="race-lane-label muted">{label}</div>
      <div className="race-track-line">
        <div className="race-runner" style={{ left: `${Math.min(100, progress * 100)}%` }}>
          {emoji}
        </div>
      </div>
    </div>
  );
}

/**
 * A little visual race toward the food: each correct answer nudges the
 * runner forward. `opponentHits` is revealed progressively (only up to how
 * many questions the player has answered so far) so both racers advance in
 * step, question by question.
 */
export function RaceTrack({ playerEmoji, playerName, playerHits, opponentEmoji, opponentName, opponentHits, questionCount }) {
  const playerProgress = playerHits.filter(Boolean).length / questionCount;
  const revealedOpponentHits = opponentHits.slice(0, playerHits.length);
  const opponentProgress = revealedOpponentHits.filter(Boolean).length / questionCount;

  return (
    <div className="race-track">
      <Lane label={playerName} emoji={playerEmoji} progress={playerProgress} />
      <Lane label={opponentName} emoji={opponentEmoji} progress={opponentProgress} />
      <div className="race-finish" aria-hidden="true">
        🍖
      </div>
    </div>
  );
}
