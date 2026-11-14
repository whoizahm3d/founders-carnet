import React from 'react';
import { ArrowRightIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'neutral' | 'tertiary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  block?: boolean;
  /** Whether to render the 36px circular arrow badge for the main screen action */
  hasBadge?: boolean;
  /** Custom badge icon if not arrow */
  badgeIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  block,
  hasBadge = false,
  badgeIcon,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const isBlock = fullWidth || block;

  // Base styling: full pill radius, min-height 44 (48 mobile), font-sans label style (14px, 600 weight)
  const baseClasses =
    'inline-flex items-center justify-center font-sans font-semibold text-sm rounded-pill transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed select-none group';

  // Variant styling
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-ink text-white hover:bg-ink-raised active:bg-black disabled:bg-disabled disabled:text-input-border shadow-sm',
    accent:
      'bg-accent text-white hover:bg-accent-deep active:bg-accent-deep disabled:bg-disabled disabled:text-input-border shadow-sm',
    secondary:
      'bg-card text-ink border border-row-line hover:border-input-border hover:bg-fill/40 active:bg-fill disabled:bg-disabled disabled:text-input-border disabled:border-transparent',
    neutral:
      'bg-fill text-ink hover:bg-trough active:bg-trough disabled:bg-disabled disabled:text-input-border',
    tertiary:
      'bg-transparent text-ink hover:underline p-0 h-auto min-h-0 focus:ring-offset-0 disabled:text-input-border',
    ghost:
      'bg-transparent text-text-secondary hover:text-ink hover:bg-fill/50 active:bg-fill disabled:text-input-border',
  };

  // Size styling (padding & min-height)
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'min-h-[36px] text-xs px-4',
    md: hasBadge
      ? 'min-h-[44px] md:min-h-[44px] pl-6 pr-1.5 py-1'
      : 'min-h-[44px] md:min-h-[44px] px-6 py-2.5',
    lg: hasBadge
      ? 'min-h-[48px] md:min-h-[48px] pl-8 pr-2 py-1.5 text-base'
      : 'min-h-[48px] md:min-h-[48px] px-8 py-3 text-base',
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        variant !== 'tertiary' && sizeClasses[size],
        isBlock && 'w-full',
        hasBadge && 'hover:scale-[1.02] active:scale-[0.99]',
        className
      )}
      disabled={disabled}
      {...rest}
    >
      <span className={cn('inline-flex items-center gap-2', hasBadge && 'mr-3')}>
        {children}
      </span>

      {hasBadge && (
        <span
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200',
            variant === 'primary' &&
              'bg-white text-ink group-hover:bg-accent group-hover:text-white',
            variant === 'accent' &&
              'bg-white text-accent group-hover:bg-white/90',
            variant === 'secondary' &&
              'bg-ink text-white group-hover:bg-accent',
            variant === 'neutral' &&
              'bg-card text-ink group-hover:bg-accent group-hover:text-white',
            disabled && 'bg-input-border/30 text-input-border group-hover:bg-input-border/30 group-hover:text-input-border'
          )}
        >
          <span className="transform transition-transform duration-200 group-hover:translate-x-0.5">
            {badgeIcon || <ArrowRightIcon size={16} />}
          </span>
        </span>
      )}
    </button>
  );
}
