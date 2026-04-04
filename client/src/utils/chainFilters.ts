import type { OptionContract, ChainFilters } from '../types/options';
import { spreadPercent } from './formatters';

export function filterChain(contracts: OptionContract[], filters: ChainFilters): OptionContract[] {
  return contracts.filter((c) => {
    if (filters.expirationDate && c.expiration !== filters.expirationDate) return false;
    const delta = Math.abs(c.delta ?? 0.5);
    if (delta < filters.minDelta || delta > filters.maxDelta) return false;
    if (c.volume < filters.minVolume) return false;
    if (c.openInterest < filters.minOpenInterest) return false;
    const spread = spreadPercent(c.bid, c.ask);
    if (spread > filters.maxSpreadPercent) return false;
    return true;
  });
}

export function scoreContract(
  contract: OptionContract,
  bias: 'bullish' | 'bearish' | 'neutral',
  targetRR: number
): { score: number; warnings: string[] } {
  const warnings: string[] = [];
  let score = 100;

  // Liquidity checks
  const spread = spreadPercent(contract.bid, contract.ask);
  if (spread > 20) { warnings.push('Wide bid-ask spread'); score -= 20; }
  else if (spread > 10) { warnings.push('Moderate spread'); score -= 10; }

  if (contract.volume < 10) { warnings.push('Low volume'); score -= 20; }
  else if (contract.volume < 100) { warnings.push('Moderate volume'); score -= 10; }

  if (contract.openInterest < 100) { warnings.push('Low open interest'); score -= 15; }

  // Delta targeting: ideally 0.3-0.5 for single-leg trades
  const delta = Math.abs(contract.delta ?? (contract.inTheMoney ? 0.7 : 0.3));
  if (delta < 0.2) { score -= 15; }
  else if (delta > 0.7) { score -= 10; }
  else if (delta >= 0.3 && delta <= 0.5) { score += 10; }

  // IV assessment
  if (contract.impliedVolatility > 1.5) { warnings.push('Very high IV (>150%)'); score -= 10; }

  return { score: Math.max(0, score), warnings };
}

export function getRecommendedContracts(
  contracts: OptionContract[],
  bias: 'bullish' | 'bearish' | 'neutral',
  targetRR: number
): OptionContract[] {
  const scored = contracts.map((c) => {
    const { score, warnings } = scoreContract(c, bias, targetRR);
    return { ...c, score, warnings };
  });

  return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5);
}
