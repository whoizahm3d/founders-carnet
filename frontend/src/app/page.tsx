'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ChevronDownIcon, ArrowRightIcon } from '@/components/ui/icons';
import { PublicNav, PublicFooter } from '@/components/layout';
import { ProductPreview } from '@/components/landing/ProductPreview';

const PLATFORM_NOTES = [
  'Mutual consent introductions: Contact details remain hidden until both parties accept an introduction request.',
  'Profile similarity, not likelihood of success: matches are ranked by how well profiles fit, not funding odds.',
  'Human review for unclear profiles: a rejection can be appealed once, and the decision after the appeal is final.',
];

const HOW_IT_WORKS_ITEMS = [
  {
    index: '01',
    title: 'Create your account and choose a role.',
    description:
      'Sign up with your email and pick whether you are a founder, talent, mentor or investor.',
  },
  {
    index: '02',
    title: 'Build your profile; automated checks and a human reviewer verify it.',
    description:
      'Profiles go through automated checks, then a human reviewer reads them. Your profile goes live once it passes review.',
  },
  {
    index: '03',
    title: 'See your readiness guide (founders) and matches by profile similarity.',
    description:
      'Founders see a readiness score on a 1 to 5 rubric and a match feed. Other roles see their own matches.',
  },
  {
    index: '04',
    title: 'Request an introduction; contact details appear only after both sides accept.',
    description:
      'You send a request. If the other person accepts, both of you see each other\'s contact details at the same time.',
  },
];

const ROLES_ITEMS = [
  {
    title: 'Founders',
    purpose: 'You are building a company and need the right people around you.',
    whatYouGet:
      'a readiness guide on a 1 to 5 rubric, pitch practice, pitch feedback, and matches.',
  },
  {
    title: 'Talent',
    purpose: 'You are looking for a role at an early-stage startup.',
    whatYouGet:
      'a profile, a resume section, job listings, and matches with founding teams.',
  },
  {
    title: 'Mentors',
    purpose: 'You have advised companies and want to give back selectively.',
    whatYouGet: 'a profile and a requests queue to accept or decline.',
  },
  {
    title: 'Investors',
    purpose: 'You are evaluating early-stage companies in Pakistan.',
    whatYouGet:
      'a profile, a founders feed, and introduction requests to accept or decline.',
  },
];

const PRINCIPLES_ITEMS = [
  {
    title: 'A rubric guide, not a funding probability.',
    body: 'The readiness guide scores a founder profile against a fixed 1 to 5 rubric. It is a guide, not a prediction of whether you will raise money.',
  },
  {
    title: 'Profile similarity, not likelihood of success.',
    body: 'Matches are ranked by how well two profiles fit together. The platform does not predict outcomes.',
  },
  {
    title: 'Contact details after mutual acceptance.',
    body: 'Your contact information stays hidden until you and the other person both accept an introduction request. Neither side can reach the other before that.',
  },
  {
    title: 'Human review for unclear profiles.',
    body: 'Automated checks run first. A human reviewer reads any profile the checks cannot clear. A rejection can be appealed once, and the decision after the appeal is final.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Who can join?',
    a: 'Founders, talent, mentors and investors can sign up. Your profile goes through verification before your first introduction.',
  },
  {
    q: 'How are profiles verified?',
    a: 'Profiles go through automated checks followed by a human review. If anything needs to change, the reviewer will say what. The goal is to keep the network honest.',
  },
  {
    q: 'When do I see contact details?',
    a: 'You see another person\'s contact details only after you both accept an introduction request. If either side does not accept, no contact information is shared.',
  },
  {
    q: 'Does the platform help raise money or hire?',
    a: 'No. The platform makes introductions between people whose profiles are a good fit. What happens after that is up to you. There is no brokerage and no fee involved.',
  },
  {
    q: 'What happens if my profile is rejected?',
    a: 'You can appeal once with updated information. If the profile is rejected after the appeal, the decision is final.',
  },
];

export default function LandingPage() {
  const [noteIndex, setNoteIndex] = useState(0);
  const [noteDirection, setNoteDirection] = useState<'in' | 'out'>('in');
  const [isNotePaused, setIsNotePaused] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
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

  const goToNote = useCallback((nextIdx: number) => {
    if (prefersReducedMotionRef.current) {
      setNoteIndex(nextIdx);
      return;
    }
    setNoteDirection('out');
    setTimeout(() => {
      setNoteIndex(nextIdx);
      setNoteDirection('in');
    }, 150);
  }, []);

  const prevNote = () =>
    goToNote((noteIndex - 1 + PLATFORM_NOTES.length) % PLATFORM_NOTES.length);
  const nextNote = () =>
    goToNote((noteIndex + 1) % PLATFORM_NOTES.length);

  useEffect(() => {
    if (isNotePaused) return;
    const timer = setInterval(() => {
      if (!prefersReducedMotionRef.current) {
        goToNote((noteIndex + 1) % PLATFORM_NOTES.length);
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [isNotePaused, noteIndex, goToNote]);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex((current) => (current === idx ? null : idx));
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-accent-wash selection:text-accent-deep">
      {/* 1. Glass Pill TopNav */}
      <PublicNav />

      {/* 2. Hero Section (full-bleed sign-in gradient artwork, taller min-height) */}
      <section className="bg-hero-gradient min-h-hero lg:min-h-hero-desktop flex flex-col justify-center px-4 sm:px-6 md:px-16 py-16 sm:py-20 lg:py-24 text-white">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Headline, subline, CTAs */}
          <div className="lg:col-span-7">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
              Introductions for{' '}
              <span className="block sm:inline font-serif italic font-normal text-carnet-yellow tracking-normal text-4xl sm:text-5xl lg:text-6xl mt-1 sm:mt-0">
                Pakistan&apos;s startup ecosystem.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-white font-normal leading-relaxed max-w-xl mt-6">
              A network that introduces founders, talent, mentors and investors across Karachi, Lahore and Islamabad. Contact details stay private until both sides accept.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link href="/register" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto" hasBadge onDark>
                  Create account
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto" onDark>
                  Sign in
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Asymmetric floating note card and trust chip */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div
              className="glass-note-card p-6 sm:p-8 text-white w-full rounded-card"
              onMouseEnter={() => setIsNotePaused(true)}
              onMouseLeave={() => setIsNotePaused(false)}
              onFocus={() => setIsNotePaused(true)}
              onBlur={() => setIsNotePaused(false)}
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={prevNote}
                      aria-label="Previous note"
                      className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={nextNote}
                      aria-label="Next note"
                      className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <p
                className={`text-base font-medium leading-relaxed text-white transition-all duration-300 ease-carnet ${
                  noteDirection === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                }`}
              >
                {PLATFORM_NOTES[noteIndex]}
              </p>
            </div>

            {/* Trust chip without yellow dot, sentence-case Hanken Grotesk */}
            <div className="glass-note-card p-4 sm:p-6 text-white w-full rounded-card flex items-center justify-center text-center">
              <p className="font-sans text-xs text-white/90 font-medium">
                Contact details after mutual acceptance
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. What it is Section (on canvas) */}
      <section id="what-it-is" className="bg-canvas px-4 sm:px-6 md:px-16 py-16 lg:py-20">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-ink tracking-tight leading-tight">
              Finding the right people should not depend on who you already know.
            </h2>
          </div>

          <div className="lg:col-span-7 space-y-6 text-base sm:text-lg text-text-secondary leading-relaxed">
            <p>
              Early-stage teams in Pakistan rely on personal networks to find co-founders, advisors, investors and early hires. If your network is thin, the gap is real and hard to close on your own.
            </p>
            <p>
              The Founder&apos;s Carnet builds a profile for every member, gives founders a readiness guide on a 1 to 5 rubric, and ranks matches by how well two profiles fit. When you see a match you want to meet, you send an introduction request. Contact details appear only after the other side accepts.
            </p>
            <p>
              The platform makes introductions. It does not handle payments, broker deals, take shares, give legal or tax advice, or send outreach on your behalf.
            </p>
          </div>
        </div>
      </section>

      {/* 4. How it works Section (hairline list on canvas) */}
      <section id="how-it-works" className="bg-canvas px-4 sm:px-6 md:px-16 py-16 lg:py-20 border-t border-hairline-row">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-semibold text-ink tracking-tight mb-10">
            How it works
          </h2>

          <div className="border-t border-hairline-row">
            {HOW_IT_WORKS_ITEMS.map((item) => (
              <div
                key={item.index}
                className="py-6 border-b border-hairline-row px-4 -mx-4 rounded-control group hover:bg-fill transition-colors duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 sm:gap-6">
                    <span className="font-mono text-sm sm:text-base font-semibold text-text-muted tracking-wider pt-0.5 select-none">
                      {item.index}
                    </span>
                    <div>
                      <h3 className="text-lg sm:text-xl font-medium text-ink tracking-tight">
                        {item.title}
                      </h3>
                      <p className="text-sm sm:text-base text-text-secondary mt-2 leading-relaxed max-w-2xl">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-accent pt-1">
                    <ArrowRightIcon size={20} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Roles Section (hairline table on canvas) */}
      <section id="roles" className="bg-canvas px-4 sm:px-6 md:px-16 py-16 lg:py-20 border-t border-hairline-row">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-semibold text-ink tracking-tight mb-10">
            Roles
          </h2>

          <div className="border-t border-hairline-row">
            {ROLES_ITEMS.map((role) => (
              <div
                key={role.title}
                className="py-8 border-b border-hairline-row grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start"
              >
                <div className="lg:col-span-5">
                  <h3 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight">
                    {role.title}
                  </h3>
                  <p className="text-sm sm:text-base text-text-secondary mt-1 leading-relaxed">
                    {role.purpose}
                  </p>
                </div>
                <div className="lg:col-span-7">
                  {/* Sentence-case Hanken Grotesk label */}
                  <p className="font-sans text-xs text-text-muted mb-1">
                    What you get
                  </p>
                  <p className="text-base text-ink font-medium leading-relaxed">
                    {role.whatYouGet}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Product preview Section */}
      <ProductPreview />

      {/* 7. Principles Section (flat ink monolith, single column below lg) */}
      <section id="principles" className="bg-canvas px-4 sm:px-6 md:px-16 py-16 lg:py-20">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto">
          <div className="bg-ink rounded-card p-6 sm:p-10 lg:p-12 border border-ink-border text-white">
            {/* Sentence-case Hanken Grotesk eyebrow */}
            <span className="font-sans text-sm text-white/70 mb-3 block">
              Principles
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-8">
              Our commitments to the ecosystem.
            </h2>

            {/* Single column at 768 and below, 2-column only at lg and up */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 pt-4 border-t border-ink-border">
              {PRINCIPLES_ITEMS.map((item) => (
                <div key={item.title} className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm sm:text-base text-white/70 leading-relaxed font-normal">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ Accordion Section */}
      <section id="faq" className="bg-canvas px-4 sm:px-6 md:px-16 py-16 lg:py-20 border-t border-hairline-row">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-semibold text-ink tracking-tight mb-10">
            Frequently asked questions
          </h2>

          <div className="border-t border-hairline-row">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={item.q} className="border-b border-hairline-row">
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full py-6 flex items-center justify-between text-left focus:outline-none group"
                    aria-expanded={isOpen}
                  >
                    <span className="text-lg sm:text-xl font-medium text-ink group-hover:text-accent transition-colors">
                      {item.q}
                    </span>
                    <span
                      className={`ml-4 text-text-muted transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-ink' : ''
                      }`}
                    >
                      <ChevronDownIcon size={20} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pb-6 pr-6 text-base text-text-secondary leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Contact Section */}
      <section id="contact" className="bg-canvas px-4 sm:px-6 md:px-16 py-16 lg:py-20 border-t border-hairline-row">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <h2 className="text-3xl sm:text-4xl font-semibold text-ink tracking-tight mb-4">
              Get in touch
            </h2>
            <p className="text-base text-text-secondary leading-relaxed">
              Questions about the platform can be sent with this form once it is available.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-card rounded-card p-6 sm:p-8 border border-hairline-row shadow-glass space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink">
                  Your name
                </label>
                <input
                  type="text"
                  disabled
                  placeholder="Enter your name"
                  className="w-full h-12 px-4 rounded-control border border-input-border bg-fill text-ink/60 cursor-not-allowed text-base"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink">
                  Email address
                </label>
                <input
                  type="email"
                  disabled
                  placeholder="name@company.com"
                  className="w-full h-12 px-4 rounded-control border border-input-border bg-fill text-ink/60 cursor-not-allowed text-base"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink">
                  Message
                </label>
                <textarea
                  disabled
                  rows={4}
                  placeholder="Write your message here"
                  className="w-full p-4 rounded-control border border-input-border bg-fill text-ink/60 cursor-not-allowed text-base resize-none"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <button
                  type="button"
                  disabled
                  className="px-6 py-3 rounded-pill bg-disabled text-text-muted cursor-not-allowed font-medium text-sm"
                >
                  Send message
                </button>
                <span className="font-mono text-xs text-text-muted">
                  (Not available yet)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Closing Section and Footer (full-bleed sign-in gradient) */}
      <section className="bg-hero-gradient px-4 sm:px-6 md:px-16 py-16 sm:py-20 lg:py-20 text-center text-white">
        <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto flex flex-col items-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-8 max-w-2xl leading-tight">
            Ready for an introduction?
          </h2>
          <Link href="/register">
            <Button variant="primary" size="lg" hasBadge onDark>
              Create account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
            {/* Footer */}
      <PublicFooter />
    </div>
  );
}
