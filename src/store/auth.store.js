import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStoreStore } from './store.store.js';

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      redirectPath: null,
      // In this SPA we treat the store as hydrated immediately to avoid
      // routes getting stuck behind a never-ending "loading" state.
      hasHydrated: true,

      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      setRedirectPath: (redirectPath) => set({ redirectPath }),
      signOut: () => {
        try {
          const clearStores = useStoreStore.getState?.().clearStores;
          if (typeof clearStores === 'function') {
            clearStores();
          }
        } catch {
          // ignore store clearing errors on sign-out
        }
        set({ accessToken: null, refreshToken: null, user: null });
      },
      _setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'vendly-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        redirectPath: state.redirectPath,
      }),
    },
  ),
);
