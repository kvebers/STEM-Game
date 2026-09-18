// A rough "days left at the current decay rate" warning, not an exact
// countdown — see fn_run_daily_decay (5 Elly/day past the grace period).
// This is just an early heads-up before an animal actually dies.
const DANGER_MARGIN = 30;

function isAtRisk(animal) {
  return animal.unlocked && animal.alive && animal.current_elo - animal.elo_threshold <= DANGER_MARGIN;
}

function statusLabel(animal) {
  if (!animal.unlocked) return `${animal.topic_name} · needs ${animal.elo_threshold} Elly`;
  if (!animal.alive) return 'Needs re-hatching, play to revive';
  if (isAtRisk(animal)) return `${animal.topic_name} · at risk of decay!`;
  return animal.topic_name;
}

export function AnimalCard({ animal, selectable = false, selected = false, onSelect, alwaysClickable = false }) {
  // Dead animals are still playable — playing is the recovery path (feeds
  // it, and re-hatches it once current Elly is back at the threshold).
  // Only "never unlocked" actually blocks play — except on the Learning
  // screen (alwaysClickable), where viewing a topic's content isn't gated
  // by whether you can play it yet.
  const isPlayable = alwaysClickable || animal.unlocked;
  const clickable = selectable && isPlayable;
  const atRisk = isAtRisk(animal);

  return (
    <button
      type="button"
      className={[
        'animal-card',
        !animal.unlocked && 'animal-card-locked',
        animal.unlocked && !animal.alive && 'animal-card-dead',
        selected && 'animal-card-selected',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={clickable ? () => onSelect(animal) : undefined}
      disabled={!clickable}
    >
      {atRisk && (
        <div className="animal-card-danger" title="At risk of decay, play soon to keep it alive" aria-hidden="true">
          <span className="animal-card-danger-dot" />
          <span className="animal-card-danger-dot" />
          <span className="animal-card-danger-dot" />
        </div>
      )}
      <div className="animal-card-emoji">{animal.art_key}</div>
      <div className="animal-card-name">{animal.name}</div>
      <div className="animal-card-status">{statusLabel(animal)}</div>
    </button>
  );
}
