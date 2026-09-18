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
 * runner forward. `opponentHits` is taken as-is — for AI mode the caller
 * passes an already-revealed slice (in sync with the player's own pace,
 * since the full sequence is precomputed upfront); for PvP it's the
 * opponent's real live progress, which must NOT be capped to the player's
 * own pace or a faster opponent's real lead would be hidden.
 */
export function RaceTrack({ playerEmoji, playerName, playerHits, opponentEmoji, opponentName, opponentHits, questionCount }) {
  const playerProgress = playerHits.filter(Boolean).length / questionCount;
  const opponentProgress = opponentHits.filter(Boolean).length / questionCount;

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
