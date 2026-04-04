import { ReactNode } from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'cyan' | 'dim';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-terminal-green/10 text-terminal-green border border-terminal-green/30',
  red: 'bg-terminal-red/10 text-terminal-red border border-terminal-red/30',
  amber: 'bg-terminal-amber/10 text-terminal-amber border border-terminal-amber/30',
  blue: 'bg-terminal-blue/10 text-terminal-blue border border-terminal-blue/30',
  purple: 'bg-terminal-purple/10 text-terminal-purple border border-terminal-purple/30',
  cyan: 'bg-terminal-cyan/10 text-terminal-cyan border border-terminal-cyan/30',
  dim: 'bg-terminal-muted text-terminal-dim border border-terminal-border',
};

export function Badge({ children, variant = 'dim', className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  );
}
