'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';

export interface PublicFooterProps {
  basePath?: string;
  variant?: 'default' | 'compact';
}

export function PublicFooter({ basePath, variant = 'default' }: PublicFooterProps) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const prefix = basePath !== undefined ? basePath : (isLanding ? '' : '/');

  if (variant === 'compact') {
    const compactLinks = [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Contact', href: `${prefix}#contact` },
    ];

    return (
      <footer className="w-full bg-ink text-white rounded-t-card px-4 sm:px-6 md:px-16 py-6 sm:py-8 z-10">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          {/* Left: Logo and Copyright */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 shrink-0">
            <Logo size={32} inverted showWordmark={true} href="/" />
            <span className="hidden sm:inline text-white/40 select-none">•</span>
            <p className="font-mono text-xs text-white/70 uppercase tracking-wider whitespace-nowrap">
              &copy; 2026 The Founder&apos;s Carnet
            </p>
          </div>

          {/* Right: Privacy, Terms, Contact */}
          <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm font-sans text-white/70">
            {compactLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  const footerLinks = [
    { label: 'What it is', href: `${prefix}#what-it-is` },
    { label: 'How it works', href: `${prefix}#how-it-works` },
    { label: 'Roles', href: `${prefix}#roles` },
    { label: 'Contact', href: `${prefix}#contact` },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ];

  return (
    <footer className="w-full bg-ink text-white rounded-t-card px-4 sm:px-6 md:px-16 py-12 z-10">
      <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Logo with wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <Logo size={32} inverted showWordmark={true} href="/" />
        </div>

        {/* Center / Row: Sentence-case Hanken Grotesk footer links */}
        <div className="flex flex-wrap items-center justify-start gap-x-3 sm:gap-x-6 gap-y-2 text-xs sm:text-sm font-sans text-white/70">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Copyright */}
        <p className="font-mono text-xs text-white/70 uppercase tracking-wider whitespace-nowrap">
          &copy; 2026 The Founder&apos;s Carnet
        </p>
      </div>
    </footer>
  );
}
