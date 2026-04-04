import { TrendingUp, AlertTriangle } from 'lucide-react';
import { useMarketContext } from '../../hooks/useMarketContext';
import { Badge } from '../shared/Badge';
import { formatPrice, formatPercent } from '../../utils/formatters';

export function TopBar() {
  const { data: market, isLoading } = useMarketContext();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-terminal-surface/95 backdrop-blur border-b border-terminal-border h-12 flex items-center px-4 gap-4">
      <div className="flex items-center gap-2 mr-4">
        <TrendingUp className="w-5 h-5 text-terminal-blue" />
        <span className="text-sm font-bold text-terminal-text tracking-widest">OPTIONS PLANNER</span>
        <Badge variant="amber" className="text-xs hidden sm:inline-flex">PAPER DATA</Badge>
      </div>

      {!isLoading && market && (
        <div className="flex items-center gap-4 text-xs overflow-x-auto">
          <MarketTicker symbol="SPY" price={market.spy.price} changePercent={market.spy.changePercent} />
          <MarketTicker symbol="QQQ" price={market.qqq.price} changePercent={market.qqq.changePercent} />
          <VixIndicator price={market.vix.price} />
          <SignalBadge signal={market.signal} />
        </div>
      )}
    </header>
  );
}

function MarketTicker({ symbol, price, changePercent }: { symbol: string; price: number; changePercent: number }) {
  const isUp = changePercent >= 0;
  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <span className="text-terminal-dim">{symbol}</span>
      <span className="text-terminal-text font-medium">{formatPrice(price)}</span>
      <span className={isUp ? 'text-terminal-green' : 'text-terminal-red'}>
        {formatPercent(changePercent)}
      </span>
    </div>
  );
}

function VixIndicator({ price }: { price: number }) {
  const variant = price >= 30 ? 'red' : price >= 20 ? 'amber' : 'green';
  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <span className="text-terminal-dim">VIX</span>
      <Badge variant={variant}>{price.toFixed(2)}</Badge>
    </div>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  if (signal === 'favors_entries') {
    return <Badge variant="green" className="hidden md:inline-flex">Market: Favorable</Badge>;
  }
  if (signal === 'caution') {
    return (
      <Badge variant="red" className="hidden md:inline-flex">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Caution
      </Badge>
    );
  }
  return <Badge variant="dim" className="hidden md:inline-flex">Market: Neutral</Badge>;
}
