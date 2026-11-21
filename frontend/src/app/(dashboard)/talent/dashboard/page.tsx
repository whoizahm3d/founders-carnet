'use client';

/**
 * Talent Dashboard (/talent/dashboard)
 * Rebuilt from design reference: talent_dashboard_hamza_iqbal
 * Conforms to DESIGN.md v3.9.2 and project rules:
 * - Sentence case headings and labels
 * - No em or en dashes (hyphens or commas only)
 * - Profile similarity label shown once per card (no hiring probability claims)
 * - Language model simulation attribution notice without AI badges or sparkles
 * - Mutual consent contact privacy: contact details hidden until both sides accept
 * - Pakistani context: Karachi, Lahore, Islamabad, PKR compensation ranges
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  INITIAL_TALENT_DASHBOARD_DATA,
  TalentJobRole,
} from '@/fixtures/talent-dashboard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ArrowRightIcon,
  LockIcon,
} from '@/components/ui/icons';

export default function TalentDashboardPage() {
  const { user } = useAuth();
  const [data] = useState(INITIAL_TALENT_DASHBOARD_DATA);

  // View state switcher: active dashboard vs first-time onboarding
  const [viewMode, setViewMode] = useState<'active' | 'onboarding'>('active');

  // Interactive state
  const [appliedRoleIds, setAppliedRoleIds] = useState<Record<string, boolean>>({});
  const [requestedTeamIds, setRequestedTeamIds] = useState<Record<string, boolean>>({});
  const [selectedRole, setSelectedRole] = useState<TalentJobRole | null>(null);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [githubUrlInput, setGithubUrlInput] = useState('');
  const [githubLinked, setGithubLinked] = useState(false);

  // Data view state simulation (active, empty, error)
  const [dataState, setDataState] = useState<'normal' | 'empty' | 'error'>('normal');

  const displayName = user?.fullName || data.profile.fullName;
  const firstName = displayName.split(' ')[0] || 'Hamza';
  const completeness = githubLinked ? 100 : data.profile.completenessPercent;

  const handleApplyRole = (role: TalentJobRole) => {
    setAppliedRoleIds((prev) => ({ ...prev, [role.id]: true }));
    if (selectedRole?.id === role.id) {
      setSelectedRole(null);
    }
  };

  const handleRequestTeamMatch = (matchId: string) => {
    setRequestedTeamIds((prev) => ({ ...prev, [matchId]: true }));
  };

  const handleSaveGitHub = (e: React.FormEvent) => {
    e.preventDefault();
    if (githubUrlInput.trim().length > 0) {
      setGithubLinked(true);
      setIsGitHubModalOpen(false);
    }
  };

  const statusVariant = (status: 'Applied' | 'In review' | 'Introduction accepted') => {
    switch (status) {
      case 'Introduction accepted':
        return 'success';
      case 'In review':
        return 'warning';
      case 'Applied':
      default:
        return 'default';
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto space-y-8 pb-12 antialiased">
      {/* 1. Sub-Header Bar: Breadcrumb and View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-white/95 backdrop-blur-md border border-hairline-subtle shadow-sm self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="font-mono text-xs uppercase tracking-[0.05em] text-text font-medium">
            Talent
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
            className={`px-3.5 py-1.5 rounded-pill text-xs font-mono uppercase tracking-[0.05em] transition-all duration-200 min-h-[36px] ${
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
            className={`px-3.5 py-1.5 rounded-pill text-xs font-mono uppercase tracking-[0.05em] transition-all duration-200 min-h-[36px] ${
              viewMode === 'onboarding'
                ? 'bg-ink text-white font-semibold shadow-sm'
                : 'text-text-secondary hover:text-ink'
            }`}
          >
            First-time onboarding
          </button>
        </div>
      </div>

      {/* 2. Hero & Profile Cluster */}
      <section aria-labelledby="talent-welcome-heading" className="flex flex-col gap-4 text-white">
        <div className="flex flex-col gap-2 max-w-4xl">
          <h1
            id="talent-welcome-heading"
            className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight"
          >
            Welcome back,{' '}
            <span className="font-serif italic font-normal text-carnet-yellow">
              {firstName}
            </span>
          </h1>
          <p className="text-base sm:text-lg text-white/85 max-w-2xl font-normal leading-relaxed">
            Backend developer, Lahore. Track your applications and roles that match your profile across Pakistan.
          </p>
        </div>

        {/* Profile Completeness Bar & Action */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-sm text-white/85">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">Profile completeness:</span>
            <span className="font-mono font-bold text-carnet-yellow">{completeness}%</span>
          </div>
          <span className="text-white/40 hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-white/75 text-xs sm:text-sm">
            {githubLinked
              ? 'GitHub profile connected and verified.'
              : 'Add GitHub repository link to reach 100%.'}
          </span>
          {!githubLinked && (
            <button
              type="button"
              onClick={() => setIsGitHubModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.05em] font-bold text-carnet-yellow hover:underline underline-offset-4 ml-auto sm:ml-2 min-h-[44px] sm:min-h-[36px] px-2 py-1"
            >
              <span>Link GitHub</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </section>

      {/* 3. Operational Summary: Ink Monolith Card */}
      <section aria-labelledby="operational-summary-heading">
        <Card variant="ink" padding="featured" className="border-ink-border shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-ink-border gap-2">
            <h2
              id="operational-summary-heading"
              className="font-mono text-xs uppercase tracking-[0.05em] text-white/60 font-semibold"
            >
              Operational summary
            </h2>
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
              <span className="font-mono text-xs uppercase tracking-[0.05em] text-white/60">
                Lahore active profile
              </span>
            </div>
          </div>

          {/* Counts Ledger */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-4xl sm:text-5xl font-bold text-white tracking-tight">
                {data.stats.applicationsSubmitted}
              </span>
              <span className="text-sm text-white/60">Applications submitted</span>
            </div>
            <div className="flex flex-col gap-2 md:pl-8 md:border-l border-ink-border">
              <span className="font-mono text-4xl sm:text-5xl font-bold text-white tracking-tight">
                {data.stats.introductionsAccepted}
              </span>
              <span className="text-sm text-white/60">Introductions accepted</span>
            </div>
            <div className="flex flex-col gap-2 md:pl-8 md:border-l border-ink-border">
              <span className="font-mono text-4xl sm:text-5xl font-bold text-white tracking-tight">
                {data.stats.startupMatches}
              </span>
              <span className="text-sm text-white/60">Startup matches</span>
            </div>
          </div>
        </Card>
      </section>

      {/* Onboarding View Alternative */}
      {viewMode === 'onboarding' ? (
        <section aria-labelledby="onboarding-heading" className="space-y-6">
          <Card variant="white" padding="featured">
            <div className="pb-6 border-b border-row-line">
              <h2 id="onboarding-heading" className="text-2xl font-bold tracking-tight text-ink">
                Talent onboarding <span className="font-serif italic font-normal text-accent">checklist</span>
              </h2>
              <p className="text-sm text-text-muted mt-1">
                Five steps to verify your profile and connect with Pakistani engineering leads.
              </p>
            </div>

            <div className="divide-y divide-row-line">
              {data.onboardingSteps.map((step, idx) => (
                <div key={step.id} className="py-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-sm text-accent font-bold mt-0.5">
                      0{idx + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-ink">{step.title}</h3>
                      <p className="text-sm text-text-muted mt-0.5">{step.description}</p>
                    </div>
                  </div>
                  <Badge variant={step.completed ? 'success' : 'default'}>
                    {step.completed ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-row-line flex justify-end">
              <Button
                variant="primary"
                onClick={() => setViewMode('active')}
                hasBadge
              >
                Return to active dashboard
              </Button>
            </div>
          </Card>
        </section>
      ) : (
        /* 4. Asymmetric Editorial Workspace (65% / 35%) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (col-span-8): Recommended Roles & Founding Team Matches */}
          <div className="lg:col-span-8 space-y-8">
            {/* Recommended Roles */}
            <Card variant="white" padding="featured">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-6 border-b border-row-line gap-2">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-ink">
                    Roles that match your <span className="font-serif italic font-normal text-accent">profile</span>
                  </h2>
                  <p className="text-sm text-text-muted mt-1">
                    Open engineering positions aligned with your backend stack and location preferences.
                  </p>
                </div>
                <Link
                  href="/talent/jobs"
                  className="font-mono text-xs uppercase tracking-[0.05em] font-semibold text-accent hover:underline underline-offset-4 self-start sm:self-auto min-h-[44px] sm:min-h-[auto] inline-flex items-center"
                >
                  Browse all jobs
                </Link>
              </div>

              {/* Data state handling */}
              {dataState === 'empty' ? (
                <div className="py-8">
                  <EmptyState
                    title="No recommended roles found"
                    description="Update your stack preferences or expand location filters to view openings."
                    action={
                      <Button variant="secondary" onClick={() => setDataState('normal')}>
                        Reset filters
                      </Button>
                    }
                  />
                </div>
              ) : dataState === 'error' ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm text-status-error font-medium">
                    Unable to load job openings at this moment.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => setDataState('normal')}>
                    Try again
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-row-line">
                  {data.recommendedRoles.map((role) => {
                    const isApplied = appliedRoleIds[role.id];

                    return (
                      <article key={role.id} className="py-6 flex flex-col gap-3 group">
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-ink">{role.title}</h3>
                            <span className="text-xs text-text-muted">at</span>
                            <span className="text-base font-semibold text-ink">{role.company}</span>
                            <span className="text-xs text-text-muted">· {role.location}</span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {role.tags.map((tag) => (
                              <span
                                key={tag}
                                className="bg-fill text-text-secondary font-mono text-[11px] px-2.5 py-1 rounded-pill uppercase tracking-wider"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <p className="text-sm text-text-secondary leading-relaxed">
                          {role.alignmentNote}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="primary"
                              size="sm"
                              hasBadge={!isApplied}
                              disabled={isApplied}
                              onClick={() => handleApplyRole(role)}
                            >
                              {isApplied ? 'Applied' : 'Apply now'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedRole(role)}
                            >
                              View details
                            </Button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs uppercase tracking-wider text-text-muted font-medium">
                              {role.profileSimilarity}% profile similarity
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Founding Team Matches */}
            <Card variant="white" padding="featured">
              <div className="pb-6 border-b border-row-line">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-ink">
                      Founding team <span className="font-serif italic font-normal text-accent">matches</span>
                    </h2>
                    <p className="text-sm text-text-muted mt-1">
                      Direct introductions to technical founders building early stage startups in Pakistan.
                    </p>
                  </div>
                  <Link
                    href="/talent/matches"
                    className="font-mono text-xs uppercase tracking-[0.05em] font-semibold text-accent hover:underline underline-offset-4 self-start sm:self-auto min-h-[44px] sm:min-h-[auto] inline-flex items-center"
                  >
                    View all matches
                  </Link>
                </div>
              </div>

              <div className="divide-y divide-row-line">
                {data.teamMatches.map((team) => {
                  const isRequested = requestedTeamIds[team.id];

                  return (
                    <div key={team.id} className="py-5 flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-ink">{team.startupName}</h3>
                            <span className="text-xs text-text-muted">· {team.sector}</span>
                            <span className="text-xs text-text-muted">({team.location})</span>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">
                            Seeking: <strong className="font-medium text-ink">{team.seekingRole}</strong>
                          </p>
                        </div>
                        <span className="font-mono text-xs uppercase tracking-wider text-text-muted font-medium shrink-0">
                          {team.profileSimilarity}% profile similarity
                        </span>
                      </div>

                      <p className="text-sm text-text-secondary leading-relaxed">
                        {team.pitchSnippet}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-text-muted">
                          Contact details stay hidden until both sides accept.
                        </span>
                        <Button
                          variant={isRequested ? 'secondary' : 'primary'}
                          size="sm"
                          disabled={isRequested}
                          onClick={() => handleRequestTeamMatch(team.id)}
                        >
                          {isRequested ? 'Introduction requested' : 'Request introduction'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right Column (col-span-4): Tracked Applications & Resume Analysis */}
          <div className="lg:col-span-4 space-y-8">
            {/* Tracked Applications */}
            <Card variant="white" padding="featured">
              <div className="pb-6 border-b border-row-line">
                <h2 className="text-2xl font-bold tracking-tight text-ink">
                  Tracked <span className="font-serif italic font-normal text-accent">applications</span>
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Current status across startup engineering leads.
                </p>
              </div>

              <div className="divide-y divide-row-line">
                {data.applications.map((app) => (
                  <div key={app.id} className="py-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-ink leading-snug">{app.company}</h3>
                        <p className="text-xs text-text-muted">
                          {app.roleTitle} · {app.location}
                        </p>
                      </div>
                      <Badge variant={statusVariant(app.status)}>
                        {app.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Privacy disclosure note */}
              <div className="pt-6 mt-6 border-t border-row-line">
                <div className="flex items-start gap-3 bg-fill p-3.5 rounded-card border border-hairline-subtle">
                  <LockIcon className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-text-secondary">
                    Contact details stay hidden until both sides accept.
                  </p>
                </div>
              </div>
            </Card>

            {/* Resume Analysis */}
            <Card variant="white" padding="featured">
              <div className="pb-4 border-b border-row-line">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold tracking-tight text-ink">
                    Resume <span className="font-serif italic font-normal text-accent">analysis</span>
                  </h2>
                  <Link
                    href="/talent/resume"
                    className="font-mono text-xs uppercase tracking-[0.05em] font-semibold text-accent hover:underline underline-offset-4"
                  >
                    Manage CV
                  </Link>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Structured feedback on your technical profile.
                </p>
              </div>

              {/* Detected competencies */}
              <div className="py-4 border-b border-row-line space-y-2">
                <span className="font-mono text-xs uppercase tracking-wider text-text-muted font-medium">
                  Detected competencies
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.resumeAnalysis.detectedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-fill text-text-secondary font-mono text-[11px] px-2.5 py-1 rounded-pill"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Refinement suggestions */}
              <div className="pt-4 space-y-3">
                <span className="font-mono text-xs uppercase tracking-wider text-text-muted font-medium">
                  Suggested refinements
                </span>
                <ul className="space-y-2.5">
                  {data.resumeAnalysis.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mandatory Language Model Attribution Notice */}
              <div className="pt-4 mt-4 border-t border-row-line">
                <p className="text-xs text-text-muted font-normal">
                  {data.resumeAnalysis.simulationNotice}
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 5. Role Details Dialog */}
      {selectedRole && (
        <Dialog
          open={Boolean(selectedRole)}
          onOpenChange={(open) => {
            if (!open) setSelectedRole(null);
          }}
          title={
            <div>
              <span className="text-xl font-bold text-ink">{selectedRole.title}</span>
              <p className="text-sm font-normal text-text-muted mt-0.5">
                {selectedRole.company} · {selectedRole.location} ({selectedRole.stage})
              </p>
            </div>
          }
        >
          <div className="space-y-6 pt-2">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-text-muted font-medium">
                Role summary
              </span>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                {selectedRole.description}
              </p>
            </div>

            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-text-muted font-medium">
                Profile alignment
              </span>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                {selectedRole.alignmentNote}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-fill p-4 rounded-card border border-hairline-subtle">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                  Compensation range
                </span>
                <p className="text-sm font-semibold text-ink mt-0.5">
                  {selectedRole.salaryPkrRange}
                </p>
              </div>
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                  Similarity metric
                </span>
                <p className="text-sm font-semibold text-ink mt-0.5">
                  {selectedRole.profileSimilarity}% profile similarity
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-row-line">
              <span className="text-xs text-text-muted">
                Contact details stay hidden until both sides accept.
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedRole(null)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  hasBadge={!appliedRoleIds[selectedRole.id]}
                  disabled={appliedRoleIds[selectedRole.id]}
                  onClick={() => handleApplyRole(selectedRole)}
                >
                  {appliedRoleIds[selectedRole.id] ? 'Applied' : 'Apply now'}
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* 6. GitHub Profile Link Dialog */}
      <Dialog
        open={isGitHubModalOpen}
        onOpenChange={setIsGitHubModalOpen}
        title="Link public GitHub profile"
        description="Connect your GitHub profile to showcase public repositories and reach 100% profile completeness."
      >
        <form onSubmit={handleSaveGitHub} className="space-y-5 pt-3">
          <div>
            <label
              htmlFor="github-username-input"
              className="block text-xs font-mono uppercase tracking-wider text-text-secondary font-medium mb-1.5"
            >
              GitHub username or profile URL
            </label>
            <input
              id="github-username-input"
              type="text"
              placeholder="e.g. github.com/hamzaiqbal"
              value={githubUrlInput}
              onChange={(e) => setGithubUrlInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-pill border border-hairline bg-card text-sm text-ink placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            Your public profile will be visible to founders after mutual acceptance of introduction requests.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-row-line">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsGitHubModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              hasBadge
            >
              Save profile link
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
