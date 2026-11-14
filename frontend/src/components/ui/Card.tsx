import React from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'white' | 'ink' | 'glass';
export type CardPadding = 'default' | 'featured' | 'compact' | 'flush';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  compact?: boolean;
  flush?: boolean;
  className?: string;
}

export function Card({
  children,
  variant = 'white',
  padding = 'default',
  hoverable = false,
  compact,
  flush,
  className,
  ...rest
}: CardProps) {
  // Backward compatibility with boolean props
  const effectivePadding = flush ? 'flush' : compact ? 'compact' : padding;

  const baseClasses = 'rounded-card transition-all duration-200 relative overflow-hidden';

  const variantClasses: Record<CardVariant, string> = {
    white: 'bg-card text-ink border border-row-line shadow-none',
    ink: 'bg-ink text-white border border-ink-border shadow-none',
    glass: 'glass-card text-ink',
  };

  const paddingClasses: Record<CardPadding, string> = {
    default: 'p-6 sm:p-6',
    featured: 'p-6 sm:p-8',
    compact: 'p-4 sm:p-4',
    flush: 'p-0',
  };

  const hoverClasses = hoverable
    ? 'hover:-translate-y-1 hover:shadow-card-hover cursor-pointer'
    : '';

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[effectivePadding],
        hoverClasses,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
