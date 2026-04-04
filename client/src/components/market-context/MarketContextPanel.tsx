import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity } from 'lucide-react';
import { useMarketContext, useTickerContext } from '../../hooks/useMarketContext';
import { useEarnings } from '../../hooks/useEarnings';
import { useTradeSetupStore } from '../../store/tradeSetupStore';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Badge } from '../shared/Badge';
import { Spinner } from '../shared/Spinner';
import { formatPrice, formatPercent, formatDate } from '../../utils/formatters';
import type { TechnicalLevels } from '../../types/market';

export function MarketContextPanel() {
  const { ticker, holdingPeriod } = useTradeSetupStore();
  const { data: market, isLoading, error } = useMarketContext();
  const { data: tickerLevels } = useTickerContext(ticker);
  const { data: earnings } = useEarnings(ticker);

  if (isLoading) {
    return (
      <Card>
        <SectionHeader title="Market Context" icon={<TrendingUp className="w-4 h-4" />} />
        <div className="flex items-center justify-center py-12 gap-3">
          <Spinner />
          <span className="text-terminal-dim text-sm">Loading market data...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <SectionHeader title="Market Context" icon={<TrendingUp className="w-4 h-4" />} />
        <div className="flex items-center gap-2 p-3 bg-terminal-red/10 border border-terminal-red/30 rounded">
          <AlertTriangle className="w-4 h-4 text-terminal-red" />
          <p className="text-terminal-red text-xs">Failed to load market data: {error.message}</p>
        </div>
      </Card>
    );
  }

  if (!market) return null;

  const daysUntilEarnings = earnings?.daysUntilEarnings;
  const earningsWithin = daysUntilEarnings !== undefined && daysUntilEarnings >= 0 && daysUntilEarnings <= 45;

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader title="Market Context" icon={<TrendingUp className="w-4 h-4" />} />

        {/* Market Signal */}
        <div className={`mb-4 p-3 rounded border flex items-center gap-3 ${
          market.signal === 'favors_entries'
            ? 'bg-terminal-green/10 border-terminal-green/30'
            : market.signal === 'caution'
            ? 'bg-terminal-red/10 border-terminal-red/30'
            : 'bg-terminal-muted/30 border-terminal-border'
        }`}>
          {market.signal === 'favors_entries' && <TrendingUp className="w-5 h-5 text-terminal-green shrink-0" />}
          {market.signal === 'caution' && <AlertTriangle className="w-5 h-5 text-terminal-red shrink-0" />}
          {market.signal === 'neutral' && <Minus className="w-5 h-5 text-terminal-dim shrink-0" />}
          <div>
            <p className={`text-sm font-semibold ${
              market.signal === 'favors_entries' ? 'text-terminal-green'
              : market.signal === 'caution' ? 'text-terminal-red'
              : 'text-terminal-dim'
            }`}>
              {market.signal === 'favors_entries' ? 'Market Favors Entries'
               : market.signal === 'caution' ? 'Market Favors Caution'
               : 'Neutral Market'}
            </p>
            <p className="text-xs text-terminal-dim mt-0.5">
              Based on SPY/QQQ trend and VIX level
            </p>
          </div>
        </div>

        {/* SPY & QQQ */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <IndexCard symbol="SPY" quote={market.spy} levels={market.spyLevels} />
          <IndexCard symbol="QQQ" quote={market.qqq} levels={market.qqqLevels} />
        </div>

        {/* VIX */}
        <div className="mb-4">
          <VixGaugeCard vix={market.vix.price} ivRank={market.ivRank ?? 0} />
        </div>

        {/* Target ticker levels */}
        {ticker && tickerLevels && (
          <div className="mb-4">
            <p className="text-xs text-terminal-dim uppercase tracking-wide mb-2">{ticker} Technical Levels</p>
            <TechnicalLevelsGrid levels={tickerLevels} />
          </div>
        )}

        {/* Earnings Alert */}
        {ticker && earningsWithin && earnings?.earningsDate && (
          <div className="flex items-start gap-2 p-3 bg-terminal-amber/10 border border-terminal-amber/30 rounded">
            <AlertTriangle className="w-4 h-4 text-terminal-amber shrink-0 mt-0.5" />
            <div>
              <p className="text-terminal-amber text-xs font-semibold">Earnings Alert</p>
              <p className="text-xs text-terminal-dim mt-0.5">
                {ticker} reports earnings on {formatDate(earnings.earningsDate)}
                {daysUntilEarnings !== undefined && ` (${daysUntilEarnings} days)`}.
                This falls within your {holdingPeriod} holding period.
                Short-vega strategies face IV crush risk after the event.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function IndexCard({ symbol, quote, levels }: { symbol: string; quote: any; levels?: TechnicalLevels }) {
  const trend = levels?.trend ?? 'neutral';
  return (
    <div className="p-3 bg-terminal-muted/30 rounded border border-terminal-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-terminal-text">{symbol}</span>
        <TrendBadge trend={trend} />
      </div>
      <div className="text-sm font-bold">{formatPrice(quote.price)}</div>
      <div className={`text-xs ${quote.changePercent >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
        {formatPercent(quote.changePercent)}
      </div>
      {levels && (
        <div className="mt-2 space-y-0.5 text-[10px] text-terminal-dim">
          <EMARow label="9 EMA" value={levels.ema9} price={quote.price} />
          <EMARow label="21 EMA" value={levels.ema21} price={quote.price} />
          <EMARow label="50 EMA" value={levels.ema50} price={quote.price} />
          <EMARow label="200 EMA" value={levels.ema200} price={quote.price} />
        </div>
      )}
    </div>
  );
}

function EMARow({ label, value, price }: { label: string; value: number; price: number }) {
  const above = price > value;
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={above ? 'text-terminal-green' : 'text-terminal-red'}>
        {formatPrice(value)} {above ? '▲' : '▼'}
      </span>
    </div>
  );
}

function TrendBadge({ trend }: { trend: 'bullish' | 'bearish' | 'neutral' }) {
  if (trend === 'bullish') return <Badge variant="green"><TrendingUp className="w-3 h-3 mr-1" />Bull</Badge>;
  if (trend === 'bearish') return <Badge variant="red"><TrendingDown className="w-3 h-3 mr-1" />Bear</Badge>;
  return <Badge variant="dim"><Minus className="w-3 h-3 mr-1" />Neutral</Badge>;
}

function VixGaugeCard({ vix, ivRank }: { vix: number; ivRank: number }) {
  const variant = vix >= 30 ? 'red' : vix >= 20 ? 'amber' : 'green';
  const ivEnvLabel = ivRank >= 50 ? 'High IV' : ivRank >= 25 ? 'Normal IV' : 'Low IV';

  return (
    <div className="p-3 bg-terminal-muted/30 rounded border border-terminal-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-terminal-dim" />
          <span className="text-xs font-semibold text-terminal-text">Volatility</span>
        </div>
        <Badge variant={variant}>{ivEnvLabel}</Badge>
      </div>
      <div className="flex items-center gap-4">
        <div>
          <div className="text-[10px] text-terminal-dim">VIX Level</div>
          <div className={`text-lg font-bold ${variant === 'red' ? 'text-terminal-red' : variant === 'amber' ? 'text-terminal-amber' : 'text-terminal-green'}`}>
            {vix.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-terminal-dim">IV Rank (est.)</div>
          <div className="text-lg font-bold text-terminal-text">{ivRank}%</div>
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-terminal-dim mb-1">IV Rank Gauge</div>
          <div className="h-2 bg-terminal-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                ivRank >= 50 ? 'bg-terminal-red' : ivRank >= 25 ? 'bg-terminal-amber' : 'bg-terminal-green'
              }`}
              style={{ width: `${Math.min(ivRank, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-terminal-dim mt-0.5">
            <span>Low</span><span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TechnicalLevelsGrid({ levels }: { levels: TechnicalLevels }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="p-2 bg-terminal-muted/30 rounded border border-terminal-border">
        <div className="text-[10px] text-terminal-dim mb-1">ATR (14)</div>
        <div className="font-semibold">{formatPrice(levels.atr14)}</div>
      </div>
      <div className="p-2 bg-terminal-muted/30 rounded border border-terminal-border">
        <div className="text-[10px] text-terminal-dim mb-1">Trend</div>
        <TrendBadge trend={levels.trend} />
      </div>
      <div className="p-2 bg-terminal-muted/30 rounded border border-terminal-border">
        <div className="text-[10px] text-terminal-dim mb-1">Support (20d)</div>
        <div className="font-semibold text-terminal-green">{formatPrice(levels.support)}</div>
      </div>
      <div className="p-2 bg-terminal-muted/30 rounded border border-terminal-border">
        <div className="text-[10px] text-terminal-dim mb-1">Resistance (20d)</div>
        <div className="font-semibold text-terminal-red">{formatPrice(levels.resistance)}</div>
      </div>
    </div>
  );
}
