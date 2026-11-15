import React from 'react';
import Link from 'next/link';

interface LogoProps {
  /** Size of the tile in pixels (default: 36) */
  size?: number;
  /** Whether to show the wordmark "The Founder's Carnet" (default: true) */
  showWordmark?: boolean;
  /** Optional link destination (default: '/') */
  href?: string;
  /** Custom classes for outer container */
  className?: string;
  /** Whether wordmark text is inverted (white) */
  inverted?: boolean;
}

export function LogoMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="#0A0A0A" />
      <path d="M45 0H52V22L48.5 18L45 22Z" fill="#B15F2C" />
      <path d="M14 14H40V23H24V28.5H36V37.5H24V50H14Z" fill="#fff" />
    </svg>
  );
}

export function Logo({
  size = 36,
  showWordmark = true,
  href,
  className = '',
  inverted = false,
}: LogoProps) {
  const content = (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className={`font-sans font-semibold tracking-[-0.01em] text-base leading-none whitespace-nowrap ${
            inverted ? 'text-white' : 'text-ink'
          }`}
        >
          The Founder&apos;s Carnet
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center group focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
