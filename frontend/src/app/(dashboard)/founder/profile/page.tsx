'use client';

/**
 * Founder Startup Profile (/founder/profile)
 * Allows founders to view, create, and update their startup profile and
 * submit verification requests for human review (FR-1, FR-17, FR-24).
 * Types strictly mapped to backend schemas (StartupRead, StartupCreate, StartupUpdate, FounderProfileRead).
 */

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input, Textarea, Select, Button, Spinner } from '@/components/ui';
import { AlertCircleIcon } from '@/components/ui/icons';
import { api, ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type {
  StartupRead,
  StartupStage,
  FounderProfileRead,
  StartupVerificationRead,
} from '@/types/founder';
import styles from './FounderProfile.module.css';

const SECTOR_OPTIONS = [
  { value: 'fintech', label: 'Fintech' },
  { value: 'edtech', label: 'Edtech' },
  { value: 'healthtech', label: 'Healthtech' },
  { value: 'saas', label: 'SaaS' },
  { value: 'aiml', label: 'AI/ML' },
  { value: 'ecommerce', label: 'E-commerce tech' },
  { value: 'agritech', label: 'Agritech' },
];

const STAGE_OPTIONS = [
  { value: 'idea', label: 'Idea' },
  { value: 'mvp', label: 'MVP / Prototype' },
  { value: 'growth', label: 'Early growth' },
  { value: 'scaling', label: 'Scaling' },
];

export default function FounderProfilePage() {
  const [startup, setStartup] = useState<StartupRead | null>(null);
  const [verification, setVerification] = useState<StartupVerificationRead | null>(null);

  // Form field states
  const [startupName, setStartupName] = useState('');
  const [oneLine, setOneLine] = useState('');
  const [sector, setSector] = useState('fintech');
  const [stage, setStage] = useState<StartupStage>('mvp');
  const [location, setLocation] = useState('');
  const [businessModel, setBusinessModel] = useState('');
  const [tractionSummary, setTractionSummary] = useState('');
  const [customerCount, setCustomerCount] = useState<string>('0');
  const [skillsText, setSkillsText] = useState('');
  const [productLink, setProductLink] = useState('');
  const [bio, setBio] = useState('');
  const [verificationNote, setVerificationNote] = useState('');

  // UI status states
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const token = authStorage.getToken();

    async function loadData() {
      try {
        setIsLoading(true);
        setError('');

        // 1. Fetch founder profile (may 404 if first-time founder)
        let founderProfile: FounderProfileRead | null = null;
        try {
          founderProfile = await api.get<FounderProfileRead>('/founders/me/profile', { token });
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            founderProfile = null;
          } else {
            throw err;
          }
        }

        if (!cancelled && founderProfile) {
          if (founderProfile.bio) setBio(founderProfile.bio);
          if (founderProfile.location) setLocation(founderProfile.location);
        }

        // 2. Fetch founder startups
        const startups = await api.get<StartupRead[]>('/founders/me/startups', { token });
        const activeStartup = startups.length > 0 ? startups[0] : null;
        if (!cancelled) {
          setStartup(activeStartup);
        }

        if (activeStartup) {
          if (!cancelled) {
            setStartupName(activeStartup.name);
            setOneLine(activeStartup.description);
            setSector(activeStartup.sector || 'fintech');
            setStage(activeStartup.stage || 'mvp');
            if (activeStartup.location) setLocation(activeStartup.location);
            setBusinessModel(activeStartup.business_model || '');
            setTractionSummary(activeStartup.traction_summary || '');
            setCustomerCount(String(activeStartup.customer_count ?? 0));
            setSkillsText((activeStartup.skills || []).join(', '));
          }

          // 3. Fetch verification request status
          try {
            const verif = await api.get<StartupVerificationRead>(
              `/founders/me/startups/${activeStartup.id}/verification-request`,
              { token }
            );
            if (!cancelled) {
              setVerification(verif);
            }
          } catch (verifErr) {
            if (verifErr instanceof ApiError && verifErr.status === 404) {
              if (!cancelled) setVerification(null);
            } else {
              throw verifErr;
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.detail || 'Unable to load profile data.');
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load profile.');
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const parseSkills = (text: string): string[] => {
    return text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const persistProfileAndStartup = async (): Promise<StartupRead> => {
    const token = authStorage.getToken();

    // 1. Ensure founder profile exists / updated
    await api.put<FounderProfileRead>('/founders/me/profile', {
      bio: bio.trim() || null,
      location: location.trim() || null,
      consent_accepted: true,
    }, { token });

    const parsedSkills = parseSkills(skillsText);
    const parsedCustomerCount = parseInt(customerCount, 10) || 0;

    // 2. Create or update startup
    let savedStartup: StartupRead;
    if (startup) {
      savedStartup = await api.patch<StartupRead>(`/founders/me/startups/${startup.id}`, {
        name: startupName.trim(),
        description: oneLine.trim(),
        sector,
        stage,
        location: location.trim(),
        business_model: businessModel.trim(),
        traction_summary: tractionSummary.trim(),
        customer_count: parsedCustomerCount,
        skills: parsedSkills,
      }, { token });
    } else {
      savedStartup = await api.post<StartupRead>('/founders/me/startups', {
        name: startupName.trim(),
        description: oneLine.trim(),
        sector,
        stage,
        location: location.trim(),
        business_model: businessModel.trim(),
        traction_summary: tractionSummary.trim(),
        customer_count: parsedCustomerCount,
        skills: parsedSkills,
      }, { token });
    }

    setStartup(savedStartup);
    return savedStartup;
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSavedMessage('');

    if (!startupName.trim() || !oneLine.trim()) {
      setError('Please provide a startup name and one-line description.');
      return;
    }

    try {
      setSubmitting(true);
      await persistProfileAndStartup();
      setSavedMessage('Profile saved successfully.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || 'Failed to save profile. Please check your inputs.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save profile.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSavedMessage('');

    const trimmedNote = verificationNote.trim();
    if (!trimmedNote) {
      setError('Please provide a note for the reviewer.');
      return;
    }

    if (!startupName.trim() || !oneLine.trim() || !businessModel.trim() || !location.trim()) {
      setError('Please complete startup name, description, stage, location, and business model before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const activeStartup = await persistProfileAndStartup();
      const token = authStorage.getToken();

      const verif = await api.post<StartupVerificationRead>(
        `/founders/me/startups/${activeStartup.id}/verification-request`,
        {
          note: trimmedNote,
        },
        { token }
      );

      setVerification(verif);
      setSavedMessage('Profile submitted for human verification review.');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Your startup is already under review.');
        } else {
          setError(err.detail || 'Failed to submit verification request.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Submission failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <Spinner size="large" />
      </div>
    );
  }

  const reviewStatusLabel = verification
    ? verification.status === 'approved'
      ? 'Verified'
      : verification.status === 'rejected'
        ? 'Rejected'
        : 'Pending review'
    : 'Not submitted';

  return (
    <div className={styles.container}>
      <PageHeader
        title="Startup profile"
        subtitle="Manage your startup details, traction metrics, and verification status."
        action={
          <span
            className={`${styles.pendingBadge} ${
              verification?.status === 'approved'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : verification?.status === 'rejected'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : ''
            }`}
          >
            {reviewStatusLabel}
          </span>
        }
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

      {savedMessage && (
        <div
          role="status"
          className="px-4 py-3 rounded-control bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium"
        >
          {savedMessage}
        </div>
      )}

      <div className={styles.twoColumnLayout}>
        {/* Left main form card */}
        <form className={styles.formCard} onSubmit={handleSaveDraft} noValidate>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="startup-name">
              Startup name <span className="text-status-error">*</span>
            </label>
            <Input
              id="startup-name"
              value={startupName}
              onChange={(e) => setStartupName(e.target.value)}
              placeholder="e.g. Munshi Books"
              disabled={submitting}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="one-line">
              One-line description <span className="text-status-error">*</span>
            </label>
            <Input
              id="one-line"
              value={oneLine}
              onChange={(e) => setOneLine(e.target.value)}
              placeholder="e.g. Automated accounting workflows for e-commerce founders"
              disabled={submitting}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="sector-select">
                Sector <span className="text-status-error">*</span>
              </label>
              <Select
                id="sector-select"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                options={SECTOR_OPTIONS}
                disabled={submitting}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="stage-select">
                Operating stage <span className="text-status-error">*</span>
              </label>
              <Select
                id="stage-select"
                value={stage}
                onChange={(e) => setStage(e.target.value as StartupStage)}
                options={STAGE_OPTIONS}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="location-input">
                Hub location <span className="text-status-error">*</span>
              </label>
              <Input
                id="location-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Karachi"
                disabled={submitting}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="customer-count-input">
                Customer count <span className="text-status-error">*</span>
              </label>
              <Input
                id="customer-count-input"
                type="number"
                min={0}
                value={customerCount}
                onChange={(e) => setCustomerCount(e.target.value)}
                placeholder="0"
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="business-model-desc">
              Business model <span className="text-status-error">*</span>
            </label>
            <Textarea
              id="business-model-desc"
              value={businessModel}
              onChange={(e) => setBusinessModel(e.target.value)}
              placeholder="Describe customer persona, pricing model, and unit economics"
              rows={3}
              disabled={submitting}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="traction-desc">
              Traction summary <span className="text-status-error">*</span>
            </label>
            <Textarea
              id="traction-desc"
              value={tractionSummary}
              onChange={(e) => setTractionSummary(e.target.value)}
              placeholder="State pilots, active merchants, repeat usage, or revenue milestones"
              rows={3}
              disabled={submitting}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="skills-input">
              Hiring or team skills
            </label>
            <Input
              id="skills-input"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="e.g. Python, React, Financial operations, Product design"
              disabled={submitting}
            />
            <span className={styles.fieldHint}>
              Comma-separated skills used for ecosystem matching with startup talent and mentors.
            </span>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="founder-bio">
              Founder bio (optional)
            </label>
            <Textarea
              id="founder-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief background on the founding team and relevant domain experience"
              rows={2}
              disabled={submitting}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="portfolio-link">
              Portfolio or product link (optional)
            </label>
            <Input
              id="portfolio-link"
              type="url"
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              placeholder="https://"
              disabled={submitting}
            />
            <span className={styles.fieldHint}>
              This link is optional. If provided, automated checks verify reachability and consistency with your profile. Used only for verification review, never shared publicly.
            </span>
          </div>

          {/* Verification note or pending status display */}
          {verification?.status === 'pending' ? (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                Submitted note for reviewer
              </label>
              <div
                id="submitted-verification-note"
                className="w-full px-3.5 py-2.5 rounded-control bg-fill/50 text-text-secondary font-sans text-sm border border-hairline whitespace-pre-wrap leading-relaxed"
              >
                {verification.note}
              </div>
            </div>
          ) : (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="verification-note">
                Note for the reviewer <span className="text-status-error">*</span>
              </label>
              <Textarea
                id="verification-note"
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                placeholder="State your business verification background, registration details, or any context for the reviewer"
                rows={3}
                maxLength={2000}
                disabled={submitting}
                required
              />
              <span className={styles.fieldHint}>
                Required for submitting verification review. Maximum 2000 characters.
              </span>
            </div>
          )}

          <div className={styles.buttonRow}>
            <Button
              type="submit"
              variant="secondary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save profile'}
            </Button>
            {verification?.status !== 'pending' && (
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmitReview}
                disabled={submitting || !verificationNote.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit for review'}
              </Button>
            )}
          </div>
        </form>

        {/* Right review status card */}
        <div className={styles.sidebarCard}>
          <div className={styles.sidebarTitle}>Review status</div>
          <span
            className={`${styles.pendingBadge} ${
              verification?.status === 'approved'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : verification?.status === 'rejected'
                  ? 'bg-status-error-wash text-status-error border-status-error/20'
                  : ''
            }`}
          >
            {reviewStatusLabel}
          </span>

          {verification?.status === 'rejected' && verification.reason && (
            <div className="p-3 rounded-control bg-status-error-wash border border-status-error/20 text-xs text-status-error leading-relaxed">
              <span className="font-semibold block mb-1">Reviewer reason:</span>
              {verification.reason}
            </div>
          )}

          <p className={styles.reviewExplainer}>
            Most profiles are verified quickly. Profiles requiring further verification receive a thorough human review.
          </p>

          <div className={styles.checklist}>
            <div className={styles.checklistItem}>
              <span className={verification?.status === 'approved' ? styles.checkIconSuccess : styles.checkIconDash}>
                {verification?.status === 'approved' ? '✓' : '-'}
              </span>
              <span>Startup verification</span>
            </div>
            <div className={styles.checklistItem}>
              <span className={startup ? styles.checkIconSuccess : styles.checkIconDash}>
                {startup ? '✓' : '-'}
              </span>
              <span>Profile registered</span>
            </div>
            <div className={styles.checklistItem}>
              <span className={productLink ? styles.checkIconSuccess : styles.checkIconPending}>
                {productLink ? '✓' : ''}
              </span>
              <span>Product link added</span>
            </div>
          </div>

          <div className={styles.reviewNote}>
            Your readiness score and pitch simulator remain accessible before review completes.
          </div>
        </div>
      </div>
    </div>
  );
}
