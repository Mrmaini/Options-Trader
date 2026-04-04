import { useState, useCallback } from 'react';
import { Search, DollarSign, Percent, Clock, TrendingUp } from 'lucide-react';
import { useTradeSetupStore } from '../../store/tradeSetupStore';
import { useQuote } from '../../hooks/useQuote';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Badge } from '../shared/Badge';
import { Spinner } from '../shared/Spinner';
import { formatPrice, formatPercent } from '../../utils/formatters';
import type { DirectionalBias, HoldingPeriod } from '../../types/trade';

const BIAS_OPTIONS: { value: DirectionalBias; label: string; color: string }[] = [
  { value: 'bullish', label: 'Bullish', color: 'text-terminal-green' },
  { value: 'bearish', label: 'Bearish', color: 'text-terminal-red' },
  { value: 'neutral', label: 'Neutral', color: 'text-terminal-amber' },
];

const PERIOD_OPTIONS: { value: HoldingPeriod; label: string; desc: string }[] = [
  { value: '0dte', label: '0DTE', desc: 'Same day' },
  { value: 'weekly', label: 'Weekly', desc: '1-7 days' },
  { value: 'monthly', label: 'Monthly', desc: '2-6 weeks' },
  { value: 'leap', label: 'LEAP', desc: '6mo+' },
];

export function TradeSetupForm() {
  const store = useTradeSetupStore();
  const [tickerInput, setTickerInput] = useState(store.ticker);
  const [submittedTicker, setSubmittedTicker] = useState(store.ticker);

  const { data: quote, isLoading, error } = useQuote(submittedTicker);

  const handleTickerSubmit = useCallback(() => {
    const t = tickerInput.trim().toUpperCase();
    if (!t) return;
    setSubmittedTicker(t);
    store.setTicker(t);
  }, [tickerInput, store]);

  const effectiveRisk = store.usePercentRisk
    ? (store.accountSize * store.maxRiskPercent) / 100
    : store.maxRiskDollar;

  return (
    <Card>
      <SectionHeader title="Trade Setup" icon={<TrendingUp className="w-4 h-4" />} />

      {/* Ticker Input */}
      <div className="mb-4">
        <label className="block text-xs text-terminal-dim mb-1">Ticker Symbol</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleTickerSubmit()}
            placeholder="AAPL, TSLA, SPY..."
            className="terminal-input flex-1 uppercase"
            maxLength={10}
          />
          <button
            onClick={handleTickerSubmit}
            disabled={isLoading}
            className="terminal-btn-primary flex items-center gap-1"
          >
            {isLoading ? <Spinner size="sm" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {quote && (
          <div className="mt-2 flex items-center gap-3 p-2 rounded bg-terminal-muted/50 border border-terminal-border">
            <span className="text-sm font-bold text-terminal-text">{quote.symbol}</span>
            <span className="text-sm font-semibold">{formatPrice(quote.price)}</span>
            <span className={quote.changePercent >= 0 ? 'text-terminal-green text-xs' : 'text-terminal-red text-xs'}>
              {formatPercent(quote.changePercent)}
            </span>
            <span className="text-terminal-dim text-xs ml-auto">
              Vol: {(quote.volume / 1000).toFixed(0)}K
            </span>
          </div>
        )}

        {error && (
          <p className="mt-1 text-xs text-terminal-red">Could not load quote. Check ticker or API availability.</p>
        )}
      </div>

      {/* Directional Bias */}
      <div className="mb-4">
        <label className="block text-xs text-terminal-dim mb-1">Directional Bias</label>
        <div className="flex gap-2">
          {BIAS_OPTIONS.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => store.setBias(value)}
              className={`flex-1 py-2 px-3 rounded border text-xs font-medium transition-all duration-150 ${
                store.bias === value
                  ? `${color} border-current bg-current/10`
                  : 'text-terminal-dim border-terminal-border hover:border-terminal-muted hover:text-terminal-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Account Size & Risk */}
      <div className="mb-4 space-y-2">
        <label className="block text-xs text-terminal-dim">Account & Risk</label>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-terminal-dim" />
            <input
              type="number"
              value={store.accountSize}
              onChange={(e) => store.setAccountSize(Number(e.target.value))}
              placeholder="Account size"
              className="terminal-input w-full pl-7"
            />
          </div>
          <span className="text-terminal-dim text-xs">acct</span>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => store.setUsePercentRisk(true)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${store.usePercentRisk ? 'text-terminal-blue border-terminal-blue/40 bg-terminal-blue/10' : 'text-terminal-dim border-terminal-border'}`}
          >
            %
          </button>
          <button
            onClick={() => store.setUsePercentRisk(false)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${!store.usePercentRisk ? 'text-terminal-blue border-terminal-blue/40 bg-terminal-blue/10' : 'text-terminal-dim border-terminal-border'}`}
          >
            $
          </button>
          <div className="relative flex-1">
            {store.usePercentRisk ? (
              <><Percent className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-terminal-dim" />
              <input
                type="number"
                value={store.maxRiskPercent}
                onChange={(e) => store.setMaxRiskPercent(Number(e.target.value))}
                step="0.5"
                min="0.1"
                max="100"
                className="terminal-input w-full pl-7"
              /></>
            ) : (
              <><DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-terminal-dim" />
              <input
                type="number"
                value={store.maxRiskDollar}
                onChange={(e) => store.setMaxRiskDollar(Number(e.target.value))}
                className="terminal-input w-full pl-7"
              /></>
            )}
          </div>
          <span className="text-terminal-dim text-xs">risk</span>
        </div>

        <div className="text-xs text-terminal-dim flex justify-between items-center">
          <span>Max risk:</span>
          <Badge variant="amber">${effectiveRisk.toFixed(0)}</Badge>
        </div>
      </div>

      {/* Holding Period */}
      <div className="mb-4">
        <label className="block text-xs text-terminal-dim mb-1">
          <Clock className="w-3.5 h-3.5 inline mr-1" />Holding Period
        </label>
        <div className="grid grid-cols-4 gap-1">
          {PERIOD_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => store.setHoldingPeriod(value)}
              className={`py-2 px-1 rounded border text-center transition-all duration-150 ${
                store.holdingPeriod === value
                  ? 'text-terminal-blue border-terminal-blue/40 bg-terminal-blue/10'
                  : 'text-terminal-dim border-terminal-border hover:border-terminal-muted'
              }`}
            >
              <div className="text-xs font-semibold">{label}</div>
              <div className="text-[10px] opacity-70">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Target R:R */}
      <div>
        <label className="block text-xs text-terminal-dim mb-1">Target Risk:Reward Ratio</label>
        <div className="flex items-center gap-2">
          <span className="text-terminal-dim text-xs">1 :</span>
          <input
            type="number"
            value={store.targetRR}
            onChange={(e) => store.setTargetRR(Number(e.target.value))}
            step="0.5"
            min="1"
            max="10"
            className="terminal-input w-20"
          />
          <Badge variant="cyan">1:{store.targetRR}</Badge>
        </div>
      </div>
    </Card>
  );
}
