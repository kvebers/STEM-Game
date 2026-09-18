import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { useMatchStore } from '../state/useMatchStore.js';
import { AnimalTree } from '../components/AnimalTree.jsx';

export function DashboardScreen() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const { profile, animals, loading, error, fetchCollection } = useCollectionStore();
  const { startAiMatch, startPvpSearch, cancelPvpSearch, pvpSearching, questions, submitting, error: matchError } =
    useMatchStore();
  const [wantsPvp, setWantsPvp] = useState(false);

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
    if (submitting || pvpSearching) return;
    if (wantsPvp) {
      await startPvpSearch(animal.stage_tier);
    } else {
      await startAiMatch(animal.stage_tier);
      navigate('/challenge');
    }
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
                {deadCount === 1 ? 'One animal needs' : `${deadCount} animals need`} re-hatching — play with it to
                earn Elly back and revive it.
              </p>
            )}
            <div className="chip-row">
              <button type="button" className={`chip ${!wantsPvp ? 'chip-selected' : ''}`} onClick={() => setWantsPvp(false)}>
                Practice (vs AI)
              </button>
              <button type="button" className={`chip ${wantsPvp ? 'chip-selected' : ''}`} onClick={() => setWantsPvp(true)}>
                Compete (Live PvP)
              </button>
              <button type="button" className="chip" onClick={() => navigate('/learning')}>
                📖 Learn
              </button>
            </div>
            {submitting ? (
              <p className="muted spinner-row">Starting…</p>
            ) : (
              <AnimalTree animals={animals} selectable onSelect={handlePick} />
            )}
          </>
        )
      )}
    </div>
  );
}
