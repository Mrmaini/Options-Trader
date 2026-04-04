import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TradeSetup, DirectionalBias, HoldingPeriod } from '../types/trade';

interface TradeSetupState extends TradeSetup {
  setTicker: (ticker: string) => void;
  setBias: (bias: DirectionalBias) => void;
  setAccountSize: (size: number) => void;
  setMaxRiskDollar: (amount: number) => void;
  setMaxRiskPercent: (pct: number) => void;
  setUsePercentRisk: (use: boolean) => void;
  setHoldingPeriod: (period: HoldingPeriod) => void;
  setTargetRR: (rr: number) => void;
}

export const useTradeSetupStore = create<TradeSetupState>()(
  persist(
    (set) => ({
      ticker: '',
      bias: 'bullish',
      accountSize: 25000,
      maxRiskDollar: 500,
      maxRiskPercent: 2,
      usePercentRisk: true,
      holdingPeriod: 'weekly',
      targetRR: 2,

      setTicker: (ticker) => set({ ticker: ticker.toUpperCase() }),
      setBias: (bias) => set({ bias }),
      setAccountSize: (accountSize) => set({ accountSize }),
      setMaxRiskDollar: (maxRiskDollar) => set({ maxRiskDollar }),
      setMaxRiskPercent: (maxRiskPercent) => set({ maxRiskPercent }),
      setUsePercentRisk: (usePercentRisk) => set({ usePercentRisk }),
      setHoldingPeriod: (holdingPeriod) => set({ holdingPeriod }),
      setTargetRR: (targetRR) => set({ targetRR }),
    }),
    {
      name: 'trade-setup-store',
      partialize: (state) => ({
        accountSize: state.accountSize,
        maxRiskDollar: state.maxRiskDollar,
        maxRiskPercent: state.maxRiskPercent,
        usePercentRisk: state.usePercentRisk,
        holdingPeriod: state.holdingPeriod,
        targetRR: state.targetRR,
        bias: state.bias,
      }),
    }
  )
);
