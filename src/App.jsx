import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from './state/useAuthStore.js';
import { useCollectionStore } from './state/useCollectionStore.js';
import { AuthScreen } from './screens/AuthScreen.jsx';
import { DashboardScreen } from './screens/DashboardScreen.jsx';
import { ChallengeScreen } from './screens/ChallengeScreen.jsx';
import { ResultsScreen } from './screens/ResultsScreen.jsx';
import { PrintScreen } from './screens/PrintScreen.jsx';
import { EllyBadge } from './components/EllyBadge.jsx';
import { ProfileOverlay } from './components/ProfileOverlay.jsx';
import { LanguageSwitcher } from './components/LanguageSwitcher.jsx';
import { useT } from './i18n/translations.js';

function TopBar() {
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useCollectionStore((s) => s.profile);
  const [showProfile, setShowProfile] = useState(false);
  const t = useT();
  return (
    <div className="top-bar">
      <div className="top-bar-content">
        <div className="top-bar-left">
          <Link to="/" className="brand">
            <img src="/elly.png" alt="" className="brand-logo" /> Elly
          </Link>
        </div>
        <div className="top-bar-right">
          <LanguageSwitcher />
          <Link to="/print" className="btn btn-secondary btn-icon" title={t('printTitle')}>
            🖨️
          </Link>
          {profile && <EllyBadge current={profile.current_elo} onClick={() => setShowProfile(true)} />}
          <button className="btn btn-secondary" onClick={signOut}>
            {t('signOut')}
          </button>
        </div>
      </div>
      {showProfile && <ProfileOverlay onClose={() => setShowProfile(false)} />}
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuthStore();
  const fetchCollection = useCollectionStore((s) => s.fetchCollection);
  const t = useT();

  useEffect(() => {
    if (session?.user?.id) fetchCollection(session.user.id);
  }, [session?.user?.id, fetchCollection]);

  if (loading) {
    return (
      <div className="app-shell">
        <div className="spinner-row">{t('loadingGeneric')}</div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <BrowserRouter>
      <TopBar />
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/challenge" element={<ChallengeScreen />} />
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="/print" element={<PrintScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
