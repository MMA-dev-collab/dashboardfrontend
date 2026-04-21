import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

export function useGamingStatus() {
  return useQuery({
    queryKey: ['growth', 'gaming', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/growth/gaming/status');
      return data.data;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useGamingLockStatus() {
  return useQuery({
    queryKey: ['growth', 'gaming', 'lock'],
    queryFn: async () => {
      const { data } = await api.get('/growth/gaming/lock-status');
      return data.data;
    },
    refetchInterval: 60000,
  });
}

export function useGamingSessions() {
  return useQuery({
    queryKey: ['growth', 'gaming', 'sessions'],
    queryFn: async () => {
      const { data } = await api.get('/growth/gaming/sessions');
      return data.data;
    },
  });
}

export function useCreateGamingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionData) => {
      const { data } = await api.post('/growth/gaming/sessions', sessionData);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['growth', 'gaming'] });
      qc.invalidateQueries({ queryKey: ['growth', 'schedule'] });
    },
  });
}

export function useStartGamingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId) => {
      const { data } = await api.patch(`/growth/gaming/sessions/${sessionId}/start`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'gaming'] }),
  });
}

export function useEndGamingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId) => {
      const { data } = await api.patch(`/growth/gaming/sessions/${sessionId}/end`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['growth', 'gaming'] });
      qc.invalidateQueries({ queryKey: ['growth', 'xp'] });
    },
  });
}

export function useGamingSuggestions() {
  return useQuery({
    queryKey: ['growth', 'gaming', 'suggestions'],
    queryFn: async () => {
      const { data } = await api.get('/growth/gaming/suggestions');
      return data.data;
    },
  });
}
