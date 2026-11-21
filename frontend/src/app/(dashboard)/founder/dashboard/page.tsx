'use client';

/**
 * Founder Dashboard (/founder/dashboard)
 * Rebuilt from design reference: founder_dashboard_bilal_ahmed
 * Follows DESIGN.md specifications for typography, tokens, spacing and layout.
 * Cites requirements: FR-1, FR-2, FR-3, FR-7, FR-10, FR-15.
 * FR-2: Readiness score is set by the system (language model); founders cannot edit it.
 */

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  INITIAL_FOUNDER_DASHBOARD_DATA,
} from '@/fixtures/founder-dashboard';
import { Dialog } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowRightIcon,
  LockIcon,
  ArrowUpRightIcon,
} from '@/components/ui/icons';

export default function FounderDashboardPage() {
  const { user } = useAuth();
  const [data] = useState(INITIAL_FOUNDER_DASHBOARD_DATA);

  // View state switcher: active dashboard vs first-time onboarding
  const [viewMode, setViewMode] = useState<'active' | 'onboarding'>('active');

  // Rubric modal state (read-only: score is set by the system per FR-2)
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);

  // Next actions state with completion tracking
  const [actions, setActions] = useState(data.nextActions);

  // Match request states
  const [requestedMatches, setRequestedMatches] = useState<Record<string, boolean>>({});

  // Composite score computed from fixture dimensions (read-only, set by system per FR-2)
  const currentCompositeScore = useMemo(() => {
    const dims = data.readiness.dimensions;
    const sum = dims.reduce((acc, dim) => acc + dim.score, 0);
    return parseFloat((sum / dims.length).toFixed(1));
  }, [data.readiness.dimensions]);

  const getTier = (score: number): string => {
    if (score < 1.5) return 'Foundational';
    if (score < 2.5) return 'Emerging';
    if (score < 3.8) return 'Traction ready';
    if (score < 4.5) return 'Scale';
    return 'Institutional';
  };

  const getProgressPercent = (score: number): number => {
    // 1.0 to 5.0 mapped to 0% to 100%
    const normalized = Math.max(0, Math.min(100, ((score - 1.0) / 4.0) * 100));
    return parseFloat(normalized.toFixed(1));
  };

  const toggleAction = (id: string) => {
    setActions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleMatchRequest = (id: string) => {
    setRequestedMatches((prev) => ({ ...prev, [id]: true }));
  };

  const openRubricModal = () => {
    setIsRubricModalOpen(true);
  };

  const pendingActionsCount = actions.filter((a) => !a.completed).length;
  const founderDisplayName = user?.fullName || data.company.founderName;
  const firstName = founderDisplayName.split(' ')[0] || 'Bilal';

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto space-y-8 pb-12 antialiased">
      {/* 1. Sub-Header Bar: Breadcrumb and View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-white/95 backdrop-blur-md border border-hairline-subtle shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="font-mono text-xs uppercase tracking-[0.05em] text-text font-medium">
            Founder
          </span>
          <span className="text-text-muted text-xs font-mono">/</span>
          <span className="font-mono text-xs uppercase tracking-[0.05em] text-ink font-bold">
            Dashboard
          </span>
        </div>

        {/* View Mode Switcher */}
        <div
          role="group"
          aria-label="Dashboard view mode"
          className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md p-1.5 rounded-pill border border-hairline-subtle shadow-sm self-start sm:self-auto"
        >
          <span className="font-mono text-xs uppercase tracking-[0.05em] text-text pl-2.5 pr-1 font-semibold select-none">
            View:
          </span>
          <button
            type="button"
            onClick={() => setViewMode('active')}
            className={`min-h-[32px] px-3.5 py-1 rounded-pill font-mono text-xs uppercase tracking-[0.05em] font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${viewMode === 'active'
              ? 'bg-ink text-white shadow-sm'
              : 'text-text-secondary hover:text-ink'
              }`}
          >
            Active dashboard
          </button>
          <button
            type="button"
            onClick={() => setViewMode('onboarding')}
            className={`min-h-[32px] px-3.5 py-1 rounded-pill font-mono text-xs uppercase tracking-[0.05em] font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${viewMode === 'onboarding'
              ? 'bg-ink text-white shadow-sm'
              : 'text-text-secondary hover:text-ink'
              }`}
          >
            First-time onboarding
          </button>
        </div>
      </div>

      {/* 2. Hero Greeting Section */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill bg-white/95 backdrop-blur border border-hairline-subtle shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.05em] font-bold text-accent-deep">
              {data.company.verificationBadgeText}
            </span>
          </div>

          <h1 className="font-sans text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white font-bold leading-tight">
            Welcome back,{' '}
            <span className="font-serif italic font-normal text-[#F5C842]">
              {firstName}
            </span>
          </h1>

          <p className="font-sans text-base sm:text-lg text-white/90 leading-relaxed">
            <strong className="font-semibold text-white">
              {data.company.companyName}
            </strong>{' '}
            · {data.company.sectorAndStage} · Track your readiness, next actions, and investor matches.
          </p>
        </div>
      </section>

      {/* VIEW A: ACTIVE DASHBOARD */}
      {viewMode === 'active' && (
        <div className="flex flex-col space-y-8 w-full transition-opacity duration-300">
          {/* 3. Hero Monolith Card: Readiness Rubric */}
          <section
            aria-label="Readiness Rubric Overview"
            className="relative w-full rounded-card bg-ink text-canvas p-6 sm:p-8 lg:p-10 shadow-card overflow-hidden"
          >
            <div className="relative z-10 flex flex-col justify-between space-y-8">
              {/* Top Meta Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span className="font-mono text-xs uppercase tracking-[0.05em] font-semibold text-canvas/80">
                    Readiness rubric · Updated today
                  </span>
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.05em] text-canvas/60 bg-white/10 px-3 py-1 rounded-pill self-start sm:self-auto border border-white/5">
                  Average across 7 dimensions
                </span>
              </div>

              {/* Metric Display and Interactive Visual Ruler */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Large Numeral Hero */}
                <div className="lg:col-span-4 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-sans text-5xl sm:text-6xl font-bold tracking-tight text-white leading-none">
                      {currentCompositeScore.toFixed(1)}
                    </span>
                    <span className="font-sans text-xl sm:text-2xl text-canvas/50 font-normal">
                      / 5.0
                    </span>
                  </div>
                  <p className="font-sans text-sm text-canvas/70 pt-1 leading-relaxed">
                    A rubric guide, not a funding probability.
                  </p>
                </div>

                {/* Dynamic Scale Ruler Container */}
                <div className="lg:col-span-8 flex flex-col space-y-4">
                  <div className="relative w-full pt-6 pb-2">
                    {/* Ruler Track Base */}
                    <div className="w-full h-3 rounded-pill bg-neutral-800 relative overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-pill transition-all duration-500"
                        style={{
                          width: `${getProgressPercent(currentCompositeScore)}%`,
                        }}
                      />
                    </div>

                    {/* Active Thumb Indicator Floating Bubble */}
                    <div
                      className="absolute top-0 -ml-5 flex flex-col items-center transition-all duration-500 pointer-events-none"
                      style={{
                        left: `${getProgressPercent(currentCompositeScore)}%`,
                      }}
                    >
                      <div className="px-2 py-0.5 rounded bg-white text-ink font-mono text-xs font-bold shadow-md">
                        {currentCompositeScore.toFixed(1)}
                      </div>
                      <div className="w-3.5 h-3.5 rounded-full bg-ink border-2 border-white shadow-sm mt-1" />
                    </div>

                    {/* Ruler Ticks and Phase Landmarks */}
                    <div className="relative w-full flex justify-between font-mono text-xs uppercase tracking-[0.05em] text-canvas/50 pt-3">
                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-canvas/80">1.0</span>
                        <span className="hidden sm:inline text-[10px] text-canvas/40 mt-0.5 lowercase">
                          foundational
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-canvas/80">2.0</span>
                        <span className="hidden sm:inline text-[10px] text-canvas/40 mt-0.5 lowercase">
                          emerging
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-white">
                          {currentCompositeScore.toFixed(1)}
                        </span>
                        <span className="hidden sm:inline text-[10px] text-[#E5884B] font-semibold mt-0.5 lowercase">
                          {getTier(currentCompositeScore)}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-canvas/80">4.0</span>
                        <span className="hidden sm:inline text-[10px] text-canvas/40 mt-0.5 lowercase">
                          scale
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-canvas/80">5.0</span>
                        <span className="hidden sm:inline text-[10px] text-canvas/40 mt-0.5 lowercase">
                          institutional
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footnote and Action Button Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 mt-2 border-t border-white/10">
                <div className="flex items-center gap-2 font-mono text-xs text-canvas/60">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span>
                    Last evaluated from:{' '}
                    <strong className="text-canvas/90 font-medium font-sans">
                      {data.readiness.evaluatedFrom}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={openRubricModal}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-pill bg-white text-ink hover:bg-canvas font-sans text-sm font-semibold transition-transform duration-150 hover:scale-[1.01] shadow-sm self-start sm:self-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <span>Inspect rubric breakdown</span>
                  <ArrowRightIcon size={16} />
                </button>
              </div>
            </div>
          </section>

          {/* 4. Two-Column Asymmetric Content Grid: Next Actions (7 cols) and Recent Feedback (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Next Actions Column (7 cols) */}
            <section
              aria-label="Next Actions"
              className="lg:col-span-7 bg-white rounded-card p-6 sm:p-8 shadow-card border border-row-line flex flex-col justify-between space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="font-sans text-xl font-bold text-ink">
                    Next actions
                  </h2>
                  <p className="font-sans text-xs sm:text-sm text-text-secondary">
                    Prioritized actions to strengthen your profile for investors
                  </p>
                </div>
                <span className="whitespace-nowrap px-3 py-1 rounded-pill bg-accent-wash text-accent-deep font-mono text-xs uppercase tracking-[0.05em] font-semibold">
                  {pendingActionsCount} pending
                </span>
              </div>

              {/* Action Rows List */}
              <div className="space-y-3">
                {actions.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 sm:p-5 rounded-2xl bg-canvas hover:bg-fill transition-colors flex items-start justify-between gap-4 border border-hairline-subtle"
                  >
                    <div className="flex items-start gap-3.5">
                      <input
                        type="checkbox"
                        checked={act.completed}
                        onChange={() => toggleAction(act.id)}
                        className="mt-1 h-4 w-4 rounded border-hairline text-accent focus:ring-accent cursor-pointer"
                        aria-label={`Mark ${act.title} as completed`}
                      />
                      <span className="font-mono text-xs font-bold text-accent mt-0.5">
                        {act.index}
                      </span>
                      <div className="space-y-1">
                        <h3
                          className={`font-sans text-sm sm:text-base font-semibold text-ink transition-opacity ${act.completed ? 'line-through opacity-60' : ''
                            }`}
                        >
                          {act.title}
                        </h3>
                        <p
                          className={`font-sans text-xs sm:text-sm text-text-secondary transition-opacity ${act.completed ? 'opacity-60' : ''
                            }`}
                        >
                          {act.description}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={act.href}
                      className="shrink-0 min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-canvas text-accent font-sans text-xs font-semibold shadow-sm transition border border-hairline focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <span>{act.actionLabel}</span>
                      <ArrowRightIcon size={14} />
                    </Link>
                  </div>
                ))}
              </div>

              {/* Footer Callout Note */}
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-fill text-text-secondary font-sans text-xs">
                <span className="font-mono text-accent font-bold text-sm">↑</span>
                <span>
                  Completing these items helps strengthen your readiness assessment score.
                </span>
              </div>
            </section>

            {/* Recent Pitch Feedback Column (5 cols) */}
            <section
              aria-label="Recent Pitch Feedback"
              className="lg:col-span-5 bg-white rounded-card p-6 sm:p-8 shadow-card border border-row-line flex flex-col justify-between space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="font-sans text-xl font-bold text-ink">
                    Recent pitch feedback
                  </h2>
                  <p className="font-sans text-xs text-text-secondary">
                    Practice simulation diagnostic logs
                  </p>
                </div>
                <Link
                  href="/founder/feedback"
                  className="font-sans text-xs text-accent hover:underline font-semibold"
                >
                  History
                </Link>
              </div>

              {/* Plain language model notice */}
              <div className="px-3 py-1.5 rounded-lg bg-canvas border border-hairline-subtle text-text-muted font-mono text-[11px] uppercase tracking-[0.05em]">
                {data.pitchFeedback[0]?.simulationMark}
              </div>

              {/* Feedback list */}
              <div className="space-y-3">
                {data.pitchFeedback.map((pf) => (
                  <div
                    key={pf.id}
                    className="p-4 rounded-2xl bg-canvas border border-hairline-subtle flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <span className="font-mono text-xs text-text-muted">
                        {pf.date}
                      </span>
                      <h4 className="font-sans text-sm font-semibold text-ink">
                        {pf.sessionTitle}
                      </h4>
                      <p className="font-sans text-xs text-accent font-medium">
                        {pf.gainNote}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-sans text-lg font-bold text-ink">
                        {pf.score.toFixed(1)}
                      </span>
                      <span className="font-sans text-xs text-text-muted">
                        {' '}
                        / {pf.maxScore.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/founder/feedback"
                className="min-h-[44px] inline-flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-fill hover:bg-canvas transition text-accent font-sans text-sm font-semibold border border-hairline-subtle focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <span>View latest feedback analysis</span>
                <ArrowRightIcon size={16} />
              </Link>
            </section>
          </div>

          {/* 5. Match Preview Section */}
          <section aria-label="Investor and Mentor Matches" className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div className="space-y-1">
                <h2 className="font-sans text-2xl font-bold text-white">
                  Investor and mentor{' '}
                  <span className="font-serif italic font-normal text-[#F5C842]">
                    matches
                  </span>
                </h2>
                <p className="font-sans text-sm text-white/80">
                  Ranked by thesis fit and profile similarity. Contact details stay hidden until both sides accept.
                </p>
              </div>
              <Link
                href="/founder/matches"
                className="inline-flex items-center gap-1.5 text-white hover:text-[#F5C842] font-sans text-sm font-semibold shrink-0 transition-colors"
              >
                <span>View all matches</span>
                <ArrowRightIcon size={16} />
              </Link>
            </div>

            {/* Match Cards Grid: 1 Featured (6 cols) + 2 Standard (3 cols each) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {data.matches.map((match) => {
                const isRequested = requestedMatches[match.id];

                if (match.isFeatured) {
                  return (
                    <article
                      key={match.id}
                      className="lg:col-span-6 bg-white rounded-card p-6 sm:p-7 shadow-card border border-row-line flex flex-col justify-between space-y-6 relative overflow-hidden"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-accent-wash flex items-center justify-center font-bold text-base text-accent-deep">
                              {match.initials}
                            </div>
                            <div>
                              <h3 className="font-sans text-lg font-semibold text-ink">
                                {match.name}
                              </h3>
                              <p className="font-sans text-sm text-text-secondary">
                                {match.titleAndFirm}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <Badge variant="default" className="font-bold">
                              {match.similarityScore}%
                            </Badge>
                            <span className="font-mono text-[10px] text-text-muted uppercase tracking-[0.05em] mt-0.5">
                              profile similarity
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {match.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-3 py-1 rounded-pill bg-fill text-ink font-sans text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="p-3.5 rounded-xl bg-canvas text-ink font-sans text-xs sm:text-sm space-y-1 border border-hairline-subtle">
                          <p className="font-mono text-xs uppercase tracking-[0.05em] text-accent-deep font-bold">
                            Why this match
                          </p>
                          <p className="leading-relaxed text-text-secondary">
                            {match.whyMatch}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-row-line">
                        <span className="font-sans text-xs text-text-muted">
                          {match.contactPolicy}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMatchRequest(match.id)}
                          disabled={isRequested}
                          className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-pill font-sans text-sm font-semibold shadow transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${isRequested
                            ? 'bg-ink/60 text-white cursor-default'
                            : 'bg-ink hover:bg-neutral-800 text-white'
                            }`}
                        >
                          <span>{isRequested ? 'Match requested ✓' : 'Request match'}</span>
                          {!isRequested && <ArrowUpRightIcon size={16} />}
                        </button>
                      </div>
                    </article>
                  );
                }

                return (
                  <article
                    key={match.id}
                    className="lg:col-span-3 bg-white rounded-card p-6 shadow-card border border-row-line flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-full bg-fill flex items-center justify-center font-bold text-sm text-ink">
                          {match.initials}
                        </div>
                        <div className="flex flex-col items-end">
                          <Badge variant="default" className="font-bold">
                            {match.similarityScore}%
                          </Badge>
                          <span className="font-mono text-[10px] text-text-muted uppercase tracking-[0.05em] mt-0.5">
                            profile similarity
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-sans text-base font-semibold text-ink">
                          {match.name}
                        </h3>
                        <p className="font-sans text-xs text-text-muted">
                          {match.titleAndFirm}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {match.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-0.5 rounded-pill bg-canvas text-text-secondary font-sans text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <p className="font-sans text-xs sm:text-sm text-text-secondary leading-relaxed">
                        {match.whyMatch}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-row-line">
                      <button
                        type="button"
                        onClick={() => handleMatchRequest(match.id)}
                        disabled={isRequested}
                        className={`w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-pill font-sans text-xs font-semibold transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${isRequested
                          ? 'bg-fill text-text-muted cursor-default'
                          : 'bg-fill hover:bg-neutral-200 text-ink'
                          }`}
                      >
                        <span>{isRequested ? 'Requested ✓' : 'Request match'}</span>
                      </button>
                      <p className="text-[11px] text-center font-sans text-text-muted">
                        {match.contactPolicy}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* VIEW B: FIRST-TIME ONBOARDING / EMPTY STATE */}
      {viewMode === 'onboarding' && (
        <div className="flex flex-col space-y-8 w-full transition-opacity duration-300">
          <section
            aria-label="Founder Onboarding Checklist"
            className="bg-white rounded-card p-8 sm:p-12 lg:p-14 shadow-card border border-row-line space-y-10"
          >
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-accent-wash text-accent-deep font-mono text-xs uppercase tracking-[0.05em] font-semibold">
                <span>Founder Onboarding Checklist</span>
              </div>

              <h2 className="font-sans text-2xl sm:text-3xl text-ink font-bold tracking-tight">
                Get your startup ready for{' '}
                <span className="font-serif italic font-normal text-accent">
                  introductions
                </span>
              </h2>

              <p className="font-sans text-base text-text-secondary leading-relaxed">
                The Founder&apos;s Carnet introduces verified founders to active capital and experienced mentors. Complete these three foundational steps to receive matched introductions.
              </p>
            </div>

            {/* 3 Step Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.onboardingSteps.map((step) => {
                const isStepTwo = step.stepNumber.includes('02');

                return (
                  <div
                    key={step.stepNumber}
                    className={`rounded-2xl p-6 flex flex-col justify-between space-y-6 border ${isStepTwo
                      ? 'bg-white shadow-sm ring-1 ring-accent/30 border-accent/20'
                      : 'bg-canvas border-row-line'
                      }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-accent">
                          {step.stepNumber}
                        </span>
                        <span
                          className={`font-mono text-xs font-semibold px-2.5 py-0.5 rounded-pill ${step.statusVariant === 'progress'
                            ? 'text-emerald-800 bg-emerald-50'
                            : step.statusVariant === 'ready'
                              ? 'text-accent-deep bg-accent-wash'
                              : 'text-text-muted bg-fill'
                            }`}
                        >
                          {step.statusText}
                        </span>
                      </div>

                      <h3 className="font-sans text-base font-semibold text-ink">
                        {step.title}
                      </h3>
                      <p className="font-sans text-xs sm:text-sm text-text-secondary leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    {isStepTwo ? (
                      <button
                        type="button"
                        onClick={openRubricModal}
                        className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-deep text-white font-sans text-xs font-semibold transition cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <span>{step.actionLabel}</span>
                        <ArrowRightIcon size={14} />
                      </button>
                    ) : step.disabled ? (
                      <button
                        type="button"
                        disabled
                        className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-fill text-text-muted font-sans text-xs font-semibold cursor-not-allowed"
                      >
                        <span>{step.actionLabel}</span>
                        <LockIcon size={14} />
                      </button>
                    ) : (
                      <Link
                        href={step.href}
                        className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ink hover:bg-neutral-800 text-white font-sans text-xs font-semibold transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <span>{step.actionLabel}</span>
                        <ArrowRightIcon size={14} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Introductions Locked Callout */}
            <div className="rounded-2xl border border-dashed border-hairline bg-canvas p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-wash flex items-center justify-center text-accent shrink-0">
                  <LockIcon size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-sans text-base font-semibold text-ink">
                    Curated Investor and Mentor Introductions Locked
                  </h4>
                  <p className="font-sans text-xs sm:text-sm text-text-secondary leading-relaxed">
                    Curated investor and mentor introductions become accessible after profile verification and initial readiness evaluation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('active')}
                className="shrink-0 min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-white hover:bg-canvas text-ink border border-row-line font-sans text-xs font-semibold shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <span>Preview sample matches</span>
                <ArrowRightIcon size={14} />
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 6. Interactive Rubric Breakdown & Evaluation Modal */}
      <Dialog
        open={isRubricModalOpen}
        onOpenChange={setIsRubricModalOpen}
        className="max-w-2xl p-0 overflow-hidden"
      >
        <div className="flex flex-col max-h-[85vh]">
          {/* Modal Header */}
          <div className="px-6 py-5 border-b border-row-line bg-canvas shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="font-mono text-xs uppercase tracking-[0.05em] text-text-muted font-semibold">
                Rubric Breakdown and Evaluation Model
              </span>
            </div>
            <h3 className="font-sans text-xl font-bold text-ink mt-1">
              7 core evaluation dimensions
            </h3>
            <p className="font-mono text-xs text-text-muted mt-1">
              Written by a language model simulation
            </p>
          </div>

          {/* Modeled Composite Score Banner */}
          <div className="bg-ink text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div>
              <span className="font-mono text-xs text-canvas/60 block uppercase tracking-[0.05em]">
                Modeled composite average
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-sans text-3xl font-bold text-white tracking-tight">
                  {currentCompositeScore.toFixed(1)}
                </span>
                <span className="font-sans text-sm text-canvas/60">/ 5.0</span>
                <span className="ml-2 px-2.5 py-0.5 rounded-pill font-mono text-xs font-semibold bg-white/10 text-[#F5C842]">
                  {getTier(currentCompositeScore)}
                </span>
              </div>
            </div>
            <div className="text-right max-w-[200px]">
              <p className="font-sans text-xs text-canvas/60 leading-tight">
                A rubric guide, not a funding probability.
              </p>
            </div>
          </div>

          {/* 7 Dimensions List (read-only, scores set by system per FR-2) */}
          <div className="p-6 divide-y divide-row-line overflow-y-auto space-y-3 flex-grow">
            {data.readiness.dimensions.map((dim) => (
              <div
                key={dim.id}
                className="pt-3 first:pt-0 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <h4 className="font-sans text-sm font-semibold text-ink">
                    {dim.number}. {dim.name}
                  </h4>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-fill text-text-secondary font-medium">
                    {dim.score} / {dim.maxScore}
                  </span>
                </div>
                <p className="font-sans text-xs text-text-secondary">
                  {dim.description}
                </p>
                <p className="font-sans text-xs text-text-muted border-l-2 border-accent/40 pl-2">
                  <span className="font-semibold text-ink">Next action:</span>{' '}
                  {dim.nextAction}
                </p>
              </div>
            ))}
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-row-line bg-canvas flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={() => setIsRubricModalOpen(false)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl border border-hairline text-text-secondary hover:bg-fill font-sans text-xs font-semibold transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
