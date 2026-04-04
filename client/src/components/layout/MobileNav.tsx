import { clsx } from 'clsx';
import { Settings, BarChart2, Target, TrendingUp, BookOpen } from 'lucide-react';

interface MobileNavProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const navItems = [
  { id: 'setup', label: 'Setup', icon: Settings },
  { id: 'chain', label: 'Chain', icon: BarChart2 },
  { id: 'calculator', label: 'Risk/Reward', icon: Target },
  { id: 'market', label: 'Market', icon: TrendingUp },
  { id: 'plan', label: 'Plan', icon: BookOpen },
];

export function MobileNav({ activeSection, onNavigate }: MobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-terminal-surface/95 backdrop-blur border-t border-terminal-border flex">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={clsx(
            'flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors',
            activeSection === id ? 'text-terminal-blue' : 'text-terminal-dim'
          )}
        >
          <Icon className="w-4 h-4" />
          <span className="text-[10px]">{label}</span>
        </button>
      ))}
    </nav>
  );
}
