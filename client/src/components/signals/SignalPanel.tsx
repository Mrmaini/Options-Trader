import { useState } from 'react';
import { Zap, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useSignals } from '../../hooks/useSignals';
import { useTradeSetupStore } from '../../store/tradeSetupStore';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Badge } from '../shared/Badge';
import { Spinner } from '../shared/Spinner';
import { formatPrice } from '../../utils/formatters';

export function SignalPanel() {
  const { ticker } = useTradeSetupStore();
  const [interval, setInterval] = useState<'5m' | '15m' | '1h'>('5m');
  const { data: signal, isLoading, error, refetch } = useSignals(ticker, interval);

  if (!ticker) {
    return (
      <Card>
        <SectionHeader title="Trade Signals" icon={<Zap className="w-4 h-4" />} />
        <p className="text-terminal-dim text-sm text-center py-6">Enter a ticker to see signals.</p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader
        title="Trade Signals"
        subtitle={`${ticker} · ${interval} chart`}
        icon={<Zap className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-2">
            {(['5m', '15m', '1h'] as const).map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  interval === iv
                    ? 'text-terminal-blue border-terminal-blue/40 bg-terminal-blue/10'
                    : 'text-terminal-dim border-terminal-border hover:border-terminal-muted'
                }`}
              >
                {iv}
              </button>
            ))}
            <button onClick={() => refetch()} className="terminal-btn-ghost p-1">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      {isLoading && (
        <div className="flex items-center justify-center py-10 gap-3">
          <Spinner />
          <span className="text-terminal-dim text-sm">Computing signals...</span>
        </div>
      )}

      {error && (
        <p className="text-terminal-red text-xs p-3 bg-terminal-red/10 border border-terminal-red/30 rounded">
          Failed to load signal data: {error.message}
        </p>
      )}

      {signal && !isLoading && (
        <div className="space-y-4">
          {/* Overall Signal */}
          <div className={`p-4 rounded border flex items-center gap-4 ${
            signal.overallSignal === 'long'
              ? 'bg-terminal-green/10 border-terminal-green/30'
              : signal.overallSignal === 'short'
              ? 'bg-terminal-red/10 border-terminal-red/30'
              : 'bg-terminal-muted/30 border-terminal-border'
          }`}>
            {signal.overallSignal === 'long' && <TrendingUp className="w-8 h-8 text-terminal-green shrink-0" />}
            {signal.overallSignal === 'short' && <TrendingDown className="w-8 h-8 text-terminal-red shrink-0" />}
            {signal.overallSignal === 'neutral' && <Minus className="w-8 h-8 text-terminal-dim shrink-0" />}
            <div>
              <div className={`text-lg font-bold ${
                signal.overallSignal === 'long' ? 'text-terminal-green'
                : signal.overallSignal === 'short' ? 'text-terminal-red'
                : 'text-terminal-dim'
              }`}>
                {signal.overallSignal === 'long' ? 'LONG SIGNAL'
                 : signal.overallSignal === 'short' ? 'SHORT SIGNAL'
                 : 'NO SIGNAL — WAIT'}
              </div>
              <p className="text-xs text-terminal-dim mt-1">{signal.reason}</p>
            </div>
          </div>

          {/* Indicator readings */}
          <div className="grid grid-cols-2 gap-2">
            <IndicatorCard
              label="SuperTrend (10,3)"
              value={signal.supertrend.toUpperCase()}
              sub={`Level: ${formatPrice(signal.supertrendValue)}`}
              variant={signal.supertrend === 'long' ? 'green' : 'red'}
            />
            <IndicatorCard
              label="45 EMA"
              value={signal.priceVsEma45 === 'above' ? 'PRICE ABOVE' : 'PRICE BELOW'}
              sub={`EMA: ${formatPrice(signal.ema45)}`}
              variant={signal.priceVsEma45 === 'above' ? 'green' : 'red'}
            />
          </div>

          {/* Entry / Stop / Targets */}
          {signal.overallSignal !== 'neutral' && (
            <div className="space-y-1">
              <p className="text-[10px] text-terminal-dim uppercase tracking-wide">Suggested Levels</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <LevelCard label="Entry" value={formatPrice(signal.entryPrice)} variant="blue" />
                <LevelCard label="Stop Loss" value={formatPrice(signal.stopLoss)} variant="red" />
                <LevelCard label="Target 1 (1.5R)" value={formatPrice(signal.target1)} variant="green" />
                <LevelCard label="Target 2 (3R)" value={formatPrice(signal.target2)} variant="cyan" />
              </div>
              <p className="text-[10px] text-terminal-dim mt-1">
                Risk/unit: {formatPrice(Math.abs(signal.entryPrice - signal.stopLoss))} &nbsp;|&nbsp;
                ATR(14): {formatPrice(signal.atr)}
              </p>
            </div>
          )}

          <p className="text-[10px] text-terminal-dim border-t border-terminal-border pt-2">
            Based on {interval} bars · SuperTrend(10,3) + 45 EMA confirmation · Updates every 2 min
          </p>
        </div>
      )}
    </Card>
  );
}

function IndicatorCard({ label, value, sub, variant }: { label: string; value: string; sub: string; variant: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-terminal-green',
    red: 'text-terminal-red',
    amber: 'text-terminal-amber',
    blue: 'text-terminal-blue',
    dim: 'text-terminal-dim',
  };
  return (
    <div className="p-3 bg-terminal-muted/30 rounded border border-terminal-border">
      <div className="text-[10px] text-terminal-dim uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-sm font-bold ${colorMap[variant] || 'text-terminal-text'}`}>{value}</div>
      <div className="text-[10px] text-terminal-dim mt-0.5">{sub}</div>
    </div>
  );
}

function LevelCard({ label, value, variant }: { label: string; value: string; variant: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-terminal-green',
    red: 'text-terminal-red',
    blue: 'text-terminal-blue',
    cyan: 'text-terminal-cyan',
  };
  return (
    <div className="p-2 bg-terminal-muted/30 rounded border border-terminal-border text-center">
      <div className="text-[10px] text-terminal-dim mb-1">{label}</div>
      <div className={`text-sm font-bold ${colorMap[variant] || 'text-terminal-text'}`}>{value}</div>
    </div>
  );
}
