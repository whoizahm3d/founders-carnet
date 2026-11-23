'use client';

/**
 * Mentor Dashboard (/mentor/dashboard)
 * Rebuilt from design reference: mentor_dashboard_asad_khan
 * Conforms to DESIGN.md v3.9.2 and project rules:
 * - Sentence case headings and labels
 * - No em or en dashes (hyphens or commas only)
 * - Profile similarity label shown once per card (no funding probability claims)
 * - Language model simulation attribution notice without AI badges
 * - Mutual consent contact privacy: contact details hidden until both sides accept
 * - Pakistani context: Karachi, Lahore, Islamabad, PKR
 * - Fictional startup names only (Munshi Books, Mehran Works, Chenab Pay, Indus Logistics, Ravi Health, Korangi Tech, Bolan Commerce)
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  INITIAL_MENTOR_DASHBOARD_DATA,
  MentorshipRequest,
  MentorFounderMatch,
} from '@/fixtures/mentor-dashboard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ArrowRightIcon,
  LockIcon,
  CheckIcon,
} from '@/components/ui/icons';

export default function MentorDashboardPage() {
  const { user } = useAuth();
  const [data] = useState(INITIAL_MENTOR_DASHBOARD_DATA);

  // View state switcher: active dashboard vs first-time onboarding
  const [viewMode, setViewMode] = useState<'active' | 'onboarding'>('active');

  // Availability toggle: local state only, one label
  const [openToMentees, setOpenToMentees] = useState(data.profile.openToMentees);

  // Inbound requests interaction state
  const [requestDecisions, setRequestDecisions] = useState<
    Record<string, 'accepted' | 'declined'>
  >({});
  const [selectedRequest, setSelectedRequest] = useState<MentorshipRequest | null>(
    null
  );
  const [selectedMatch, setSelectedMatch] = useState<MentorFounderMatch | null>(
    null
  );

  const displayName = user?.fullName || data.profile.fullName;
  const firstName = displayName.split(' ')[0] || 'Asad';

  const pendingRequestsCount = data.incomingRequests.filter(
    (req) => !requestDecisions[req.id]
  ).length;

  const handleAcceptRequest = (id: string) => {
    setRequestDecisions((prev) => ({ ...prev, [id]: 'accepted' }));
    if (selectedRequest?.id === id) {
      setSelectedRequest(null);
    }
  };

  const handleDeclineRequest = (id: string) => {
    setRequestDecisions((prev) => ({ ...prev, [id]: 'declined' }));
    if (selectedRequest?.id === id) {
      setSelectedRequest(null);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto space-y-8 pb-12 antialiased">
      {/* 1. Sub-Header Bar: Breadcrumb and View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-white/95 backdrop-blur-md border border-hairline-subtle shadow-sm self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="font-mono text-xs uppercase tracking-[0.05em] text-text font-medium">
            Mentor
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
          <button
            type="button"
            onClick={() => setViewMode('active')}
            className={`px-3.5 py-1.5 rounded-pill text-xs font-mono uppercase tracking-[0.05em] transition-all duration-200 min-h-[36px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
              viewMode === 'active'
                ? 'bg-ink text-white font-semibold shadow-sm'
                : 'text-text-secondary hover:text-ink'
            }`}
          >
            Active dashboard
          </button>
          <button
            type="button"
            onClick={() => setViewMode('onboarding')}
            className={`px-3.5 py-1.5 rounded-pill text-xs font-mono uppercase tracking-[0.05em] transition-all duration-200 min-h-[36px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
              viewMode === 'onboarding'
                ? 'bg-ink text-white font-semibold shadow-sm'
                : 'text-text-secondary hover:text-ink'
            }`}
          >
            First-time onboarding
          </button>
        </div>
      </div>

      {/* 2. Hero Greeting Section */}
      <section
        aria-labelledby="mentor-welcome-heading"
        className="flex flex-col gap-4 text-white"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill bg-white/95 backdrop-blur border border-hairline-subtle shadow-sm self-start">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.05em] font-bold text-accent-deep">
              {data.profile.verificationBadgeText}
            </span>
          </div>

          {/* Availability Toggle */}
          <div className="inline-flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-2 rounded-pill border border-hairline-subtle shadow-sm self-start sm:self-auto">
            <span className="font-mono text-xs uppercase tracking-[0.05em] font-semibold text-text select-none">
              Open to new mentees
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={openToMentees}
              onClick={() => setOpenToMentees((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                openToMentees ? 'bg-accent' : 'bg-disabled'
              }`}
            >
              <span className="sr-only">Toggle mentee availability</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  openToMentees ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 max-w-3xl">
          <h1
            id="mentor-welcome-heading"
            className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight font-sans"
          >
            Welcome back,{' '}
            <span className="font-serif italic font-normal text-carnet-yellow">
              {firstName}
            </span>
          </h1>
          <p className="font-sans text-base sm:text-lg text-white/90 leading-relaxed">
            <strong className="font-semibold text-white">
              {data.profile.roleTitle}
            </strong>{' '}
            · {data.profile.location} · Review inbound founder requests and
            manage your active mentees across Pakistan.
          </p>
        </div>
      </section>

      {/* VIEW A: ACTIVE DASHBOARD */}
      {viewMode === 'active' && (
        <div className="flex flex-col space-y-8 w-full transition-opacity duration-300">
          {/* 3. Dark Summary Card (Monolith / Ink Card) */}
          <section
            aria-label="Operational overview"
            className="relative w-full rounded-card bg-ink text-canvas p-6 sm:p-8 lg:p-10 shadow-card overflow-hidden border border-ink-border"
          >
            <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8">
              {/* Left Column: Operational Summary & Plain Counts */}
              <div className="flex-1 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    <span className="font-mono text-xs uppercase tracking-[0.05em] text-white/70 font-medium">
                      Atelier status
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                    Operational summary
                  </h2>
                </div>

                <div className="h-px w-full bg-ink-border" />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                  <div className="space-y-1">
                    <div className="text-3xl sm:text-4xl font-bold text-white font-mono tracking-tight">
                      {pendingRequestsCount}
                    </div>
                    <div className="text-sm font-semibold text-white/90">
                      Inbound requests
                    </div>
                    <p className="text-xs text-text-muted">
                      Pending advisory review
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl sm:text-4xl font-bold text-white font-mono tracking-tight">
                      {data.activeMentees.length}
                    </div>
                    <div className="text-sm font-semibold text-white/90">
                      Active mentees
                    </div>
                    <p className="text-xs text-text-muted">
                      Ongoing founder engagements
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl sm:text-4xl font-bold text-white font-mono tracking-tight">
                      {data.founderMatches.length}
                    </div>
                    <div className="text-sm font-semibold text-white/90">
                      Advisory matches
                    </div>
                    <p className="text-xs text-text-muted">
                      Suggested by profile similarity
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Expertise & Focus Areas Panel */}
              <div className="lg:w-80 bg-ink-raised rounded-2xl p-5 border border-ink-border flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-[0.05em] text-white/70 font-semibold">
                      Advisory focus
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.profile.expertiseAreas.map((area) => (
                      <span
                        key={area}
                        className="px-2.5 py-1 rounded-pill bg-ink-border/80 text-white/90 font-mono text-xs tracking-tight"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-ink-border/50">
                  <Link
                    href="/mentor/profile"
                    className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.05em] text-accent hover:text-white transition-colors py-1 focus:outline-none focus-visible:underline"
                  >
                    <span>Update advisory profile</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Two-Column Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Recommended Founders (Wide: 7 cols) */}
            <section
              aria-labelledby="recommended-founders-heading"
              className="lg:col-span-7 bg-card rounded-card border border-row-line p-6 sm:p-8 shadow-sm space-y-6"
            >
              <div className="space-y-2 border-b border-row-line pb-4">
                <div className="flex items-center justify-between">
                  <h2
                    id="recommended-founders-heading"
                    className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-sans"
                  >
                    Recommended{' '}
                    <span className="font-serif italic font-normal text-accent">
                      founders
                    </span>
                  </h2>
                  <Badge variant="accent">
                    {data.founderMatches.length} matches
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Profile similarity, not a funding probability. Contact
                  details stay hidden until both sides accept.
                </p>
              </div>

              {data.founderMatches.length === 0 ? (
                <EmptyState
                  title="No founder matches yet"
                  description="When new Pakistani founders match your advisory criteria, they will appear here."
                />
              ) : (
                <div className="space-y-4">
                  {data.founderMatches.map((match) => (
                    <article
                      key={match.id}
                      className="p-5 rounded-2xl border border-hairline hover:border-accent/40 hover:shadow-card-hover transition-all bg-card space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs uppercase tracking-[0.05em] text-text-muted font-bold">
                              {match.index}.
                            </span>
                            <h3 className="font-bold text-ink text-base">
                              {match.founderName}
                            </h3>
                            <span className="text-xs text-text-secondary">
                              · {match.startupName}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted">
                            {match.sector} · {match.stage} · {match.city}
                          </p>
                        </div>

                        {/* Similarity Score Badge & Single Caption per Card */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="accent" className="font-bold">
                            {match.similarityScore}%
                          </Badge>
                          <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-text-muted font-medium">
                            Profile similarity
                          </span>
                        </div>
                      </div>

                      {/* Simulation Note & Context */}
                      <div className="bg-fill/60 rounded-xl p-3 space-y-1.5 border border-hairline-subtle">
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {match.simulationContext}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.05em] text-text-muted">
                          Written by a language model simulation
                        </p>
                      </div>

                      {/* Tags & Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap gap-1.5">
                          {match.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-pill bg-fill text-text-secondary font-mono text-[11px]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedMatch(match)}
                            className="text-xs min-h-[44px] sm:min-h-[36px]"
                          >
                            View founder carnet
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* RIGHT COLUMN: Pending Requests & Active Mentees (Narrow: 5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card 1: Incoming Mentorship Requests */}
              <section
                aria-labelledby="pending-requests-heading"
                className="bg-card rounded-card border border-row-line p-6 shadow-sm space-y-5"
              >
                <div className="flex items-center justify-between border-b border-row-line pb-4">
                  <div>
                    <h2
                      id="pending-requests-heading"
                      className="text-xl font-bold tracking-tight text-ink font-sans"
                    >
                      Pending{' '}
                      <span className="font-serif italic font-normal text-accent">
                        requests
                      </span>
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Contact details stay hidden until both sides accept.
                    </p>
                  </div>
                  <Badge variant="accent">{pendingRequestsCount}</Badge>
                </div>

                {data.incomingRequests.length === 0 ? (
                  <EmptyState
                    title="No incoming requests"
                    description="You have no pending founder introduction requests."
                  />
                ) : (
                  <div className="space-y-4">
                    {data.incomingRequests.map((request) => {
                      const decision = requestDecisions[request.id];
                      return (
                        <article
                          key={request.id}
                          className="p-4 rounded-xl border border-hairline bg-card space-y-3 hover:border-ink transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-ink text-sm">
                                {request.startupName}
                              </h3>
                              <p className="text-[11px] text-text-muted">
                                {request.sectorAndStage} · {request.city} ·{' '}
                                {request.founderName}
                              </p>
                            </div>
                            <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-text-muted shrink-0">
                              {request.requestedAt}
                            </span>
                          </div>

                          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                            {request.requestNote}
                          </p>

                          {decision ? (
                            <div className="flex items-center justify-between pt-1">
                              <Badge
                                variant={
                                  decision === 'accepted' ? 'success' : 'default'
                                }
                              >
                                {decision === 'accepted'
                                  ? 'Request accepted'
                                  : 'Request declined'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                                className="text-xs min-h-[44px] sm:min-h-[36px]"
                              >
                                View details
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() =>
                                    handleAcceptRequest(request.id)
                                  }
                                  className="text-xs min-h-[44px] sm:min-h-[36px]"
                                >
                                  Accept request
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    handleDeclineRequest(request.id)
                                  }
                                  className="text-xs min-h-[44px] sm:min-h-[36px]"
                                >
                                  Decline
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                                className="text-xs min-h-[44px] sm:min-h-[36px]"
                              >
                                Details
                              </Button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Card 2: Active Mentees */}
              <section
                aria-labelledby="active-mentees-heading"
                className="bg-card rounded-card border border-row-line p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-row-line pb-3">
                  <h2
                    id="active-mentees-heading"
                    className="text-lg font-bold tracking-tight text-ink font-sans"
                  >
                    Active{' '}
                    <span className="font-serif italic font-normal text-accent">
                      mentees
                    </span>
                  </h2>
                  <Badge variant="default">{data.activeMentees.length}</Badge>
                </div>

                {data.activeMentees.length === 0 ? (
                  <EmptyState
                    title="No active mentees"
                    description="When you accept founder requests, active advisory relationships will appear here."
                  />
                ) : (
                  <div className="divide-y divide-hairline">
                    {data.activeMentees.map((mentee) => (
                      <div
                        key={mentee.id}
                        className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <h3 className="font-semibold text-ink text-sm">
                            {mentee.startupName}
                          </h3>
                          <p className="text-xs text-text-muted">
                            {mentee.founderName} · {mentee.city} · {mentee.sector}
                          </p>
                        </div>
                        <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-text-secondary bg-fill px-2.5 py-1 rounded-pill shrink-0">
                          {mentee.cadence}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: FIRST-TIME ONBOARDING */}
      {viewMode === 'onboarding' && (
        <section
          aria-labelledby="mentor-onboarding-heading"
          className="bg-card rounded-card border border-row-line p-6 sm:p-8 shadow-sm space-y-6"
        >
          <div className="border-b border-row-line pb-4 space-y-1">
            <h2
              id="mentor-onboarding-heading"
              className="text-2xl font-bold tracking-tight text-ink font-sans"
            >
              Mentor onboarding{' '}
              <span className="font-serif italic font-normal text-accent">
                guide
              </span>
            </h2>
            <p className="text-xs text-text-secondary">
              Configure your mentor profile, advisory focus, and availability
              to start receiving relevant founder introduction requests.
            </p>
          </div>

          <div className="space-y-4">
            {data.onboardingChecklist.map((step, idx) => (
              <div
                key={step.id}
                className="p-5 rounded-2xl border border-hairline bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-mono text-xs font-semibold ${
                      step.completed
                        ? 'bg-status-success text-white'
                        : 'bg-fill text-text-secondary'
                    }`}
                  >
                    {step.completed ? (
                      <CheckIcon className="w-3.5 h-3.5" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-ink text-sm sm:text-base">
                      {step.title}
                    </h3>
                    <p className="text-xs text-text-secondary max-w-xl">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="self-end sm:self-auto shrink-0">
                  {step.completed ? (
                    <Badge variant="success">Completed</Badge>
                  ) : (
                    <Link href={step.href}>
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-xs min-h-[44px] sm:min-h-[36px]"
                      >
                        {step.actionLabel}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MODAL 1: Request Details Dialog */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        title={
          selectedRequest ? (
            <div className="space-y-1">
              <span className="font-mono text-xs uppercase tracking-[0.05em] text-accent font-semibold">
                Inbound advisory request
              </span>
              <h3 className="text-xl font-bold text-ink">
                {selectedRequest.startupName}
              </h3>
            </div>
          ) : null
        }
      >
        {selectedRequest && (
          <div className="space-y-5 pt-2">
            <div className="p-3 bg-fill/60 rounded-xl space-y-1 border border-hairline-subtle text-xs text-text-secondary">
              <p>
                <strong className="text-ink">Founder:</strong>{' '}
                {selectedRequest.founderName}
              </p>
              <p>
                <strong className="text-ink">Venture:</strong>{' '}
                {selectedRequest.sectorAndStage} · {selectedRequest.city}
              </p>
              <p>
                <strong className="text-ink">Received:</strong>{' '}
                {selectedRequest.requestedAt}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase font-mono tracking-wider text-text">
                Request note
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed bg-card p-3 rounded-xl border border-hairline">
                {selectedRequest.requestNote}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase font-mono tracking-wider text-text">
                Proposed discussion topics
              </h4>
              <ul className="space-y-1.5 text-xs text-text-secondary list-disc pl-4">
                {selectedRequest.discussionTopics.map((topic, i) => (
                  <li key={i}>{topic}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-fill/50 border border-hairline-subtle space-y-1">
              <p className="text-xs text-text-secondary">
                {selectedRequest.simulationSummary}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.05em] text-text-muted">
                Written by a language model simulation
              </p>
            </div>

            {/* Contact Details Privacy Notice */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-wash border border-accent/20 text-xs text-accent-deep">
              <LockIcon className="w-4 h-4 shrink-0" />
              <span>Contact details stay hidden until both sides accept.</span>
            </div>

            {/* Dialog Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRequest(null)}
                className="text-xs min-h-[44px] sm:min-h-[36px]"
              >
                Close
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDeclineRequest(selectedRequest.id)}
                className="text-xs min-h-[44px] sm:min-h-[36px]"
              >
                Decline
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAcceptRequest(selectedRequest.id)}
                className="text-xs min-h-[44px] sm:min-h-[36px]"
              >
                Accept request
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL 2: Founder Match Details Dialog */}
      <Dialog
        open={!!selectedMatch}
        onOpenChange={(open) => !open && setSelectedMatch(null)}
        title={
          selectedMatch ? (
            <div className="space-y-1">
              <span className="font-mono text-xs uppercase tracking-[0.05em] text-accent font-semibold">
                Founder carnet preview
              </span>
              <h3 className="text-xl font-bold text-ink">
                {selectedMatch.founderName} · {selectedMatch.startupName}
              </h3>
            </div>
          ) : null
        }
      >
        {selectedMatch && (
          <div className="space-y-5 pt-2">
            <div className="flex items-center justify-between p-3 bg-fill/60 rounded-xl border border-hairline-subtle">
              <div className="text-xs text-text-secondary">
                <p>
                  <strong className="text-ink">Sector & Stage:</strong>{' '}
                  {selectedMatch.sector} · {selectedMatch.stage}
                </p>
                <p>
                  <strong className="text-ink">Location:</strong>{' '}
                  {selectedMatch.city}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="accent">
                  {selectedMatch.similarityScore}%
                </Badge>
                <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
                  Profile similarity
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase font-mono tracking-wider text-text">
                Advisory alignment analysis
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed bg-card p-3 rounded-xl border border-hairline">
                {selectedMatch.simulationContext}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.05em] text-text-muted">
                Written by a language model simulation
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedMatch.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-pill bg-fill text-text-secondary font-mono text-[11px]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-wash border border-accent/20 text-xs text-accent-deep">
              <LockIcon className="w-4 h-4 shrink-0" />
              <span>Contact details stay hidden until both sides accept.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedMatch(null)}
                className="text-xs min-h-[44px] sm:min-h-[36px]"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
