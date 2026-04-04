// Black-Scholes model for options pricing and Greeks calculation

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface BSInputs {
  S: number;   // Underlying price
  K: number;   // Strike price
  T: number;   // Time to expiry in years
  r: number;   // Risk-free rate (annual)
  sigma: number; // Implied volatility (annual)
  type: 'call' | 'put';
}

export interface BSResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  d1: number;
  d2: number;
}

export function blackScholes(inputs: BSInputs): BSResult {
  const { S, K, T, r, sigma, type } = inputs;

  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    const intrinsic = type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return {
      price: intrinsic,
      delta: type === 'call' ? (S > K ? 1 : 0) : S < K ? -1 : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      d1: 0,
      d2: 0,
    };
  }

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  let price: number;
  let delta: number;
  let rho: number;

  if (type === 'call') {
    price = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
    delta = normalCDF(d1);
    rho = K * T * Math.exp(-r * T) * normalCDF(d2) / 100;
  } else {
    price = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
    delta = normalCDF(d1) - 1;
    rho = -K * T * Math.exp(-r * T) * normalCDF(-d2) / 100;
  }

  const gamma = normalPDF(d1) / (S * sigma * Math.sqrt(T));
  const vega = S * normalPDF(d1) * Math.sqrt(T) / 100;
  const theta =
    (-S * normalPDF(d1) * sigma / (2 * Math.sqrt(T)) -
      r * K * Math.exp(-r * T) * (type === 'call' ? normalCDF(d2) : normalCDF(-d2))) /
    365;

  return { price, delta, gamma, theta, vega, rho, d1, d2 };
}

export function daysToYears(days: number): number {
  return days / 365;
}

// Compute implied volatility from market price using Newton-Raphson with bisection fallback
export function impliedVolatility(
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  type: 'call' | 'put'
): number | null {
  if (T <= 0 || marketPrice <= 0) return null;

  const intrinsic = type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
  if (marketPrice < intrinsic) return null;

  // Newton-Raphson
  let sigma = 0.3; // initial guess
  for (let i = 0; i < 10; i++) {
    const result = blackScholes({ S, K, T, r, sigma, type });
    const diff = result.price - marketPrice;
    if (Math.abs(diff) < 0.0001) return sigma;
    const vegaVal = result.vega * 100; // un-normalize
    if (vegaVal < 1e-10) break;
    sigma -= diff / vegaVal;
    if (sigma <= 0) { sigma = 0.01; break; }
  }

  // Bisection fallback
  let lo = 0.001;
  let hi = 5.0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const result = blackScholes({ S, K, T, r, sigma: mid, type });
    const diff = result.price - marketPrice;
    if (Math.abs(diff) < 0.0001) return mid;
    if (diff > 0) hi = mid;
    else lo = mid;
  }

  return (lo + hi) / 2;
}

// Compute option price at a given DTE (for intermediate P&L curves)
export function optionPriceAtDTE(
  S: number,
  K: number,
  daysRemaining: number,
  iv: number,
  r: number,
  type: 'call' | 'put'
): number {
  return blackScholes({ S, K, T: daysToYears(daysRemaining), r, sigma: iv, type }).price;
}
