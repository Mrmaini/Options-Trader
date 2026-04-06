import { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useOptionsFlow } from '../../hooks/useOptionsFlow';
import { useTradeSetupStore } from '../../store/tradeSetupStore';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Badge } from '../shared/Badge';
import { Spinner } from '../shared/Spinner';
import { formatCurrency, formatVolume, formatPrice } from '../../utils/formatters';
import type { FlowItem } from '../../hooks/useOptionsFlow';

export function OptionsFlowPanel() {
  const { ticker } = useTradeSetupStore();
  const [loadRequested, setLoadRequested] = useState(false);
  const { data: flow, isLoading, error } = useOptionsFlow(ticker, loadRequested);
  const [filter, setFilter] = useState<'all' | 'unusual' | 'calls' | 'puts'>('all');

  if (!ticker) return (
    <Card>
      <SectionHeader title="Options Flow" icon={<Activity className="w-4 h-4" />} />
      <p className="text-terminal-dim text-sm text-center py-6">Enter a ticker in Trade Setup to see options flow.</p>
    </Card>
  );

  const filtered = flow?.flows.filter((f) => {
    if (filter === 'unusual') return f.unusual;
    if (filter === 'calls') return f.type === 'call';
    if (filter === 'puts') return f.type === 'put';
    return true;
  }) ?? [];

  const sentimentVariant = flow?.flowSentiment === 'bullish' ? 'green' : flow?.flowSentiment === 'bearish' ? 'red' : 'amber';

  return (
    <Card noPadding>
      <div className="p-4">
        <SectionHeader
          title="Options Flow"
          subtitle={ticker}
          icon={<Activity className="w-4 h-4" />}
          action={flow && <Badge variant={sentimentVariant}>{flow.flowSentiment.toUpperCase()} FLOW</Badge>}
        />

        {!loadRequested && !flow && (
          <div className="text-center py-8">
            <p className="text-terminal-dim text-xs mb-3">Flow data loads the full options chain — click to fetch.</p>
            <button onClick={() => setLoadRequested(true)} className="terminal-btn-primary text-xs">Load Options Flow</button>
          </div>
        )}
        {isLoading && <div className="flex items-center justify-center py-10 gap-3"><Spinner /><span className="text-terminal-dim text-sm">Loading flow data...</span></div>}
        {error && <p className="text-terminal-red text-xs p-3 bg-terminal-red/10 border border-terminal-red/30 rounded">Failed to load flow: {error.message}</p>}

        {flow && !isLoading && (
          <>
            {/* Flow summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-terminal-green/10 border border-terminal-green/20 rounded text-center">
                <div className="text-[10px] text-terminal-dim mb-1">CALL FLOW</div>
                <div className="text-sm font-bold text-terminal-green">{formatCurrency(flow.totalCallFlow, 0)}</div>
              </div>
              <div className="p-3 bg-terminal-red/10 border border-terminal-red/20 rounded text-center">
                <div className="text-[10px] text-terminal-dim mb-1">PUT FLOW</div>
                <div className="text-sm font-bold text-terminal-red">{formatCurrency(flow.totalPutFlow, 0)}</div>
              </div>
              <div className="p-3 bg-terminal-muted/30 border border-terminal-border rounded text-center">
                <div className="text-[10px] text-terminal-dim mb-1">P/C RATIO</div>
                <div className={`text-sm font-bold ${flow.putCallRatio < 0.7 ? 'text-terminal-green' : flow.putCallRatio > 1.3 ? 'text-terminal-red' : 'text-terminal-amber'}`}>
                  {flow.putCallRatio.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 mb-3 flex-wrap">
              {(['all', 'unusual', 'calls', 'puts'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1 rounded border transition-colors capitalize ${filter === f ? 'text-terminal-blue border-terminal-blue/40 bg-terminal-blue/10' : 'text-terminal-dim border-terminal-border hover:border-terminal-muted'}`}>
                  {f === 'unusual' ? '🔥 Unusual' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {flow && !isLoading && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-t border-terminal-border text-terminal-dim bg-terminal-surface/50">
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Strike</th>
                <th className="px-3 py-2 text-right">Exp</th>
                <th className="px-3 py-2 text-right">Mid</th>
                <th className="px-3 py-2 text-right">Volume</th>
                <th className="px-3 py-2 text-right">OI</th>
                <th className="px-3 py-2 text-right">Vol/OI</th>
                <th className="px-3 py-2 text-right">$ Flow</th>
                <th className="px-3 py-2 text-right">IV</th>
                <th className="px-3 py-2 text-center">Flag</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 30).map((item) => (
                <FlowRow key={item.contractSymbol} item={item} />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-terminal-dim">No flow data matches filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function FlowRow({ item }: { item: FlowItem }) {
  return (
    <tr className={`border-t border-terminal-border/50 hover:bg-terminal-muted/20 transition-colors ${item.unusual ? 'bg-terminal-amber/5' : ''}`}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {item.type === 'call' ? <TrendingUp className="w-3 h-3 text-terminal-green" /> : <TrendingDown className="w-3 h-3 text-terminal-red" />}
          <span className={item.type === 'call' ? 'text-terminal-green font-medium' : 'text-terminal-red font-medium'}>
            {item.type.toUpperCase()}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 text-right font-medium">${item.strike}</td>
      <td className="px-3 py-2 text-right text-terminal-dim">{item.expiration}</td>
      <td className="px-3 py-2 text-right">{formatPrice(item.mid)}</td>
      <td className="px-3 py-2 text-right font-medium">{formatVolume(item.volume)}</td>
      <td className="px-3 py-2 text-right text-terminal-dim">{formatVolume(item.openInterest)}</td>
      <td className="px-3 py-2 text-right">
        <span className={item.volOiRatio > 1 ? 'text-terminal-amber font-medium' : 'text-terminal-dim'}>
          {item.volOiRatio.toFixed(2)}x
        </span>
      </td>
      <td className="px-3 py-2 text-right font-medium">
        <span className={item.type === 'call' ? 'text-terminal-green' : 'text-terminal-red'}>
          {formatCurrency(item.dollarFlow, 0)}
        </span>
      </td>
      <td className="px-3 py-2 text-right text-terminal-dim">{(item.impliedVolatility * 100).toFixed(0)}%</td>
      <td className="px-3 py-2 text-center">
        {item.unusual && <AlertTriangle className="w-3.5 h-3.5 text-terminal-amber mx-auto" />}
      </td>
    </tr>
  );
}
