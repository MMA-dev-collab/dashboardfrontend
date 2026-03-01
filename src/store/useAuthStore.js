import { create } from 'zustand';
import api from '../api/client';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = data.data;
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('refreshToken', refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
    return user;
  },

  logout: async () => {
    try {
      const refreshToken = sessionStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch (_) { /* fail silently */ }
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const { data } = await api.get('/auth/profile');
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch (_) {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (updates) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...updates } });
    }
  },

  hasRole: (role) => {
    const { user } = get();
    return user?.roles?.includes(role) || false;
  },

  isAdmin: () => get().hasRole('Admin'),
}));

export default useAuthStore;
