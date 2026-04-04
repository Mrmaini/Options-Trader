import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { formatPrice, formatVolume, spreadPercent } from '../../utils/formatters';
import { scoreContract } from '../../utils/chainFilters';
import type { OptionContract } from '../../types/options';

interface ChainTableProps {
  contracts: OptionContract[];
  underlyingPrice: number;
  onAddLeg: (contract: OptionContract, action: 'buy' | 'sell') => void;
}

export function ChainTable({ contracts, underlyingPrice, onAddLeg }: ChainTableProps) {
  if (contracts.length === 0) {
    return (
      <div className="text-center py-8 text-terminal-dim text-sm border-t border-terminal-border">
        No contracts match current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-t border-terminal-border text-terminal-dim bg-terminal-surface/50">
            <th className="px-3 py-2 text-left font-medium sticky left-0 bg-terminal-surface/50">Strike</th>
            <th className="px-3 py-2 text-right font-medium">Bid</th>
            <th className="px-3 py-2 text-right font-medium">Ask</th>
            <th className="px-3 py-2 text-right font-medium">Mid</th>
            <th className="px-3 py-2 text-right font-medium">Delta</th>
            <th className="px-3 py-2 text-right font-medium">IV</th>
            <th className="px-3 py-2 text-right font-medium">Vol</th>
            <th className="px-3 py-2 text-right font-medium">OI</th>
            <th className="px-3 py-2 text-right font-medium">Spread</th>
            <th className="px-3 py-2 text-center font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => {
            const { score, warnings } = scoreContract(contract, 'bullish', 2);
            const spread = spreadPercent(contract.bid, contract.ask);
            const isATM = Math.abs(contract.strike - underlyingPrice) / underlyingPrice < 0.02;
            const hasWarnings = warnings.length > 0;

            return (
              <tr
                key={contract.contractSymbol}
                className={clsx(
                  'border-t border-terminal-border/50 hover:bg-terminal-muted/30 transition-colors',
                  isATM && 'bg-terminal-blue/5',
                  contract.inTheMoney && 'bg-terminal-muted/20'
                )}
              >
                <td className="px-3 py-2 font-medium sticky left-0 bg-inherit">
                  <div className="flex items-center gap-1">
                    {hasWarnings && <AlertTriangle className="w-3 h-3 text-terminal-amber shrink-0" />}
                    <span className={isATM ? 'text-terminal-blue' : 'text-terminal-text'}>
                      ${contract.strike}
                    </span>
                    {isATM && <span className="text-[10px] text-terminal-blue">[ATM]</span>}
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-terminal-dim">{formatPrice(contract.bid)}</td>
                <td className="px-3 py-2 text-right text-terminal-dim">{formatPrice(contract.ask)}</td>
                <td className="px-3 py-2 text-right font-medium text-terminal-text">{formatPrice(contract.mid)}</td>
                <td className="px-3 py-2 text-right">
                  <span className={getDeltaColor(contract.delta, contract.type)}>
                    {contract.delta?.toFixed(2) ?? 'N/A'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-terminal-dim">
                  {(contract.impliedVolatility * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-2 text-right text-terminal-dim">{formatVolume(contract.volume)}</td>
                <td className="px-3 py-2 text-right text-terminal-dim">{formatVolume(contract.openInterest)}</td>
                <td className="px-3 py-2 text-right">
                  <span className={spread > 20 ? 'text-terminal-red' : spread > 10 ? 'text-terminal-amber' : 'text-terminal-green'}>
                    {spread.toFixed(0)}%
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => onAddLeg(contract, 'buy')}
                      className="px-2 py-0.5 rounded text-[10px] bg-terminal-green/10 text-terminal-green border border-terminal-green/20 hover:bg-terminal-green/20"
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => onAddLeg(contract, 'sell')}
                      className="px-2 py-0.5 rounded text-[10px] bg-terminal-red/10 text-terminal-red border border-terminal-red/20 hover:bg-terminal-red/20"
                    >
                      Sell
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getDeltaColor(delta: number | undefined, type: 'call' | 'put'): string {
  if (!delta) return 'text-terminal-dim';
  const abs = Math.abs(delta);
  if (abs >= 0.5) return type === 'call' ? 'text-terminal-green' : 'text-terminal-red';
  if (abs >= 0.3) return 'text-terminal-amber';
  return 'text-terminal-dim';
}
