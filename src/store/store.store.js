import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStoreStore = create(
  persist(
    (set) => ({
      stores: [],
      currentStoreId: null,

      setStores: (stores) => set({ stores }),
      setCurrentStoreId: (id) => set({ currentStoreId: id }),
      clearStores: () => set({ stores: [], currentStoreId: null }),
    }),
    {
      name: 'vendli-stores',
      // Only persist the active store ID — the stores list is always re-fetched fresh on load
      partialize: (state) => ({ currentStoreId: state.currentStoreId }),
    },
  ),
);
