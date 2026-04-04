import { useChainStore } from '../../store/chainStore';

export function ChainFiltersPanel() {
  const { filters, setFilters } = useChainStore();

  return (
    <div className="mb-3 p-3 bg-terminal-muted/30 rounded border border-terminal-border space-y-2">
      <p className="text-xs font-medium text-terminal-dim uppercase tracking-wide mb-2">Filters</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-terminal-dim block mb-1">Min Delta</label>
          <input
            type="number"
            value={filters.minDelta}
            onChange={(e) => setFilters({ minDelta: Number(e.target.value) })}
            step="0.05"
            min="0"
            max="1"
            className="terminal-input w-full"
          />
        </div>
        <div>
          <label className="text-terminal-dim block mb-1">Max Delta</label>
          <input
            type="number"
            value={filters.maxDelta}
            onChange={(e) => setFilters({ maxDelta: Number(e.target.value) })}
            step="0.05"
            min="0"
            max="1"
            className="terminal-input w-full"
          />
        </div>
        <div>
          <label className="text-terminal-dim block mb-1">Min Volume</label>
          <input
            type="number"
            value={filters.minVolume}
            onChange={(e) => setFilters({ minVolume: Number(e.target.value) })}
            min="0"
            className="terminal-input w-full"
          />
        </div>
        <div>
          <label className="text-terminal-dim block mb-1">Min Open Interest</label>
          <input
            type="number"
            value={filters.minOpenInterest}
            onChange={(e) => setFilters({ minOpenInterest: Number(e.target.value) })}
            min="0"
            className="terminal-input w-full"
          />
        </div>
        <div className="col-span-2">
          <label className="text-terminal-dim block mb-1">Max Spread % (bid-ask)</label>
          <input
            type="number"
            value={filters.maxSpreadPercent}
            onChange={(e) => setFilters({ maxSpreadPercent: Number(e.target.value) })}
            step="5"
            min="1"
            max="100"
            className="terminal-input w-full"
          />
        </div>
      </div>
    </div>
  );
}
