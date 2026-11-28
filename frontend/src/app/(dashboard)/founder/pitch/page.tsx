'use client';

/**
 * Founder Pitch Practice (/founder/pitch)
 * Multi-turn simulated investor conversation powered by language models (FR-3).
 * Data contracts:
 * - GET /api/v1/founders/me/startups
 * - POST /api/v1/pitch/sessions (PitchStart)
 * - POST /api/v1/pitch/sessions/{id}/turns (PitchAnswer)
 * - POST /api/v1/pitch/sessions/{id}/abandon
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Spinner } from '@/components/ui';
import { AlertCircleIcon } from '@/components/ui/icons';
import { api, ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type {
  StartupRead,
  PitchSessionRead,
  PitchStart,
  PitchAnswer,
} from '@/types/founder';
import styles from './PitchPractice.module.css';

const PERSONA_OPTIONS = [
  'Seed-stage fintech investor',
  'Angel investor (B2B SaaS)',
  'Growth VC investor',
];

export default function PitchPracticePage() {
  const router = useRouter();

  const [startup, setStartup] = useState<StartupRead | null>(null);
  const [session, setSession] = useState<PitchSessionRead | null>(null);
  const [persona, setPersona] = useState(PERSONA_OPTIONS[0]);
  const [inputText, setInputText] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [error, setError] = useState('');
  const [retryableTurn, setRetryableTurn] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = authStorage.getToken();

    async function loadStartup() {
      try {
        setIsLoading(true);
        setError('');

        const startups = await api.get<StartupRead[]>('/founders/me/startups', { token });
        const activeStartup = startups.length > 0 ? startups[0] : null;

        if (cancelled) return;
        setStartup(activeStartup);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail || 'Unable to load startup details.');
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load profile.');
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadStartup();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartSession = async () => {
    if (!startup) return;
    setError('');
    setRetryableTurn(null);

    try {
      setIsStarting(true);
      const token = authStorage.getToken();
      const payload: PitchStart = {
        startup_id: startup.id,
        persona,
      };

      const newSession = await api.post<PitchSessionRead>(
        '/pitch/sessions',
        payload,
        { token }
      );
      setSession(newSession);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('Too many requests. Please wait a moment before trying again.');
        } else if (err.status === 502) {
          setError('Pitch response could not be generated; the transcript is preserved. Please try again.');
        } else if (err.status === 503) {
          setError('Service is temporarily unavailable. Please try again shortly.');
        } else {
          setError(err.detail || 'Failed to start pitch session.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Session initialization failed.');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = retryableTurn || inputText.trim();
    if (!textToSend || !session) return;

    setError('');
    setRetryableTurn(null);

    try {
      setIsSending(true);
      const token = authStorage.getToken();
      const payload: PitchAnswer = {
        answer: textToSend,
      };

      const updated = await api.post<PitchSessionRead>(
        `/pitch/sessions/${session.id}/turns`,
        payload,
        { token }
      );

      setSession(updated);
      setInputText('');

      if (updated.status === 'completed') {
        router.push(`/founder/feedback?session_id=${updated.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('Too many requests. Please wait a moment before trying again.');
        } else if (err.status === 502) {
          setRetryableTurn(textToSend);
          setError('Pitch response could not be generated; the transcript is preserved. You can retry sending your response.');
        } else if (err.status === 503) {
          setError('Service is temporarily unavailable. Please try again shortly.');
        } else {
          setError(err.detail || 'Failed to submit response.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Network error.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    setError('');

    try {
      setIsAbandoning(true);
      const token = authStorage.getToken();
      await api.post<PitchSessionRead>(
        `/pitch/sessions/${session.id}/abandon`,
        {},
        { token }
      );
      router.push('/founder/feedback');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || 'Failed to end session.');
      } else {
        setError(err instanceof Error ? err.message : 'Error ending session.');
      }
    } finally {
      setIsAbandoning(false);
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
          title="Pitch practice"
          subtitle="Practice your investor pitch with a simulated conversation and live rubric feedback."
        />
        <div className="p-8 rounded-card border border-hairline bg-card text-center max-w-xl mx-auto my-8 space-y-4">
          <p className="text-base text-text-secondary">
            Add your startup profile first.
          </p>
          <p className="text-sm text-text-muted">
            The simulated investor persona asks tailored questions based on your sector, stage, and business model.
          </p>
          <Link href="/founder/profile">
            <Button variant="primary">Go to startup profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  const turns = session?.turns || [];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Pitch practice"
        subtitle="Practice your investor pitch with a simulated conversation and live rubric feedback."
      />

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2.5 px-4 py-3 rounded-control bg-status-error-wash border border-status-error/20 text-sm text-status-error"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircleIcon size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          {retryableTurn && (
            <button
              type="button"
              onClick={() => handleSend()}
              className="text-xs font-semibold underline hover:text-ink shrink-0 ml-2"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Selectors Bar */}
      <div className={styles.selectorBar}>
        <div className={styles.dropdownGroup}>
          <div className={styles.selectBox}>
            <span className={styles.selectLabel}>Investor persona</span>
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              disabled={Boolean(session && session.status === 'active')}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                backgroundColor: '#ffffff',
              }}
            >
              {PERSONA_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.selectBox}>
            <span className={styles.selectLabel}>Startup</span>
            <select
              value={startup.name}
              disabled
              style={{
                padding: '6px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                backgroundColor: '#ffffff',
              }}
            >
              <option value={startup.name}>{startup.name}</option>
            </select>
          </div>
        </div>

        <div className={styles.disclaimerText}>
          Written by a language model simulation. This is a practice guide, not a funding prediction.
        </div>
      </div>

      <div className={styles.mainLayout}>
        {/* Left: Practice chat */}
        <div className={styles.chatCard}>
          <div className={styles.chatHeader}>
            <span className={styles.chatTitle}>Practice chat</span>
            <span className={styles.mobileTimerText}>
              {session?.status === 'active' ? 'Session active' : 'Ready'}
            </span>
          </div>

          <div className={styles.chatMessages}>
            {!session ? (
              <div className="p-8 text-center space-y-4 my-auto">
                <p className="text-sm text-text-secondary">
                  Ready to test your pitch? Start a session to simulate questions from a {persona.toLowerCase()}.
                </p>
                <Button
                  variant="primary"
                  onClick={handleStartSession}
                  disabled={isStarting}
                >
                  {isStarting ? 'Starting session...' : 'Start pitch session'}
                </Button>
              </div>
            ) : (
              turns.map((turn) => {
                const isInvestor = turn.speaker === 'investor';
                return (
                  <div
                    key={turn.turn_number}
                    className={isInvestor ? styles.messageWrapperAi : styles.messageWrapperUser}
                  >
                    <span className={styles.senderLabel}>
                      {isInvestor ? 'Simulated Investor' : 'You'}
                    </span>
                    <div className={isInvestor ? styles.bubbleAi : styles.bubbleUser}>
                      {turn.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {session && session.status === 'active' && (
            <form onSubmit={handleSend} className={styles.inputBar}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your response..."
                className={styles.chatInput}
                disabled={isSending || isAbandoning}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={isSending || !inputText.trim() || isAbandoning}
              >
                {isSending ? 'Sending...' : 'Send'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleEndSession}
                disabled={isAbandoning || isSending}
              >
                {isAbandoning ? 'Ending...' : 'End session'}
              </Button>
            </form>
          )}
        </div>

        {/* Right: Rubric & Session status */}
        <div className={styles.rightCol}>
          <div className={styles.rubricCard}>
            <div className={styles.rubricTitle}>Rubric guidance</div>
            <p className="text-xs text-text-secondary leading-relaxed mb-3">
              Answers are evaluated at the conclusion of the session across three core capabilities:
            </p>

            <div className={styles.rubricItem}>
              <div className={styles.rubricRow}>
                <span className="font-medium">Clarity</span>
                <span className="text-text-muted">1 to 5</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1 leading-snug">
                Conciseness of problem framing and target customer description.
              </p>
            </div>

            <div className={styles.rubricItem}>
              <div className={styles.rubricRow}>
                <span className="font-medium">Confidence</span>
                <span className="text-text-muted">1 to 5</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1 leading-snug">
                Defensibility of assumptions and directness when answering pushback.
              </p>
            </div>

            <div className={styles.rubricItem}>
              <div className={styles.rubricRow}>
                <span className="font-medium">Content</span>
                <span className="text-text-muted">1 to 5</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1 leading-snug">
                Specificity of traction metrics, unit economics, and go-to-market channels.
              </p>
            </div>
          </div>

          <div className={styles.timerCard}>
            <div className={styles.timerTitle}>Session status</div>
            <div className={styles.timerValue}>
              {session?.status === 'active' ? 'Active' : 'Not started'}
            </div>
            <p className="text-xs text-text-muted mt-1">
              Turns: {turns.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
