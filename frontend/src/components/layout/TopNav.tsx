'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { MenuIcon, LogOutIcon } from '@/components/ui/icons';
import { MenuOverlay } from '@/components/layout/MenuOverlay';
import { ROLE_NAVIGATION } from '@/lib/navigation';
import type { UserRole, User } from '@/types/auth';

interface TopNavProps {
  user: User | null;
  onLogout: () => void;
}

export function TopNav({ user, onLogout }: TopNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [karachiTime, setKarachiTime] = useState<string>('');

  // Karachi time formatter
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Karachi',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          day: 'numeric',
          month: 'short',
        }).format(now);
        setKarachiTime(formatted);
      } catch {
        setKarachiTime('Karachi PKT');
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  const role: UserRole = user?.role || 'founder';
  const roleConfig = ROLE_NAVIGATION[role] || ROLE_NAVIGATION.founder;
  const navItems = roleConfig.items;

  const displayName = user?.fullName || user?.email || 'User';
  const initials = (user?.fullName || user?.email || 'FC')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <header className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <nav
          aria-label="Primary Navigation"
          className="glass-nav px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4"
        >
          {/* Left: Brand Logo & Role Chip */}
          <div className="flex items-center gap-3">
            <Logo href={navItems[0]?.href || '/'} size={32} />
            {user && (
              <span className="hidden sm:inline-flex font-mono text-xs uppercase tracking-[0.05em] px-2.5 py-0.5 rounded-pill bg-fill text-text-secondary border border-hairline-subtle font-medium">
                {role}
              </span>
            )}
          </div>

          {/* Center: Desktop Nav Pills */}
          <div className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap font-mono text-[13px] uppercase tracking-[0.05em] px-3 py-1.5 rounded-pill transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent ${
                    isActive
                      ? 'bg-ink text-white font-semibold shadow-sm'
                      : 'text-text-secondary hover:text-ink hover:bg-fill/60'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right: Karachi Time & User Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {karachiTime && (
              <div
                title="Karachi Local Time"
                className="hidden xl:flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.05em] text-text-secondary px-3 py-1 rounded-pill glass-chip whitespace-nowrap"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>{karachiTime}</span>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <div
                  title={`${displayName} (${user.role})`}
                  className="w-8 h-8 rounded-full bg-fill border border-hairline flex items-center justify-center font-mono text-xs font-semibold text-ink"
                >
                  {initials}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out"
                  className="hidden sm:inline-flex p-1.5 rounded-full hover:bg-fill text-text-secondary hover:text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <LogOutIcon size={16} />
                </button>
              </div>
            ) : null}

            {/* Mobile Menu Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile navigation"
              className="xl:hidden p-2 rounded-full hover:bg-fill text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <MenuIcon size={20} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer Overlay */}
      <MenuOverlay
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        items={navItems}
        user={user}
        onLogout={onLogout}
      />
    </>
  );
}
