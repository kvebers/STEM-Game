import { AnimalCard } from './AnimalCard.jsx';

// Fixed tree shape: trunk (1,2), then two branches. See
// shared/questions/index.js LEARNING_TREE for the canonical structure this
// mirrors — this is presentation-only.
const TRUNK = [1, 2];
const LEFT_BRANCH = [3, 4, 5, 6, 7, 8]; // Numbers path -> Advanced Equations
const RIGHT_BRANCH = [9, 10, 11, 12]; // Quantities path -> Statistics & Probability

function TreeNode({ animal, selectable, selected, onSelect }) {
  if (!animal) return null;
  return (
    <div className="tree-node">
      <AnimalCard animal={animal} selectable={selectable} selected={selected} onSelect={onSelect} />
      <div className="tree-perch" aria-hidden="true" />
    </div>
  );
}

function Branch({ tiers, byTier, selectable, selectedTier, onSelect }) {
  return (
    <div className="tree-branch">
      {tiers.map((tier, i) => (
        <div key={tier} className="tree-branch-slot">
          {i > 0 && <div className="tree-connector" />}
          <TreeNode
            tier={tier}
            animal={byTier.get(tier)}
            selectable={selectable}
            selected={selectedTier === tier}
            onSelect={() => onSelect(byTier.get(tier))}
          />
        </div>
      ))}
    </div>
  );
}

export function AnimalTree({ animals, selectable = false, selectedTier = null, onSelect = () => {} }) {
  const byTier = new Map(animals.map((a) => [a.stage_tier, a]));

  return (
    <div className="animal-tree">
      {TRUNK.map((tier, i) => (
        <div key={tier} className="tree-trunk-slot">
          {i > 0 && <div className="tree-connector" />}
          <TreeNode
            tier={tier}
            animal={byTier.get(tier)}
            selectable={selectable}
            selected={selectedTier === tier}
            onSelect={() => onSelect(byTier.get(tier))}
          />
        </div>
      ))}

      <div className="tree-split" aria-hidden="true">
        <div className="tree-split-stem" />
        <div className="tree-split-bar" />
        <div className="tree-split-leg tree-split-leg-left" />
        <div className="tree-split-leg tree-split-leg-right" />
      </div>

      <div className="tree-branches">
        <Branch tiers={LEFT_BRANCH} byTier={byTier} selectable={selectable} selectedTier={selectedTier} onSelect={onSelect} />
        <Branch tiers={RIGHT_BRANCH} byTier={byTier} selectable={selectable} selectedTier={selectedTier} onSelect={onSelect} />
      </div>
    </div>
  );
}
