export interface QuoteData {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketOpen?: number;
  bid?: number;
  ask?: number;
}

export interface HistoricalBar {
  date: string;
  close: number;
  high: number;
  low: number;
}

export interface TechnicalLevels {
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  atr14: number;
  support: number;
  resistance: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface MarketContext {
  spy: QuoteData;
  qqq: QuoteData;
  vix: QuoteData;
  spyLevels?: TechnicalLevels;
  qqqLevels?: TechnicalLevels;
  targetLevels?: TechnicalLevels;
  ivRank?: number;
  ivPercentile?: number;
  signal: 'favors_entries' | 'caution' | 'neutral';
}

export interface EarningsData {
  symbol: string;
  earningsDate?: string;
  earningsDateFormatted?: string;
  daysUntilEarnings?: number;
}
