import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  showValueText?: boolean;
  variant?: 'accent' | 'success' | 'warning';
  size?: 'normal' | 'large';
  className?: string;
  onInk?: boolean;
}

export function ProgressBar({
  value,
  label,
  showValueText = true,
  variant = 'accent',
  size = 'normal',
  className = '',
  onInk = false,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const variantFills: Record<'accent' | 'success' | 'warning', string> = {
    accent: 'bg-accent',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
  };

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {(label || showValueText) && (
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.05em]">
          {label && (
            <span className={onInk ? 'text-white/70' : 'text-text-secondary'}>
              {label}
            </span>
          )}
          {showValueText && (
            <span
              className={cn(
                'font-semibold tabular-nums',
                onInk ? 'text-white' : 'text-ink'
              )}
            >
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full rounded-pill overflow-hidden',
          size === 'large' ? 'h-2.5' : 'h-1.5',
          onInk ? 'bg-ink-border' : 'bg-fill'
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full rounded-pill transition-all duration-300 ease-out',
            variantFills[variant]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
