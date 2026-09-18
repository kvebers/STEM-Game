import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from './state/useAuthStore.js';
import { useCollectionStore } from './state/useCollectionStore.js';
import { AuthScreen } from './screens/AuthScreen.jsx';
import { DashboardScreen } from './screens/DashboardScreen.jsx';
import { ChallengeScreen } from './screens/ChallengeScreen.jsx';
import { ResultsScreen } from './screens/ResultsScreen.jsx';
import { LearningScreen } from './screens/LearningScreen.jsx';
import { EllyBadge } from './components/EllyBadge.jsx';

function TopBar() {
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useCollectionStore((s) => s.profile);
  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <Link to="/" className="brand">
          <span className="brand-emoji">🍃</span> Elly
        </Link>
        <Link to="/learning" className="btn btn-secondary">
          📖 Learn
        </Link>
      </div>
      <div className="top-bar-right">
        {profile && <EllyBadge current={profile.current_elo} peak={profile.peak_elo} />}
        <button className="btn btn-secondary" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuthStore();
  const fetchCollection = useCollectionStore((s) => s.fetchCollection);

  useEffect(() => {
    if (session?.user?.id) fetchCollection(session.user.id);
  }, [session?.user?.id, fetchCollection]);

  if (loading) {
    return (
      <div className="app-shell">
        <div className="spinner-row">Loading…</div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <TopBar />
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/learning" element={<LearningScreen />} />
          <Route path="/challenge" element={<ChallengeScreen />} />
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
