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
  score?: number;
  warnings?: string[];
}

export interface OptionsChain {
  symbol: string;
  underlyingPrice: number;
  expirationDates: string[];
  calls: OptionContract[];
  puts: OptionContract[];
}

export interface ChainFilters {
  expirationDate: string;
  optionType: 'call' | 'put' | 'both';
  minDelta: number;
  maxDelta: number;
  minVolume: number;
  minOpenInterest: number;
  maxSpreadPercent: number;
}
