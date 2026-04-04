import { useMemo } from 'react';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useTradeSetupStore } from '../../store/tradeSetupStore';
import { useMarketContext } from '../../hooks/useMarketContext';
import { useEarnings } from '../../hooks/useEarnings';
import { recommendStrategies, classifyIVEnvironment } from '../../utils/strategyEngine';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Badge } from '../shared/Badge';
import type { StrategyRecommendation } from '../../types/strategy';

export function StrategyRecommender() {
  const { ticker, bias, holdingPeriod, targetRR } = useTradeSetupStore();
  const { data: market } = useMarketContext();
  const { data: earnings } = useEarnings(ticker);

  const recommendations = useMemo(() => {
    const ivRank = market?.ivRank ?? 30;
    const ivPercentile = market?.ivPercentile ?? 30;
    return recommendStrategies({
      bias,
      ivRank,
      ivPercentile,
      holdingPeriod,
      daysUntilEarnings: earnings?.daysUntilEarnings,
      targetRR,
    });
  }, [bias, market, earnings, holdingPeriod, targetRR]);

  const ivEnv = classifyIVEnvironment(market?.ivRank ?? 30);
  const ivLabel = ivEnv === 'high' ? 'High IV' : ivEnv === 'low' ? 'Low IV' : 'Normal IV';
  const ivVariant = ivEnv === 'high' ? 'red' : ivEnv === 'low' ? 'green' : 'amber';

  return (
    <Card>
      <SectionHeader
        title="Strategy Recommender"
        icon={<Zap className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={ivVariant}>{ivLabel}</Badge>
            <Badge variant={bias === 'bullish' ? 'green' : bias === 'bearish' ? 'red' : 'amber'}>
              {bias.charAt(0).toUpperCase() + bias.slice(1)}
            </Badge>
          </div>
        }
      />

      {recommendations.length === 0 ? (
        <p className="text-terminal-dim text-sm text-center py-6">
          Configure your trade setup to get strategy recommendations.
        </p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <StrategyCard key={rec.type} rec={rec} rank={i + 1} />
          ))}
        </div>
      )}
    </Card>
  );
}

function StrategyCard({ rec, rank }: { rec: StrategyRecommendation; rank: number }) {
  const [expanded, setExpanded] = useState(rank === 1);

  const scoreVariant = rec.score >= 80 ? 'green' : rec.score >= 60 ? 'amber' : 'red';

  return (
    <div className={`rounded border transition-all ${
      rank === 1 ? 'border-terminal-blue/30 bg-terminal-blue/5' : 'border-terminal-border bg-terminal-muted/20'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <span className="text-xs text-terminal-dim w-4">#{rank}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-terminal-text">{rec.name}</span>
            <Badge variant={scoreVariant}>{rec.score}</Badge>
            <Badge variant={rec.ivEnvironment === 'high' ? 'red' : rec.ivEnvironment === 'low' ? 'green' : 'amber'} className="hidden sm:inline-flex">
              {rec.ivEnvironment} IV
            </Badge>
          </div>
          <p className="text-xs text-terminal-dim mt-0.5 line-clamp-2">{rec.rationale}</p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-terminal-dim shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-terminal-dim shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-terminal-border/50 pt-2 space-y-2">
          <p className="text-xs text-terminal-dim">{rec.description}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-terminal-green uppercase tracking-wide mb-1">Pros</p>
              <ul className="space-y-0.5">
                {rec.pros.map((pro) => (
                  <li key={pro} className="text-xs text-terminal-dim flex items-start gap-1">
                    <span className="text-terminal-green mt-0.5">+</span> {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] text-terminal-red uppercase tracking-wide mb-1">Cons</p>
              <ul className="space-y-0.5">
                {rec.cons.map((con) => (
                  <li key={con} className="text-xs text-terminal-dim flex items-start gap-1">
                    <span className="text-terminal-red mt-0.5">-</span> {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
