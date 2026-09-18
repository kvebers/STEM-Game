import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './state/useAuthStore.js';
import { AuthScreen } from './screens/AuthScreen.jsx';
import { DashboardScreen } from './screens/DashboardScreen.jsx';
import { PlaySetupScreen } from './screens/PlaySetupScreen.jsx';
import { AiChallengeScreen } from './screens/AiChallengeScreen.jsx';
import { ResultsScreen } from './screens/ResultsScreen.jsx';

function TopBar() {
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <div className="top-bar">
      <div className="brand">
        <span className="brand-emoji">⚡</span> Elly
      </div>
      <button className="btn btn-secondary" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuthStore();

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
          <Route path="/play" element={<PlaySetupScreen />} />
          <Route path="/challenge" element={<AiChallengeScreen />} />
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
