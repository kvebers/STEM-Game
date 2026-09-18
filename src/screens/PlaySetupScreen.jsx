import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { useMatchStore } from '../state/useMatchStore.js';
import { AnimalTree } from '../components/AnimalTree.jsx';

export function PlaySetupScreen() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const { animals, fetchCollection } = useCollectionStore();
  const { startAiMatch, submitting, error } = useMatchStore();

  const [selectedAnimal, setSelectedAnimal] = useState(null);

  useEffect(() => {
    if (session?.user?.id && animals.length === 0) fetchCollection(session.user.id);
  }, [session?.user?.id, animals.length, fetchCollection]);

  const hasPlayableAnimal = animals.some((a) => a.unlocked && a.alive);

  const handleStart = async () => {
    await startAiMatch(selectedAnimal.stage_tier);
    navigate('/challenge');
  };

  if (animals.length > 0 && !hasPlayableAnimal) {
    return (
      <div className="card">
        <p>None of your animals are currently alive to play with.</p>
        <p className="muted">Earn Elly back up to a tier's threshold to re-hatch that animal.</p>
      </div>
    );
  }

  return (
    <div className="play-setup">
      <section>
        <h2 className="section-title">Choose an animal to practice with</h2>
        <p className="muted">Picking an animal picks its topic — no separate subject choice needed.</p>
        <AnimalTree
          animals={animals}
          selectable
          selectedTier={selectedAnimal?.stage_tier ?? null}
          onSelect={setSelectedAnimal}
        />
      </section>

      {selectedAnimal && (
        <section>
          <h2 className="section-title">Choose mode</h2>
          <div className="chip-row">
            <button type="button" className="chip chip-selected">
              vs AI
            </button>
            <button type="button" className="chip" disabled title="Coming in a later update">
              Live PvP (coming soon)
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="btn btn-primary start-btn" onClick={handleStart} disabled={submitting}>
            {submitting ? 'Starting…' : `Practice ${selectedAnimal.topic_name}`}
          </button>
        </section>
      )}
    </div>
  );
}
