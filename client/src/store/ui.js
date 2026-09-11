import { create } from 'zustand';

export const useUI = create((set) => ({
  searchOpen: false,
  setSearchOpen: (v) => set({ searchOpen: v }),
}));
