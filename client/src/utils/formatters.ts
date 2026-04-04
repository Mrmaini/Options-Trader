export function formatCurrency(value: number, decimals: number = 2): string {
  if (!isFinite(value)) return value > 0 ? '+∞' : '-∞';
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function formatPercent(value: number, decimals: number = 2): string {
  if (!isFinite(value)) return value > 0 ? '+∞%' : '-∞%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDelta(delta: number): string {
  return delta.toFixed(2);
}

export function formatGreek(value: number, decimals: number = 4): string {
  return value.toFixed(decimals);
}

export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatRR(ratio: number | null): string {
  if (ratio === null) return 'N/A';
  return `1:${ratio.toFixed(1)}`;
}

export function formatWinRate(rate: number | null): string {
  if (rate === null) return 'N/A';
  return `${(rate * 100).toFixed(0)}%`;
}

export function spreadPercent(bid: number, ask: number): number {
  if (bid + ask === 0) return 0;
  return ((ask - bid) / ((bid + ask) / 2)) * 100;
}
