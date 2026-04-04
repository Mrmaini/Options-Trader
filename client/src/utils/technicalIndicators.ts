import type { HistoricalBar, TechnicalLevels } from '../types/market';

export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const emas: number[] = [];
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  emas.push(ema);
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    emas.push(ema);
  }
  return emas;
}

export function calculateATR(bars: HistoricalBar[], period: number = 14): number {
  if (bars.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  if (trs.length < period) return trs.reduce((a, b) => a + b, 0) / trs.length;
  // Wilder's smoothing
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

export function findSupportResistance(bars: HistoricalBar[], lookback: number = 20): { support: number; resistance: number } {
  const recent = bars.slice(-lookback);
  const highs = recent.map((b) => b.high);
  const lows = recent.map((b) => b.low);
  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
  };
}

export function computeTechnicalLevels(bars: HistoricalBar[]): TechnicalLevels {
  const closes = bars.map((b) => b.close);
  const currentPrice = closes[closes.length - 1];

  const ema9Arr = calculateEMA(closes, 9);
  const ema21Arr = calculateEMA(closes, 21);
  const ema50Arr = calculateEMA(closes, 50);
  const ema200Arr = calculateEMA(closes, 200);

  const ema9 = ema9Arr[ema9Arr.length - 1] ?? currentPrice;
  const ema21 = ema21Arr[ema21Arr.length - 1] ?? currentPrice;
  const ema50 = ema50Arr[ema50Arr.length - 1] ?? currentPrice;
  const ema200 = ema200Arr[ema200Arr.length - 1] ?? currentPrice;
  const atr14 = calculateATR(bars);
  const { support, resistance } = findSupportResistance(bars);

  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  const bullishSignals = [currentPrice > ema9, currentPrice > ema21, currentPrice > ema50, currentPrice > ema200].filter(Boolean).length;
  if (bullishSignals >= 3) trend = 'bullish';
  else if (bullishSignals <= 1) trend = 'bearish';

  return { ema9, ema21, ema50, ema200, atr14, support, resistance, trend };
}
