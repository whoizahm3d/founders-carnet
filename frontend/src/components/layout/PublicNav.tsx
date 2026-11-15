'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { MenuIcon, CloseIcon } from '@/components/ui/icons';

export interface PublicNavProps {
  basePath?: string;
}

export function PublicNav({ basePath }: PublicNavProps) {
  const pathname = usePathname();
  const [timeString, setTimeString] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Client-rendered Karachi local time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };
      setTimeString(`${now.toLocaleTimeString('en-US', options)} PKT`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const isLanding = pathname === '/';
  const prefix = basePath !== undefined ? basePath : (isLanding ? '' : '/');

  const navLinks = [
    { label: 'What it is', href: `${prefix}#what-it-is` },
    { label: 'How it works', href: `${prefix}#how-it-works` },
    { label: 'Roles', href: `${prefix}#roles` },
    { label: 'Principles', href: `${prefix}#principles` },
    { label: 'FAQ', href: `${prefix}#faq` },
    { label: 'Contact', href: `${prefix}#contact` },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full px-4 sm:px-6 md:px-16 pt-4 pb-2">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto">
          <nav
            aria-label="Main navigation"
            className="glass-card rounded-pill px-4 sm:px-6 py-2 flex items-center justify-between border border-hairline/60 shadow-glass"
          >
            {/* Left: Logo with wordmark (whitespace-nowrap) */}
            <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
              <Logo size={36} showWordmark={true} href="/" />
            </div>

            {/* Center: Navigation Links (Hanken Grotesk sentence case, desktop only) */}
            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-sans font-medium text-text-secondary hover:text-ink transition-colors whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right: Time chip + CTAs */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {timeString && (
                <span className="hidden lg:inline-flex items-center px-3 py-1 rounded-pill bg-white/70 backdrop-blur-glass text-xs font-mono text-ink border border-hairline/40 select-none whitespace-nowrap shrink-0">
                  {timeString}
                </span>
              )}
              <Link
                href="/login"
                className="hidden lg:inline-flex px-4 py-2 text-sm font-sans font-medium text-ink hover:text-accent transition-colors whitespace-nowrap shrink-0"
              >
                Sign in
              </Link>
              <Link href="/register" className="hidden lg:inline-flex shrink-0 whitespace-nowrap">
                <Button variant="primary" size="sm" hasBadge className="whitespace-nowrap">
                  Create account
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-control text-ink hover:bg-fill transition-colors shrink-0"
                aria-label="Open menu"
              >
                <MenuIcon size={20} />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-ink text-white p-6 sm:p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Logo size={40} inverted showWordmark={true} href="/" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-white/80 hover:text-white rounded-control transition-colors"
              aria-label="Close menu"
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="flex flex-col gap-6 my-auto py-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-sans font-semibold text-white/90 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-6 border-t border-ink-border">
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <Button variant="primary" className="w-full justify-center" hasBadge>
                Create account
              </Button>
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <Button variant="secondary" className="w-full justify-center">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
