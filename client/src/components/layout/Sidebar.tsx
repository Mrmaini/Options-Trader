import { clsx } from 'clsx';
import { Settings, TrendingUp, BarChart2, BookOpen, Target, Radio, Activity, Scan } from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const navItems = [
  { id: 'setup', label: 'Trade Setup', icon: Settings },
  { id: 'signals', label: 'Signals', icon: Radio },
  { id: 'scanner', label: 'Scanner', icon: Scan },
  { id: 'flow', label: 'Options Flow', icon: Activity },
  { id: 'chain', label: 'Options Chain', icon: BarChart2 },
  { id: 'calculator', label: 'Risk/Reward', icon: Target },
  { id: 'market', label: 'Market Context', icon: TrendingUp },
  { id: 'plan', label: 'Trade Plan', icon: BookOpen },
];

export function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-16 xl:w-48 fixed left-0 top-12 bottom-0 bg-terminal-surface border-r border-terminal-border py-4 gap-1 z-40">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 mx-2 rounded text-xs transition-all duration-150',
            activeSection === id
              ? 'bg-terminal-blue/10 text-terminal-blue border border-terminal-blue/20'
              : 'text-terminal-dim hover:text-terminal-text hover:bg-terminal-muted'
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="hidden xl:block font-medium">{label}</span>
        </button>
      ))}
    </aside>
  );
}
