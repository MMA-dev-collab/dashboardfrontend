import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

export function useRoutineStatus() {
  return useQuery({
    queryKey: ['growth', 'routine', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/growth/routine/status');
      return data.data;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useRoutineCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (type) => {
      const { data } = await api.post('/growth/routine/checkin', { type });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['growth', 'routine'] });
      qc.invalidateQueries({ queryKey: ['growth', 'gaming'] });
      qc.invalidateQueries({ queryKey: ['growth', 'xp'] });
    },
  });
}
