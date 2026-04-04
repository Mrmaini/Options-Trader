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
import { SignalPanel } from './components/signals/SignalPanel';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

type Section = 'setup' | 'chain' | 'calculator' | 'market' | 'signals' | 'plan';

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('setup');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-terminal-bg">
        <TopBar />
        <Sidebar activeSection={activeSection} onNavigate={(s) => setActiveSection(s as Section)} />
        <MobileNav activeSection={activeSection} onNavigate={(s) => setActiveSection(s as Section)} />

        <main className="pt-12 pb-20 lg:pb-4 lg:pl-16 xl:pl-48 min-h-screen">
          <div className="max-w-5xl mx-auto p-4 lg:p-6">

            {/* Desktop: full dashboard */}
            <div className="hidden lg:block space-y-6">
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-2">
                  <ErrorBoundary><TradeSetupForm /></ErrorBoundary>
                </div>
                <div className="col-span-3">
                  <ErrorBoundary><StrategyRecommender /></ErrorBoundary>
                </div>
              </div>

              {/* Signal Panel — prominent position */}
              <ErrorBoundary><SignalPanel /></ErrorBoundary>

              <ErrorBoundary><MarketContextPanel /></ErrorBoundary>
              <ErrorBoundary><OptionsChainScanner /></ErrorBoundary>

              <div className="grid grid-cols-2 gap-4">
                <ErrorBoundary><RiskRewardCalculator /></ErrorBoundary>
                <ErrorBoundary><TradePlanGenerator /></ErrorBoundary>
              </div>
            </div>

            {/* Mobile: single section */}
            <div className="lg:hidden">
              <ErrorBoundary>
                {activeSection === 'setup' && (
                  <div className="space-y-4">
                    <TradeSetupForm />
                    <SignalPanel />
                    <StrategyRecommender />
                  </div>
                )}
                {activeSection === 'chain' && <OptionsChainScanner />}
                {activeSection === 'calculator' && <RiskRewardCalculator />}
                {activeSection === 'market' && <MarketContextPanel />}
                {activeSection === 'signals' && <SignalPanel />}
                {activeSection === 'plan' && <TradePlanGenerator />}
              </ErrorBoundary>
            </div>

          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}
