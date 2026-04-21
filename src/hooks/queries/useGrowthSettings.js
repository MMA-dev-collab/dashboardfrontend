import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

export function useGrowthSettings() {
  return useQuery({
    queryKey: ['growth', 'settings'],
    queryFn: async () => {
      const { data } = await api.get('/growth/settings');
      return data.data;
    },
    staleTime: 60000,
  });
}

export function useUpdateGrowthSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings) => {
      const { data } = await api.patch('/growth/settings', settings);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['growth', 'settings'] });
      qc.invalidateQueries({ queryKey: ['growth', 'gaming'] });
      qc.invalidateQueries({ queryKey: ['growth', 'routine'] });
    },
  });
}
