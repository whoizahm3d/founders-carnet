import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { PublicFooter } from '@/components/layout/PublicFooter';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col justify-between text-ink relative selection:bg-accent-wash selection:text-accent-deep">
      {/* Top Header: desktop only (on mobile the header band is inside AuthHeroPanel) */}
      <header className="w-full px-4 sm:px-6 md:px-16 py-6 hidden md:flex items-center justify-between z-20">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto flex items-center justify-between">
          <Logo size={48} inverted href="/" />
          <nav
            aria-label="Quick links"
            className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-pill bg-white/70 backdrop-blur-glass border border-hairline/70 shadow-sm text-sm font-sans"
          >
            <Link
              href="/#what-it-is"
              className="px-2 py-1 rounded-pill text-ink hover:text-ink-raised transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              About
            </Link>
            <Link
              href="/#faq"
              className="px-2 py-1 rounded-pill text-ink hover:text-ink-raised transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              FAQ
            </Link>
            <Link
              href="/#contact"
              className="px-2 py-1 rounded-pill text-ink hover:text-ink-raised transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Contact
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full flex-grow flex items-center justify-center px-4 sm:px-6 md:px-16 py-6 md:py-10 z-10">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer: compact PublicFooter variant */}
      <PublicFooter variant="compact" />
    </div>
  );
}
