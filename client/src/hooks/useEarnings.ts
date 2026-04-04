import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { EarningsData } from '../types/market';
import { daysUntil } from '../utils/formatters';

export function useEarnings(symbol: string) {
  return useQuery<EarningsData>({
    queryKey: ['earnings', symbol],
    queryFn: async () => {
      const { data } = await api.get<EarningsData>(`/earnings/${symbol}`);
      if (data.earningsDate) {
        data.daysUntilEarnings = daysUntil(data.earningsDate);
      }
      return data;
    },
    enabled: !!symbol,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
