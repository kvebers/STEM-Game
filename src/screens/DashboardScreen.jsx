import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { useMatchStore } from '../state/useMatchStore.js';
import { AnimalTree } from '../components/AnimalTree.jsx';
import { LearningDetail } from '../components/LearningDetail.jsx';
import { useT } from '../i18n/translations.js';

export function DashboardScreen() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const { profile, animals, loading, error, fetchCollection } = useCollectionStore();
  const { startAiMatch, startPvpSearch, cancelPvpSearch, pvpSearching, questions, submitting, error: matchError } =
    useMatchStore();
  const [mode, setMode] = useState('practice');
  const [learningAnimal, setLearningAnimal] = useState(null);
  const t = useT();

  const MODES = {
    practice: t('modePractice'),
    compete: t('modeCompete'),
    learn: t('modeLearn'),
  };

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
      <div>
        <h2 className="section-title">{t('pvpSearchTitle')}</h2>
        <div className="pvp-search-wrap">
          <div className="card pvp-search-card">
            <img src="/elly.png" alt="" className="pvp-search-image" />
            <p>{t('searchingOpponent')}</p>
            {matchError && <p className="error-text">{matchError}</p>}
            <button className="btn btn-secondary" onClick={cancelPvpSearch}>
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      {matchError && <p className="error-text">{matchError}</p>}
      {loading && !profile ? (
        <div className="spinner-row">{t('loadingCollection')}</div>
      ) : (
        profile && (
          <>
            {deadCount > 0 && (
              <p className="muted">
                {deadCount === 1 ? t('animalsNeedRehatchOne') : t('animalsNeedRehatchMany', { count: deadCount })}
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
              <p className="muted spinner-row">{t('starting')}</p>
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
