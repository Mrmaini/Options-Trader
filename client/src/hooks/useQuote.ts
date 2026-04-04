import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { QuoteData } from '../types/market';

export function useQuote(symbol: string) {
  return useQuery<QuoteData>({
    queryKey: ['quotes', symbol],
    queryFn: async () => {
      const { data } = await api.get<QuoteData>(`/quotes/${symbol}`);
      return data;
    },
    enabled: !!symbol,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 2,
  });
}
