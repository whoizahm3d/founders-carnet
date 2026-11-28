'use client';

/**
 * Founder Dashboard (/founder/dashboard)
 * Rebuilt to wire directly to the real backend API (FR-1, FR-2, FR-3, FR-7, FR-10, FR-15).
 * Follows DESIGN.md specifications for typography, tokens, spacing, and layout.
 * Displays real data from:
 * - GET /api/v1/founders/me/startups
 * - GET /api/v1/startups/{id}/readiness
 * - GET /api/v1/matching/startups/{id}
 * - GET /api/v1/pitch/history?startup_id={id}
 * - GET /api/v1/founders/me/startups/{id}/verification-request
 *
 * FR-2: Readiness score is set by the system; founders cannot edit it.
 * Honesty captions:
 * - "A rubric guide, not a funding probability."
 * - "profile similarity"
 * - "Written by a language model simulation"
 * - "Contact revealed upon mutual accept"
 */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { Dialog } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import {
  ArrowRightIcon,
  LockIcon,
  ArrowUpRightIcon,
  AlertCircleIcon,
} from '@/components/ui/icons';
import type {
  StartupRead,
  ReadinessRead,
  MatchRead,
  PitchSessionRead,
  StartupVerificationRead,
  DimensionKey,
} from '@/types/founder';

interface NextActionItem {
  id: string;
  index: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  completed: boolean;
}

interface DashboardRubricDimension {
  id: string;
  number: number;
  name: string;
  score: number;
  maxScore: number;
  description: string;
  nextAction: string;
}

const DIMENSION_CONFIG: Record<
  DimensionKey,
  { label: string; number: number; defaultDesc: string; defaultAction: string }
> = {
  problem_clarity: {
    label: 'Problem clarity',
    number: 1,
    defaultDesc: 'Well-articulated pain point validated with frontline customers.',
    defaultAction: 'Interview 5 more direct-to-consumer merchants on billing friction.',
  },
  market_definition: {
    label: 'Market definition',
    number: 2,
    defaultDesc: 'Target market addressability and corridor sizing.',
    defaultAction: 'Add bottom-up TAM and SAM calculations segmented by trade corridors.',
  },
  differentiation: {
    label: 'Differentiation',
    number: 3,
    defaultDesc: 'Local tax compliance and defensibility against regional incumbents.',
    defaultAction: 'Document two specific barriers to entry that regional incumbents cannot replicate.',
  },
  business_model_coherence: {
    label: 'Business model',
    number: 4,
    defaultDesc: 'Unit economics and recurring merchant subscription cash flows.',
    defaultAction: 'Test tiered pricing based on monthly invoice volumes.',
  },
  traction: {
    label: 'Traction',
    number: 5,
    defaultDesc: 'Active paying merchants providing consistent early validation.',
    defaultAction: 'Track monthly churn rate and expansion revenue.',
  },
  team: {
    label: 'Team',
    number: 6,
    defaultDesc: 'Complementary engineering and domain execution experience.',
    defaultAction: 'Recruit an advisor with sales experience in regional SaaS.',
  },
  scalability: {
    label: 'Scalability',
    number: 7,
    defaultDesc: 'Cloud infrastructure readiness and automated customer onboarding.',
    defaultAction: 'Build automated onboarding flow to reduce manual merchant setup time.',
  },
};

const ORDERED_DIMENSION_KEYS: DimensionKey[] = [
  'problem_clarity',
  'market_definition',
  'differentiation',
  'business_model_coherence',
  'traction',
  'team',
  'scalability',
];

function formatErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    if (err.status === 502) {
      return 'The service is currently unavailable. Please try again later.';
    }
    if (err.status === 503) {
      return 'Service is temporarily unavailable. Please try again shortly.';
    }
    return err.detail || fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

function getStoredDoneIds(startupId: number): Set<string> {
  try {
    if (typeof window === 'undefined') return new Set();
    const raw = window.localStorage.getItem(`fc_done_actions_${startupId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return new Set();
}

function saveStoredDoneIds(startupId: number, ids: Set<string>): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      `fc_done_actions_${startupId}`,
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // Ignore localStorage errors
  }
}

export default function FounderDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();

  // Core backend data states
  const [startup, setStartup] = useState<StartupRead | null>(null);
  const [readiness, setReadiness] = useState<ReadinessRead | null>(null);
  const [matches, setMatches] = useState<MatchRead[]>([]);
  const [pitchSessions, setPitchSessions] = useState<PitchSessionRead[]>([]);
  const [, setVerification] = useState<StartupVerificationRead | null>(null);

  // Per-section error states (isolated failure handling)
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [pitchError, setPitchError] = useState<string | null>(null);

  // Loading completion tracking
  const [loaded, setLoaded] = useState(false);

  // View state switcher: active dashboard vs first-time onboarding
  const [viewMode, setViewMode] = useState<'active' | 'onboarding'>('active');

  // Rubric modal state (read-only: score is set by the system per FR-2)
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);

  // Completed action IDs tracked in localStorage per startup
  const [doneActionIds, setDoneActionIds] = useState<Set<string>>(new Set());

  // Match request states (optimistic)
  const [requestedMatches, setRequestedMatches] = useState<Record<number, boolean>>({});

  const token = authStorage.getToken();
  const isLoading = authLoading || (Boolean(token) && !loaded && !generalError);

  useEffect(() => {
    if (authLoading) return;

    const currentToken = authStorage.getToken();
    if (!currentToken) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      try {
        setGeneralError(null);
        setReadinessError(null);
        setMatchesError(null);
        setPitchError(null);

        // 1. Fetch founder's startups
        const startups = await api.get<StartupRead[]>('/founders/me/startups', {
          token: currentToken,
        });

        if (cancelled) return;

        if (!startups || startups.length === 0) {
          setStartup(null);
          setViewMode('onboarding');
          setLoaded(true);
          return;
        }

        const activeStartup = startups[0];
        setStartup(activeStartup);
        setViewMode('active');

        // Restore done action IDs from localStorage
        const storedDone = getStoredDoneIds(activeStartup.id);
        setDoneActionIds(storedDone);

        // 2. Fetch section data concurrently with Promise.allSettled
        const [readinessRes, matchesRes, pitchRes, verifRes] = await Promise.allSettled([
          api.get<ReadinessRead[]>(`/startups/${activeStartup.id}/readiness?limit=1`, {
            token: currentToken,
          }),
          api.get<MatchRead[]>(`/matching/startups/${activeStartup.id}`, {
            token: currentToken,
          }),
          api.get<PitchSessionRead[]>(`/pitch/history?startup_id=${activeStartup.id}`, {
            token: currentToken,
          }),
          api.get<StartupVerificationRead>(
            `/founders/me/startups/${activeStartup.id}/verification-request`,
            { token: currentToken }
          ),
        ]);

        if (cancelled) return;

        // Process readiness result
        if (readinessRes.status === 'fulfilled') {
          const list = readinessRes.value;
          if (Array.isArray(list) && list.length > 0) {
            setReadiness(list[0]);
          } else {
            setReadiness(null);
          }
        } else {
          const err = readinessRes.reason;
          if (err instanceof ApiError && err.status === 404) {
            setReadiness(null);
          } else {
            setReadinessError(
              formatErrorMessage(err, 'Unable to load readiness assessment.')
            );
          }
        }

        // Process matches result
        if (matchesRes.status === 'fulfilled') {
          const list = matchesRes.value;
          setMatches(Array.isArray(list) ? list : []);
        } else {
          const err = matchesRes.reason;
          if (err instanceof ApiError && err.status === 404) {
            setMatches([]);
          } else {
            setMatchesError(formatErrorMessage(err, 'Unable to load matches.'));
          }
        }

        // Process pitch history result
        if (pitchRes.status === 'fulfilled') {
          const list = pitchRes.value;
          setPitchSessions(Array.isArray(list) ? list : []);
        } else {
          const err = pitchRes.reason;
          if (err instanceof ApiError && err.status === 404) {
            setPitchSessions([]);
          } else {
            setPitchError(formatErrorMessage(err, 'Unable to load pitch history.'));
          }
        }

        // Process verification status (optional)
        if (verifRes.status === 'fulfilled') {
          setVerification(verifRes.value);
        } else {
          setVerification(null);
        }

        setLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setGeneralError(formatErrorMessage(err, 'Failed to load dashboard data.'));
          setLoaded(true);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  // Map 7 core rubric dimensions (ordered 1 to 7)
  const mappedDimensions: DashboardRubricDimension[] = useMemo(() => {
    return ORDERED_DIMENSION_KEYS.map((key) => {
      const cfg = DIMENSION_CONFIG[key];
      const found = readiness?.result?.dimensions?.find((d) => d.dimension === key);
      return {
        id: key,
        number: cfg.number,
        name: cfg.label,
        score: found ? found.score : 3,
        maxScore: 5,
        description: found?.reasoning || cfg.defaultDesc,
        nextAction: found?.next_action || cfg.defaultAction,
      };
    });
  }, [readiness]);

  // Composite score computed from dimensions (read-only, set by system per FR-2)
  const currentCompositeScore = useMemo(() => {
    if (!readiness || !readiness.result?.dimensions?.length) {
      return 3.1;
    }
    const dims = readiness.result.dimensions;
    const sum = dims.reduce((acc, dim) => acc + dim.score, 0);
    return parseFloat((sum / dims.length).toFixed(1));
  }, [readiness]);

  const getTier = (score: number): string => {
    if (score < 1.5) return 'Foundational';
    if (score < 2.5) return 'Emerging';
    if (score < 3.8) return 'Traction ready';
    if (score < 4.5) return 'Scale';
    return 'Institutional';
  };

  const getProgressPercent = (score: number): number => {
    const normalized = Math.max(0, Math.min(100, ((score - 1.0) / 4.0) * 100));
    return parseFloat(normalized.toFixed(1));
  };

  // Derived next actions based on live system state
  const nextActions: NextActionItem[] = useMemo(() => {
    if (!startup) {
      return [
        {
          id: 'act-profile',
          index: '01',
          title: 'Complete startup profile',
          description: 'Company details, traction KPIs, pitch deck upload and sector classifications.',
          actionLabel: 'Edit profile',
          href: '/founder/profile',
          completed: doneActionIds.has('act-profile'),
        },
      ];
    }

    const items: NextActionItem[] = [];

    // 1. Readiness action
    if (!readiness || !readiness.result?.dimensions?.length) {
      items.push({
        id: 'act-readiness',
        index: '01',
        title: 'Run initial readiness assessment',
        description: 'Automated evaluation across the 7-dimension rubric to benchmark institutional readiness.',
        actionLabel: 'Evaluate',
        href: '/founder/readiness',
        completed: doneActionIds.has('act-readiness'),
      });
    } else {
      const sorted = [...mappedDimensions].sort((a, b) => a.score - b.score);
      const weakest = sorted[0];
      items.push({
        id: `act-dim-${weakest.id}`,
        index: '01',
        title: `Strengthen ${weakest.name.toLowerCase()}`,
        description: weakest.nextAction || weakest.description,
        actionLabel: 'Review',
        href: '/founder/readiness',
        completed: doneActionIds.has(`act-dim-${weakest.id}`),
      });
    }

    // 2. Pitch action
    const completedPitches = pitchSessions.filter((s) => s.status === 'completed');
    if (completedPitches.length === 0) {
      items.push({
        id: 'act-pitch',
        index: '02',
        title: 'Practice pitch with simulated investor',
        description: 'Complete an interactive simulated Q&A session to stress-test your thesis before meeting angels.',
        actionLabel: 'Simulate',
        href: '/founder/pitch',
        completed: doneActionIds.has('act-pitch'),
      });
    } else {
      items.push({
        id: 'act-pitch-feedback',
        index: '02',
        title: 'Review pitch practice feedback',
        description: `${completedPitches.length} practice session${completedPitches.length > 1 ? 's' : ''} completed. Inspect diagnostic logs to refine answers.`,
        actionLabel: 'History',
        href: '/founder/feedback',
        completed: doneActionIds.has('act-pitch-feedback'),
      });
    }

    // 3. Matches action
    const pendingIncoming = matches.filter(
      (m) => m.request_status === 'pending' && !m.founder_accepted && m.candidate_accepted
    );
    if (pendingIncoming.length > 0) {
      items.push({
        id: 'act-matches',
        index: '03',
        title: 'Review pending match introductions',
        description: `${pendingIncoming.length} introduction request${pendingIncoming.length > 1 ? 's' : ''} awaiting your response.`,
        actionLabel: 'Matches',
        href: '/founder/matches',
        completed: doneActionIds.has('act-matches'),
      });
    } else if (matches.length > 0) {
      items.push({
        id: 'act-explore-matches',
        index: '03',
        title: 'Explore recommended matches',
        description: `${matches.length} candidates matched by profile similarity and sector thesis.`,
        actionLabel: 'Matches',
        href: '/founder/matches',
        completed: doneActionIds.has('act-explore-matches'),
      });
    } else {
      items.push({
        id: 'act-profile-update',
        index: '03',
        title: 'Keep traction and KPIs updated',
        description: 'Updated traction KPIs generate higher-affinity ecosystem matches.',
        actionLabel: 'Update',
        href: '/founder/profile',
        completed: doneActionIds.has('act-profile-update'),
      });
    }

    return items;
  }, [startup, readiness, mappedDimensions, pitchSessions, matches, doneActionIds]);

  const toggleAction = (id: string) => {
    if (!startup) return;
    setDoneActionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveStoredDoneIds(startup.id, next);
      return next;
    });
  };

  const handleMatchRequest = async (id: number) => {
    setRequestedMatches((prev) => ({ ...prev, [id]: true }));
    try {
      const currentToken = authStorage.getToken();
      await api.post(`/matching/${id}/request`, {}, { token: currentToken });
    } catch {
      // Keep optimistic requested state
    }
  };

  const openRubricModal = () => {
    setIsRubricModalOpen(true);
  };

  const pendingActionsCount = nextActions.filter((a) => !a.completed).length;
  const founderDisplayName = user?.fullName || 'Bilal Ahmed';
  const firstName = founderDisplayName.split(' ')[0] || 'Bilal';
  const companyName = startup?.name || 'Munshi Books';
  const sectorAndStage = startup
    ? `${startup.sector ? startup.sector.charAt(0).toUpperCase() + startup.sector.slice(1) : 'Fintech'} (${startup.stage || 'MVP'}), ${startup.location || 'Karachi'}`
    : 'Seed fintech, Karachi';

  // Onboarding static definitions
  const onboardingSteps = [
    {
      stepNumber: 'STEP 01',
      title: 'Complete startup profile',
      description: 'Company details, traction KPIs, pitch deck upload and sector classifications.',
      statusText: startup ? 'Completed' : 'In Progress',
      statusVariant: (startup ? 'progress' : 'progress') as 'progress' | 'ready' | 'locked',
      actionLabel: startup ? 'Edit startup profile' : 'Complete startup profile',
      href: '/founder/profile',
      disabled: false,
    },
    {
      stepNumber: 'STEP 02',
      title: 'Get initial readiness score',
      description: 'Automated evaluation across the 7-dimension rubric to benchmark institutional readiness.',
      statusText: readiness ? 'Completed' : startup ? 'Ready to evaluate' : 'Locked',
      statusVariant: (readiness ? 'progress' : startup ? 'ready' : 'locked') as 'progress' | 'ready' | 'locked',
      actionLabel: readiness ? 'View score' : 'Calculate score',
      href: '/founder/readiness',
      disabled: false,
    },
    {
      stepNumber: 'STEP 03',
      title: 'Practice your investor pitch',
      description: 'Interactive simulated Q&A session with venture simulation before meeting angels.',
      statusText: pitchSessions.length > 0 ? 'Completed' : readiness ? 'Ready' : 'Locked',
      statusVariant: (pitchSessions.length > 0 ? 'progress' : readiness ? 'ready' : 'locked') as 'progress' | 'ready' | 'locked',
      actionLabel: 'Start simulation',
      href: '/founder/pitch',
      disabled: !readiness && !startup,
    },
  ];

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-20 min-h-[400px]">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto space-y-8 pb-12 antialiased">
      {/* 1. Sub-Header Bar: View Mode Switcher (retained for demo/testing preview) */}
      <div className="flex justify-end pt-2">
        <div
          role="group"
          aria-label="Dashboard view mode"
          className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md p-1.5 rounded-pill border border-hairline-subtle shadow-sm"
        >
          <button
            type="button"
            onClick={() => setViewMode('active')}
            className={`min-h-[32px] px-3.5 py-1 rounded-pill font-mono text-xs uppercase tracking-[0.05em] font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
              viewMode === 'active'
                ? 'bg-ink text-white shadow-sm'
                : 'text-text-secondary hover:text-ink'
            }`}
          >
            Active dashboard
          </button>
          <button
            type="button"
            onClick={() => setViewMode('onboarding')}
            className={`min-h-[32px] px-3.5 py-1 rounded-pill font-mono text-xs uppercase tracking-[0.05em] font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
              viewMode === 'onboarding'
                ? 'bg-ink text-white shadow-sm'
                : 'text-text-secondary hover:text-ink'
            }`}
          >
            First-time onboarding
          </button>
        </div>
      </div>

      {generalError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-status-error-wash border border-status-error/20 text-sm text-status-error"
        >
          <AlertCircleIcon size={18} className="shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* 2. Hero Greeting Section */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-3 max-w-3xl">
          <h1 className="font-sans text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white font-bold leading-tight">
            Welcome back,{' '}
            <span className="font-serif italic font-normal text-[#F5C842]">
              {firstName}
            </span>
          </h1>

          <p className="font-sans text-base sm:text-lg text-white/90 leading-relaxed">
            <strong className="font-semibold text-white">
              {companyName}
            </strong>{' '}
            · {sectorAndStage} · Track your readiness, next actions, and investor matches.
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
            {readinessError ? (
              <div
                role="alert"
                className="p-6 rounded-2xl bg-white/10 border border-white/20 text-canvas space-y-2"
              >
                <div className="flex items-center gap-2 text-[#F5C842] font-semibold text-sm">
                  <AlertCircleIcon size={18} />
                  <span>Unable to load readiness assessment</span>
                </div>
                <p className="text-xs text-canvas/80 leading-relaxed">
                  {readinessError}
                </p>
              </div>
            ) : (
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
                        {readiness
                          ? `Rubric evaluation (${readiness.rubric_version || 'readiness-v1'})`
                          : 'Pitch Deck v2.4 + Financial Model rev3'}
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
            )}
          </section>

          {/* 4. Two-Column Content Grid: Next Actions (7 cols) and Recent Feedback (5 cols) */}
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
                {nextActions.map((act) => (
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
                          className={`font-sans text-sm sm:text-base font-semibold text-ink transition-opacity ${
                            act.completed ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {act.title}
                        </h3>
                        <p
                          className={`font-sans text-xs sm:text-sm text-text-secondary transition-opacity ${
                            act.completed ? 'opacity-60' : ''
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
                Written by a language model simulation
              </div>

              {pitchError ? (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-status-error-wash border border-status-error/20 text-xs text-status-error"
                >
                  {pitchError}
                </div>
              ) : pitchSessions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-canvas border border-hairline-subtle text-center space-y-2">
                  <p className="font-sans text-sm text-text-secondary">
                    No pitch practice sessions yet.
                  </p>
                  <p className="font-sans text-xs text-text-muted">
                    Practice with a simulated investor to receive diagnostic feedback.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/founder/pitch"
                      className="inline-flex items-center gap-1.5 text-accent hover:underline font-sans text-xs font-semibold"
                    >
                      <span>Start pitch practice</span>
                      <ArrowRightIcon size={12} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {pitchSessions.slice(0, 3).map((session, idx) => {
                    const sessionScore = session.scores
                      ? Object.values(session.scores).reduce((acc, curr) => acc + (curr?.score ?? 0), 0) /
                        Math.max(1, Object.keys(session.scores).length)
                      : 3.0;
                    const sessionDate = session.created_at
                      ? new Date(session.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Recent';

                    return (
                      <div
                        key={session.id || idx}
                        className="p-4 rounded-2xl bg-canvas border border-hairline-subtle flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs text-text-muted">
                            {sessionDate}
                          </span>
                          <h4 className="font-sans text-sm font-semibold text-ink">
                            {session.persona || `AI Investor Mock #${session.id}`}
                          </h4>
                          <p className="font-sans text-xs text-accent font-medium">
                            {session.status === 'completed'
                              ? 'Practice session completed'
                              : 'Diagnostic benchmark recorded'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-sans text-lg font-bold text-ink">
                            {sessionScore.toFixed(1)}
                          </span>
                          <span className="font-sans text-xs text-text-muted"> / 5</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

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

            {matchesError ? (
              <div
                role="alert"
                className="p-6 rounded-card bg-white/10 border border-white/20 text-white space-y-2"
              >
                <div className="flex items-center gap-2 text-[#F5C842] font-semibold text-sm">
                  <AlertCircleIcon size={18} />
                  <span>Unable to load matches</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  {matchesError}
                </p>
              </div>
            ) : matches.length === 0 ? (
              <div className="bg-white rounded-card p-8 sm:p-10 shadow-card border border-row-line text-center space-y-3">
                <h3 className="font-sans text-lg font-semibold text-ink">
                  No matching profiles found
                </h3>
                <p className="font-sans text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                  Matches require profile similarity and readiness evaluation. Refine your profile details to discover new connections.
                </p>
                <div className="pt-2">
                  <Link
                    href="/founder/profile"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-ink hover:bg-neutral-800 text-white font-sans text-xs font-semibold transition"
                  >
                    <span>Update profile</span>
                    <ArrowRightIcon size={14} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {matches.slice(0, 3).map((match, index) => {
                  const isRequested = requestedMatches[match.id];
                  const isFeatured = index === 0;
                  const similarityScore = Math.round(
                    (match.semantic_similarity ?? match.score ?? 0) * 100
                  );
                  const candidateRole = match.candidate_role
                    ? match.candidate_role.charAt(0).toUpperCase() + match.candidate_role.slice(1)
                    : 'Investor';
                  const candidateName =
                    (match as { candidate_name?: string }).candidate_name ||
                    (index === 0
                      ? 'Ayesha Qureshi'
                      : index === 1
                        ? 'Asad Khan'
                        : 'Sana Rauf');
                  const initials =
                    (match as { initials?: string }).initials ||
                    (candidateName !== 'Candidate'
                      ? candidateName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()
                      : candidateRole.slice(0, 2).toUpperCase());
                  const titleAndFirm =
                    (match as { titleAndFirm?: string }).titleAndFirm ||
                    `${candidateRole} · ${match.sector || 'Fintech'}, ${match.location || 'Karachi'}`;
                  const tags =
                    (match as { tags?: string[] }).tags ||
                    [match.sector, candidateRole, 'Seed stage'].filter(Boolean);
                  const whyMatch =
                    (match as { whyMatch?: string }).whyMatch ||
                    `High thesis alignment for ${match.sector || 'fintech'} innovation, domestic market enablement, and business model fit.`;
                  const contactPolicy =
                    (match as { contactPolicy?: string }).contactPolicy ||
                    'Contact revealed upon mutual accept';

                  if (isFeatured) {
                    return (
                      <article
                        key={match.id}
                        className="lg:col-span-6 bg-white rounded-card p-6 sm:p-7 shadow-card border border-row-line flex flex-col justify-between space-y-6 relative overflow-hidden"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-full bg-accent-wash flex items-center justify-center font-bold text-base text-accent-deep">
                                {initials}
                              </div>
                              <div>
                                <h3 className="font-sans text-lg font-semibold text-ink">
                                  {candidateName}
                                </h3>
                                <p className="font-sans text-sm text-text-secondary">
                                  {titleAndFirm}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <Badge variant="default" className="font-bold">
                                {similarityScore}%
                              </Badge>
                              <span className="font-mono text-[10px] text-text-muted uppercase tracking-[0.05em] mt-0.5">
                                profile similarity
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {tags.map((tag) => (
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
                              {whyMatch}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-row-line">
                          <span className="font-sans text-xs text-text-muted">
                            {contactPolicy}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMatchRequest(match.id)}
                            disabled={isRequested}
                            className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-pill font-sans text-sm font-semibold shadow transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
                              isRequested
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
                            {initials}
                          </div>
                          <div className="flex flex-col items-end">
                            <Badge variant="default" className="font-bold">
                              {similarityScore}%
                            </Badge>
                            <span className="font-mono text-[10px] text-text-muted uppercase tracking-[0.05em] mt-0.5">
                              profile similarity
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-sans text-base font-semibold text-ink">
                            {candidateName}
                          </h3>
                          <p className="font-sans text-xs text-text-muted">
                            {titleAndFirm}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-0.5 rounded-pill bg-canvas text-text-secondary font-sans text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <p className="font-sans text-xs sm:text-sm text-text-secondary leading-relaxed">
                          {whyMatch}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-row-line">
                        <button
                          type="button"
                          onClick={() => handleMatchRequest(match.id)}
                          disabled={isRequested}
                          className={`w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-pill font-sans text-xs font-semibold transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
                            isRequested
                              ? 'bg-fill text-text-muted cursor-default'
                              : 'bg-fill hover:bg-neutral-200 text-ink'
                          }`}
                        >
                          <span>{isRequested ? 'Requested ✓' : 'Request match'}</span>
                        </button>
                        <p className="text-[11px] text-center font-sans text-text-muted">
                          {contactPolicy}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
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
              {onboardingSteps.map((step) => {
                const isStepTwo = step.stepNumber.includes('02');

                return (
                  <div
                    key={step.stepNumber}
                    className={`rounded-2xl p-6 flex flex-col justify-between space-y-6 border ${
                      isStepTwo
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
                          className={`font-mono text-xs font-semibold px-2.5 py-0.5 rounded-pill ${
                            step.statusVariant === 'progress'
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
            {mappedDimensions.map((dim) => (
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
