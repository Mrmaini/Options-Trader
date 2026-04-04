import axios, { AxiosInstance } from 'axios';
import { getCacheOrFetch, TTL } from './cacheService';

const YF1 = 'https://query1.finance.yahoo.com';
const YF2 = 'https://query2.finance.yahoo.com';

// ---------- Session / crumb management ----------
let _crumb: string | null = null;
let _cookies: string = '';
let _sessionRefreshedAt = 0;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const rawHttp: AxiosInstance = axios.create({ timeout: 12000, headers: { 'User-Agent': UA } });

async function refreshSession(): Promise<void> {
  // 1. Hit chart endpoint to receive session cookies
  const r1 = await rawHttp.get(`${YF2}/v8/finance/chart/SPY?interval=1d&range=1d`);
  const setCookies: string[] = (r1.headers['set-cookie'] as string[] | undefined) ?? [];
  _cookies = setCookies.map((c) => c.split(';')[0]).join('; ');

  // 2. Exchange cookies for crumb
  const r2 = await rawHttp.get(`${YF2}/v1/test/getcrumb`, {
    headers: { Cookie: _cookies },
  });
  _crumb = typeof r2.data === 'string' ? r2.data.trim() : null;
  _sessionRefreshedAt = Date.now();
  console.log('[YF] Session refreshed, crumb:', _crumb ? _crumb.slice(0, 8) + '…' : 'null');
}

async function http_get(url: string): Promise<any> {
  // Refresh session if older than 30 minutes or not yet set
  if (!_crumb || Date.now() - _sessionRefreshedAt > 30 * 60 * 1000) {
    await refreshSession();
  }
  const sep = url.includes('?') ? '&' : '?';
  const finalUrl = _crumb ? `${url}${sep}crumb=${encodeURIComponent(_crumb)}` : url;
  const resp = await rawHttp.get(finalUrl, { headers: { Cookie: _cookies } });
  return resp.data;
}

// ---------- Interfaces ----------
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

export interface EarningsData { symbol: string; earningsDate?: string; }
export interface IntradayBar { time: string; open: number; high: number; low: number; close: number; volume: number; }

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
    bid, ask,
    mid: parseFloat(((bid + ask) / 2).toFixed(2)),
    volume: raw.volume ?? 0,
    openInterest: raw.openInterest ?? 0,
    impliedVolatility: raw.impliedVolatility ?? 0,
    inTheMoney: raw.inTheMoney ?? false,
    percentChange: raw.percentChange,
  };
}

// ---------- Public API ----------
export async function getQuote(symbol: string): Promise<QuoteData> {
  const key = `quote:${symbol.toUpperCase()}`;
  return getCacheOrFetch(key, TTL.QUOTE, async () => {
    const data = await http_get(`${YF1}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`);
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error(`No quote data for ${symbol}`);
    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    return {
      symbol: symbol.toUpperCase(), price, previousClose: prevClose,
      change: price - prevClose,
      changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
      volume: meta.regularMarketVolume ?? 0,
      marketCap: meta.marketCap, fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow, regularMarketOpen: meta.regularMarketOpen,
    };
  });
}

export async function getOptionsChain(symbol: string, expiration?: string): Promise<OptionsChain> {
  const key = `chain:${symbol.toUpperCase()}:${expiration ?? 'all'}`;
  return getCacheOrFetch(key, TTL.CHAIN, async () => {
    let url = `${YF2}/v7/finance/options/${encodeURIComponent(symbol)}`;
    if (expiration) url += `?date=${Math.floor(new Date(expiration).getTime() / 1000)}`;
    const data = await http_get(url);
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
    const [spy, qqq, vix] = await Promise.all([getQuote('SPY'), getQuote('QQQ'), getQuote('^VIX')]);
    return { spy, qqq, vix };
  });
}

export async function getHistoricalData(symbol: string, period: '1mo' | '3mo' | '6mo' | '1y' = '3mo'): Promise<{ date: string; close: number; high: number; low: number }[]> {
  const key = `historical:${symbol.toUpperCase()}:${period}`;
  return getCacheOrFetch(key, TTL.CHAIN, async () => {
    const data = await http_get(`${YF1}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${period}`);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error(`No historical data for ${symbol}`);
    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    return timestamps.map((ts, i) => ({
      date: toISODate(ts), close: q.close?.[i] ?? 0, high: q.high?.[i] ?? 0, low: q.low?.[i] ?? 0,
    })).filter((b) => b.close > 0);
  });
}

export async function getIntradayData(symbol: string, interval: '5m' | '15m' | '1h' = '5m'): Promise<IntradayBar[]> {
  const key = `intraday:${symbol.toUpperCase()}:${interval}`;
  return getCacheOrFetch(key, 60, async () => {
    const range = interval === '1h' ? '5d' : '2d';
    const data = await http_get(`${YF1}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error(`No intraday data for ${symbol}`);
    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    return timestamps.map((ts, i) => ({
      time: new Date(ts * 1000).toISOString(),
      open: q.open?.[i] ?? 0, high: q.high?.[i] ?? 0, low: q.low?.[i] ?? 0,
      close: q.close?.[i] ?? 0, volume: q.volume?.[i] ?? 0,
    })).filter((b) => b.close > 0);
  });
}

export async function getEarnings(symbol: string): Promise<EarningsData> {
  const key = `earnings:${symbol.toUpperCase()}`;
  return getCacheOrFetch(key, TTL.EARNINGS, async () => {
    try {
      const data = await http_get(`${YF2}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=calendarEvents`);
      const events = data?.quoteSummary?.result?.[0]?.calendarEvents;
      const dates: any[] = events?.earnings?.earningsDate ?? [];
      return { symbol: symbol.toUpperCase(), earningsDate: dates.length > 0 ? toISODate(dates[0].raw) : undefined };
    } catch { return { symbol: symbol.toUpperCase() }; }
  });
}
