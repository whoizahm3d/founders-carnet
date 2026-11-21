'use client';

import React, { useState, useEffect } from 'react';
import { FormattedHeading } from '@/components/layout/PageHeader';

export interface LegalNavItem {
  id: string;
  label: string;
}

export interface LegalPageNavProps {
  pageTitle: string;
  lastUpdated: string;
  items: LegalNavItem[];
  summaryLines: string[];
}

export function LegalPageNav({
  pageTitle,
  lastUpdated,
  items,
  summaryLines,
}: LegalPageNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id || '');

  useEffect(() => {
    if (typeof window === 'undefined' || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -65% 0px',
        threshold: 0,
      }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  return (
    <div className="hidden lg:block lg:col-span-4 sticky top-24 space-y-6">
      {/* Title & Timestamp */}
      <div>
        <h1 className="text-4xl lg:text-5xl font-bold font-sans text-white tracking-tight leading-tight">
          <FormattedHeading text={pageTitle} italicWordsCount={1} onGradient={true} />
        </h1>
        <p className="font-mono text-xs text-white/70 uppercase tracking-wider mt-3">
          {lastUpdated}
        </p>
      </div>

      {/* Dark Glass Summary Card */}
      <aside
        aria-label="Summary note"
        className="glass-note-card p-6 text-white"
      >
        <span className="font-mono text-xs text-white/70 uppercase tracking-wider block mb-3">
          Summary
        </span>
        <ul className="space-y-2.5 text-sm text-white/90 font-sans">
          {summaryLines.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="text-white/60 select-none">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Sticky Table of Contents */}
      <nav aria-label="On this page" className="pt-2">
        <span className="font-mono text-xs text-white/70 uppercase tracking-wider block mb-3">
          On this page
        </span>
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = activeId === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={isActive ? 'location' : undefined}
                  className={`text-sm font-sans transition-colors block py-1 px-2 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    isActive
                      ? 'text-white font-medium bg-white/10'
                      : 'text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
