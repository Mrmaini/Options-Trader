import type { DirectionalBias, HoldingPeriod, StrategyType } from '../types/trade';
import type { StrategyRecommendation, IVEnvironment } from '../types/strategy';

export function classifyIVEnvironment(ivRank: number): IVEnvironment {
  if (ivRank >= 50) return 'high';
  if (ivRank >= 25) return 'normal';
  return 'low';
}

interface RecommendInput {
  bias: DirectionalBias;
  ivRank: number;
  ivPercentile: number;
  holdingPeriod: HoldingPeriod;
  daysUntilEarnings?: number;
  targetRR?: number;
}

const STRATEGY_DETAILS: Record<StrategyType, { name: string; description: string; pros: string[]; cons: string[] }> = {
  long_call: {
    name: 'Long Call',
    description: 'Buy a call option for defined-risk bullish exposure.',
    pros: ['Unlimited upside', 'Defined max loss', 'Simple to manage'],
    cons: ['Premium decay (theta)', 'Needs big move to profit', 'Full premium at risk'],
  },
  long_put: {
    name: 'Long Put',
    description: 'Buy a put option for defined-risk bearish exposure.',
    pros: ['Large downside potential', 'Defined max loss', 'Simple to manage'],
    cons: ['Premium decay (theta)', 'Needs big drop to profit', 'Full premium at risk'],
  },
  call_debit_spread: {
    name: 'Call Debit Spread',
    description: 'Buy a call and sell a higher-strike call to reduce cost basis.',
    pros: ['Lower cost than long call', 'Defined risk and reward', 'Less theta decay'],
    cons: ['Capped upside', 'Needs directional move', 'Two legs to manage'],
  },
  put_debit_spread: {
    name: 'Put Debit Spread',
    description: 'Buy a put and sell a lower-strike put to reduce cost basis.',
    pros: ['Lower cost than long put', 'Defined risk and reward', 'Less theta decay'],
    cons: ['Capped downside profit', 'Needs directional move', 'Two legs to manage'],
  },
  bull_put_spread: {
    name: 'Bull Put Spread',
    description: 'Sell a put and buy a lower-strike put. Collect premium in a bullish environment.',
    pros: ['Theta positive (time works for you)', 'Defined risk', 'Profits even if stock stays flat'],
    cons: ['Capped credit received', 'Assignment risk at short strike', 'Needs IV to be elevated'],
  },
  bear_call_spread: {
    name: 'Bear Call Spread',
    description: 'Sell a call and buy a higher-strike call. Collect premium in a bearish environment.',
    pros: ['Theta positive', 'Defined risk', 'Profits if stock stays flat or falls'],
    cons: ['Capped credit', 'Assignment risk at short strike', 'Best in high IV'],
  },
  iron_condor: {
    name: 'Iron Condor',
    description: 'Sell OTM call spread + OTM put spread. Profit if underlying stays in a range.',
    pros: ['High probability of profit', 'Theta works for you', 'Defined risk both sides'],
    cons: ['Max profit capped', 'Multiple legs to manage', 'Can be tested in volatile markets'],
  },
  short_strangle: {
    name: 'Short Strangle',
    description: 'Sell OTM call and OTM put naked. Profit from IV crush and range-bound price.',
    pros: ['Wide range for profit', 'Large credit received', 'Theta heavy'],
    cons: ['Undefined risk', 'Requires high buying power', 'Dangerous around earnings'],
  },
  long_strangle: {
    name: 'Long Strangle',
    description: 'Buy OTM call and OTM put. Profit from a large move in either direction.',
    pros: ['Profits from big moves either way', 'Defined risk', 'Good for binary events'],
    cons: ['Needs a big move to profit', 'Expensive in high IV', 'Time decay hurts'],
  },
  long_straddle: {
    name: 'Long Straddle',
    description: 'Buy ATM call and put. Profit from a large move in either direction.',
    pros: ['ATM means lower required move', 'Defined risk', 'Great for events'],
    cons: ['Expensive to enter', 'Needs very large move', 'Time decay is severe'],
  },
  calendar_spread: {
    name: 'Calendar Spread',
    description: 'Sell near-term option and buy longer-term option at same strike. Profits from theta and IV expansion.',
    pros: ['Vega positive (profits from IV rise)', 'Low cost', 'Theta neutral to positive'],
    cons: ['Complex to manage', 'Sensitive to IV changes', 'Limited profit window'],
  },
};

export function recommendStrategies(input: RecommendInput): StrategyRecommendation[] {
  const { bias, ivRank, holdingPeriod, daysUntilEarnings } = input;
  const ivEnv = classifyIVEnvironment(ivRank);
  const earningsWithin = daysUntilEarnings !== undefined && daysUntilEarnings >= 0 && daysUntilEarnings <= 30;

  const recommendations: Array<{ type: StrategyType; score: number; rationale: string; ivEnvironment: IVEnvironment }> = [];

  if (bias === 'bullish') {
    if (ivEnv === 'low') {
      recommendations.push({ type: 'long_call', score: 95, rationale: 'Low IV means cheap premiums — ideal time to buy calls. IV expansion can add value on top of the directional move.', ivEnvironment: 'low' });
      recommendations.push({ type: 'call_debit_spread', score: 80, rationale: 'Reduces cost versus a naked long call while maintaining bullish upside. Smart choice in low IV when you want to limit theta risk.', ivEnvironment: 'low' });
    } else if (ivEnv === 'normal') {
      recommendations.push({ type: 'call_debit_spread', score: 90, rationale: 'Balanced IV environment favors debit spreads — you get directional exposure with reduced cost and defined risk.', ivEnvironment: 'normal' });
      recommendations.push({ type: 'long_call', score: 75, rationale: 'Straight long calls work in normal IV. Watch theta decay carefully if holding longer than a week.', ivEnvironment: 'normal' });
      recommendations.push({ type: 'bull_put_spread', score: 70, rationale: 'Collect premium in a bullish market. Profits even if stock moves sideways or slightly lower.', ivEnvironment: 'normal' });
    } else {
      recommendations.push({ type: 'bull_put_spread', score: 95, rationale: 'High IV means fat premiums — selling a put spread lets you collect premium while defining your risk in a bullish environment.', ivEnvironment: 'high' });
      recommendations.push({ type: 'call_debit_spread', score: 65, rationale: 'Debit spreads in high IV offset some premium cost. Still works but expect wider spreads.', ivEnvironment: 'high' });
    }
  } else if (bias === 'bearish') {
    if (ivEnv === 'low') {
      recommendations.push({ type: 'long_put', score: 95, rationale: 'Low IV = cheap puts. Great time to buy directional protection or speculate on a decline.', ivEnvironment: 'low' });
      recommendations.push({ type: 'put_debit_spread', score: 80, rationale: 'Reduces premium cost while maintaining bearish exposure. Good when you want to manage theta risk.', ivEnvironment: 'low' });
    } else if (ivEnv === 'normal') {
      recommendations.push({ type: 'put_debit_spread', score: 90, rationale: 'Balanced environment favors debit spreads. You get bearish leverage with capped risk and reasonable cost.', ivEnvironment: 'normal' });
      recommendations.push({ type: 'long_put', score: 75, rationale: 'Straight puts work well in normal IV. Good for swing trades expecting a sharp move down.', ivEnvironment: 'normal' });
      recommendations.push({ type: 'bear_call_spread', score: 70, rationale: 'Collect premium by selling calls above the market. Profits from flat to declining price action.', ivEnvironment: 'normal' });
    } else {
      recommendations.push({ type: 'bear_call_spread', score: 95, rationale: 'High IV inflates call premiums — sell a call spread above current price and collect elevated premium in a bearish environment.', ivEnvironment: 'high' });
      recommendations.push({ type: 'put_debit_spread', score: 65, rationale: 'Put spreads offset the expensive put premium in high IV. Still directional but more cost-efficient.', ivEnvironment: 'high' });
    }
  } else {
    // Neutral
    if (ivEnv === 'low') {
      recommendations.push({ type: 'long_straddle', score: 85, rationale: 'Low IV means cheap straddles. Bet on a big move without knowing direction — perfect for potential catalysts.', ivEnvironment: 'low' });
      recommendations.push({ type: 'long_strangle', score: 80, rationale: 'Similar to straddle but cheaper. Needs a larger move but costs less premium.', ivEnvironment: 'low' });
      recommendations.push({ type: 'calendar_spread', score: 75, rationale: 'In low IV, calendars allow you to be long vega cheaply. IV expansion (when it comes) can be highly profitable.', ivEnvironment: 'low' });
    } else if (ivEnv === 'normal') {
      recommendations.push({ type: 'iron_condor', score: 85, rationale: 'Normal IV + neutral outlook is the iron condor sweet spot. Collect premium from both sides while price remains in a range.', ivEnvironment: 'normal' });
      recommendations.push({ type: 'calendar_spread', score: 75, rationale: 'Collect theta while staying direction-neutral. IV expansion in front month adds value.', ivEnvironment: 'normal' });
    } else {
      recommendations.push({ type: 'iron_condor', score: 95, rationale: 'High IV + neutral outlook is the textbook iron condor setup. IV crush after an event will reward this position heavily.', ivEnvironment: 'high' });
      recommendations.push({ type: 'short_strangle', score: 85, rationale: 'Maximizes premium collection in high IV. Wide breakevens give plenty of room. Use only if comfortable with undefined risk.', ivEnvironment: 'high' });
    }
  }

  // Penalize short-vega strategies near earnings
  if (earningsWithin) {
    for (const rec of recommendations) {
      if (['iron_condor', 'short_strangle', 'bull_put_spread', 'bear_call_spread'].includes(rec.type)) {
        rec.score = Math.max(0, rec.score - 30);
        rec.rationale += ' ⚠️ Earnings within holding period — IV crush risk on short vega positions.';
      }
    }
  }

  // Apply holding period adjustments
  if (holdingPeriod === '0dte' || holdingPeriod === 'weekly') {
    for (const rec of recommendations) {
      if (rec.type === 'calendar_spread') rec.score -= 20;
    }
  }

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((rec) => ({
      ...STRATEGY_DETAILS[rec.type],
      type: rec.type,
      score: rec.score,
      rationale: rec.rationale,
      ivEnvironment: rec.ivEnvironment,
    }));
}
