import { create } from 'zustand';
import api from '../api/client';

const useGrowthStore = create((set, get) => ({
  xp: 0,
  level: 1,
  xpToNextLevel: 100,
  xpProgress: 0,
  gamingTimeAvailable: 0,
  streak: 0,
  streakMultiplier: 1.0,

  refreshProfile: async () => {
    try {
      const { data } = await api.get('/growth/xp/profile');
      const profile = data.data;
      set({
        xp: profile.totalXp,
        level: profile.currentLevel,
        xpToNextLevel: profile.xpToNextLevel?.remaining || 100,
        xpProgress: profile.xpToNextLevel?.progressPct || 0,
      });
    } catch (_) {}
  },

  refreshGamingStatus: async () => {
    try {
      const { data } = await api.get('/growth/gaming/status');
      set({ gamingTimeAvailable: data.data.availableMinutes });
    } catch (_) {}
  },

  refreshStreak: async () => {
    try {
      const { data } = await api.get('/growth/xp/streak');
      set({ streak: data.data.currentStreak, streakMultiplier: data.data.multiplier });
    } catch (_) {}
  },

  optimisticXpGain: (amount) => {
    const { xp, level, xpToNextLevel } = get();
    const newXp = xp + amount;
    set({ xp: newXp });
  },

  optimisticTimeChange: (delta) => {
    const { gamingTimeAvailable } = get();
    set({ gamingTimeAvailable: Math.max(0, gamingTimeAvailable + delta) });
  },
}));

export default useGrowthStore;
