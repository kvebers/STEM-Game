function statusLabel(animal) {
  if (!animal.unlocked) return `${animal.topic_name} · needs ${animal.elo_threshold} Elly`;
  if (!animal.alive) return 'Needs re-hatching';
  return animal.topic_name;
}

export function AnimalCard({ animal, selectable = false, selected = false, onSelect }) {
  const isPlayable = animal.unlocked && animal.alive;
  const clickable = selectable && isPlayable;

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
      <div className="animal-card-emoji">{animal.art_key}</div>
      <div className="animal-card-name">{animal.name}</div>
      <div className="animal-card-status">{statusLabel(animal)}</div>
    </button>
  );
}
