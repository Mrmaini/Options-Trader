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
    params: { period: '1y' },
  });
  return data;
}

function calcIVEnvironment(vixPrice: number): { ivRank: number; ivPercentile: number } {
  // Rough approximation: VIX 12-15 = low, 15-25 = normal, 25+ = high
  // Map VIX to an IV rank 0-100
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
      const [{ data: raw }, spyHist, qqqHist] = await Promise.all([
        api.get<RawMarketContext>('/market/context'),
        fetchHistorical('SPY'),
        fetchHistorical('QQQ'),
      ]);

      const spyLevels = computeTechnicalLevels(spyHist);
      const qqqLevels = computeTechnicalLevels(qqqHist);
      const { ivRank, ivPercentile } = calcIVEnvironment(raw.vix.price);
      const signal = calcSignal(spyLevels, qqqLevels, raw.vix.price);

      return {
        ...raw,
        spyLevels,
        qqqLevels,
        ivRank,
        ivPercentile,
        signal,
      };
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    retry: 2,
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
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
