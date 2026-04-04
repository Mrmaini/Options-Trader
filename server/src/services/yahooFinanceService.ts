import axios from 'axios';
import { getCacheOrFetch, TTL } from './cacheService';

const YF1 = 'https://query1.finance.yahoo.com';
const YF2 = 'https://query2.finance.yahoo.com';

const http = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  },
});

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
}

function toISODate(ts: number): string {
  return new Date(ts * 1000).toISOString().split('T')[0];
}

function transformContract(raw: any, type: 'call' | 'put', expTs: number): OptionContract {
  const bid = raw.bid ?? 0;
  const ask = raw.ask ?? 0;
  return {
    contractSymbol: raw.contractSymbol ?? '',
    strike: raw.strike ?? 0,
    expiration: toISODate(expTs),
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
  };
}

export async function getQuote(symbol: string): Promise<QuoteData> {
  const key = `quote:${symbol.toUpperCase()}`;
  return getCacheOrFetch(key, TTL.QUOTE, async () => {
    const url = `${YF1}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const { data } = await http.get(url);
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error(`No quote data for ${symbol}`);
    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    return {
      symbol: symbol.toUpperCase(),
      price,
      previousClose: prevClose,
      change: price - prevClose,
      changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
      volume: meta.regularMarketVolume ?? 0,
      marketCap: meta.marketCap,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      regularMarketOpen: meta.regularMarketOpen,
    };
  });
}

export async function getOptionsChain(symbol: string, expiration?: string): Promise<OptionsChain> {
  const key = `chain:${symbol.toUpperCase()}:${expiration ?? 'all'}`;
  return getCacheOrFetch(key, TTL.CHAIN, async () => {
    let url = `${YF2}/v7/finance/options/${encodeURIComponent(symbol)}`;
    if (expiration) {
      const ts = Math.floor(new Date(expiration).getTime() / 1000);
      url += `?date=${ts}`;
    }
    const { data } = await http.get(url);
    const result = data?.optionChain?.result?.[0];
    if (!result) throw new Error(`No options data for ${symbol}`);

    const underlyingPrice = result.quote?.regularMarketPrice ?? 0;
    const expirationDates: string[] = (result.expirationDates ?? []).map(toISODate);

    const calls: OptionContract[] = [];
    const puts: OptionContract[] = [];

    for (const chain of result.options ?? []) {
      const expTs = chain.expirationDate;
      for (const c of chain.calls ?? []) calls.push(transformContract(c, 'call', expTs));
      for (const p of chain.puts ?? []) puts.push(transformContract(p, 'put', expTs));
    }

    return { symbol: symbol.toUpperCase(), underlyingPrice, expirationDates, calls, puts };
  });
}

export async function getMarketContext(): Promise<{ spy: QuoteData; qqq: QuoteData; vix: QuoteData }> {
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
    const url = `${YF1}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${period}`;
    const { data } = await http.get(url);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error(`No historical data for ${symbol}`);

    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    const highs: number[] = result.indicators?.quote?.[0]?.high ?? [];
    const lows: number[] = result.indicators?.quote?.[0]?.low ?? [];

    return timestamps.map((ts, i) => ({
      date: toISODate(ts),
      close: closes[i] ?? 0,
      high: highs[i] ?? 0,
      low: lows[i] ?? 0,
    })).filter((b) => b.close > 0);
  });
}

export interface IntradayBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getIntradayData(symbol: string, interval: '5m' | '15m' | '1h' = '5m'): Promise<IntradayBar[]> {
  const key = `intraday:${symbol.toUpperCase()}:${interval}`;
  return getCacheOrFetch(key, 60, async () => {
    const range = interval === '1h' ? '5d' : '2d';
    const url = `${YF1}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    const { data } = await http.get(url);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error(`No intraday data for ${symbol}`);

    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const opens: number[] = q.open ?? [];
    const highs: number[] = q.high ?? [];
    const lows: number[] = q.low ?? [];
    const closes: number[] = q.close ?? [];
    const volumes: number[] = q.volume ?? [];

    return timestamps.map((ts, i) => ({
      time: new Date(ts * 1000).toISOString(),
      open: opens[i] ?? 0,
      high: highs[i] ?? 0,
      low: lows[i] ?? 0,
      close: closes[i] ?? 0,
      volume: volumes[i] ?? 0,
    })).filter((b) => b.close > 0);
  });
}

export async function getEarnings(symbol: string): Promise<EarningsData> {
  const key = `earnings:${symbol.toUpperCase()}`;
  return getCacheOrFetch(key, TTL.EARNINGS, async () => {
    try {
      const url = `${YF2}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=calendarEvents`;
      const { data } = await http.get(url);
      const events = data?.quoteSummary?.result?.[0]?.calendarEvents;
      const dates: any[] = events?.earnings?.earningsDate ?? [];
      const earningsDate = dates.length > 0 ? toISODate(dates[0].raw) : undefined;
      return { symbol: symbol.toUpperCase(), earningsDate };
    } catch {
      return { symbol: symbol.toUpperCase() };
    }
  });
}
