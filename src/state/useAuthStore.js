import { create } from 'zustand';
import { supabase } from '../api/supabaseClient.js';

export const useAuthStore = create(() => ({
  session: null,
  loading: true,

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));

// Called once at app startup (see App.jsx). Keeps the store in sync with
// Supabase's own session state rather than duplicating auth logic here.
export function initAuthListener() {
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({ session: data.session, loading: false });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ session, loading: false });
  });
}
