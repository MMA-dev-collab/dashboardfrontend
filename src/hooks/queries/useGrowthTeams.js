import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

export function useGrowthTeams() {
  return useQuery({
    queryKey: ['growth', 'teams'],
    queryFn: async () => {
      const { data } = await api.get('/growth/teams');
      return data.data;
    },
  });
}

export function useTeamDetail(teamId) {
  return useQuery({
    queryKey: ['growth', 'teams', teamId],
    queryFn: async () => {
      const { data } = await api.get(`/growth/teams/${teamId}`);
      return data.data;
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamData) => {
      const { data } = await api.post('/growth/teams', teamData);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'teams'] }),
  });
}

export function useLeaveTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId) => {
      const { data } = await api.delete(`/growth/teams/${teamId}`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'teams'] }),
  });
}

export function useAvailableUsers() {
  return useQuery({
    queryKey: ['growth', 'users', 'available'],
    queryFn: async () => {
      const { data } = await api.get('/growth/teams/users/available');
      return data.data;
    },
    staleTime: 60000,
  });
}

export function useFriends() {
  return useQuery({
    queryKey: ['growth', 'friends'],
    queryFn: async () => {
      const { data } = await api.get('/growth/teams/friends');
      return data.data;
    },
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (addresseeId) => {
      const { data } = await api.post('/growth/teams/friends/request', { addresseeId });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'friends'] }),
  });
}

export function useRespondFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ friendshipId, status }) => {
      const { data } = await api.patch(`/growth/teams/friends/${friendshipId}`, { status });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'friends'] }),
  });
}

export function useAvailability() {
  return useQuery({
    queryKey: ['growth', 'availability'],
    queryFn: async () => {
      const { data } = await api.get('/growth/teams/availability');
      return data.data;
    },
  });
}

export function useSetAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slots) => {
      const { data } = await api.post('/growth/teams/availability', { slots });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['growth', 'availability'] }),
  });
}

export function usePendingInvites() {
  return useQuery({
    queryKey: ['growth', 'invites'],
    queryFn: async () => {
      const { data } = await api.get('/growth/teams/invites');
      return data.data;
    },
    refetchInterval: 30000,
  });
}

export function useRespondToInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inviteId, status }) => {
      const { data } = await api.post(`/growth/teams/invites/${inviteId}/respond`, { status });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['growth', 'invites'] });
      qc.invalidateQueries({ queryKey: ['growth', 'teams'] });
    },
  });
}
