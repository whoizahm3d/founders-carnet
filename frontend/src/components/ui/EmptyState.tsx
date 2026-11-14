import React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  onInk?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
  onInk = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'w-full py-12 px-6 flex flex-col items-center justify-center text-center rounded-card border border-dashed',
        onInk
          ? 'border-ink-border bg-ink-raised/50 text-white'
          : 'border-hairline bg-fill/30 text-ink',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center mb-4',
            onInk ? 'bg-ink-border text-white/70' : 'bg-fill text-text-secondary'
          )}
        >
          {icon}
        </div>
      )}

      <h3
        className={cn(
          'font-sans font-bold text-lg tracking-tight',
          onInk ? 'text-white' : 'text-ink'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'font-sans text-sm max-w-sm mt-1.5 leading-relaxed',
            onInk ? 'text-white/60' : 'text-text-secondary'
          )}
        >
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
