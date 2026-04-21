import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

export function useGrowthTasks(filters = {}) {
  return useQuery({
    queryKey: ['growth', 'tasks', filters],
    queryFn: async () => {
      const { data } = await api.get('/growth/tasks', { params: filters });
      return data.data;
    },
  });
}

export function useGrowthTodayTasks() {
  return useQuery({
    queryKey: ['growth', 'tasks', 'today'],
    queryFn: async () => {
      const { data } = await api.get('/growth/tasks/today');
      return data.data;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useCreateGrowthTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskData) => {
      const { data } = await api.post('/growth/tasks', taskData);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['growth', 'tasks'] });
      qc.invalidateQueries({ queryKey: ['growth', 'schedule'] });
    },
  });
}

export function useCompleteGrowthTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId) => {
      const { data } = await api.patch(`/growth/tasks/${taskId}/complete`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['growth', 'tasks'] });
      qc.invalidateQueries({ queryKey: ['growth', 'xp'] });
      qc.invalidateQueries({ queryKey: ['growth', 'gaming'] });
      qc.invalidateQueries({ queryKey: ['growth', 'schedule'] });
    },
  });
}

export function useStartGrowthTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId) => {
      const { data } = await api.patch(`/growth/tasks/${taskId}/start`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'tasks'] }),
  });
}

export function useUpdateGrowthTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data } = await api.put(`/growth/tasks/${id}`, updates);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'tasks'] }),
  });
}

export function useDeleteGrowthTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId) => {
      const { data } = await api.delete(`/growth/tasks/${taskId}`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'tasks'] }),
  });
}
