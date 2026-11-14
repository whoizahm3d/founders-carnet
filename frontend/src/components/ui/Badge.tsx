import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'dark'
  | 'outlined';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  icon?: React.ReactNode;
}

export function Badge({
  children,
  variant = 'default',
  className,
  icon,
  ...rest
}: BadgeProps) {
  const baseClasses =
    'inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.05em] font-medium px-2.5 py-1 rounded-pill select-none';

  const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-fill text-text-secondary border border-hairline-subtle',
    accent: 'bg-accent-wash text-accent border border-accent/20',
    dark: 'bg-ink text-white border border-ink-border',
    success: 'bg-status-success-wash text-status-success border border-status-success/20',
    warning: 'bg-status-warning-wash text-status-warning border border-status-warning/20',
    error: 'bg-status-error-wash text-status-error border border-status-error/20',
    outlined: 'bg-transparent text-text-secondary border border-hairline',
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)} {...rest}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
