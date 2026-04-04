// SuperTrend and EMA signal calculations for intraday bars

export interface IntradayBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalResult {
  supertrend: 'long' | 'short' | 'neutral';
  supertrendValue: number;
  ema45: number;
  priceVsEma45: 'above' | 'below';
  overallSignal: 'long' | 'short' | 'neutral';
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  atr: number;
  lastBar: IntradayBar;
  reason: string;
}

function calcATR(bars: IntradayBar[], period: number): number[] {
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const h = bars[i].high, l = bars[i].low, pc = bars[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atrs: number[] = new Array(period).fill(0);
  if (trs.length < period) return atrs;
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  atrs[period] = atr;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    atrs.push(atr);
  }
  return atrs;
}

function calcEMA(values: number[], period: number): number[] {
  if (values.length < period) return values.map(() => 0);
  const k = 2 / (period + 1);
  const emas: number[] = new Array(period - 1).fill(0);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  emas.push(ema);
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    emas.push(ema);
  }
  return emas;
}

function calcSuperTrend(bars: IntradayBar[], period = 10, multiplier = 3): { trend: ('long' | 'short')[]; values: number[] } {
  const atrs = calcATR(bars, period);
  const trends: ('long' | 'short')[] = [];
  const values: number[] = [];

  let upperBand = 0, lowerBand = 0;
  let trend: 'long' | 'short' = 'long';

  for (let i = 0; i < bars.length; i++) {
    const atr = atrs[i] ?? atrs[atrs.length - 1];
    const hl2 = (bars[i].high + bars[i].low) / 2;
    const basicUpper = hl2 + multiplier * atr;
    const basicLower = hl2 - multiplier * atr;

    if (i === 0) {
      upperBand = basicUpper;
      lowerBand = basicLower;
      trends.push('long');
      values.push(lowerBand);
      continue;
    }

    const prevUpper = upperBand;
    const prevLower = lowerBand;

    upperBand = basicUpper < prevUpper || bars[i - 1].close > prevUpper ? basicUpper : prevUpper;
    lowerBand = basicLower > prevLower || bars[i - 1].close < prevLower ? basicLower : prevLower;

    if (trend === 'short' && bars[i].close > upperBand) trend = 'long';
    else if (trend === 'long' && bars[i].close < lowerBand) trend = 'short';

    trends.push(trend);
    values.push(trend === 'long' ? lowerBand : upperBand);
  }

  return { trend: trends, values };
}

export function computeSignals(bars: IntradayBar[]): SignalResult | null {
  if (bars.length < 50) return null;

  const closes = bars.map((b) => b.close);
  const { trend: stTrends, values: stValues } = calcSuperTrend(bars, 10, 3);
  const ema45Arr = calcEMA(closes, 45);

  const last = bars[bars.length - 1];
  const stSignal = stTrends[stTrends.length - 1];
  const stValue = stValues[stValues.length - 1];
  const ema45 = ema45Arr[ema45Arr.length - 1];
  const atrArr = calcATR(bars, 14);
  const atr = atrArr[atrArr.length - 1] ?? (last.high - last.low);

  const priceVsEma45: 'above' | 'below' = last.close > ema45 ? 'above' : 'below';

  // Confirm signal: SuperTrend AND price vs 45 EMA must agree
  let overallSignal: 'long' | 'short' | 'neutral' = 'neutral';
  if (stSignal === 'long' && priceVsEma45 === 'above') overallSignal = 'long';
  else if (stSignal === 'short' && priceVsEma45 === 'below') overallSignal = 'short';

  // Entry, stop, targets based on ATR
  let entryPrice = last.close;
  let stopLoss: number;
  let target1: number;
  let target2: number;
  let reason: string;

  if (overallSignal === 'long') {
    stopLoss = Math.min(stValue, last.low - atr * 0.5);
    target1 = entryPrice + (entryPrice - stopLoss) * 1.5;
    target2 = entryPrice + (entryPrice - stopLoss) * 3;
    reason = `SuperTrend bullish + price above 45 EMA (${ema45.toFixed(2)}). Entry above current candle high.`;
  } else if (overallSignal === 'short') {
    stopLoss = Math.max(stValue, last.high + atr * 0.5);
    target1 = entryPrice - (stopLoss - entryPrice) * 1.5;
    target2 = entryPrice - (stopLoss - entryPrice) * 3;
    reason = `SuperTrend bearish + price below 45 EMA (${ema45.toFixed(2)}). Entry below current candle low.`;
  } else {
    stopLoss = last.close - atr;
    target1 = last.close + atr * 1.5;
    target2 = last.close + atr * 3;
    reason = stSignal !== priceVsEma45.replace('above', 'long').replace('below', 'short') as any
      ? 'SuperTrend and 45 EMA conflict — no clear signal. Wait for alignment.'
      : 'Insufficient data for signal confirmation.';
  }

  return {
    supertrend: stSignal,
    supertrendValue: stValue,
    ema45,
    priceVsEma45,
    overallSignal,
    entryPrice,
    stopLoss,
    target1,
    target2,
    atr,
    lastBar: last,
    reason,
  };
}
