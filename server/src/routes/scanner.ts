import { Router, Request, Response, NextFunction } from 'express';
import { getQuote, getIntradayData, getOptionsChain } from '../services/yahooFinanceService';
import { getCacheOrFetch } from '../services/cacheService';
import { quotesLimiter } from '../middleware/rateLimit';

const router = Router();

// Tickers to scan
const WATCHLIST = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD', 'COIN', 'PLTR'];

function calcEMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) ema = values[i] * k + ema * (1 - k);
  return ema;
}

function calcATR(bars: any[], period = 14): number {
  if (bars.length < 2) return 0;
  const trs = bars.slice(1).map((b, i) => {
    const h = b.high, l = b.low, pc = bars[i].close;
    return Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  });
  if (trs.length < period) return trs.reduce((a, b) => a + b, 0) / trs.length;
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) atr = (atr * (period - 1) + trs[i]) / period;
  return atr;
}

function calcSuperTrend(bars: any[], period = 10, mult = 3): 'long' | 'short' {
  if (bars.length < period + 2) return 'neutral' as any;
  const atrs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const h = bars[i].high, l = bars[i].low, pc = bars[i - 1].close;
    atrs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let atr = atrs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < atrs.length; i++) atr = (atr * (period - 1) + atrs[i]) / period;

  let upper = 0, lower = 0, trend: 'long' | 'short' = 'long';
  for (let i = 1; i < bars.length; i++) {
    const hl2 = (bars[i].high + bars[i].low) / 2;
    const bu = hl2 + mult * atr;
    const bl = hl2 - mult * atr;
    upper = bu < upper || bars[i - 1].close > upper ? bu : upper;
    lower = bl > lower || bars[i - 1].close < lower ? bl : lower;
    if (trend === 'short' && bars[i].close > upper) trend = 'long';
    else if (trend === 'long' && bars[i].close < lower) trend = 'short';
  }
  return trend;
}

async function scanTicker(symbol: string) {
  try {
    const [quote, bars5m] = await Promise.all([
      getQuote(symbol),
      getIntradayData(symbol, '5m'),
    ]);

    const closes = bars5m.map((b) => b.close);
    const ema9 = calcEMA(closes, 9);
    const ema21 = calcEMA(closes, 21);
    const ema45 = calcEMA(closes, 45);
    const atr = calcATR(bars5m);
    const st = calcSuperTrend(bars5m);
    const price = quote.price;

    const aboveEma45 = price > ema45;
    const aboveEma9 = price > ema9;
    const aboveEma21 = price > ema21;

    let signal: 'long' | 'short' | 'neutral' = 'neutral';
    let strength = 0;
    if (st === 'long' && aboveEma45) { signal = 'long'; strength = (aboveEma9 ? 1 : 0) + (aboveEma21 ? 1 : 0) + 2; }
    else if (st === 'short' && !aboveEma45) { signal = 'short'; strength = (!aboveEma9 ? 1 : 0) + (!aboveEma21 ? 1 : 0) + 2; }

    // Get today/next expiry for option recommendation
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6;
    const weeklyExp = new Date(today);
    weeklyExp.setDate(today.getDate() + daysToFriday);
    const weeklyExpStr = weeklyExp.toISOString().split('T')[0];

    // Estimate ATM strike (round to nearest 5 for SPY, 1 for others)
    const step = symbol === 'SPY' || symbol === 'QQQ' ? 1 : 2.5;
    const atmStrike = Math.round(price / step) * step;

    const optionType = signal === 'long' ? 'call' : signal === 'short' ? 'put' : null;
    const entry = signal === 'long'
      ? { stop: price - atr * 1.5, t1: price + atr * 1.5, t2: price + atr * 3 }
      : signal === 'short'
      ? { stop: price + atr * 1.5, t1: price - atr * 1.5, t2: price - atr * 3 }
      : null;

    return {
      symbol,
      price,
      change: quote.changePercent,
      signal,
      strength,
      supertrend: st,
      aboveEma45,
      ema45: parseFloat(ema45.toFixed(2)),
      atr: parseFloat(atr.toFixed(2)),
      optionType,
      suggestedStrike: optionType ? atmStrike : null,
      suggestedExpiry: optionType ? (signal !== 'neutral' ? (daysToFriday === 0 ? '0DTE' : `Weekly ${weeklyExpStr}`) : null) : null,
      entry,
    };
  } catch {
    return null;
  }
}

router.get('/market', quotesLimiter, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const key = 'scanner:market';
    const results = await getCacheOrFetch(key, 300, async () => {
      // Scan sequentially with small delay to avoid rate limiting
      const results: any[] = [];
      for (const symbol of WATCHLIST) {
        const r = await scanTicker(symbol);
        if (r) results.push(r);
        await new Promise((res) => setTimeout(res, 400)); // 400ms between each
      }
      return results.sort((a, b) => b.strength - a.strength);
    });
    res.json(results);
  } catch (err) { next(err); }
});

export default router;
