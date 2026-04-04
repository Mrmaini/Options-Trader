import { useMemo, useState } from 'react';
import { BookOpen, Copy, Check, Download } from 'lucide-react';
import { useChainStore } from '../../store/chainStore';
import { useTradeSetupStore } from '../../store/tradeSetupStore';
import { useQuote } from '../../hooks/useQuote';
import { calcRiskMetrics, calcRequiredWinRate } from '../../utils/pnlCalculator';
import { calcMaxContracts, calcRiskDollarFromPercent } from '../../utils/positionSizer';
import { useClipboard } from '../../hooks/useClipboard';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Badge } from '../shared/Badge';
import { formatCurrency, formatPrice, formatPercent, formatWinRate, formatGreek } from '../../utils/formatters';

export function TradePlanGenerator() {
  const { selectedLegs } = useChainStore();
  const { ticker, bias, accountSize, maxRiskPercent, maxRiskDollar, usePercentRisk, holdingPeriod, targetRR } = useTradeSetupStore();
  const { data: quote } = useQuote(ticker);
  const { copy, copied } = useClipboard();

  const maxRisk = usePercentRisk ? calcRiskDollarFromPercent(accountSize, maxRiskPercent) : maxRiskDollar;

  const metrics = useMemo(() => {
    if (selectedLegs.length === 0) return null;
    const raw = calcRiskMetrics(selectedLegs);
    const requiredWinRate = calcRequiredWinRate(raw.maxLoss, raw.maxGain);
    return { ...raw, requiredWinRate };
  }, [selectedLegs]);

  const maxContracts = useMemo(() => {
    if (!metrics || metrics.maxLoss === -Infinity) return 1;
    const riskPerContract = Math.abs(metrics.maxLoss);
    return riskPerContract > 0 ? Math.floor(maxRisk / riskPerContract) : 1;
  }, [metrics, maxRisk]);

  const combinedGreeks = useMemo(() => {
    return selectedLegs.reduce(
      (acc, leg) => {
        const dir = leg.action === 'buy' ? 1 : -1;
        return {
          delta: acc.delta + (leg.delta ?? 0) * dir * leg.quantity,
          gamma: acc.gamma + (leg.gamma ?? 0) * dir * leg.quantity,
          theta: acc.theta + (leg.theta ?? 0) * dir * leg.quantity,
          vega: acc.vega + (leg.vega ?? 0) * dir * leg.quantity,
        };
      },
      { delta: 0, gamma: 0, theta: 0, vega: 0 }
    );
  }, [selectedLegs]);

  const planText = useMemo(() => {
    if (!metrics || selectedLegs.length === 0) return '';

    const underlyingPrice = quote?.price ?? 0;
    const netPremium = metrics.netPremium;
    const stopLossPercent = 50;
    const stopLossPrice = netPremium * (1 + stopLossPercent / 100);
    const target1Percent = 50;
    const target1Price = netPremium * (1 - target1Percent / 100);

    const legDesc = selectedLegs
      .map((l) => `  - ${l.action.toUpperCase()} ${l.quantity}x $${l.strike} ${l.expiration} ${l.type.toUpperCase()} @ $${l.premium.toFixed(2)}`)
      .join('\n');

    const greeksLine = `Delta: ${formatGreek(combinedGreeks.delta)} | Gamma: ${formatGreek(combinedGreeks.gamma)} | Theta: ${formatGreek(combinedGreeks.theta)}/day | Vega: ${formatGreek(combinedGreeks.vega)}`;

    return `
=== OPTIONS TRADE PLAN ===
Generated: ${new Date().toLocaleString()}

TICKER: ${ticker}
Underlying Price: ${formatPrice(underlyingPrice)}
Directional Bias: ${bias.toUpperCase()}
Holding Period: ${holdingPeriod.toUpperCase()}

POSITION LEGS:
${legDesc}

RISK PARAMETERS:
  Account Size: ${formatCurrency(accountSize)}
  Max Risk: ${formatCurrency(maxRisk)} (${usePercentRisk ? maxRiskPercent + '%' : 'fixed'})
  Max Contracts: ${maxContracts}
  Net Premium: ${formatCurrency(netPremium)} per contract (${netPremium > 0 ? 'debit' : 'credit'})

TRADE MANAGEMENT:
  Entry: Market order or limit at mid-price
  Stop Loss: ${stopLossPercent}% of premium = ${formatCurrency(Math.abs(stopLossPrice))} loss per contract
  Target 1 (50%): ${formatCurrency(Math.abs(target1Price))} gain | Exit 50% of position
  Target 2 (100%): ${formatCurrency(Math.abs(netPremium))} gain | Exit remaining position

RISK / REWARD:
  Max Loss: ${metrics.maxLoss === -Infinity ? 'Unlimited' : formatCurrency(metrics.maxLoss)}
  Max Gain: ${metrics.maxGain === null ? 'Unlimited' : formatCurrency(metrics.maxGain ?? 0)}
  Breakeven${metrics.breakevens.length !== 1 ? 's' : ''}: ${metrics.breakevens.map((b) => formatPrice(b)).join(', ') || 'N/A'}
  Required Win Rate: ${formatWinRate(metrics.requiredWinRate)}
  Target R:R: 1:${targetRR}

GREEKS SNAPSHOT:
  ${greeksLine}

NOTES:
  - Confirm IV rank before entry (sell premium in high IV, buy in low IV)
  - Watch for earnings within holding window
  - Never risk more than ${usePercentRisk ? maxRiskPercent + '%' : formatCurrency(maxRisk)} per trade
  - Paper data only — not investment advice
==========================
`.trim();
  }, [selectedLegs, metrics, quote, ticker, bias, accountSize, maxRisk, maxRiskPercent, usePercentRisk, holdingPeriod, targetRR, maxContracts, combinedGreeks]);

  if (selectedLegs.length === 0) {
    return (
      <Card>
        <SectionHeader title="Trade Plan" icon={<BookOpen className="w-4 h-4" />} />
        <div className="text-center py-12 text-terminal-dim text-sm">
          Add contract legs in the Risk/Reward Calculator to generate a trade plan.
        </div>
      </Card>
    );
  }

  const netPremium = metrics?.netPremium ?? 0;

  return (
    <Card>
      <SectionHeader
        title="Trade Plan"
        icon={<BookOpen className="w-4 h-4" />}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => copy(planText)}
              className="terminal-btn-primary flex items-center gap-1 text-xs"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => {
                const blob = new Blob([planText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `trade-plan-${ticker}-${Date.now()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="terminal-btn-ghost flex items-center gap-1 text-xs"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <PlanMetric label="Net Premium" value={`${netPremium > 0 ? 'Debit' : 'Credit'} ${formatCurrency(Math.abs(netPremium))}`} variant={netPremium > 0 ? 'red' : 'green'} />
        <PlanMetric label="Max Position" value={`${maxContracts} contracts`} variant="cyan" />
        <PlanMetric label="Total Risk" value={formatCurrency(maxContracts * Math.abs(netPremium) * 100)} variant="amber" />
        <PlanMetric label="Greeks Δ" value={formatGreek(combinedGreeks.delta)} variant="blue" />
      </div>

      {/* Greeks */}
      <div className="mb-4 p-3 bg-terminal-muted/30 rounded border border-terminal-border">
        <p className="text-[10px] text-terminal-dim uppercase tracking-wide mb-2">Position Greeks</p>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <GreekCell label="Delta" value={formatGreek(combinedGreeks.delta)} note="Directional" />
          <GreekCell label="Gamma" value={formatGreek(combinedGreeks.gamma)} note="Acceleration" />
          <GreekCell label="Theta" value={`${formatGreek(combinedGreeks.theta)}/d`} note="Time decay" />
          <GreekCell label="Vega" value={formatGreek(combinedGreeks.vega)} note="IV sensitivity" />
        </div>
      </div>

      {/* Trade Management */}
      <div className="mb-4 space-y-2">
        <p className="text-[10px] text-terminal-dim uppercase tracking-wide">Trade Management</p>
        <ManagementRow label="Stop Loss" value={`50% of premium = ${formatCurrency(Math.abs(netPremium * 0.5))} loss`} variant="red" />
        <ManagementRow label="Target 1 (trim 50%)" value={`50% gain = ${formatCurrency(Math.abs(netPremium * 0.5))}`} variant="green" />
        <ManagementRow label="Target 2 (full exit)" value={`100% gain = ${formatCurrency(Math.abs(netPremium))}`} variant="green" />
        <ManagementRow label="Max Contracts" value={`${maxContracts} x ${formatCurrency(Math.abs(netPremium) * 100)} = ${formatCurrency(maxContracts * Math.abs(netPremium) * 100)} total`} variant="cyan" />
      </div>

      {/* Plan Text Preview */}
      <div>
        <p className="text-[10px] text-terminal-dim uppercase tracking-wide mb-2">Full Plan Preview</p>
        <pre className="bg-terminal-bg p-3 rounded border border-terminal-border text-[10px] text-terminal-dim overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {planText}
        </pre>
      </div>
    </Card>
  );
}

function PlanMetric({ label, value, variant }: { label: string; value: string; variant: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-terminal-green',
    red: 'text-terminal-red',
    amber: 'text-terminal-amber',
    cyan: 'text-terminal-cyan',
    blue: 'text-terminal-blue',
    dim: 'text-terminal-dim',
  };
  return (
    <div className="p-2 bg-terminal-muted/30 rounded border border-terminal-border text-center">
      <div className="text-[10px] text-terminal-dim uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xs font-bold ${colorMap[variant] || 'text-terminal-text'}`}>{value}</div>
    </div>
  );
}

function GreekCell({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <div className="text-terminal-text font-semibold">{value}</div>
      <div className="text-[10px] text-terminal-dim">{label}</div>
      <div className="text-[9px] text-terminal-dim opacity-60">{note}</div>
    </div>
  );
}

function ManagementRow({ label, value, variant }: { label: string; value: string; variant: string }) {
  const colorMap: Record<string, string> = {
    green: 'border-l-terminal-green text-terminal-green',
    red: 'border-l-terminal-red text-terminal-red',
    cyan: 'border-l-terminal-cyan text-terminal-cyan',
  };
  return (
    <div className={`pl-3 border-l-2 ${colorMap[variant] || 'border-l-terminal-border text-terminal-dim'}`}>
      <span className="text-xs text-terminal-dim">{label}: </span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}
