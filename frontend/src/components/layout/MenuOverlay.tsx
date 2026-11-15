'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { CloseIcon, LogOutIcon } from '@/components/ui/icons';
import type { NavItem } from '@/lib/navigation';
import type { User } from '@/types/auth';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  items: NavItem[];
  user: User | null;
  onLogout: () => void;
}

export function MenuOverlay({
  isOpen,
  onClose,
  items,
  user,
  onLogout,
}: MenuOverlayProps) {
  const pathname = usePathname();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayName = user?.fullName || user?.email || 'User';
  const initials = (user?.fullName || user?.email || 'FC')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
      className="fixed inset-0 z-50 bg-ink text-white p-6 sm:p-8 flex flex-col justify-between overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-border pb-6">
        <Logo inverted size={32} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="p-2 rounded-full hover:bg-ink-raised text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <CloseIcon size={20} />
        </button>
      </div>

      {/* Numbered Nav Links */}
      <nav className="my-auto py-8">
        <ul className="space-y-4">
          {items.map((item, idx) => {
            const isActive = pathname === item.href;
            const indexStr = String(idx + 1).padStart(2, '0');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-baseline gap-4 group py-2 focus:outline-none ${
                    isActive ? 'text-accent' : 'text-white/90 hover:text-white'
                  }`}
                >
                  <span className="font-mono text-xs uppercase tracking-[0.05em] text-white/40 group-hover:text-accent transition-colors">
                    {indexStr}
                  </span>
                  <span className="font-sans text-2xl sm:text-3xl font-bold tracking-tight">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-accent inline-block ml-2" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / User Session */}
      <div className="border-t border-ink-border pt-6 flex items-center justify-between">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ink-raised border border-ink-border flex items-center justify-center font-mono text-xs font-semibold text-accent">
              {initials}
            </div>
            <div>
              <p className="font-sans text-sm font-semibold text-white">{displayName}</p>
              <p className="font-mono text-xs uppercase tracking-wider text-white/50">
                {user.role}
              </p>
            </div>
          </div>
        ) : (
          <div />
        )}

        {user && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.05em] text-white/70 hover:text-white px-4 py-2 rounded-pill hover:bg-ink-raised transition-colors"
          >
            <LogOutIcon size={14} />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </div>
  );
}
