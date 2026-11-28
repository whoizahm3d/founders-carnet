'use client';

/**
 * Founder Matches Feed (/founder/matches)
 * Displays ecosystem candidates matched to the founder's startup.
 * Data contracts strictly mapped to MatchRead from backend API:
 * - GET /api/v1/founders/me/startups
 * - GET /api/v1/matching/startups/{startup_id}?top_k=3
 * - POST /api/v1/matching/{match_id}/request
 * - POST /api/v1/matching/{match_id}/accept
 * - POST /api/v1/matching/{match_id}/decline
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Spinner } from '@/components/ui';
import { AlertCircleIcon } from '@/components/ui/icons';
import { api, ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type { StartupRead, MatchRead } from '@/types/founder';
import styles from './MatchFeed.module.css';

function getCandidateDisplayName(candidateRole: string, sector: string, location: string): string {
  const roleName = candidateRole ? candidateRole.charAt(0).toUpperCase() + candidateRole.slice(1) : 'Candidate';
  const parts = [roleName];
  if (sector) parts.push(sector);
  if (location) parts.push(location);
  return parts.join(', ');
}

function getCandidateInitials(candidateRole: string): string {
  if (!candidateRole) return 'VC';
  return candidateRole.slice(0, 2).toUpperCase();
}

export default function FounderMatchesPage() {
  const [startup, setStartup] = useState<StartupRead | null>(null);
  const [matches, setMatches] = useState<MatchRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [filterType, setFilterType] = useState<'All' | 'Mentors' | 'Investors'>('All');
  const [sectorFilter, setSectorFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;
    const token = authStorage.getToken();

    async function loadData() {
      try {
        setIsLoading(true);
        setError('');

        const startups = await api.get<StartupRead[]>('/founders/me/startups', { token });
        const activeStartup = startups.length > 0 ? startups[0] : null;

        if (cancelled) return;
        setStartup(activeStartup);

        if (activeStartup) {
          try {
            const list = await api.get<MatchRead[]>(
              `/matching/startups/${activeStartup.id}`,
              { token }
            );
            if (!cancelled) {
              setMatches(list || []);
            }
          } catch (matchErr) {
            if (matchErr instanceof ApiError && matchErr.status === 404) {
              if (!cancelled) setMatches([]);
            } else {
              throw matchErr;
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            if (err.status === 429) {
              setError('Too many requests. Please wait a moment before trying again.');
            } else if (err.status === 502) {
              setError('Matching service is currently unavailable. Please try again later.');
            } else if (err.status === 503) {
              setError('Service is temporarily unavailable. Please try again shortly.');
            } else {
              setError(err.detail || 'Unable to load matches.');
            }
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load matches.');
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequestMatch = async (matchId: number) => {
    setError('');
    setSuccessMessage('');
    setActionLoadingId(matchId);

    try {
      const token = authStorage.getToken();
      const updated = await api.post<MatchRead>(
        `/matching/${matchId}/request`,
        {},
        { token }
      );
      setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));
      setSuccessMessage('Match request sent successfully.');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError(err.detail || 'A request for this match is already open or processed.');
        } else {
          setError(err.detail || 'Failed to request match.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Action failed.');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptMatch = async (matchId: number) => {
    setError('');
    setSuccessMessage('');
    setActionLoadingId(matchId);

    try {
      const token = authStorage.getToken();
      const updated = await api.post<MatchRead>(
        `/matching/${matchId}/accept`,
        {},
        { token }
      );
      setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));
      setSuccessMessage('Match accepted.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || 'Failed to accept match.');
      } else {
        setError(err instanceof Error ? err.message : 'Action failed.');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineMatch = async (matchId: number) => {
    setError('');
    setSuccessMessage('');
    setActionLoadingId(matchId);

    try {
      const token = authStorage.getToken();
      const updated = await api.post<MatchRead>(
        `/matching/${matchId}/decline`,
        {},
        { token }
      );
      setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));
      setSuccessMessage('Match request declined.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || 'Failed to decline match.');
      } else {
        setError(err instanceof Error ? err.message : 'Action failed.');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <Spinner size="large" />
      </div>
    );
  }

  // Empty state: no startup registered yet
  if (!startup) {
    return (
      <div className={styles.container}>
        <PageHeader
          title="Matches"
          subtitle="Ranked by sector, stage, and expertise fit. Percentages show profile similarity, not the likelihood of a successful match."
        />
        <div className="p-8 rounded-card border border-hairline bg-card text-center max-w-xl mx-auto my-8 space-y-4">
          <p className="text-base text-text-secondary">
            Add your startup profile first.
          </p>
          <p className="text-sm text-text-muted">
            Startup details and evaluation metrics are required to calculate cosine similarity against ecosystem profiles.
          </p>
          <Link href="/founder/profile">
            <Button variant="primary">Go to startup profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filter logic
  const filteredMatches = matches.filter((m) => {
    if (filterType === 'Mentors' && m.candidate_role?.toLowerCase() !== 'mentor') return false;
    if (filterType === 'Investors' && m.candidate_role?.toLowerCase() !== 'investor') return false;
    if (sectorFilter !== 'All' && m.sector?.toLowerCase() !== sectorFilter.toLowerCase()) return false;
    return true;
  });

  // Extract unique sectors from returned matches
  const availableSectors = Array.from(new Set(matches.map((m) => m.sector).filter(Boolean)));

  return (
    <div className={styles.container}>
      <PageHeader
        title="Matches"
        subtitle="Ranked by sector, stage, and expertise fit. Percentages show profile similarity, not the likelihood of a successful match. Contact details stay hidden until both sides accept."
      />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 px-4 py-3 rounded-control bg-status-error-wash border border-status-error/20 text-sm text-status-error"
        >
          <AlertCircleIcon size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="px-4 py-3 rounded-control bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium"
        >
          {successMessage}
        </div>
      )}

      {/* Filter Row */}
      <div className={styles.filtersRow}>
        <button
          type="button"
          className={`${styles.filterPill} ${filterType === 'All' ? styles.filterPillActive : ''}`}
          onClick={() => setFilterType('All')}
        >
          All
        </button>
        <button
          type="button"
          className={`${styles.filterPill} ${filterType === 'Mentors' ? styles.filterPillActive : ''}`}
          onClick={() => setFilterType('Mentors')}
        >
          Mentors
        </button>
        <button
          type="button"
          className={`${styles.filterPill} ${filterType === 'Investors' ? styles.filterPillActive : ''}`}
          onClick={() => setFilterType('Investors')}
        >
          Investors
        </button>

        {availableSectors.length > 0 && (
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className={styles.filterDropdown}
            aria-label="Filter by sector"
          >
            <option value="All">All sectors</option>
            {availableSectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Match Feed Cards */}
      <div className={styles.feedList}>
        {filteredMatches.length === 0 ? (
          <div className={styles.emptyFeedCard}>
            <div className={styles.emptyTitle}>No matching profiles found.</div>
            <div className={styles.emptyDesc}>
              Matches require profile similarity and readiness evaluation. Refine your profile details to discover new connections.
            </div>
          </div>
        ) : (
          filteredMatches.map((m) => {
            const displayName = getCandidateDisplayName(m.candidate_role, m.sector, m.location);
            const initials = getCandidateInitials(m.candidate_role);
            const similarityPercent = Math.round((m.semantic_similarity ?? 0) * 100);

            // Factor tags formatting
            const factorList: string[] = [];
            if (m.factors && typeof m.factors === 'object') {
              for (const [key, val] of Object.entries(m.factors)) {
                if (typeof val === 'number' && val > 0) {
                  const cleanKey = key.replace(/_/g, ' ');
                  factorList.push(`${cleanKey}: ${Math.round(val * 100)}%`);
                }
              }
            }

            const isMutual = m.mutual_acceptance || (m.founder_accepted && m.candidate_accepted);
            const isPendingIncoming = m.request_status === 'pending' && !m.founder_accepted && m.candidate_accepted;
            const isPendingOutgoing = m.request_status === 'pending' && m.founder_accepted && !m.candidate_accepted;
            const isDeclined = m.request_status === 'declined';

            return (
              <div key={m.id} className={styles.matchFeedCard} data-testid={`match-card-${m.id}`}>
                <div className={styles.cardTopRow}>
                  <div className={styles.userBioRow}>
                    <div className={styles.avatarCircle}>{initials}</div>
                    <div className={styles.userNameArea}>
                      <div className={styles.nameRow}>
                        <span className={styles.nameText}>{displayName}</span>
                        <span className={styles.roleTag}>
                          {m.candidate_role ? m.candidate_role.charAt(0).toUpperCase() + m.candidate_role.slice(1) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.similarityScore}>{similarityPercent}% similarity</div>
                </div>

                {factorList.length > 0 && (
                  <div className={styles.tagsRow}>
                    {factorList.map((f) => (
                      <span key={f} className={styles.factorTag}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                <div className={styles.cardBottomRow}>
                  {isMutual ? (
                    <>
                      <div className={styles.revealedContact}>
                        <span>&#9993;</span> {m.contact_email || 'Contact details shared'}
                      </div>
                      <Button variant="secondary" size="sm" disabled>
                        Connected
                      </Button>
                    </>
                  ) : isDeclined ? (
                    <>
                      <div className={styles.contactNote}>
                        <span>&#128274;</span> Contact details hidden
                      </div>
                      <Button variant="secondary" size="sm" disabled>
                        Declined
                      </Button>
                    </>
                  ) : isPendingIncoming ? (
                    <>
                      <div className={styles.contactNote}>
                        <span>&#128274;</span> Candidate requested connection
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeclineMatch(m.id)}
                          disabled={actionLoadingId === m.id}
                        >
                          Decline
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAcceptMatch(m.id)}
                          disabled={actionLoadingId === m.id}
                        >
                          Accept
                        </Button>
                      </div>
                    </>
                  ) : isPendingOutgoing ? (
                    <>
                      <div className={styles.contactNote}>
                        <span>&#128274;</span> Contact revealed on mutual accept
                      </div>
                      <Button variant="secondary" size="sm" disabled>
                        Requested
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className={styles.contactNote}>
                        <span>&#128274;</span> Contact revealed on mutual accept
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRequestMatch(m.id)}
                        disabled={actionLoadingId === m.id}
                      >
                        {actionLoadingId === m.id ? 'Requesting...' : 'Request match'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Empty state bottom card */}
        {filteredMatches.length > 0 && (
          <div className={styles.emptyFeedCard}>
            <div className={styles.emptyTitle}>No more matches yet.</div>
            <div className={styles.emptyDesc}>Complete your profile to see more.</div>
          </div>
        )}
      </div>
    </div>
  );
}
