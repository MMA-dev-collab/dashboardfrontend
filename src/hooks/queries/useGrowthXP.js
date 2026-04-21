import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';

export function useXpProfile() {
  return useQuery({
    queryKey: ['growth', 'xp', 'profile'],
    queryFn: async () => {
      const { data } = await api.get('/growth/xp/profile');
      return data.data;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useXpLogs({ page = 1, limit = 20, source } = {}) {
  return useQuery({
    queryKey: ['growth', 'xp', 'logs', { page, limit, source }],
    queryFn: async () => {
      const { data } = await api.get('/growth/xp/logs', { params: { page, limit, source } });
      return data.data;
    },
  });
}

export function useXpLeaderboard(type = 'global') {
  return useQuery({
    queryKey: ['growth', 'xp', 'leaderboard', type],
    queryFn: async () => {
      const { data } = await api.get('/growth/xp/leaderboard', { params: { type } });
      return data.data;
    },
    refetchInterval: 60000,
  });
}

export function useXpStreak() {
  return useQuery({
    queryKey: ['growth', 'xp', 'streak'],
    queryFn: async () => {
      const { data } = await api.get('/growth/xp/streak');
      return data.data;
    },
  });
}

export function useXpMultipliers() {
  return useQuery({
    queryKey: ['growth', 'xp', 'multipliers'],
    queryFn: async () => {
      const { data } = await api.get('/growth/xp/multipliers');
      return data.data;
    },
  });
}
