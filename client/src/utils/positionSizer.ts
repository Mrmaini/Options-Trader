export function calcMaxContracts(
  maxRiskDollar: number,
  premiumPerContract: number
): number {
  if (premiumPerContract <= 0) return 0;
  const costPerContract = premiumPerContract * 100;
  return Math.floor(maxRiskDollar / costPerContract);
}

export function calcRiskDollarFromPercent(accountSize: number, riskPercent: number): number {
  return accountSize * (riskPercent / 100);
}

export function calcPositionCost(contracts: number, premium: number): number {
  return contracts * premium * 100;
}
