'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type { PitchSessionRead, StartupRead } from '@/types/founder';
import styles from './PitchFeedback.module.css';

function PitchFeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get('session_id');
  const { isLoading: authLoading } = useAuth();

  const [loaded, setLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [startup, setStartup] = useState<StartupRead | null>(null);
  const [history, setHistory] = useState<PitchSessionRead[]>([]);
  const [selectedSession, setSelectedSession] = useState<PitchSessionRead | null>(null);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const token = authStorage.getToken();
  const isLoading = authLoading || (Boolean(token) && !loaded && !errorMsg);

  useEffect(() => {
    if (authLoading) return;

    const token = authStorage.getToken();
    if (!token) return;

    let cancelled = false;

    async function loadData() {
      try {
        const startups = await api.get<StartupRead[]>('/founders/me/startups', { token });
        if (cancelled) return;

        setErrorMsg(null);

        if (!startups || startups.length === 0) {
          setStartup(null);
          setLoaded(true);
          return;
        }

        const activeStartup = startups[0];
        setStartup(activeStartup);

        const sessions = await api.get<PitchSessionRead[]>(
          `/pitch/history?startup_id=${activeStartup.id}`,
          { token }
        );
        if (cancelled) return;

        const sessionList = Array.isArray(sessions) ? sessions : [];
        setHistory(sessionList);

        let target: PitchSessionRead | null = null;
        if (sessionIdParam) {
          const parsedId = parseInt(sessionIdParam, 10);
          target = sessionList.find((s) => s.id === parsedId) ?? null;
        }

        if (!target) {
          const completed = sessionList.filter((s) => s.status === 'completed');
          target = completed.length > 0 ? completed[0] : (sessionList[0] ?? null);
        }

        setSelectedSession(target);
        setLoaded(true);
      } catch (err) {
        if (cancelled) return;
        setLoaded(true);
        if (err instanceof ApiError) {
          if (err.status === 429) {
            setErrorMsg('Too many requests. Please wait a moment before trying again.');
          } else if (err.status === 503) {
            setErrorMsg('Service is temporarily unavailable. Please try again shortly.');
          } else if (err.status === 502) {
            setErrorMsg('Unable to retrieve pitch feedback right now. The transcript is preserved.');
          } else {
            setErrorMsg(err.message || 'Failed to load feedback session.');
          }
        } else {
          setErrorMsg('An unexpected error occurred while loading session feedback.');
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, sessionIdParam]);

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <PageHeader title="Session feedback" subtitle="Loading feedback details..." />
        <div className={styles.card}>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Loading pitch simulation feedback...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className={styles.container}>
        <PageHeader title="Session feedback" subtitle="Practice guide" />
        <div
          role="alert"
          style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-status-error-wash, #fef2f2)',
            border: '1px solid var(--color-status-error-border, #fecaca)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-status-error-text, #991b1b)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {errorMsg}
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={() => router.push('/founder/pitch')}>
            Back to pitch practice
          </Button>
        </div>
      </div>
    );
  }

  if (!startup) {
    return (
      <div className={styles.container}>
        <PageHeader title="Session feedback" subtitle="Practice guide" />
        <div className={styles.card} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
            Add your startup profile first
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            To view pitch simulation feedback and practice runs, create your startup profile.
          </p>
          <Link href="/founder/profile">
            <Button variant="primary">Add your startup profile first.</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!selectedSession) {
    return (
      <div className={styles.container}>
        <PageHeader title="Session feedback" subtitle="Practice guide" />
        <div className={styles.card} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
            No pitch sessions found
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Complete a practice pitch session to receive rubric feedback and actionable suggestions.
          </p>
          <Link href="/founder/pitch">
            <Button variant="primary">Start a pitch session</Button>
          </Link>
        </div>
      </div>
    );
  }

  const scores = selectedSession.scores;
  const clarityScore = scores?.clarity?.score ?? null;
  const confidenceScore = scores?.confidence?.score ?? null;
  const contentScore = scores?.content?.score ?? null;

  const validScores = [clarityScore, confidenceScore, contentScore].filter(
    (s): s is number => typeof s === 'number'
  );
  const averageScore =
    validScores.length > 0
      ? (validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length).toFixed(1)
      : null;

  // Next steps derived from score reasoning or honest empty state
  const derivedSteps: { id: string; text: string }[] = [];
  if (scores?.clarity?.reasoning) {
    derivedSteps.push({
      id: 'clarity',
      text: scores.clarity.reasoning,
    });
  }
  if (scores?.content?.reasoning) {
    derivedSteps.push({
      id: 'content',
      text: scores.content.reasoning,
    });
  }
  if (scores?.confidence?.reasoning) {
    derivedSteps.push({
      id: 'confidence',
      text: scores.confidence.reasoning,
    });
  }

  // Session turns / transcript
  const turns = selectedSession.turns ?? [];
  const questionTurns = turns.filter((t) => t.speaker === 'investor');

  // Completed sessions for progress across sessions
  const completedSessions = history.filter((s) => s.status === 'completed');

  return (
    <div className={styles.container}>
      <PageHeader
        title="Session feedback"
        subtitle={`Investor persona: ${selectedSession.persona} | Session status: ${selectedSession.status}`}
      />

      {/* Honest simulation disclaimer */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: 'var(--color-surface-subtle, #f9fafb)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
        }}
      >
        Written by a language model simulation. This is a practice guide, not a funding prediction.
      </div>

      <div className={styles.mainLayout}>
        {/* Left column */}
        <div className={styles.leftCol}>
          {/* Feedback by rubric */}
          <div className={styles.card}>
            <div className={styles.headerRow}>
              <span className={styles.cardTitle}>Feedback by rubric</span>
              <span className={styles.averageText}>
                {averageScore !== null ? (
                  <>
                    Session average <span className={styles.averageScore}>{averageScore} / 5</span>
                  </>
                ) : (
                  <span>Scores pending</span>
                )}
              </span>
            </div>

            <div className={styles.rubricList}>
              {/* Clarity */}
              <div className={styles.rubricItem}>
                <div className={styles.itemHeader}>
                  <span>Clarity</span>
                  <span style={{ fontWeight: 'var(--font-weight-bold)' }}>
                    {clarityScore !== null ? `${clarityScore} / 5` : 'N/A'}
                  </span>
                </div>
                <div className={styles.track}>
                  <div
                    className={styles.bar}
                    style={{ width: clarityScore !== null ? `${(clarityScore / 5) * 100}%` : '0%' }}
                  />
                </div>
                <p className={styles.feedbackNote}>
                  {scores?.clarity?.reasoning || 'No specific clarity notes provided for this session.'}
                </p>
              </div>

              {/* Confidence */}
              <div className={styles.rubricItem}>
                <div className={styles.itemHeader}>
                  <span>Confidence</span>
                  <span style={{ fontWeight: 'var(--font-weight-bold)' }}>
                    {confidenceScore !== null ? `${confidenceScore} / 5` : 'N/A'}
                  </span>
                </div>
                <div className={styles.track}>
                  <div
                    className={styles.bar}
                    style={{ width: confidenceScore !== null ? `${(confidenceScore / 5) * 100}%` : '0%' }}
                  />
                </div>
                <p className={styles.feedbackNote}>
                  {scores?.confidence?.reasoning || 'No specific confidence notes provided for this session.'}
                </p>
              </div>

              {/* Content */}
              <div className={styles.rubricItem}>
                <div className={styles.itemHeader}>
                  <span>Content</span>
                  <span style={{ fontWeight: 'var(--font-weight-bold)' }}>
                    {contentScore !== null ? `${contentScore} / 5` : 'N/A'}
                  </span>
                </div>
                <div className={styles.track}>
                  <div
                    className={styles.bar}
                    style={{ width: contentScore !== null ? `${(contentScore / 5) * 100}%` : '0%' }}
                  />
                </div>
                <p className={styles.feedbackNote}>
                  {scores?.content?.reasoning || 'No specific content notes provided for this session.'}
                </p>
              </div>
            </div>
          </div>

          {/* Session questions */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Session questions</div>
            {questionTurns.length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                No question records available for this session.
              </p>
            ) : (
              <div className={styles.struggledList}>
                {questionTurns.map((turn, idx) => (
                  <div key={`question-${turn.turn_number}-${idx}`} className={styles.struggledItem}>
                    <span className={styles.struggledIcon}>Q{turn.turn_number}</span>
                    <div className={styles.struggledContent}>
                      <span className={styles.questionText}>{turn.content}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Transcript</div>
            <div>
              <button
                type="button"
                className={styles.transcriptLink}
                onClick={() => setShowFullTranscript((prev) => !prev)}
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                {showFullTranscript ? 'Hide transcript' : 'View full transcript'}
              </button>
            </div>

            {showFullTranscript && (
              <div
                style={{
                  marginTop: 'var(--space-3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: 'var(--space-3)',
                }}
              >
                {turns.length === 0 ? (
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    No transcript entries recorded.
                  </p>
                ) : (
                  turns.map((turn, idx) => {
                    const speakerLabel =
                      turn.speaker === 'investor'
                        ? 'Simulated Investor'
                        : turn.speaker === 'founder'
                        ? 'You'
                        : turn.speaker;
                    return (
                      <div key={`turn-${turn.turn_number}-${idx}`} style={{ fontSize: 'var(--font-size-xs)' }}>
                        <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                          Turn {turn.turn_number} ({speakerLabel})
                        </p>
                        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                          {turn.content}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className={styles.rightCol}>
          {/* Progress across sessions */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Progress across sessions</div>

            {completedSessions.length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                No other completed sessions yet.
              </p>
            ) : (
              completedSessions.slice(0, 5).map((session, index) => {
                const sClarity = session.scores?.clarity?.score ?? 0;
                const sConfidence = session.scores?.confidence?.score ?? 0;
                const sContent = session.scores?.content?.score ?? 0;
                const sAvg = ((sClarity + sConfidence + sContent) / 3).toFixed(1);
                const sPct = ((parseFloat(sAvg) / 5) * 100).toFixed(0);
                const dateStr = session.created_at
                  ? new Date(session.created_at).toLocaleDateString()
                  : `Session ${index + 1}`;

                return (
                  <div key={session.id} className={styles.progressItem}>
                    <div className={styles.progressItemHeader}>
                      <span className={styles.sessionDate}>
                        Session {session.id} &bull; {dateStr}
                      </span>
                      <span className={styles.sessionScore}>{sAvg} / 5</span>
                    </div>
                    <div className={styles.track}>
                      <div className={styles.bar} style={{ width: `${sPct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Next steps */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Next steps</div>
            {derivedSteps.length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                No specific next steps provided for this session.
              </p>
            ) : (
              <div className={styles.checklist}>
                {derivedSteps.map((step) => {
                  const isChecked = !!completedSteps[step.id];
                  return (
                    <label key={step.id} className={styles.checklistItem}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStep(step.id)}
                        className={styles.checkboxInput}
                      />
                      <span
                        style={{
                          textDecoration: isChecked ? 'line-through' : 'none',
                          opacity: isChecked ? 0.6 : 1,
                        }}
                      >
                        {step.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <Link href="/founder/pitch">
            <Button variant="primary" block>
              Practice again
            </Button>
          </Link>

          <Button
            variant="secondary"
            block
            onClick={() => {
              startTransition(() => {
                router.push('/founder/dashboard');
              });
            }}
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PitchFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <PageHeader title="Session feedback" subtitle="Loading feedback details..." />
          <div className={styles.card}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Loading pitch simulation feedback...
            </p>
          </div>
        </div>
      }
    >
      <PitchFeedbackContent />
    </Suspense>
  );
}
