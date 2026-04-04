import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { TradeSetupForm } from './components/trade-setup/TradeSetupForm';
import { OptionsChainScanner } from './components/options-chain/OptionsChainScanner';
import { RiskRewardCalculator } from './components/risk-reward/RiskRewardCalculator';
import { MarketContextPanel } from './components/market-context/MarketContextPanel';
import { StrategyRecommender } from './components/strategy-recommender/StrategyRecommender';
import { TradePlanGenerator } from './components/trade-plan/TradePlanGenerator';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

type Section = 'setup' | 'chain' | 'calculator' | 'market' | 'strategy' | 'plan';

const SECTION_LABELS: Record<Section, string> = {
  setup: 'Trade Setup',
  chain: 'Options Chain',
  calculator: 'Risk / Reward',
  market: 'Market Context',
  strategy: 'Strategy',
  plan: 'Trade Plan',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('setup');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-terminal-bg">
        <TopBar />
        <Sidebar activeSection={activeSection} onNavigate={(s) => setActiveSection(s as Section)} />
        <MobileNav activeSection={activeSection} onNavigate={(s) => setActiveSection(s as Section)} />

        {/* Main content area */}
        <main className="pt-12 pb-20 lg:pb-4 lg:pl-16 xl:pl-48 min-h-screen">
          <div className="max-w-5xl mx-auto p-4 lg:p-6">
            {/* Dashboard: show all sections on large screens, single section on mobile */}
            <div className="hidden lg:block space-y-6">
              {/* Top row: Trade Setup + Strategy */}
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-2">
                  <ErrorBoundary>
                    <TradeSetupForm />
                  </ErrorBoundary>
                </div>
                <div className="col-span-3">
                  <ErrorBoundary>
                    <StrategyRecommender />
                  </ErrorBoundary>
                </div>
              </div>

              {/* Market Context */}
              <ErrorBoundary>
                <MarketContextPanel />
              </ErrorBoundary>

              {/* Options Chain */}
              <ErrorBoundary>
                <OptionsChainScanner />
              </ErrorBoundary>

              {/* Risk/Reward + Trade Plan */}
              <div className="grid grid-cols-2 gap-4">
                <ErrorBoundary>
                  <RiskRewardCalculator />
                </ErrorBoundary>
                <ErrorBoundary>
                  <TradePlanGenerator />
                </ErrorBoundary>
              </div>
            </div>

            {/* Mobile: single section view */}
            <div className="lg:hidden">
              <ErrorBoundary>
                {activeSection === 'setup' && (
                  <div className="space-y-4">
                    <TradeSetupForm />
                    <StrategyRecommender />
                  </div>
                )}
                {activeSection === 'chain' && <OptionsChainScanner />}
                {activeSection === 'calculator' && <RiskRewardCalculator />}
                {activeSection === 'market' && <MarketContextPanel />}
                {activeSection === 'strategy' && <StrategyRecommender />}
                {activeSection === 'plan' && <TradePlanGenerator />}
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}
