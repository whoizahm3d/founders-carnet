import React from 'react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: React.ReactNode;
  className?: string;
  /** Whether displayed inside an ink card (white text) or white card (ink text) */
  variant?: 'ink' | 'white';
}

export function StatCard({
  label,
  value,
  subtext,
  badge,
  className = '',
  variant = 'white',
}: StatCardProps) {
  const isInk = variant === 'ink';

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className={cn(
            'font-mono text-xs uppercase tracking-[0.05em]',
            isInk ? 'text-white/60' : 'text-text-secondary'
          )}
        >
          {label}
        </span>
        {badge}
      </div>

      <div
        className={cn(
          'font-sans font-bold text-3xl sm:text-4xl tracking-[-0.02em] tabular-nums',
          isInk ? 'text-white' : 'text-ink'
        )}
      >
        {value}
      </div>

      {subtext && (
        <p
          className={cn(
            'font-sans text-xs mt-1 leading-snug',
            isInk ? 'text-white/50' : 'text-text-muted'
          )}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}
