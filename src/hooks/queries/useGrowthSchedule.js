import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

export function useGrowthSchedule(date) {
  return useQuery({
    queryKey: ['growth', 'schedule', date],
    queryFn: async () => {
      const { data } = await api.get(`/growth/schedule/${date}`);
      return data.data;
    },
    refetchInterval: 30000,
    staleTime: 15000,
    enabled: !!date,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date) => {
      const { data } = await api.post('/growth/schedule', { date });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'schedule'] }),
  });
}

export function useAddBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleId, ...blockData }) => {
      const { data } = await api.post(`/growth/schedule/${scheduleId}/blocks`, blockData);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'schedule'] }),
  });
}

export function useUpdateBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleId, blockId, ...updates }) => {
      const { data } = await api.put(`/growth/schedule/${scheduleId}/blocks/${blockId}`, updates);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'schedule'] }),
  });
}

export function useRemoveBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleId, blockId }) => {
      const { data } = await api.delete(`/growth/schedule/${scheduleId}/blocks/${blockId}`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'schedule'] }),
  });
}

export function useFreeTime(date) {
  return useQuery({
    queryKey: ['growth', 'schedule', date, 'free-time'],
    queryFn: async () => {
      const { data } = await api.get(`/growth/schedule/${date}/free-time`);
      return data.data;
    },
    enabled: !!date,
  });
}
