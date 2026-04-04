import { create } from 'zustand';
import type { TradePlan } from '../types/trade';

interface PlanState {
  plan: TradePlan | null;
  setPlan: (plan: TradePlan) => void;
  clearPlan: () => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  plan: null,
  setPlan: (plan) => set({ plan }),
  clearPlan: () => set({ plan: null }),
}));
