import type { TradeLeg, PnLPoint } from '../types/trade';
import { optionPriceAtDTE, daysToYears } from './blackScholes';

export function calcPnLAtExpiry(legs: TradeLeg[], underlyingPrice: number): number {
  return legs.reduce((total, leg) => {
    const intrinsic =
      leg.type === 'call'
        ? Math.max(underlyingPrice - leg.strike, 0)
        : Math.max(leg.strike - underlyingPrice, 0);
    const legPnL = (leg.action === 'buy' ? 1 : -1) * (intrinsic - leg.premium) * 100 * leg.quantity;
    return total + legPnL;
  }, 0);
}

export function calcPnLAtDTE(
  legs: TradeLeg[],
  underlyingPrice: number,
  daysRemaining: number,
  riskFreeRate: number = 0.05
): number {
  return legs.reduce((total, leg) => {
    const daysToExp = Math.max(
      0,
      (new Date(leg.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const targetDays = Math.min(daysRemaining, daysToExp);
    const iv = leg.impliedVolatility ?? 0.3;

    let currentPrice: number;
    if (targetDays <= 0) {
      currentPrice = leg.type === 'call'
        ? Math.max(underlyingPrice - leg.strike, 0)
        : Math.max(leg.strike - underlyingPrice, 0);
    } else {
      currentPrice = optionPriceAtDTE(
        underlyingPrice,
        leg.strike,
        targetDays,
        iv,
        riskFreeRate,
        leg.type
      );
    }

    const legPnL = (leg.action === 'buy' ? 1 : -1) * (currentPrice - leg.premium) * 100 * leg.quantity;
    return total + legPnL;
  }, 0);
}

export function generatePnLCurve(
  legs: TradeLeg[],
  currentPrice: number,
  daysRemaining?: number
): PnLPoint[] {
  if (legs.length === 0) return [];

  const range = currentPrice * 0.4;
  const minPrice = Math.max(0.01, currentPrice - range);
  const maxPrice = currentPrice + range;
  const steps = 200;
  const stepSize = (maxPrice - minPrice) / steps;

  const points: PnLPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const price = minPrice + i * stepSize;
    const pnl = calcPnLAtExpiry(legs, price);
    const point: PnLPoint = { price: parseFloat(price.toFixed(2)), pnl: parseFloat(pnl.toFixed(2)) };

    if (daysRemaining !== undefined && daysRemaining > 0) {
      point.pnlAtDTE = parseFloat(calcPnLAtDTE(legs, price, daysRemaining).toFixed(2));
    }

    points.push(point);
  }

  return points;
}

export function calcRiskMetrics(legs: TradeLeg[]): {
  maxLoss: number;
  maxGain: number | null;
  breakevens: number[];
  netPremium: number;
  totalDebit: number;
  totalCredit: number;
} {
  const totalDebit = legs.reduce(
    (sum, l) => sum + (l.action === 'buy' ? l.premium * 100 * l.quantity : 0),
    0
  );
  const totalCredit = legs.reduce(
    (sum, l) => sum + (l.action === 'sell' ? l.premium * 100 * l.quantity : 0),
    0
  );
  const netPremium = totalDebit - totalCredit;

  // Sample P&L across a wide range to find max/min
  const strikes = legs.map((l) => l.strike);
  const minStrike = Math.min(...strikes);
  const maxStrike = Math.max(...strikes);
  const testPrices: number[] = [];

  // Test at 0, near min/max strikes, and a wide range
  for (let p = Math.max(0.01, minStrike * 0.5); p <= maxStrike * 1.5; p += (maxStrike - minStrike) * 0.01 || 0.5) {
    testPrices.push(p);
  }
  testPrices.push(0.01, minStrike * 0.01, ...strikes, maxStrike * 2, maxStrike * 10);

  const pnls = testPrices.map((p) => calcPnLAtExpiry(legs, p));
  const maxGainRaw = Math.max(...pnls);
  const maxLossRaw = Math.min(...pnls);

  // Find breakevens (sign changes)
  const breakevens: number[] = [];
  for (let i = 1; i < testPrices.length; i++) {
    if (pnls[i - 1] * pnls[i] < 0) {
      // Linear interpolation
      const be =
        testPrices[i - 1] +
        ((testPrices[i] - testPrices[i - 1]) * (-pnls[i - 1])) /
          (pnls[i] - pnls[i - 1]);
      breakevens.push(parseFloat(be.toFixed(2)));
    }
  }

  // Determine if loss or gain is theoretically unlimited
  const isUnlimitedLoss = maxLossRaw < -100000 || legs.some(l => l.action === 'sell' && !legs.some(l2 => l2.action === 'buy' && l2.type === l.type && l2.strike > l.strike));
  const isUnlimitedGain = maxGainRaw > 100000;

  return {
    maxLoss: isUnlimitedLoss ? -Infinity : maxLossRaw,
    maxGain: isUnlimitedGain ? null : maxGainRaw,
    breakevens: [...new Set(breakevens)].sort((a, b) => a - b),
    netPremium,
    totalDebit,
    totalCredit,
  };
}

export function calcRequiredWinRate(maxLoss: number, maxGain: number | null): number | null {
  if (maxGain === null || maxLoss === 0) return null;
  const loss = Math.abs(maxLoss);
  if (loss + maxGain === 0) return null;
  return loss / (loss + maxGain);
}
