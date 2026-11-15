'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Logo } from '@/components/ui/Logo';

const PLATFORM_NOTES = [
  'Mutual consent introductions: Contact details remain hidden until both parties accept an introduction request.',
  'Profile similarity, not likelihood of success: matches are ranked by how well profiles fit, not funding odds.',
  'Human review for unclear profiles: a rejection is final after one appeal.',
];

const HOW_IT_WORKS_ROWS = [
  {
    index: '01',
    text: 'Create your account and choose a role.',
  },
  {
    index: '02',
    text: 'Build your profile; automated checks and a human reviewer verify it.',
  },
  {
    index: '03',
    text: 'See your readiness guide (founders) and matches by profile similarity.',
  },
  {
    index: '04',
    text: 'Request an introduction; contact details appear only after both sides accept.',
  },
];

export function AuthHeroPanel() {
  const [noteIndex, setNoteIndex] = useState(0);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotionRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotionRef.current = mediaQuery.matches;
      const handler = (e: MediaQueryListEvent) => {
        prefersReducedMotionRef.current = e.matches;
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  const goTo = useCallback((nextIdx: number) => {
    if (prefersReducedMotionRef.current) {
      setNoteIndex(nextIdx);
      return;
    }
    setDirection('out');
    setTimeout(() => {
      setNoteIndex(nextIdx);
      setDirection('in');
    }, 150);
  }, []);

  const prev = () => goTo((noteIndex - 1 + PLATFORM_NOTES.length) % PLATFORM_NOTES.length);
  const next = () => goTo((noteIndex + 1) % PLATFORM_NOTES.length);

  // Auto-advance every 6 seconds per DESIGN.md line 281
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      if (!prefersReducedMotionRef.current) {
        goTo((noteIndex + 1) % PLATFORM_NOTES.length);
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, noteIndex, goTo]);

  return (
    <div className="flex flex-col justify-center text-white lg:pt-8 w-full">
      {/* Mobile & Tablet Header Band with subtle ink scrim for WCAG contrast (>= 3:1 for large text) */}
      <div className="lg:hidden bg-ink/50 backdrop-blur-md rounded-card p-6 border border-white/10 mb-8 w-full max-w-auth-card mx-auto">
        <div className="mb-4 md:hidden">
          <Logo size={40} inverted href="/" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-[-0.02em] text-white">
          Introductions for{' '}
          <span className="block sm:inline text-4xl sm:text-5xl font-serif italic font-normal tracking-normal text-carnet-yellow mt-1 sm:mt-0">
            Pakistan&apos;s startup ecosystem.
          </span>
        </h1>
        <p className="mt-3 text-sm text-white/90 font-normal leading-relaxed">
          A network that introduces founders, talent, mentors and investors across Karachi, Lahore and Islamabad. Contact details stay private until both sides accept.
        </p>
      </div>

      {/* Desktop Headline: 60px bold sans, italic scaled up one step to 72px for optical weight */}
      <div className="hidden lg:block max-w-2xl">
        <h1 className="text-6xl font-bold leading-[1.08] tracking-[-0.025em] mb-6 text-white drop-shadow-sm">
          Introductions for{' '}
          <span className="font-serif italic font-normal tracking-normal text-7xl text-carnet-yellow">
            Pakistan&apos;s startup ecosystem.
          </span>
        </h1>

        {/* Editorial subline: exact text from DESIGN.md */}
        <p className="text-lg text-white/95 font-normal leading-relaxed max-w-xl mb-8">
          A network that introduces founders, talent, mentors and investors across Karachi, Lahore and Islamabad. Contact details stay private until both sides accept.
        </p>
      </div>

      {/* Dark translucent glass note card (hidden below md; below lg shares max-w-auth-card single column) */}
      <div
        className="hidden md:block glass-note-card p-6 sm:p-7 text-white w-full max-w-auth-card lg:max-w-xl"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        role="region"
        aria-label="Platform note"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-white/90">
            <svg
              className="w-4 h-4 text-carnet-yellow"
              fill="currentColor"
              viewBox="0 0 256 256"
              aria-hidden="true"
            >
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V120a8,8,0,0,1,0-16,16,16,0,0,1,16,16v48A8,8,0,0,1,144,176ZM116,84a12,12,0,1,1,12,12A12,12,0,0,1,116,84Z" />
            </svg>
            Platform note
          </span>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-medium text-white/80">
              {noteIndex + 1} of {PLATFORM_NOTES.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous note"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#B15F2C]"
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next note"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#B15F2C]"
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Note text: rises 8px and cross fades over 300ms */}
        <p
          className={`text-base sm:text-lg font-medium leading-relaxed text-white transition-all duration-300 ease-carnet ${
            direction === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          {PLATFORM_NOTES[noteIndex]}
        </p>
      </div>

      {/* Quiet How it works list under the note card (lg and up only) */}
      <div className="hidden lg:block mt-8 max-w-xl">
        <div className="border-t border-white/20">
          {HOW_IT_WORKS_ROWS.map((row) => (
            <div
              key={row.index}
              className="py-3 border-b border-white/15 flex items-start gap-4 text-white"
            >
              <span className="font-mono text-xs text-white/70 tracking-widest pt-0.5 select-none">
                {row.index}
              </span>
              <p className="text-xs text-white/90 font-normal leading-relaxed">
                {row.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
