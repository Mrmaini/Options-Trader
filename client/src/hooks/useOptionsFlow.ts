import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface FlowItem {
  contractSymbol: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  bid: number;
  ask: number;
  mid: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  volOiRatio: number;
  dollarFlow: number;
  spreadPct: number;
  unusual: boolean;
  sentiment: 'bullish' | 'bearish';
}

export interface FlowData {
  symbol: string;
  underlyingPrice: number;
  totalCallFlow: number;
  totalPutFlow: number;
  putCallRatio: number;
  flowSentiment: 'bullish' | 'bearish' | 'neutral';
  flows: FlowItem[];
}

export function useOptionsFlow(symbol: string, enabled = true) {
  return useQuery<FlowData>({
    queryKey: ['flow', symbol],
    queryFn: async () => {
      const { data } = await api.get<FlowData>(`/flow/${symbol}`);
      return data;
    },
    enabled: !!symbol && enabled,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}
