import { create } from 'zustand';
import { supabase } from '../api/supabaseClient.js';

export const useCollectionStore = create((set, get) => ({
  profile: null,
  animals: [], // user_animals merged with static stage_animals info
  stageAnimals: [],
  subjects: [],
  loading: false,
  error: null,

  loadStaticData: async () => {
    if (get().stageAnimals.length && get().subjects.length) return;
    const [{ data: stageAnimals }, { data: subjects }] = await Promise.all([
      supabase.from('stage_animals').select('*').order('tier'),
      supabase.from('subjects').select('*').order('sort_order'),
    ]);
    set({ stageAnimals: stageAnimals ?? [], subjects: subjects ?? [] });
  },

  fetchCollection: async (userId) => {
    set({ loading: true, error: null });
    try {
      await get().loadStaticData();
      const [{ data: profile, error: profileError }, { data: userAnimals, error: animalsError }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_animals').select('*').eq('user_id', userId).order('stage_tier'),
      ]);
      if (profileError) throw profileError;
      if (animalsError) throw animalsError;

      const stageAnimals = get().stageAnimals;
      // current_elo is denormalized onto each animal so AnimalCard can show
      // a danger indicator without threading a separate prop through the
      // 3D tree layer.
      const animals = (userAnimals ?? []).map((ua) => ({
        ...ua,
        ...stageAnimals.find((sa) => sa.tier === ua.stage_tier),
        current_elo: profile.current_elo,
      }));

      set({ profile, animals, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  updateDisplayName: async (displayName) => {
    const { data, error } = await supabase.rpc('fn_update_display_name', { p_display_name: displayName });
    if (error) throw new Error(error.message);
    set((state) => ({ profile: { ...state.profile, ...data } }));
    return data;
  },
}));
