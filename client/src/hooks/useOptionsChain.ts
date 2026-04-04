import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { OptionsChain } from '../types/options';

export function useOptionsChain(symbol: string, expiration?: string) {
  return useQuery<OptionsChain>({
    queryKey: ['chain', symbol, expiration ?? 'all'],
    queryFn: async () => {
      const params = expiration ? { expiration } : {};
      const { data } = await api.get<OptionsChain>(`/chain/${symbol}`, { params });
      return data;
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
