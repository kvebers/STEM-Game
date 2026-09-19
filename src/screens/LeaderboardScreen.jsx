import { useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient.js';
import { useAuthStore } from '../state/useAuthStore.js';
import { useT } from '../i18n/translations.js';

const LIMIT = 50;

export function LeaderboardScreen() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, display_name, current_elo')
        .order('current_elo', { ascending: false })
        .limit(LIMIT);

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setPlayers(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h2 className="section-title">{t('leaderboardTitle')}</h2>
      {loading && <div className="spinner-row">{t('loadingGeneric')}</div>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && (
        <div className="card leaderboard-card">
          {players.map((player, index) => (
            <div key={player.id} className={`leaderboard-row ${player.id === userId ? 'leaderboard-row-you' : ''}`}>
              <span className="leaderboard-rank">{index + 1}</span>
              <span className="leaderboard-name">{player.display_name}</span>
              <span className="leaderboard-elo">{player.current_elo}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
