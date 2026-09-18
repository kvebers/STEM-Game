import { useEffect } from 'react';
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

  useEffect(() => {
    if (session?.user?.id && animals.length === 0) fetchCollection(session.user.id);
  }, [session?.user?.id, animals.length, fetchCollection]);

  const hasPlayableAnimal = animals.some((a) => a.unlocked && a.alive);

  const handlePick = async (animal) => {
    if (submitting) return;
    await startAiMatch(animal.stage_tier);
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
        <h2 className="section-title">Mode</h2>
        <div className="chip-row">
          <button type="button" className="chip chip-selected">
            vs AI
          </button>
          <button type="button" className="chip" disabled title="Coming in a later update">
            Live PvP (coming soon)
          </button>
        </div>
      </section>

      <section>
        <h2 className="section-title">Tap an animal to practice its topic</h2>
        {error && <p className="error-text">{error}</p>}
        {submitting ? (
          <p className="muted spinner-row">Starting…</p>
        ) : (
          <AnimalTree animals={animals} selectable onSelect={handlePick} />
        )}
      </section>
    </div>
  );
}
