import { useState, useMemo } from 'react';
import { BarChart2, AlertTriangle, Star } from 'lucide-react';
import { useOptionsChain } from '../../hooks/useOptionsChain';
import { useTradeSetupStore } from '../../store/tradeSetupStore';
import { useChainStore } from '../../store/chainStore';
import { filterChain, getRecommendedContracts } from '../../utils/chainFilters';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Spinner } from '../shared/Spinner';
import { Badge } from '../shared/Badge';
import { ChainFiltersPanel } from './ChainFiltersPanel';
import { ChainTable } from './ChainTable';
import { formatPrice, formatVolume, formatPercent, spreadPercent } from '../../utils/formatters';
import type { OptionContract } from '../../types/options';

export function OptionsChainScanner() {
  const { ticker, bias, targetRR } = useTradeSetupStore();
  const { selectedExpiration, filters, setExpiration, addLeg } = useChainStore();
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'calls' | 'puts'>('calls');

  const { data: chain, isLoading, error } = useOptionsChain(ticker, selectedExpiration || undefined);

  const expirationDates = chain?.expirationDates ?? [];

  const filteredContracts = useMemo(() => {
    if (!chain) return [];
    const source = activeTab === 'calls' ? chain.calls : chain.puts;
    return filterChain(source, { ...filters, expirationDate: selectedExpiration });
  }, [chain, activeTab, filters, selectedExpiration]);

  const recommendations = useMemo(() => {
    if (!filteredContracts.length) return [];
    return getRecommendedContracts(filteredContracts, bias, targetRR);
  }, [filteredContracts, bias, targetRR]);

  const handleAddLeg = (contract: OptionContract, action: 'buy' | 'sell') => {
    addLeg({
      id: `${contract.contractSymbol}-${Date.now()}`,
      type: contract.type,
      action,
      strike: contract.strike,
      expiration: contract.expiration,
      premium: contract.mid || contract.lastPrice,
      quantity: 1,
      delta: contract.delta,
      gamma: contract.gamma,
      theta: contract.theta,
      vega: contract.vega,
      impliedVolatility: contract.impliedVolatility,
      contractSymbol: contract.contractSymbol,
    });
  };

  if (!ticker) {
    return (
      <Card>
        <SectionHeader title="Options Chain" icon={<BarChart2 className="w-4 h-4" />} />
        <div className="text-center py-12 text-terminal-dim text-sm">
          Enter a ticker in Trade Setup to scan the options chain.
        </div>
      </Card>
    );
  }

  return (
    <Card noPadding>
      <div className="p-4">
        <SectionHeader
          title="Options Chain"
          subtitle={ticker}
          icon={<BarChart2 className="w-4 h-4" />}
          action={
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="terminal-btn-ghost text-xs flex items-center gap-1"
            >
              Filters {showFilters ? '▲' : '▼'}
            </button>
          }
        />

        {isLoading && (
          <div className="flex items-center justify-center py-12 gap-3">
            <Spinner />
            <span className="text-terminal-dim text-sm">Loading options chain...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-terminal-red/10 border border-terminal-red/30 rounded">
            <AlertTriangle className="w-4 h-4 text-terminal-red shrink-0" />
            <p className="text-terminal-red text-xs">Failed to load chain: {error.message}</p>
          </div>
        )}

        {chain && !isLoading && (
          <>
            {/* Underlying price */}
            <div className="flex items-center gap-3 mb-3 text-xs text-terminal-dim">
              <span>Underlying: <span className="text-terminal-text font-medium">{formatPrice(chain.underlyingPrice)}</span></span>
            </div>

            {/* Expiration picker */}
            <div className="mb-3 flex gap-1 flex-wrap">
              {expirationDates.slice(0, 8).map((exp) => (
                <button
                  key={exp}
                  onClick={() => setExpiration(exp)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    selectedExpiration === exp
                      ? 'text-terminal-blue border-terminal-blue/40 bg-terminal-blue/10'
                      : 'text-terminal-dim border-terminal-border hover:border-terminal-muted'
                  }`}
                >
                  {exp}
                </button>
              ))}
            </div>

            {showFilters && <ChainFiltersPanel />}

            {/* Calls / Puts toggle */}
            <div className="flex gap-1 mb-3">
              {(['calls', 'puts'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors capitalize ${
                    activeTab === tab
                      ? tab === 'calls'
                        ? 'text-terminal-green border-terminal-green/40 bg-terminal-green/10'
                        : 'text-terminal-red border-terminal-red/40 bg-terminal-red/10'
                      : 'text-terminal-dim border-terminal-border hover:border-terminal-muted'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="mb-3 p-3 bg-terminal-muted/30 rounded border border-terminal-border">
                <div className="flex items-center gap-1 mb-2">
                  <Star className="w-3.5 h-3.5 text-terminal-amber" />
                  <span className="text-xs font-medium text-terminal-amber">Recommended Contracts</span>
                </div>
                <div className="space-y-1.5">
                  {recommendations.slice(0, 3).map((contract) => (
                    <RecommendedRow
                      key={contract.contractSymbol}
                      contract={contract}
                      underlyingPrice={chain.underlyingPrice}
                      onAdd={handleAddLeg}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {chain && !isLoading && (
        <ChainTable
          contracts={filteredContracts}
          underlyingPrice={chain.underlyingPrice}
          onAddLeg={handleAddLeg}
        />
      )}
    </Card>
  );
}

function RecommendedRow({
  contract,
  underlyingPrice,
  onAdd,
}: {
  contract: OptionContract;
  underlyingPrice: number;
  onAdd: (c: OptionContract, action: 'buy' | 'sell') => void;
}) {
  const warnings = (contract as any).warnings ?? [];
  const score = (contract as any).score ?? 0;
  const spread = spreadPercent(contract.bid, contract.ask);

  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant={score >= 80 ? 'green' : score >= 60 ? 'amber' : 'red'}>{score}</Badge>
      <span className="text-terminal-text font-medium">${contract.strike}</span>
      <span className="text-terminal-dim">{contract.expiration}</span>
      <span className="text-terminal-text">{formatPrice(contract.mid)}</span>
      <span className="text-terminal-dim">Δ{contract.delta?.toFixed(2) ?? 'N/A'}</span>
      <span className="text-terminal-dim">Vol:{formatVolume(contract.volume)}</span>
      {spread > 10 && <Badge variant="amber">{spread.toFixed(0)}% spread</Badge>}
      {warnings.map((w: string) => (
        <Badge key={w} variant="amber" className="hidden lg:inline-flex">{w}</Badge>
      ))}
      <div className="ml-auto flex gap-1">
        <button onClick={() => onAdd(contract, 'buy')} className="px-2 py-0.5 rounded bg-terminal-green/10 text-terminal-green border border-terminal-green/20 hover:bg-terminal-green/20 text-xs">+Buy</button>
        <button onClick={() => onAdd(contract, 'sell')} className="px-2 py-0.5 rounded bg-terminal-red/10 text-terminal-red border border-terminal-red/20 hover:bg-terminal-red/20 text-xs">+Sell</button>
      </div>
    </div>
  );
}
