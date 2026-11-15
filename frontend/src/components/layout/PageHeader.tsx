import React from 'react';

interface PageHeaderProps {
  /** Page title (rendered as <h1>) */
  title: string;
  /** Gray subtitle under the title */
  subtitle?: string;
  /** Optional action element shown to the right of the title */
  action?: React.ReactNode;
  /** Optional meta pill/label above title (JetBrains Mono) */
  meta?: string;
  /** Number of trailing words to render in Instrument Serif italic (default: 1 or 2) */
  italicWordsCount?: number;
  /** Whether the header sits directly on the page background gradient (white text + yellow italic) */
  onGradient?: boolean;
}

export function FormattedHeading({
  text,
  italicWordsCount = 1,
  onGradient = true,
  className = '',
}: {
  text: string;
  italicWordsCount?: number;
  onGradient?: boolean;
  className?: string;
}) {
  const words = text.trim().split(/\s+/);
  if (words.length <= italicWordsCount) {
    return (
      <span className={className}>
        <span className={`font-serif italic font-normal tracking-normal ${onGradient ? 'text-carnet-yellow' : 'text-accent'}`}>
          {text}
        </span>
      </span>
    );
  }

  const baseWords = words.slice(0, words.length - italicWordsCount).join(' ');
  const italicWords = words.slice(words.length - italicWordsCount).join(' ');

  return (
    <span className={className}>
      {baseWords}{' '}
      <span className={`font-serif italic font-normal tracking-normal ${onGradient ? 'text-carnet-yellow' : 'text-accent'}`}>
        {italicWords}
      </span>
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  meta,
  italicWordsCount = 1,
  onGradient = true,
}: PageHeaderProps) {
  return (
    <header className="mb-8 pt-2">
      {meta && (
        <p className="font-mono text-xs uppercase tracking-[0.05em] text-white/60 mb-2">
          {meta}
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1
          className={`font-sans text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight ${
            onGradient ? 'text-white' : 'text-ink'
          }`}
        >
          <FormattedHeading
            text={title}
            italicWordsCount={italicWordsCount}
            onGradient={onGradient}
          />
        </h1>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {subtitle && (
        <p
          className={`mt-2 text-base max-w-[680px] leading-relaxed ${
            onGradient ? 'text-white/80' : 'text-text-secondary'
          }`}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}
