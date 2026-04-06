import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { MarketContext, HistoricalBar, QuoteData, TechnicalLevels } from '../types/market';
import { computeTechnicalLevels } from '../utils/technicalIndicators';

interface RawMarketContext {
  spy: QuoteData;
  qqq: QuoteData;
  vix: QuoteData;
}

async function fetchHistorical(symbol: string): Promise<HistoricalBar[]> {
  const { data } = await api.get<HistoricalBar[]>(`/market/historical/${symbol}`, {
    params: { period: '3mo' }, // use 3mo instead of 1y — much lighter
  });
  return data;
}

function calcIVEnvironment(vixPrice: number): { ivRank: number; ivPercentile: number } {
  const clampedVix = Math.min(Math.max(vixPrice, 10), 80);
  const ivRank = Math.round(((clampedVix - 10) / 70) * 100);
  return { ivRank, ivPercentile: ivRank };
}

function calcSignal(spyLevels: TechnicalLevels, qqqLevels: TechnicalLevels, vixPrice: number): MarketContext['signal'] {
  const bullish = spyLevels.trend === 'bullish' && qqqLevels.trend === 'bullish' && vixPrice < 20;
  const bearish = spyLevels.trend === 'bearish' || qqqLevels.trend === 'bearish' || vixPrice > 30;
  if (bullish) return 'favors_entries';
  if (bearish) return 'caution';
  return 'neutral';
}

export function useMarketContext() {
  return useQuery<MarketContext>({
    queryKey: ['market', 'context'],
    queryFn: async () => {
      // Fetch quotes first, then historical separately (sequential, not parallel)
      const { data: raw } = await api.get<RawMarketContext>('/market/context');
      const { ivRank, ivPercentile } = calcIVEnvironment(raw.vix.price);

      // Fetch historical for EMAs — do sequentially to reduce burst
      let spyLevels: TechnicalLevels | undefined;
      let qqqLevels: TechnicalLevels | undefined;
      try {
        const spyHist = await fetchHistorical('SPY');
        spyLevels = computeTechnicalLevels(spyHist);
        const qqqHist = await fetchHistorical('QQQ');
        qqqLevels = computeTechnicalLevels(qqqHist);
      } catch {
        // Historical fetch failed — still return quotes with neutral signal
      }

      const signal = spyLevels && qqqLevels
        ? calcSignal(spyLevels, qqqLevels, raw.vix.price)
        : 'neutral';

      return { ...raw, spyLevels, qqqLevels, ivRank, ivPercentile, signal };
    },
    staleTime: 10 * 60 * 1000,   // 10 min
    refetchInterval: 15 * 60 * 1000, // 15 min
    retry: 1,
  });
}

export function useTickerContext(symbol: string) {
  return useQuery<TechnicalLevels | null>({
    queryKey: ['market', 'historical', symbol],
    queryFn: async () => {
      if (!symbol) return null;
      const hist = await fetchHistorical(symbol);
      return computeTechnicalLevels(hist);
    },
    enabled: !!symbol,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}
