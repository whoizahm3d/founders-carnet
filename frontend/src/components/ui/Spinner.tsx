import React from 'react';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'normal' | 'large';
  label?: string;
  className?: string;
  variant?: 'ink' | 'accent' | 'white';
}

export function Spinner({
  size = 'normal',
  label,
  className = '',
  variant = 'accent',
}: SpinnerProps) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    normal: 'w-6 h-6 border-2',
    large: 'w-10 h-10 border-3',
  };

  const variantMap = {
    accent: 'border-accent border-t-transparent',
    ink: 'border-ink border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  return (
    <div
      className={cn('inline-flex items-center gap-3', className)}
      role="status"
    >
      <div
        className={cn(
          'rounded-full animate-spin shrink-0',
          sizeMap[size],
          variantMap[variant]
        )}
        aria-hidden="true"
      />
      {label && (
        <span className="font-mono text-xs uppercase tracking-[0.05em] text-text-secondary">
          {label}
        </span>
      )}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
}
