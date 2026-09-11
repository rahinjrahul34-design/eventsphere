import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { endpoints } from '../lib/api';

export const useAuth = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      hydrated: false,
      status: 'idle', // idle | loading | error

      setSession: ({ user, token }) => set({ user, token, status: 'idle' }),

      login: async (email, password) => {
        set({ status: 'loading' });
        const data = await endpoints.login({ email, password });
        set({ user: data.user, token: data.token, status: 'idle' });
        return data.user;
      },
      loginWithGoogle: async (credential) => {
        set({ status: 'loading' });
        const data = await endpoints.googleLogin({ credential });
        set({ user: data.user, token: data.token, status: 'idle' });
        return data.user;
      },
      register: async (payload) => {
        set({ status: 'loading' });
        const data = await endpoints.register(payload);
        set({ user: data.user, token: data.token, status: 'idle' });
        return data.user;
      },
      logout: () => set({ user: null, token: null, status: 'idle' }),

      refreshUser: async () => {
        const { token } = get();
        if (!token) return null;
        const user = await endpoints.me();
        set({ user });
        return user;
      },
      patchUser: (patch) => {
        const { user } = get();
        if (user) set({ user: { ...user, ...patch } });
      },
    }),
    {
      name: 'es-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
