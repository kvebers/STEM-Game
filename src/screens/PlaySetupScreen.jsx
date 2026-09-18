import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { useMatchStore } from '../state/useMatchStore.js';
import { AnimalCard } from '../components/AnimalCard.jsx';

export function PlaySetupScreen() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const { animals, subjects, fetchCollection } = useCollectionStore();
  const { startAiMatch, submitting, error } = useMatchStore();

  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedStageTier, setSelectedStageTier] = useState(null);

  useEffect(() => {
    if (session?.user?.id && animals.length === 0) fetchCollection(session.user.id);
  }, [session?.user?.id, animals.length, fetchCollection]);

  const playableAnimals = animals.filter((a) => a.unlocked && a.alive);

  const handleAnimalSelect = (animal) => {
    setSelectedAnimal(animal);
    setSelectedStageTier(animal.stage_tier);
  };

  const handleStart = async () => {
    await startAiMatch({
      subjectId: selectedSubject,
      stageTier: selectedStageTier,
      animalStageTier: selectedAnimal.stage_tier,
    });
    navigate('/challenge');
  };

  if (playableAnimals.length === 0) {
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
        <h2 className="section-title">1. Choose your animal</h2>
        <p className="muted">This sets the hardest difficulty you can play right now.</p>
        <div className="animal-grid">
          {playableAnimals.map((animal) => (
            <AnimalCard
              key={animal.stage_tier}
              animal={animal}
              selectable
              selected={selectedAnimal?.stage_tier === animal.stage_tier}
              onSelect={handleAnimalSelect}
            />
          ))}
        </div>
      </section>

      {selectedAnimal && (
        <section>
          <h2 className="section-title">2. Choose a subject</h2>
          <div className="chip-row">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                className={`chip ${selectedSubject === subject.id ? 'chip-selected' : ''}`}
                onClick={() => setSelectedSubject(subject.id)}
              >
                {subject.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedAnimal && selectedSubject && (
        <section>
          <h2 className="section-title">3. Choose difficulty</h2>
          <div className="chip-row">
            {Array.from({ length: selectedAnimal.stage_tier }, (_, i) => i + 1).map((tier) => (
              <button
                key={tier}
                type="button"
                className={`chip ${selectedStageTier === tier ? 'chip-selected' : ''}`}
                onClick={() => setSelectedStageTier(tier)}
              >
                Stage {tier}
              </button>
            ))}
          </div>

          <h2 className="section-title">4. Choose mode</h2>
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
            {submitting ? 'Starting…' : 'Start Challenge'}
          </button>
        </section>
      )}
    </div>
  );
}
