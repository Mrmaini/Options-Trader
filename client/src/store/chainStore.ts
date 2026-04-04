import { create } from 'zustand';
import type { TradeLeg } from '../types/trade';
import type { ChainFilters } from '../types/options';

interface ChainState {
  selectedExpiration: string;
  filters: ChainFilters;
  selectedLegs: TradeLeg[];
  setExpiration: (exp: string) => void;
  setFilters: (filters: Partial<ChainFilters>) => void;
  addLeg: (leg: TradeLeg) => void;
  removeLeg: (id: string) => void;
  updateLeg: (id: string, updates: Partial<TradeLeg>) => void;
  clearLegs: () => void;
}

export const useChainStore = create<ChainState>((set) => ({
  selectedExpiration: '',
  filters: {
    expirationDate: '',
    optionType: 'both',
    minDelta: 0.1,
    maxDelta: 0.9,
    minVolume: 0,
    minOpenInterest: 0,
    maxSpreadPercent: 100,
  },
  selectedLegs: [],

  setExpiration: (selectedExpiration) =>
    set((state) => ({
      selectedExpiration,
      filters: { ...state.filters, expirationDate: selectedExpiration },
    })),

  setFilters: (updates) =>
    set((state) => ({ filters: { ...state.filters, ...updates } })),

  addLeg: (leg) => set((state) => ({ selectedLegs: [...state.selectedLegs, leg] })),

  removeLeg: (id) =>
    set((state) => ({ selectedLegs: state.selectedLegs.filter((l) => l.id !== id) })),

  updateLeg: (id, updates) =>
    set((state) => ({
      selectedLegs: state.selectedLegs.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),

  clearLegs: () => set({ selectedLegs: [] }),
}));
