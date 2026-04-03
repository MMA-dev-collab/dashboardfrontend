import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';

/**
 * React Query hook for fetching projects.
 * Uses the shared API client (with auth interceptor) from src/api/client.js
 */
export function useGetProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
