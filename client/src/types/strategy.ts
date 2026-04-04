import type { StrategyType } from './trade';

export interface StrategyRecommendation {
  type: StrategyType;
  name: string;
  description: string;
  rationale: string;
  pros: string[];
  cons: string[];
  ivEnvironment: 'low' | 'normal' | 'high';
  score: number;
}

export type IVEnvironment = 'low' | 'normal' | 'high';
