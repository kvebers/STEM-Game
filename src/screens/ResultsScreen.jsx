import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore.js';
import { useCollectionStore } from '../state/useCollectionStore.js';
import { useMatchStore } from '../state/useMatchStore.js';

export function ResultsScreen() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const { result, questions, reset } = useMatchStore();
  const fetchCollection = useCollectionStore((s) => s.fetchCollection);
  const [newlyChanged, setNewlyChanged] = useState([]);

  useEffect(() => {
    if (!result) {
      navigate('/play', { replace: true });
      return;
    }
    const before = useCollectionStore.getState().animals;
    fetchCollection(session.user.id).then(() => {
      const after = useCollectionStore.getState().animals;
      const changes = after
        .map((a) => {
          const prev = before.find((b) => b.stage_tier === a.stage_tier);
          if (!prev) return null;
          if (!prev.unlocked && a.unlocked) return { ...a, changeType: 'unlocked' };
          if (prev.unlocked && !prev.alive && a.alive) return { ...a, changeType: 'rehatched' };
          return null;
        })
        .filter(Boolean);
      setNewlyChanged(changes);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!result) return null;

  const won = result.elo_delta_player1 > 0;
  const drew = result.elo_delta_player1 === 0;

  const handleBack = () => {
    reset();
    navigate('/');
  };

  return (
    <div className="card results-card">
      <div className="results-headline">{won ? '🎉 You won!' : drew ? '🤝 Draw' : '💪 Good effort'}</div>
      <p className="muted">
        You scored {result.player1_score}/{questions.length} against an AI baseline of {result.player2_score}.
      </p>
      <div className={`elo-delta ${won ? 'positive' : drew ? '' : 'negative'}`}>
        {result.elo_delta_player1 > 0 ? '+' : ''}
        {result.elo_delta_player1} Elly
      </div>

      {newlyChanged.length > 0 && (
        <div className="unlock-banner">
          {newlyChanged.map((a) => (
            <div key={a.stage_tier}>
              {a.art_key} {a.name} {a.changeType === 'unlocked' ? 'unlocked!' : 're-hatched!'}
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-primary" onClick={handleBack}>
        Back to Dashboard
      </button>
    </div>
  );
}
