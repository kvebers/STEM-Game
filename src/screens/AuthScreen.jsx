import { useAuthStore } from '../state/useAuthStore.js';

export function AuthScreen() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  return (
    <div className="app-shell auth-shell">
      <div className="card auth-card">
        <div className="brand">
          <span className="brand-emoji">⚡</span> Elly
        </div>
        <p className="muted">
          Climb the ladder, keep your animals fed, and earn Elly by racing through math challenges.
        </p>
        <button className="btn btn-primary" onClick={signInWithGoogle}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
