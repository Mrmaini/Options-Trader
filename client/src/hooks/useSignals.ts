import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { computeSignals, type SignalResult, type IntradayBar } from '../utils/signals';

export function useSignals(symbol: string, interval: '5m' | '15m' | '1h' = '5m') {
  return useQuery<SignalResult | null>({
    queryKey: ['signals', symbol, interval],
    queryFn: async () => {
      const { data } = await api.get<IntradayBar[]>(`/market/intraday/${symbol}`, {
        params: { interval },
      });
      return computeSignals(data);
    },
    enabled: !!symbol,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    retry: 2,
  });
}
