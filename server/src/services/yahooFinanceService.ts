import { getCacheOrFetch, TTL } from './cacheService';

// yahoo-finance2 is ESM-only; use dynamic import for CommonJS compatibility
const yfPromise: Promise<any> = import('yahoo-finance2').then((m: any) => m.default ?? m);
async function yf() { return yfPromise; }

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

export interface OptionContract {
  contractSymbol: string;
  strike: number;
  expiration: string;
  type: 'call' | 'put';
  lastPrice: number;
  bid: number;
  ask: number;
  mid: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  inTheMoney: boolean;
  percentChange?: number;
  lastTradeDate?: string;
}

export interface OptionsChain {
  symbol: string;
  underlyingPrice: number;
  expirationDates: string[];
  calls: OptionContract[];
  puts: OptionContract[];
}

export interface EarningsData {
  symbol: string;
  earningsDate?: string;
  earningsDateFormatted?: string;
}

function transformOption(raw: any, type: 'call' | 'put', expiration: string): OptionContract {
  const bid = raw.bid ?? 0;
  const ask = raw.ask ?? 0;
  return {
    contractSymbol: raw.contractSymbol ?? '',
    strike: raw.strike ?? 0,
    expiration,
    type,
    lastPrice: raw.lastPrice ?? 0,
    bid,
    ask,
    mid: parseFloat(((bid + ask) / 2).toFixed(2)),
    volume: raw.volume ?? 0,
    openInterest: raw.openInterest ?? 0,
    impliedVolatility: raw.impliedVolatility ?? 0,
    inTheMoney: raw.inTheMoney ?? false,
    percentChange: raw.percentChange,
    lastTradeDate: raw.lastTradeDate ? new Date(raw.lastTradeDate).toISOString() : undefined,
  };
}

export async function getQuote(symbol: string): Promise<QuoteData> {
  const key = `quote:${symbol.toUpperCase()}`;
  return getCacheOrFetch(key, TTL.QUOTE, async () => {
    const result = await (await yf()).quote(symbol.toUpperCase());
    return {
      symbol: result.symbol,
      price: result.regularMarketPrice ?? 0,
      previousClose: result.regularMarketPreviousClose ?? 0,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      volume: result.regularMarketVolume ?? 0,
      marketCap: result.marketCap,
      fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: result.fiftyTwoWeekLow,
      regularMarketOpen: result.regularMarketOpen,
      bid: result.bid,
      ask: result.ask,
    };
  });
}

export async function getOptionsChain(symbol: string, expiration?: string): Promise<OptionsChain> {
  const key = `chain:${symbol.toUpperCase()}:${expiration ?? 'all'}`;
  return getCacheOrFetch(key, TTL.CHAIN, async () => {
    const options: any = {};
    if (expiration) options.date = new Date(expiration);

    const result = await (await yf()).options(symbol.toUpperCase(), options);
    const underlyingPrice = result.quote?.regularMarketPrice ?? 0;
    const expirationDates = (result.expirationDates ?? []).map((d: Date | number) =>
      new Date(d).toISOString().split('T')[0]
    );

    const calls: OptionContract[] = [];
    const puts: OptionContract[] = [];

    for (const chain of result.options ?? []) {
      const exp = new Date(chain.expirationDate).toISOString().split('T')[0];
      for (const c of chain.calls ?? []) calls.push(transformOption(c, 'call', exp));
      for (const p of chain.puts ?? []) puts.push(transformOption(p, 'put', exp));
    }

    return { symbol: symbol.toUpperCase(), underlyingPrice, expirationDates, calls, puts };
  });
}

export async function getMarketContext(): Promise<{
  spy: QuoteData;
  qqq: QuoteData;
  vix: QuoteData;
}> {
  const key = 'market:context';
  return getCacheOrFetch(key, TTL.MARKET, async () => {
    const [spy, qqq, vix] = await Promise.all([
      getQuote('SPY'),
      getQuote('QQQ'),
      getQuote('^VIX'),
    ]);
    return { spy, qqq, vix };
  });
}

export async function getHistoricalData(symbol: string, period: '1mo' | '3mo' | '6mo' | '1y' = '3mo'): Promise<{ date: string; close: number; high: number; low: number }[]> {
  const key = `historical:${symbol.toUpperCase()}:${period}`;
  return getCacheOrFetch(key, TTL.CHAIN, async () => {
    const endDate = new Date();
    const startDate = new Date();
    const months = period === '1mo' ? 1 : period === '3mo' ? 3 : period === '6mo' ? 6 : 12;
    startDate.setMonth(startDate.getMonth() - months);

    const result = await (await yf()).historical(symbol.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    });

    return result.map((r: any) => ({
      date: new Date(r.date).toISOString().split('T')[0],
      close: r.close ?? 0,
      high: r.high ?? 0,
      low: r.low ?? 0,
    }));
  });
}

export async function getEarnings(symbol: string): Promise<EarningsData> {
  const key = `earnings:${symbol.toUpperCase()}`;
  return getCacheOrFetch(key, TTL.EARNINGS, async () => {
    try {
      const result = await (await yf()).quoteSummary(symbol.toUpperCase(), {
        modules: ['calendarEvents'],
      });
      const events = (result as any).calendarEvents;
      const earningsDates = events?.earnings?.earningsDate;
      let earningsDate: string | undefined;
      if (earningsDates && earningsDates.length > 0) {
        const d = earningsDates[0];
        earningsDate = new Date(d).toISOString().split('T')[0];
      }
      return { symbol: symbol.toUpperCase(), earningsDate };
    } catch {
      return { symbol: symbol.toUpperCase() };
    }
  });
}
