'use client';

/**
 * Founder Startup Readiness Score (/founder/readiness)
 * Displays uncalibrated rubric evaluation across 7 core dimensions (FR-2).
 * Sourced from backend:
 * - GET /api/v1/founders/me/startups
 * - GET /api/v1/startups/{startup_id}/readiness
 * - POST /api/v1/startups/{startup_id}/readiness
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Spinner } from '@/components/ui';
import { AlertCircleIcon } from '@/components/ui/icons';
import { api, ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type {
  StartupRead,
  ReadinessRead,
  DimensionResult,
  DimensionKey,
} from '@/types/founder';
import styles from './ReadinessScore.module.css';

const DIMENSION_CONFIG: Record<DimensionKey, { label: string; order: number }> = {
  problem_clarity: { label: 'Problem clarity', order: 1 },
  market_definition: { label: 'Market definition', order: 2 },
  differentiation: { label: 'Differentiation', order: 3 },
  business_model_coherence: { label: 'Business model', order: 4 },
  traction: { label: 'Traction', order: 5 },
  team: { label: 'Team', order: 6 },
  scalability: { label: 'Scalability', order: 7 },
};

function formatDimensionTitle(dimension: DimensionKey): string {
  return DIMENSION_CONFIG[dimension]?.label || dimension.replace(/_/g, ' ');
}

export default function ReadinessScorePage() {
  const [startup, setStartup] = useState<StartupRead | null>(null);
  const [readiness, setReadiness] = useState<ReadinessRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssessing, setIsAssessing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
            const history = await api.get<ReadinessRead[]>(
              `/startups/${activeStartup.id}/readiness?limit=1`,
              { token }
            );
            if (!cancelled && history && history.length > 0) {
              setReadiness(history[0]);
            }
          } catch (historyErr) {
            if (historyErr instanceof ApiError && historyErr.status === 404) {
              if (!cancelled) setReadiness(null);
            } else {
              throw historyErr;
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            if (err.status === 429) {
              setError('Too many requests. Please wait a moment before trying again.');
            } else if (err.status === 502) {
              setError('The readiness evaluation service is currently unavailable. Please try again later.');
            } else if (err.status === 503) {
              setError('Service is temporarily unavailable. Please try again shortly.');
            } else {
              setError(err.detail || 'Unable to load readiness assessment.');
            }
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load readiness data.');
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

  const handleRunAssessment = async () => {
    if (!startup) return;
    setError('');
    setSuccessMessage('');

    try {
      setIsAssessing(true);
      const token = authStorage.getToken();
      const updated = await api.post<ReadinessRead>(
        `/startups/${startup.id}/readiness`,
        {},
        { token }
      );
      setReadiness(updated);
      setSuccessMessage('Readiness score updated successfully.');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('Too many requests. Please wait a moment before running another assessment.');
        } else if (err.status === 502) {
          setError('Readiness assessment could not be generated. Please try again later.');
        } else if (err.status === 503) {
          setError('Service is temporarily unavailable. Please try again shortly.');
        } else {
          setError(err.detail || 'Failed to generate readiness score.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Assessment request failed.');
      }
    } finally {
      setIsAssessing(false);
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
          title="Readiness score"
          subtitle="A rubric-based guide to where your startup stands. It is not a funding probability."
        />
        <div className="p-8 rounded-card border border-hairline bg-card text-center max-w-xl mx-auto my-8 space-y-4">
          <p className="text-base text-text-secondary">
            Add your startup profile first.
          </p>
          <p className="text-sm text-text-muted">
            The readiness evaluation analyzes your problem statement, business model, stage, traction, and team background.
          </p>
          <Link href="/founder/profile">
            <Button variant="primary">Go to startup profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  const dimensions: DimensionResult[] = readiness?.result?.dimensions
    ? [...readiness.result.dimensions].sort((a, b) => {
        const orderA = DIMENSION_CONFIG[a.dimension]?.order ?? 99;
        const orderB = DIMENSION_CONFIG[b.dimension]?.order ?? 99;
        return orderA - orderB;
      })
    : [];

  const averageScore = dimensions.length > 0
    ? (dimensions.reduce((acc, d) => acc + d.score, 0) / dimensions.length).toFixed(1)
    : null;

  return (
    <div className={styles.container}>
      <PageHeader
        title="Readiness score"
        subtitle="A rubric-based guide to where your startup stands. It is not a funding probability."
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

      {dimensions.length === 0 ? (
        <div className="p-8 rounded-card border border-hairline bg-card text-center max-w-xl mx-auto my-8 space-y-4">
          <p className="text-base text-text-primary font-medium">
            No readiness score evaluated yet.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            Run an assessment to evaluate your startup across the 7 core dimensions. This provides structured feedback to help you prepare for discussions with mentors and investors.
          </p>
          <Button
            variant="primary"
            onClick={handleRunAssessment}
            disabled={isAssessing}
          >
            {isAssessing ? 'Evaluating...' : 'Run assessment'}
          </Button>
        </div>
      ) : (
        <div className={styles.mainLayout}>
          {/* Left: 7 Dimensions 2-column grid */}
          <div className={styles.dimensionsGrid}>
            {dimensions.map((dim) => (
              <div key={dim.dimension} className={styles.dimensionCard}>
                <div className={styles.headerRow}>
                  <span className={styles.dimensionTitle}>{formatDimensionTitle(dim.dimension)}</span>
                  <span className={styles.scoreFraction}>{dim.score} / 5</span>
                </div>

                <div className={styles.track}>
                  <div
                    className={styles.bar}
                    style={{ width: `${(dim.score / 5) * 100}%` }}
                  />
                </div>

                <p className={styles.narrative}>{dim.reasoning}</p>

                {dim.next_action && (
                  <div className="mt-auto pt-2 border-t border-hairline/60">
                    <span className="block text-xs font-semibold text-text-primary mb-0.5">
                      Suggested next action
                    </span>
                    <span className="text-xs text-text-secondary leading-relaxed">
                      {dim.next_action}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right sidebar summary card & recalculate */}
          <div className={styles.sidebarCol}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryTitle}>Summary</div>
              {averageScore && (
                <div className={styles.bigScore}>{averageScore} / 5</div>
              )}
              <p className={styles.summaryText}>
                Average across the seven dimensions. A rubric guide for structured feedback, not an automated funding prediction.
              </p>
              <Link href="/founder/pitch">
                <Button variant="primary" block>
                  Practice your pitch
                </Button>
              </Link>
            </div>

            <Button
              variant="secondary"
              block
              onClick={handleRunAssessment}
              disabled={isAssessing}
            >
              {isAssessing ? 'Recalculating...' : 'Recalculate score'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
