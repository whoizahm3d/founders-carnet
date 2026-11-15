import React from 'react';
import { ArrowRightIcon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'neutral' | 'tertiary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  block?: boolean;
  /** Whether the button sits on a dark background/gradient */
  onDark?: boolean;
  /** Whether to render the 36px circular arrow badge for the main screen action */
  hasBadge?: boolean;
  /** Custom badge icon if not arrow */
  badgeIcon?: React.ReactNode;
  /** Loading state for form submit sequence */
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  block,
  onDark = false,
  hasBadge = false,
  badgeIcon,
  loading = false,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const isBlock = fullWidth || block;
  const isDisabled = disabled || loading;

  // Base styling: full pill radius, min-height 44 (48 mobile), font-sans label style (14px, 600 weight)
  // relative + overflow-hidden are required for the absolute badge to slide inside the pill.
  const baseClasses = cn(
    'relative overflow-hidden inline-flex items-center justify-center font-sans font-semibold text-sm rounded-pill transition-all duration-300 ease-carnet focus:outline-none focus:ring-2 disabled:cursor-not-allowed select-none group motion-reduce:transition-none motion-reduce:transform-none',
    onDark ? 'focus:ring-white focus:ring-offset-0' : 'focus:ring-accent focus:ring-offset-2'
  );

  // Variant styling
  const variantClasses: Record<ButtonVariant, string> = {
    primary: onDark
      ? 'bg-white text-ink hover:bg-white/90 active:bg-white/80 disabled:bg-disabled disabled:text-input-border shadow-sm'
      : 'bg-ink text-white hover:bg-ink-raised active:bg-black disabled:bg-disabled disabled:text-input-border shadow-sm',
    accent:
      'bg-accent text-white hover:bg-accent-deep active:bg-accent-deep disabled:bg-disabled disabled:text-input-border shadow-sm',
    secondary: onDark
      ? 'bg-transparent text-white border border-white/40 hover:bg-white/10 active:bg-white/20 disabled:border-white/20 disabled:text-white/40'
      : 'bg-card text-ink border border-row-line hover:border-input-border hover:bg-fill/40 active:bg-fill disabled:bg-disabled disabled:text-input-border disabled:border-transparent',
    neutral:
      'bg-fill text-ink hover:bg-trough active:bg-trough disabled:bg-disabled disabled:text-input-border',
    tertiary:
      'bg-transparent text-ink hover:underline p-0 h-auto min-h-0 focus:ring-offset-0 disabled:text-input-border',
    ghost:
      'bg-transparent text-text-secondary hover:text-ink hover:bg-fill/50 active:bg-fill disabled:text-input-border',
  };

  // Size styling: default button height 48px on mobile & desktop per DESIGN.md line 236
  // hasBadge: symmetric px so label stays centered; badge (36px) + inset (4px each side) = 44px
  // px-12 (48px) on md/lg gives 4px clearance on both sides; px-10 (40px) on sm fits badge-sm (28px).
  const sizeClasses: Record<ButtonSize, string> = {
    sm: hasBadge
      ? 'min-h-10 px-10 py-1 text-xs'
      : 'min-h-8 px-4 py-1 text-xs',
    md: hasBadge
      ? 'min-h-12 px-12 py-1 text-base'
      : 'min-h-12 px-6 py-3 text-base',
    lg: hasBadge
      ? 'min-h-12 px-12 py-2 text-base'
      : 'min-h-12 px-8 py-3 text-base',
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        variant !== 'tertiary' && sizeClasses[size],
        isBlock && 'w-full',
        hasBadge &&
          !isDisabled &&
          'active:scale-98 motion-reduce:active:scale-100',
        className
      )}
      disabled={isDisabled}
      {...rest}
    >
      <span className="inline-flex items-center whitespace-nowrap">
        {children}
      </span>

      {/* Badge: visible during loading (shows spinner) but hidden when explicitly disabled */}
      {hasBadge && !disabled && (
        <span
          aria-hidden="true"
          className={cn(
            // btn-badge: absolute, starts left, slides to right on hover/focus (see globals.css)
            // btn-badge-active pins it at the right end without hover (e.g. during loading)
            'btn-badge w-badge h-badge rounded-full flex items-center justify-center shrink-0',
            loading && 'btn-badge-active',
            variant === 'primary' &&
              (onDark
                ? 'bg-ink text-white'
                : 'bg-white text-ink group-hover:bg-accent group-hover:text-white'),
            variant === 'accent' &&
              'bg-white text-accent',
            variant === 'secondary' &&
              (onDark
                ? 'bg-white text-ink'
                : 'bg-ink text-white group-hover:bg-accent'),
            variant === 'neutral' &&
              'bg-card text-ink group-hover:bg-accent group-hover:text-white',
            'transition-colors duration-300 ease-carnet'
          )}
        >
          {loading ? (
            <Spinner size="sm" variant={variant === 'primary' ? 'ink' : 'white'} />
          ) : (
            badgeIcon || <ArrowRightIcon size={16} />
          )}
        </span>
      )}
    </button>
  );
}
