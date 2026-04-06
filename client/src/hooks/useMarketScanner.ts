import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface ScanResult {
  symbol: string;
  price: number;
  change: number;
  signal: 'long' | 'short' | 'neutral';
  strength: number;
  supertrend: 'long' | 'short';
  aboveEma45: boolean;
  ema45: number;
  atr: number;
  optionType: 'call' | 'put' | null;
  suggestedStrike: number | null;
  suggestedExpiry: string | null;
  entry: { stop: number; t1: number; t2: number } | null;
}

export function useMarketScanner(enabled = true) {
  return useQuery<ScanResult[]>({
    queryKey: ['scanner', 'market'],
    queryFn: async () => {
      const { data } = await api.get<ScanResult[]>('/scanner/market');
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: false, // manual only
    retry: 1,
  });
}
