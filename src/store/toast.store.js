import { create } from 'zustand';

let idCounter = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: ({ type, message }) => {
    const id = ++idCounter;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    return id;
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
