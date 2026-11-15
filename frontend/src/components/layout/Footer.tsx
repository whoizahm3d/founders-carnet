import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function Footer() {
  return (
    <footer className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-auto py-8">
      <div className="border-t border-hairline pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Brand */}
        <Logo size={28} />

        {/* Right: Plain links */}
        <div className="flex items-center gap-6 font-mono text-xs uppercase tracking-[0.05em] text-text-secondary">
          <Link
            href="/privacy"
            className="hover:text-ink transition-colors focus:outline-none focus:underline"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hover:text-ink transition-colors focus:outline-none focus:underline"
          >
            Terms
          </Link>
          <Link
            href="mailto:contact@founderscarnet.pk"
            className="hover:text-ink transition-colors focus:outline-none focus:underline"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
