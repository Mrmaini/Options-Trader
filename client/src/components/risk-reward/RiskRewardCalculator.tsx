import { useMemo } from 'react';
import { Target, X, Plus } from 'lucide-react';
import { useChainStore } from '../../store/chainStore';
import { useTradeSetupStore } from '../../store/tradeSetupStore';
import { useQuote } from '../../hooks/useQuote';
import { generatePnLCurve, calcRiskMetrics, calcRequiredWinRate } from '../../utils/pnlCalculator';
import { calcMaxContracts, calcRiskDollarFromPercent } from '../../utils/positionSizer';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Badge } from '../shared/Badge';
import { PnLDiagram } from './PnLDiagram';
import { formatCurrency, formatPrice, formatPercent, formatWinRate } from '../../utils/formatters';
import type { TradeLeg } from '../../types/trade';

export function RiskRewardCalculator() {
  const { selectedLegs, removeLeg, updateLeg, addLeg } = useChainStore();
  const { ticker, accountSize, maxRiskPercent, maxRiskDollar, usePercentRisk, targetRR } = useTradeSetupStore();
  const { data: quote } = useQuote(ticker);

  const underlyingPrice = quote?.price ?? 100;

  const maxRisk = usePercentRisk ? calcRiskDollarFromPercent(accountSize, maxRiskPercent) : maxRiskDollar;

  const metrics = useMemo(() => {
    if (selectedLegs.length === 0) return null;
    const raw = calcRiskMetrics(selectedLegs);
    const rr = raw.maxGain !== null && raw.maxLoss !== 0
      ? Math.abs(raw.maxGain / raw.maxLoss)
      : null;
    return { ...raw, riskRewardRatio: rr, requiredWinRate: calcRequiredWinRate(raw.maxLoss, raw.maxGain) };
  }, [selectedLegs]);

  const pnlData = useMemo(
    () => generatePnLCurve(selectedLegs, underlyingPrice),
    [selectedLegs, underlyingPrice]
  );

  const maxContracts = useMemo(() => {
    if (!metrics || metrics.maxLoss === -Infinity) return 1;
    const riskPerContract = Math.abs(metrics.maxLoss / Math.max(1, selectedLegs.reduce((s, l) => s + l.quantity, 0)));
    return riskPerContract > 0 ? Math.floor(maxRisk / riskPerContract) : 1;
  }, [metrics, maxRisk, selectedLegs]);

  const handleAddManualLeg = () => {
    addLeg({
      id: `manual-${Date.now()}`,
      type: 'call',
      action: 'buy',
      strike: underlyingPrice,
      expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      premium: 1.0,
      quantity: 1,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader title="Risk / Reward Calculator" icon={<Target className="w-4 h-4" />} />

        {/* Selected Legs */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-terminal-dim uppercase tracking-wide">Position Legs</span>
            <button onClick={handleAddManualLeg} className="terminal-btn-ghost text-xs flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Leg
            </button>
          </div>

          {selectedLegs.length === 0 ? (
            <div className="text-center py-6 text-terminal-dim text-xs border border-dashed border-terminal-border rounded">
              No legs selected. Add contracts from the Options Chain or use + Add Leg.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedLegs.map((leg) => (
                <LegRow key={leg.id} leg={leg} onRemove={removeLeg} onUpdate={updateLeg} />
              ))}
            </div>
          )}
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <MetricCard
              label="Max Loss"
              value={metrics.maxLoss === -Infinity ? 'Unlimited' : formatCurrency(metrics.maxLoss)}
              variant={metrics.maxLoss < 0 ? 'red' : 'green'}
            />
            <MetricCard
              label="Max Gain"
              value={metrics.maxGain === null ? 'Unlimited' : formatCurrency(metrics.maxGain ?? 0)}
              variant={metrics.maxGain !== null && metrics.maxGain > 0 ? 'green' : 'dim'}
            />
            <MetricCard
              label="Risk:Reward"
              value={metrics.riskRewardRatio !== null ? `1:${metrics.riskRewardRatio.toFixed(1)}` : 'N/A'}
              variant={metrics.riskRewardRatio !== null && metrics.riskRewardRatio >= targetRR ? 'green' : 'amber'}
            />
            <MetricCard
              label="Win Rate Needed"
              value={formatWinRate(metrics.requiredWinRate)}
              variant="cyan"
            />
          </div>
        )}

        {metrics && metrics.breakevens.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-terminal-dim mb-2">
            <span>Breakeven{metrics.breakevens.length > 1 ? 's' : ''}:</span>
            {metrics.breakevens.map((be, i) => (
              <Badge key={i} variant="amber">{formatPrice(be)}</Badge>
            ))}
          </div>
        )}

        {metrics && (
          <div className="flex items-center gap-2 text-xs text-terminal-dim">
            <span>Max position size:</span>
            <Badge variant="cyan">{maxContracts} contract{maxContracts !== 1 ? 's' : ''}</Badge>
            <span className="text-terminal-dim">based on ${maxRisk.toFixed(0)} risk</span>
          </div>
        )}
      </Card>

      {/* P&L Diagram */}
      {pnlData.length > 0 && (
        <Card>
          <SectionHeader title="P&L Diagram" subtitle="At expiration" />
          <PnLDiagram
            data={pnlData}
            underlyingPrice={underlyingPrice}
            breakevens={metrics?.breakevens ?? []}
          />
        </Card>
      )}
    </div>
  );
}

function LegRow({ leg, onRemove, onUpdate }: { leg: TradeLeg; onRemove: (id: string) => void; onUpdate: (id: string, updates: Partial<TradeLeg>) => void }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-terminal-muted/30 rounded border border-terminal-border text-xs flex-wrap">
      <select
        value={leg.action}
        onChange={(e) => onUpdate(leg.id, { action: e.target.value as 'buy' | 'sell' })}
        className="terminal-input py-1"
      >
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
      </select>
      <select
        value={leg.type}
        onChange={(e) => onUpdate(leg.id, { type: e.target.value as 'call' | 'put' })}
        className="terminal-input py-1"
      >
        <option value="call">Call</option>
        <option value="put">Put</option>
      </select>
      <div className="flex items-center gap-1">
        <span className="text-terminal-dim">$</span>
        <input
          type="number"
          value={leg.strike}
          onChange={(e) => onUpdate(leg.id, { strike: Number(e.target.value) })}
          className="terminal-input py-1 w-20"
        />
      </div>
      <input
        type="date"
        value={leg.expiration}
        onChange={(e) => onUpdate(leg.id, { expiration: e.target.value })}
        className="terminal-input py-1"
      />
      <div className="flex items-center gap-1">
        <span className="text-terminal-dim">@</span>
        <input
          type="number"
          value={leg.premium}
          onChange={(e) => onUpdate(leg.id, { premium: Number(e.target.value) })}
          step="0.01"
          min="0"
          className="terminal-input py-1 w-16"
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-terminal-dim">x</span>
        <input
          type="number"
          value={leg.quantity}
          onChange={(e) => onUpdate(leg.id, { quantity: Math.max(1, Number(e.target.value)) })}
          min="1"
          className="terminal-input py-1 w-12"
        />
      </div>
      <button onClick={() => onRemove(leg.id)} className="ml-auto p-1 rounded hover:bg-terminal-red/10 hover:text-terminal-red text-terminal-dim transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function MetricCard({ label, value, variant }: { label: string; value: string; variant: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-terminal-green',
    red: 'text-terminal-red',
    amber: 'text-terminal-amber',
    cyan: 'text-terminal-cyan',
    dim: 'text-terminal-dim',
  };
  return (
    <div className="p-3 bg-terminal-muted/30 rounded border border-terminal-border text-center">
      <div className="text-[10px] text-terminal-dim uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-sm font-bold ${colorMap[variant] || 'text-terminal-text'}`}>{value}</div>
    </div>
  );
}
