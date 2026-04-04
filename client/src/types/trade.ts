export type DirectionalBias = 'bullish' | 'bearish' | 'neutral';
export type HoldingPeriod = '0dte' | 'weekly' | 'monthly' | 'leap';
export type OptionType = 'call' | 'put';
export type StrategyType =
  | 'long_call'
  | 'long_put'
  | 'call_debit_spread'
  | 'put_debit_spread'
  | 'bull_put_spread'
  | 'bear_call_spread'
  | 'iron_condor'
  | 'short_strangle'
  | 'long_strangle'
  | 'long_straddle'
  | 'calendar_spread';

export interface TradeSetup {
  ticker: string;
  bias: DirectionalBias;
  accountSize: number;
  maxRiskDollar: number;
  maxRiskPercent: number;
  usePercentRisk: boolean;
  holdingPeriod: HoldingPeriod;
  targetRR: number;
}

export interface TradeLeg {
  id: string;
  type: OptionType;
  action: 'buy' | 'sell';
  strike: number;
  expiration: string;
  premium: number;
  quantity: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  impliedVolatility?: number;
  contractSymbol?: string;
}

export interface RiskMetrics {
  maxLoss: number;
  maxGain: number | null;
  breakevens: number[];
  riskRewardRatio: number | null;
  requiredWinRate: number | null;
  totalDebit: number;
  totalCredit: number;
  netPremium: number;
}

export interface PnLPoint {
  price: number;
  pnl: number;
  pnlAtDTE?: number;
}

export interface TradePlan {
  ticker: string;
  underlyingPrice: number;
  strategy: string;
  legs: TradeLeg[];
  entryPrice: number;
  stopLossPrice: number;
  stopLossPercent: number;
  target1: number;
  target1Percent: number;
  target2?: number;
  target2Percent?: number;
  maxPositionSize: number;
  maxRiskDollar: number;
  riskMetrics: RiskMetrics;
  greeks: { delta: number; gamma: number; theta: number; vega: number };
  notes: string;
  generatedAt: string;
}
