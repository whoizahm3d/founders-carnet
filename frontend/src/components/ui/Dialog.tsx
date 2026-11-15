'use client';

import React, { useEffect, useCallback } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = '',
}: DialogProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Ink Backdrop at 30% with blur per DESIGN.md line 226 */}
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Modal Card per DESIGN.md: white, radius 24, shadow 0 16px 36px -8px rgba(10,10,10,0.12) */}
      <div
        className={cn(
          'relative w-full max-w-lg bg-card rounded-card border border-row-line shadow-modal-elevation p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-200',
          className
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-5 right-5 p-2 rounded-full text-text-muted hover:text-ink hover:bg-fill transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Close dialog"
        >
          <CloseIcon size={18} />
        </button>

        {title && (
          <h2 className="font-sans font-bold text-xl sm:text-2xl text-ink tracking-tight pr-8">
            {title}
          </h2>
        )}

        {description && (
          <p className="font-sans text-sm text-text-secondary mt-1.5 leading-relaxed">
            {description}
          </p>
        )}

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
