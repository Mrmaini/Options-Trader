import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMarketScanner } from '../../hooks/useMarketScanner';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Badge } from '../shared/Badge';
import { Spinner } from '../shared/Spinner';
import { formatPrice, formatPercent } from '../../utils/formatters';
import type { ScanResult } from '../../hooks/useMarketScanner';

export function MarketScannerPanel() {
  const { data: results, isLoading, error, refetch, isFetching } = useMarketScanner();

  const longs = results?.filter((r) => r.signal === 'long') ?? [];
  const shorts = results?.filter((r) => r.signal === 'short') ?? [];
  const neutral = results?.filter((r) => r.signal === 'neutral') ?? [];

  return (
    <Card>
      <SectionHeader
        title="Market Scanner"
        subtitle="SuperTrend + 45 EMA across top tickers"
        icon={<TrendingUp className="w-4 h-4" />}
        action={
          <button onClick={() => refetch()} disabled={isFetching} className="terminal-btn-ghost flex items-center gap-1 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {isLoading && <div className="flex items-center justify-center py-10 gap-3"><Spinner /><span className="text-terminal-dim text-sm">Scanning market...</span></div>}
      {error && <p className="text-terminal-red text-xs p-3 bg-terminal-red/10 border border-terminal-red/30 rounded">Scanner error: {error.message}</p>}

      {results && !isLoading && (
        <div className="space-y-4">
          {/* Signal summary */}
          <div className="flex gap-3">
            <div className="flex-1 p-3 bg-terminal-green/10 border border-terminal-green/20 rounded text-center">
              <div className="text-lg font-bold text-terminal-green">{longs.length}</div>
              <div className="text-[10px] text-terminal-dim">LONG SIGNALS</div>
            </div>
            <div className="flex-1 p-3 bg-terminal-red/10 border border-terminal-red/20 rounded text-center">
              <div className="text-lg font-bold text-terminal-red">{shorts.length}</div>
              <div className="text-[10px] text-terminal-dim">SHORT SIGNALS</div>
            </div>
            <div className="flex-1 p-3 bg-terminal-muted/30 border border-terminal-border rounded text-center">
              <div className="text-lg font-bold text-terminal-dim">{neutral.length}</div>
              <div className="text-[10px] text-terminal-dim">NEUTRAL</div>
            </div>
          </div>

          {/* Actionable trades */}
          {(longs.length > 0 || shorts.length > 0) && (
            <div>
              <p className="text-[10px] text-terminal-dim uppercase tracking-wide mb-2">Recommended Trades</p>
              <div className="space-y-2">
                {[...longs, ...shorts].map((r) => (
                  <ScanCard key={r.symbol} result={r} />
                ))}
              </div>
            </div>
          )}

          {/* Full table */}
          <div>
            <p className="text-[10px] text-terminal-dim uppercase tracking-wide mb-2">All Scanned Tickers</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-terminal-border text-terminal-dim">
                    <th className="px-2 py-1.5 text-left">Ticker</th>
                    <th className="px-2 py-1.5 text-right">Price</th>
                    <th className="px-2 py-1.5 text-right">Chg%</th>
                    <th className="px-2 py-1.5 text-center">Signal</th>
                    <th className="px-2 py-1.5 text-center">ST</th>
                    <th className="px-2 py-1.5 text-center">45 EMA</th>
                    <th className="px-2 py-1.5 text-right">ATR</th>
                    <th className="px-2 py-1.5 text-left">Trade Idea</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.symbol} className="border-t border-terminal-border/40 hover:bg-terminal-muted/20">
                      <td className="px-2 py-1.5 font-bold">{r.symbol}</td>
                      <td className="px-2 py-1.5 text-right">{formatPrice(r.price)}</td>
                      <td className={`px-2 py-1.5 text-right ${r.change >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                        {formatPercent(r.change)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {r.signal === 'long' && <TrendingUp className="w-3.5 h-3.5 text-terminal-green mx-auto" />}
                        {r.signal === 'short' && <TrendingDown className="w-3.5 h-3.5 text-terminal-red mx-auto" />}
                        {r.signal === 'neutral' && <Minus className="w-3.5 h-3.5 text-terminal-dim mx-auto" />}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={r.supertrend === 'long' ? 'text-terminal-green' : 'text-terminal-red'}>
                          {r.supertrend.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={r.aboveEma45 ? 'text-terminal-green' : 'text-terminal-red'}>
                          {r.aboveEma45 ? 'Above' : 'Below'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right text-terminal-dim">{formatPrice(r.atr)}</td>
                      <td className="px-2 py-1.5">
                        {r.optionType && r.suggestedStrike ? (
                          <span className={r.signal === 'long' ? 'text-terminal-green' : 'text-terminal-red'}>
                            {r.signal === 'long' ? 'Buy' : 'Buy'} ${r.suggestedStrike} {r.optionType?.toUpperCase()} · {r.suggestedExpiry}
                          </span>
                        ) : (
                          <span className="text-terminal-dim">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[10px] text-terminal-dim">Scans 12 tickers · SuperTrend(10,3) + 45 EMA on 5m · Refreshes every 5 min · Not financial advice</p>
        </div>
      )}
    </Card>
  );
}

function ScanCard({ result: r }: { result: ScanResult }) {
  const isLong = r.signal === 'long';
  return (
    <div className={`p-3 rounded border ${isLong ? 'border-terminal-green/30 bg-terminal-green/5' : 'border-terminal-red/30 bg-terminal-red/5'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isLong ? <TrendingUp className="w-4 h-4 text-terminal-green" /> : <TrendingDown className="w-4 h-4 text-terminal-red" />}
          <span className="font-bold text-sm">{r.symbol}</span>
          <span className="text-terminal-dim text-xs">{formatPrice(r.price)}</span>
          <span className={r.change >= 0 ? 'text-terminal-green text-xs' : 'text-terminal-red text-xs'}>{formatPercent(r.change)}</span>
        </div>
        <div className="flex gap-1">
          <Badge variant={isLong ? 'green' : 'red'}>{isLong ? 'LONG' : 'SHORT'}</Badge>
          <Badge variant="dim">Strength {r.strength}/4</Badge>
        </div>
      </div>

      {r.optionType && r.suggestedStrike && (
        <div className="text-xs mb-2">
          <span className="text-terminal-dim">Trade: </span>
          <span className={isLong ? 'text-terminal-green font-medium' : 'text-terminal-red font-medium'}>
            Buy ${r.suggestedStrike} {r.optionType.toUpperCase()} · {r.suggestedExpiry}
          </span>
        </div>
      )}

      {r.entry && (
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="bg-terminal-muted/40 rounded px-2 py-1">
            <span className="text-terminal-dim">Stop </span>
            <span className="font-medium">{formatPrice(r.entry.stop)}</span>
          </div>
          <div className="bg-terminal-muted/40 rounded px-2 py-1">
            <span className="text-terminal-dim">T1 </span>
            <span className="text-terminal-green font-medium">{formatPrice(r.entry.t1)}</span>
          </div>
          <div className="bg-terminal-muted/40 rounded px-2 py-1">
            <span className="text-terminal-dim">T2 </span>
            <span className="text-terminal-cyan font-medium">{formatPrice(r.entry.t2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
