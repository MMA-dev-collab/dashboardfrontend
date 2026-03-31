import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// API instance should theoretically be moved to a dedicated api.js service
// We use a simple axios instance here for demonstration
const apiClient = axios.create({
  baseURL: '/api',
});

// Add auth interceptor if needed
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Example React Query hook for fetching projects
 * Replaces traditional useEffect + useState fetching logic
 */
export function useGetProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await apiClient.get('/projects');
      return data;
    },
    // Customize staleTime or cacheTime if specific to this query
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
