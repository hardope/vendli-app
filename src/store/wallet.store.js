import { create } from 'zustand';

export const useWalletStore = create((set) => ({
  balance: 0,
  setBalance: (balance) => set({ balance }),
}));
