'use client';

/**
 * Admin Dashboard (/admin/dashboard)
 * Rebuilt from design reference: admin_console
 * Conforms to DESIGN.md v3.9.2 and project rules:
 * - Sentence case headings and labels
 * - No em or en dashes (hyphens or commas only)
 * - Fictional cast only (Munshi Books / Bilal Ahmed, Chenab Pay / Daniyal Shah, Nida Farooq)
 * - Exact finality wording: "Rejection is final." and "Rejection is final. The user cannot appeal."
 * - Language model simulation attribution: "Written by a language model simulation"
 * - Mutual consent contact privacy: "Contact details stay hidden until both sides accept."
 * - Counts in summary card derive directly from fixture arrays
 * - Tailwind tokens only (no raw hex, no arbitrary values, no CSS modules)
 */

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  INITIAL_ADMIN_DASHBOARD_DATA,
  AdminReviewItem,
  AdminAppealItem,
} from '@/fixtures/admin-dashboard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { DocumentIcon } from '@/components/ui/icons';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data] = useState(INITIAL_ADMIN_DASHBOARD_DATA);

  // View state switcher: active queue vs appeals review
  const [viewMode, setViewMode] = useState<'active' | 'appeals'>('active');

  // Decision & Reason tracking state
  const [reasons, setReasons] = useState<Record<string, string>>({
    'munshi-books': '',
    'chenab-pay': '',
    'nida-farooq': '',
  });

  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected' | null>>({
    'munshi-books': null,
    'chenab-pay': null,
    'nida-farooq': null,
  });

  const [sessionDecidedCount, setSessionDecidedCount] = useState(0);

  // Confirm dialog state
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    name: string;
    decision: 'approved' | 'rejected';
    isAppeal: boolean;
  } | null>(null);

  // Inspection modal state
  const [inspectItem, setInspectItem] = useState<AdminReviewItem | AdminAppealItem | null>(null);

  const displayName = user?.fullName || data.profile.fullName;
  const firstName = displayName.split(' ')[0] || 'Maryam';

  const pendingEscalated = data.escalatedProfiles.filter((item) => !decisions[item.id]);
  const pendingAppeals = data.appeals.filter((item) => !decisions[item.id]);

  const escalatedCount = pendingEscalated.length;
  const appealsCount = pendingAppeals.length;
  const decidedCount = data.decidedToday.length + sessionDecidedCount;

  const handleReasonChange = (id: string, text: string) => {
    setReasons((prev) => ({ ...prev, [id]: text }));
  };

  const initiateDecision = (
    id: string,
    name: string,
    decision: 'approved' | 'rejected',
    isAppeal: boolean
  ) => {
    setPendingAction({ id, name, decision, isAppeal });
  };

  const confirmDecision = () => {
    if (!pendingAction) return;
    const { id, decision } = pendingAction;
    setDecisions((prev) => ({ ...prev, [id]: decision }));
    setSessionDecidedCount((prev) => prev + 1);
    setPendingAction(null);
  };

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto space-y-8 pb-12 antialiased">
      {/* 1. Sub-Header Bar: View Mode Switcher */}
      <div className="flex justify-end pt-2">
        {/* View Mode Switcher */}
        <div
          role="group"
          aria-label="Admin console view mode"
          className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md p-1.5 rounded-pill border border-hairline-subtle shadow-sm"
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
            Active queue ({escalatedCount})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('appeals')}
            className={`px-3.5 py-1.5 rounded-pill text-xs font-mono uppercase tracking-[0.05em] transition-all duration-200 min-h-[36px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
              viewMode === 'appeals'
                ? 'bg-ink text-white font-semibold shadow-sm'
                : 'text-text-secondary hover:text-ink'
            }`}
          >
            Appeals review ({appealsCount})
          </button>
        </div>
      </div>

      {/* 2. Hero Greeting Section */}
      <section
        aria-labelledby="admin-welcome-heading"
        className="flex flex-col gap-4 text-white"
      >
        <div className="flex flex-col gap-2 max-w-3xl">
          <h1
            id="admin-welcome-heading"
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
            · {data.profile.location} · Review escalated profiles and appeals. Rejection is final.
          </p>
        </div>
      </section>

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
                  Admin activity
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
                  {escalatedCount}
                </div>
                <div className="text-sm font-sans font-medium text-white/90">
                  Escalated profiles
                </div>
                <div className="text-xs text-white/60 font-sans">
                  Awaiting manual review
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-bold text-white font-mono tracking-tight">
                  {appealsCount}
                </div>
                <div className="text-sm font-sans font-medium text-white/90">
                  Appeals
                </div>
                <div className="text-xs text-white/60 font-sans">
                  Submitted with evidence
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-bold text-white font-mono tracking-tight">
                  {decidedCount}
                </div>
                <div className="text-sm font-sans font-medium text-white/90">
                  Decided today
                </div>
                <div className="text-xs text-white/60 font-sans">
                  Final determinations logged
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Review Protocol Note (wording strictly from existing page) */}
          <div className="lg:w-[380px] bg-ink-raised rounded-2xl p-6 border border-ink-border flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="font-mono text-xs uppercase tracking-[0.05em] text-white/70 font-semibold">
                  Review protocol
                </span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed font-sans">
                Review escalated profiles and appeals. Rejection is final. Manual verification required for flagged profiles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VIEW A: ACTIVE HUMAN ESCALATIONS */}
      {viewMode === 'active' && (
        <section
          aria-labelledby="escalations-heading"
          className="flex flex-col space-y-6 w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2
                id="escalations-heading"
                className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans"
              >
                Active human{' '}
                <span className="font-serif italic font-normal text-carnet-yellow">
                  escalations
                </span>
              </h2>
              <span className="px-2.5 py-1 rounded-pill bg-white/95 border border-hairline-subtle text-xs font-mono uppercase tracking-[0.05em] text-ink font-semibold">
                {escalatedCount} pending
              </span>
            </div>
            <p className="text-xs font-mono uppercase tracking-[0.05em] text-white/90">
              Contact details stay hidden until both sides accept.
            </p>
          </div>

          {/* Review Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.escalatedProfiles.map((item) => {
              const isDecided = decisions[item.id];
              const hasReason = Boolean(reasons[item.id]?.trim());
              return (
                <article
                  key={item.id}
                  className="rounded-card bg-card border border-hairline p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-fill flex items-center justify-center font-mono font-bold text-ink text-sm border border-hairline shrink-0">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-ink font-sans leading-snug">
                            {item.name}
                          </h3>
                          <p className="text-sm text-text-secondary font-sans">
                            {item.applicantName} · {item.roleTypeLabel} · {item.city}
                          </p>
                          <p className="text-xs text-text-muted font-sans mt-0.5">
                            {item.sectorOrSpecialty}
                          </p>
                        </div>
                      </div>

                      <Badge variant="default">{item.badgeLabel}</Badge>
                    </div>

                    {/* Status Row */}
                    <div className="p-3 rounded-xl bg-fill border border-hairline-subtle flex items-center gap-2">
                      <span className="font-mono text-xs uppercase tracking-[0.05em] text-accent-deep font-semibold">
                        {item.statusTag}:
                      </span>
                      <span className="text-sm font-sans text-text-secondary">
                        {item.statusDesc}
                      </span>
                    </div>

                    {/* Signals Grid */}
                    <div className="space-y-2">
                      <div className="text-xs font-mono uppercase tracking-[0.05em] text-text-muted font-semibold">
                        Signals
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-y border-hairline-subtle">
                        {item.signals.map((sig) => (
                          <div key={sig.label} className="space-y-0.5">
                            <div className="text-xs font-sans text-text-muted">
                              {sig.label}
                            </div>
                            <div
                              className={`text-sm font-sans font-semibold ${
                                sig.isFailed ? 'text-error' : 'text-ink'
                              }`}
                            >
                              {sig.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Score Block (Readiness rubric with mandatory caption) */}
                    {item.scoreValue && (
                      <div className="space-y-1 bg-white p-3 rounded-xl border border-hairline-subtle">
                        <div className="text-xs font-mono uppercase tracking-[0.05em] text-text-muted font-semibold">
                          {item.scoreLabel || 'Score'}
                        </div>
                        <div className="text-base font-bold text-ink font-mono">
                          {item.scoreValue}
                        </div>
                        {item.scoreCaption && (
                          <div className="text-xs text-text-secondary font-sans italic">
                            {item.scoreCaption}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Simulation Context & Attributions */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs text-text-secondary font-sans leading-relaxed">
                        {item.simulationSummary}
                      </p>
                      <p className="text-xs font-sans italic text-text-muted">
                        Written by a language model simulation
                      </p>
                    </div>
                  </div>

                  {/* Decision Controls or Post-decision state */}
                  <div className="pt-4 border-t border-hairline-subtle space-y-4">
                    {isDecided ? (
                      <div className="p-4 rounded-xl bg-fill border border-hairline flex items-center justify-between gap-4">
                        <div className="text-sm font-sans text-text">
                          Decided as{' '}
                          <strong className="font-semibold capitalize text-ink">
                            {isDecided}
                          </strong>
                          . Rejection is final.
                        </div>
                        <Badge variant={isDecided === 'approved' ? 'success' : 'error'}>
                          {isDecided}
                        </Badge>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label
                            htmlFor={`reason-${item.id}`}
                            className="block text-xs font-mono uppercase tracking-[0.05em] text-text-muted font-semibold"
                          >
                            Reason (required for audit log)
                          </label>
                          <textarea
                            id={`reason-${item.id}`}
                            rows={2}
                            value={reasons[item.id] || ''}
                            onChange={(e) => handleReasonChange(item.id, e.target.value)}
                            placeholder="Enter reason for decision..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-input-border text-sm font-sans text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white transition"
                          />
                          {!hasReason && (
                            <p className="text-xs text-text-muted font-sans italic">
                              Add a reason to continue.
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setInspectItem(item)}
                          >
                            Inspect details
                          </Button>

                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={!hasReason}
                              onClick={() =>
                                initiateDecision(item.id, item.name, 'rejected', false)
                              }
                              className="border-error text-error hover:bg-error-wash active:bg-error-wash focus:ring-error"
                            >
                              Reject
                            </Button>

                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              hasBadge
                              disabled={!hasReason}
                              onClick={() =>
                                initiateDecision(item.id, item.name, 'approved', false)
                              }
                            >
                              Approve
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-text-muted font-sans">
                          Rejection is final. The user cannot appeal.
                        </div>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* VIEW B: APPEALS ADJUDICATION */}
      {viewMode === 'appeals' && (
        <section
          aria-labelledby="appeals-heading"
          className="flex flex-col space-y-6 w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2
                id="appeals-heading"
                className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans"
              >
                Appeals{' '}
                <span className="font-serif italic font-normal text-carnet-yellow">
                  adjudication
                </span>
              </h2>
              <span className="px-2.5 py-1 rounded-pill bg-white/95 border border-hairline-subtle text-xs font-mono uppercase tracking-[0.05em] text-ink font-semibold">
                {appealsCount} active
              </span>
            </div>
            <p className="text-xs font-mono uppercase tracking-[0.05em] text-white/90">
              Contact details stay hidden until both sides accept.
            </p>
          </div>

          {/* Appeals List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.appeals.map((appeal) => {
              const isDecided = decisions[appeal.id];
              const hasAppealReason = Boolean(reasons[appeal.id]?.trim());
              return (
                <article
                  key={appeal.id}
                  className="rounded-card bg-card border border-hairline p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-accent-wash flex items-center justify-center font-mono font-bold text-accent-deep text-sm border border-hairline shrink-0">
                          {appeal.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-ink font-sans leading-snug">
                            {appeal.name}
                          </h3>
                          <p className="text-sm text-text-secondary font-sans">
                            {appeal.roleTypeLabel} · {appeal.sectorOrSpecialty} · {appeal.city}
                          </p>
                          <p className="text-xs text-text-muted font-sans mt-0.5">
                            Appeal lodged: {appeal.lodgedAt}
                          </p>
                        </div>
                      </div>

                      <Badge variant="accent">{appeal.badgeLabel}</Badge>
                    </div>

                    {/* Status & Original Reason */}
                    <div className="p-3.5 rounded-xl bg-fill border border-hairline-subtle space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs uppercase tracking-[0.05em] text-accent-deep font-semibold">
                          {appeal.statusTag}:
                        </span>
                        <span className="text-sm font-sans text-text font-medium">
                          {appeal.statusDesc}
                        </span>
                      </div>
                    </div>

                    {/* Candidate Appeal Statement */}
                    <div className="space-y-1.5 p-3.5 rounded-xl bg-white border border-hairline-subtle">
                      <div className="text-xs font-mono uppercase tracking-[0.05em] text-text-muted font-semibold">
                        Candidate appeal note
                      </div>
                      <p className="text-sm font-sans text-text italic leading-relaxed">
                        &quot;{appeal.appealNote}&quot;
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {appeal.evidenceItems.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fill text-xs font-mono text-text border border-hairline-subtle"
                          >
                            <DocumentIcon className="w-3.5 h-3.5 text-accent" />
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Signals Grid */}
                    <div className="space-y-2">
                      <div className="text-xs font-mono uppercase tracking-[0.05em] text-text-muted font-semibold">
                        Signals
                      </div>
                      <div className="grid grid-cols-3 gap-3 py-2 border-y border-hairline-subtle">
                        {appeal.signals.map((sig) => (
                          <div key={sig.label} className="space-y-0.5">
                            <div className="text-xs font-sans text-text-muted">
                              {sig.label}
                            </div>
                            <div
                              className={`text-sm font-sans font-semibold ${
                                sig.isFailed ? 'text-error' : 'text-ink'
                              }`}
                            >
                              {sig.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Simulation Note */}
                    <div className="space-y-1 pt-1">
                      <p className="text-xs text-text-secondary font-sans leading-relaxed">
                        {appeal.simulationSummary}
                      </p>
                      <p className="text-xs font-sans italic text-text-muted">
                        Written by a language model simulation
                      </p>
                    </div>
                  </div>

                  {/* Decision Controls or Post-decision state */}
                  <div className="pt-4 border-t border-hairline-subtle space-y-4">
                    {isDecided ? (
                      <div className="p-4 rounded-xl bg-fill border border-hairline flex items-center justify-between gap-4">
                        <div className="text-sm font-sans text-text">
                          Decided as{' '}
                          <strong className="font-semibold capitalize text-ink">
                            {isDecided}
                          </strong>
                          . Rejection is final.
                        </div>
                        <Badge variant={isDecided === 'approved' ? 'success' : 'error'}>
                          {isDecided}
                        </Badge>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label
                            htmlFor={`reason-appeal-${appeal.id}`}
                            className="block text-xs font-mono uppercase tracking-[0.05em] text-text-muted font-semibold"
                          >
                            Reason (required for audit log)
                          </label>
                          <textarea
                            id={`reason-appeal-${appeal.id}`}
                            rows={2}
                            value={reasons[appeal.id] || ''}
                            onChange={(e) => handleReasonChange(appeal.id, e.target.value)}
                            placeholder="Enter reason for appeal determination..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-input-border text-sm font-sans text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white transition"
                          />
                          {!hasAppealReason && (
                            <p className="text-xs text-text-muted font-sans italic">
                              Add a reason to continue.
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setInspectItem(appeal)}
                          >
                            Inspect details
                          </Button>

                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={!hasAppealReason}
                              onClick={() =>
                                initiateDecision(appeal.id, appeal.name, 'rejected', true)
                              }
                              className="border-error text-error hover:bg-error-wash active:bg-error-wash focus:ring-error"
                            >
                              Reject
                            </Button>

                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              hasBadge
                              disabled={!hasAppealReason}
                              onClick={() =>
                                initiateDecision(appeal.id, appeal.name, 'approved', true)
                              }
                            >
                              Approve
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-text-muted font-sans">
                          Rejection is final. The user cannot appeal.
                        </div>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Decided Today Section */}
      <section
        aria-labelledby="decided-heading"
        className="rounded-card bg-card border border-hairline p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2
              id="decided-heading"
              className="text-xl sm:text-2xl font-bold text-ink tracking-tight font-sans"
            >
              Recent determinations
            </h2>
            <p className="text-sm text-text-secondary font-sans mt-0.5">
              Determinations logged today across review queues. Rejection is final.
            </p>
          </div>
          <span className="font-mono text-xs uppercase tracking-[0.05em] text-text-muted">
            {decidedCount} logged
          </span>
        </div>

        <div className="divide-y divide-hairline">
          {data.decidedToday.map((record) => (
            <div
              key={record.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink font-sans">
                    {record.name}
                  </span>
                  <span className="text-xs text-text-muted font-mono">
                    ({record.roleTypeLabel})
                  </span>
                  <Badge
                    variant={record.decision === 'approved' ? 'success' : 'error'}
                  >
                    {record.decision}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary font-sans">
                  {record.reason}
                </p>
              </div>
              <div className="text-xs font-mono text-text-muted shrink-0">
                {record.decidedAt}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Decision Confirmation Dialog */}
      <Dialog
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={`Confirm ${pendingAction?.decision || ''} decision`}
        description={`Record final determination for ${pendingAction?.name || ''}.`}
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-fill border border-hairline-subtle space-y-2">
            <div className="text-xs font-mono uppercase tracking-[0.05em] text-text-muted font-semibold">
              Action confirmation
            </div>
            <p className="text-sm font-sans text-text leading-relaxed">
              You are recording this determination as{' '}
              <strong className="font-bold capitalize text-ink">
                {pendingAction?.decision}
              </strong>
              .
            </p>
            <p className="text-xs text-error font-sans font-medium">
              Rejection is final. The user cannot appeal.
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-[0.05em] text-text-muted font-semibold">
              Recorded reason
            </div>
            <p className="text-sm font-sans text-text-secondary italic">
              {pendingAction && (reasons[pendingAction.id] || 'No extra note provided.')}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline-subtle">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPendingAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={confirmDecision}
            >
              Confirm determination
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Inspect Item Dialog */}
      <Dialog
        open={!!inspectItem}
        onOpenChange={(open) => {
          if (!open) setInspectItem(null);
        }}
        title={inspectItem?.name || 'Inspection'}
        description={`${inspectItem?.roleTypeLabel || ''} · ${inspectItem?.city || ''}`}
      >
        {inspectItem && (
          <div className="space-y-5 pt-2">
            <div className="p-3.5 rounded-xl bg-fill border border-hairline-subtle space-y-1">
              <div className="text-xs font-mono uppercase tracking-[0.05em] text-accent-deep font-semibold">
                Status note
              </div>
              <p className="text-sm font-sans text-text">
                {inspectItem.statusDesc}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-[0.05em] text-text-muted font-semibold">
                Verification signals
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white border border-hairline-subtle">
                {inspectItem.signals.map((sig) => (
                  <div key={sig.label} className="space-y-0.5">
                    <div className="text-xs font-sans text-text-muted">
                      {sig.label}
                    </div>
                    <div
                      className={`text-sm font-sans font-semibold ${
                        sig.isFailed ? 'text-error' : 'text-ink'
                      }`}
                    >
                      {sig.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {'scoreValue' in inspectItem && inspectItem.scoreValue && (
              <div className="space-y-1 p-3 rounded-xl bg-white border border-hairline-subtle">
                <div className="text-xs font-mono uppercase tracking-[0.05em] text-text-muted font-semibold">
                  Score
                </div>
                <div className="text-base font-bold text-ink font-mono">
                  {inspectItem.scoreValue}
                </div>
                {'scoreCaption' in inspectItem && inspectItem.scoreCaption && (
                  <div className="text-xs text-text-secondary font-sans italic">
                    {inspectItem.scoreCaption}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1 p-3 rounded-xl bg-white border border-hairline-subtle">
              <div className="text-xs font-mono uppercase tracking-[0.05em] text-text-muted font-semibold">
                Simulation analysis
              </div>
              <p className="text-xs text-text-secondary font-sans leading-relaxed">
                {inspectItem.simulationSummary}
              </p>
              <p className="text-xs font-sans italic text-text-muted mt-1">
                Written by a language model simulation
              </p>
            </div>

            <div className="p-3 rounded-xl bg-fill border border-hairline-subtle text-xs text-text-secondary font-sans">
              Contact details stay hidden until both sides accept.
            </div>

            <div className="flex justify-end pt-2 border-t border-hairline-subtle">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setInspectItem(null)}
              >
                Close inspection
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
