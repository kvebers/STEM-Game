import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { EllyBadge } from '../components/EllyBadge.jsx';
import { AnimalCard } from '../components/AnimalCard.jsx';

export function DashboardScreen() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const { profile, animals, loading, error, fetchCollection } = useCollectionStore();

  useEffect(() => {
    if (session?.user?.id) fetchCollection(session.user.id);
  }, [session?.user?.id, fetchCollection]);

  const hasPlayableAnimal = animals.some((a) => a.unlocked && a.alive);

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      {loading && !profile ? (
        <div className="spinner-row">Loading your collection…</div>
      ) : (
        profile && (
          <>
            <div className="dashboard-header">
              <EllyBadge current={profile.current_elo} peak={profile.peak_elo} />
              <button className="btn btn-primary" onClick={() => navigate('/play')}>
                Play
              </button>
            </div>
            {!hasPlayableAnimal && (
              <p className="muted">All your animals need re-hatching — play to earn Elly back and revive one.</p>
            )}
            <h2 className="section-title">Your animals</h2>
            <div className="animal-grid">
              {animals.map((animal) => (
                <AnimalCard key={animal.stage_tier} animal={animal} />
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
