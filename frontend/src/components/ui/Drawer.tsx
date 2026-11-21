'use client';

import React, { useEffect, useCallback } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  side?: 'right' | 'left';
}

export function Drawer({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  className = '',
  side = 'right',
}: DrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Ink Backdrop at 30% with blur */}
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={cn(
          'fixed inset-y-0 max-w-full flex z-10',
          side === 'right' ? 'right-0' : 'left-0'
        )}
      >
        <div
          className={cn(
            'w-screen max-w-md bg-card border-l border-row-line shadow-modal-elevation flex flex-col justify-between p-6 sm:p-8 overflow-y-auto animate-in slide-in-from-right duration-200',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-5 border-b border-hairline">
            <div>
              {title && (
                <h2 className="font-sans font-bold text-xl text-ink tracking-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="font-sans text-xs text-text-secondary mt-1">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full text-text-muted hover:text-ink hover:bg-fill transition-colors focus:outline-none focus:ring-2 focus:ring-accent shrink-0 ml-4"
              aria-label="Close drawer"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
