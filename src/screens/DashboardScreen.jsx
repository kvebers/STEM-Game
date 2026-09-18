import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { useMatchStore } from '../state/useMatchStore.js';
import { AnimalTree } from '../components/AnimalTree.jsx';
import { LearningDetail } from '../components/LearningDetail.jsx';

const MODES = {
  practice: 'Practice (vs AI)',
  compete: 'Compete (Live PvP)',
  learn: '📖 Learn',
};

export function DashboardScreen() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const { profile, animals, loading, error, fetchCollection } = useCollectionStore();
  const { startAiMatch, startPvpSearch, cancelPvpSearch, pvpSearching, questions, submitting, error: matchError } =
    useMatchStore();
  const [mode, setMode] = useState('practice');
  const [learningAnimal, setLearningAnimal] = useState(null);

  useEffect(() => {
    if (session?.user?.id) fetchCollection(session.user.id);
  }, [session?.user?.id, fetchCollection]);

  // Only navigate once questions are actually ready — pvpSearching alone
  // just means "still waiting for an opponent", nothing to show yet.
  useEffect(() => {
    if (questions.length > 0) navigate('/challenge');
  }, [questions.length, navigate]);

  const deadCount = animals.filter((a) => a.unlocked && !a.alive).length;

  const handlePick = async (animal) => {
    if (mode === 'learn') {
      setLearningAnimal(animal);
      return;
    }
    if (submitting || pvpSearching) return;
    if (mode === 'compete') {
      await startPvpSearch(animal.stage_tier);
    } else {
      await startAiMatch(animal.stage_tier);
      navigate('/challenge');
    }
  };

  const handlePracticeFromLearning = async () => {
    const animal = learningAnimal;
    setLearningAnimal(null);
    setMode('practice');
    await startAiMatch(animal.stage_tier);
    navigate('/challenge');
  };

  if (pvpSearching) {
    return (
      <div className="card pvp-search-card">
        <p>Searching for an opponent…</p>
        {matchError && <p className="error-text">{matchError}</p>}
        <button className="btn btn-secondary" onClick={cancelPvpSearch}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      {loading && !profile ? (
        <div className="spinner-row">Loading your collection…</div>
      ) : (
        profile && (
          <>
            {deadCount > 0 && (
              <p className="muted">
                {deadCount === 1 ? 'One animal needs' : `${deadCount} animals need`} re-hatching, play with it to
                earn Elly back and revive it.
              </p>
            )}
            <div className="chip-row">
              {Object.entries(MODES).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`chip ${mode === key ? 'chip-selected' : ''}`}
                  onClick={() => {
                    setMode(key);
                    setLearningAnimal(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {submitting ? (
              <p className="muted spinner-row">Starting…</p>
            ) : (
              <AnimalTree
                animals={animals}
                selectable
                alwaysClickable={mode === 'learn'}
                selectedTier={learningAnimal?.stage_tier ?? null}
                onSelect={handlePick}
              />
            )}
            {learningAnimal && (
              <LearningDetail
                animal={learningAnimal}
                onClose={() => setLearningAnimal(null)}
                onPractice={handlePracticeFromLearning}
              />
            )}
          </>
        )
      )}
    </div>
  );
}
