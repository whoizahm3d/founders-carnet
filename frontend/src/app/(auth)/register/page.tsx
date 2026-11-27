'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/auth';
import { Button, Select, ConsentBox, Spinner } from '@/components/ui';
import { AuthHeroPanel } from '@/components/auth/AuthHeroPanel';
import { ApiError } from '@/lib/api';
import {
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
  LinkedInIcon,
  GoogleIcon,
  GitHubIcon,
} from '@/components/ui/icons';

const ROLE_OPTIONS = [
  { value: 'founder', label: 'Founder' },
  { value: 'talent', label: 'Talent' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'investor', label: 'Investor' },
];

const ROLE_HINTS: Record<UserRole, string> = {
  founder: 'Building or scaling a startup in Pakistan',
  talent: 'Software, design, product or growth operator',
  mentor: 'Advising early-stage founders with domain expertise',
  investor: 'Angel, syndicate, or venture fund allocating capital',
  admin: '',
};

function getPasswordStrength(pass: string): { level: number; label: string } {
  if (pass.length === 0) return { level: 0, label: '' };
  if (pass.length < 8) return { level: 1, label: 'Too short' };
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/\d/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;
  if (score === 1) return { level: 1, label: 'Weak' };
  if (score === 2) return { level: 2, label: 'Good' };
  return { level: 3, label: 'Strong' };
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, register, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(`/${user.role}/dashboard`);
    }
  }, [user, isLoading, router]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('founder');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = getPasswordStrength(password);
  const strengthColor = ['', 'bg-status-error', 'bg-status-warning', 'bg-status-success'][strength.level];
  const strengthTextColor = ['', 'text-status-error', 'text-status-warning', 'text-status-success'][strength.level];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password.length > 128) {
      setError('Password must not exceed 128 characters.');
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to the terms and privacy policy before registering.');
      return;
    }

    try {
      setSubmitting(true);
      const newUser = await register({
        fullName: fullName.trim(),
        email,
        password,
        role,
        agreedToTerms,
      });
      router.push(`/${newUser.role}/dashboard`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('An account with this email address already exists. Please sign in instead.');
        } else if (err.status === 400) {
          setError('You must agree to the terms and privacy policy before registering.');
        } else if (err.status === 403) {
          setError(err.detail || 'Admin accounts cannot be registered publicly.');
        } else if (err.status === 422) {
          setError(err.detail || 'Validation error. Please check your inputs.');
        } else if (err.status === 429) {
          setError('Too many attempts. Please wait a minute and try again.');
        } else if (err.status === 0) {
          setError('Unable to connect to the server. Please check your internet connection.');
        } else {
          setError(err.detail || 'Registration failed. Please try again.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || user) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <Spinner variant="white" size="large" />
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
      {/* Left Column: Hero branding and floating platform note card */}
      <section aria-label="Introduction" className="lg:col-span-7 animate-entrance-delayed">
        <AuthHeroPanel />
      </section>

      {/* Right Column: 480px White Form Card */}
      <section
        aria-label="Account registration form"
        className="w-full max-w-auth-card lg:col-span-5 bg-white rounded-auth-card border border-hairline shadow-auth-card p-6 sm:p-10 mx-auto lg:mr-0 transition-all duration-300 ease-carnet animate-entrance"
      >
        <div className="w-full">
          {/* Segmented Control Tabs */}
          <div
            role="tablist"
            aria-label="Authentication Options"
            className="flex p-1 mb-8 rounded-pill bg-canvas border border-hairline shadow-inner max-w-[280px]"
          >
            <Link
              href="/login"
              role="tab"
              aria-selected="false"
              className="flex-1 py-1.5 px-4 rounded-pill text-xs font-mono uppercase tracking-wider font-semibold transition-all duration-300 ease-carnet text-text-muted hover:text-ink text-center"
            >
              Sign in
            </Link>
            <button
              type="button"
              role="tab"
              aria-selected="true"
              className="flex-1 py-1.5 px-4 rounded-pill text-xs font-mono uppercase tracking-wider font-semibold transition-all duration-300 ease-carnet bg-white text-ink shadow-sm cursor-default"
            >
              Register
            </button>
          </div>

          {/* Form Header */}
          <div className="space-y-2 mb-6">
            <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Create account
            </h1>
            <p className="font-sans text-sm text-text-secondary leading-relaxed">
              Join Pakistan&apos;s startup network with verified introductions.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-control bg-status-error-wash border border-status-error/20 transition-all duration-300"
            >
              <AlertCircleIcon size={18} className="text-status-error shrink-0 mt-0.5" />
              <span className="text-sm text-status-error">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Full Name input */}
            <div className="space-y-1.5">
              <label htmlFor="register-fullname" className="block font-sans text-sm font-semibold text-text tracking-wide">
                Full name
              </label>
              <input
                id="register-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Bilal Ahmed"
                autoComplete="name" maxLength={255}
                required
                disabled={submitting}
                className="w-full h-12 px-4 rounded-control border border-input-border bg-white text-ink placeholder:text-text-muted text-base focus:border-accent focus:ring-[3px] focus:ring-accent-wash outline-none transition-all duration-300 ease-carnet disabled:bg-fill disabled:cursor-not-allowed"
              />
            </div>

            {/* Email input */}
            <div className="space-y-1.5">
              <label htmlFor="register-email" className="block font-sans text-sm font-semibold text-text tracking-wide">
                Email address
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                required
                disabled={submitting}
                className="w-full h-12 px-4 rounded-control border border-input-border bg-white text-ink placeholder:text-text-muted text-base focus:border-accent focus:ring-[3px] focus:ring-accent-wash outline-none transition-all duration-300 ease-carnet disabled:bg-fill disabled:cursor-not-allowed"
              />
            </div>

            {/* Password input with show/hide and strength meter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="register-password" className="block font-sans text-sm font-semibold text-text tracking-wide">
                  Password
                </label>
                {password.length > 0 && (
                  <span className={`font-mono text-xs font-semibold uppercase tracking-wider ${strengthTextColor}`}>
                    Strength: {strength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                  disabled={submitting}
                  className="w-full h-12 px-4 pr-11 rounded-control border border-input-border bg-white text-ink placeholder:text-text-muted text-base focus:border-accent focus:ring-[3px] focus:ring-accent-wash outline-none transition-all duration-300 ease-carnet disabled:bg-fill disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-ink transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>

              {/* Password strength segments with 300ms fill animation */}
              {password.length > 0 && (
                <div className="flex gap-1.5 pt-1">
                  {[1, 2, 3].map((bar) => (
                    <div
                      key={bar}
                      className={`h-1 flex-1 rounded-pill transition-all duration-300 ease-carnet ${
                        bar <= strength.level ? strengthColor : 'bg-trough'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Role Select: single word roles, description in hint */}
            <Select
              label="Select your role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={ROLE_OPTIONS}
              hint={ROLE_HINTS[role]}
            />

            {/* Consent and Data Notice Box */}
            <ConsentBox
              id="consent-checkbox"
              checked={agreedToTerms}
              onChange={setAgreedToTerms}
              label="Consent and data notice"
            >
              By creating an account, you agree to our{' '}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-ink underline hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 rounded-sm"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-ink underline hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 rounded-sm"
              >
                Privacy Policy
              </Link>
              . Profiles undergo verification before introduction requests are active. Contact details stay hidden until both sides accept.
            </ConsentBox>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                block
                hasBadge
                loading={submitting}
                disabled={!agreedToTerms}
              >
                {submitting ? 'Creating account' : 'Create account'}
              </Button>
            </div>

            {!agreedToTerms && (
              <p className="text-center text-sm text-text-muted -mt-2">
                Create account is disabled until you agree to the terms above.
              </p>
            )}
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-hairline" />
            </div>
            <div className="relative bg-white px-3 font-mono text-xs uppercase tracking-wider font-semibold text-text-muted">
              Or continue with
            </div>
          </div>

          {/* Social options: LinkedIn full width, Google and GitHub side by side below it */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full h-11 rounded-pill border border-hairline bg-white text-ink font-semibold text-sm flex items-center justify-center gap-2.5 cursor-not-allowed shadow-sm transition-colors"
            >
              <LinkedInIcon size={18} className="text-ink" />
              <span>Continue with LinkedIn</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="w-full h-11 rounded-pill border border-hairline bg-white text-ink font-semibold text-sm flex items-center justify-center gap-2 cursor-not-allowed shadow-sm transition-colors"
              >
                <GoogleIcon size={18} className="text-ink" />
                <span>Google</span>
              </button>

              <button
                type="button"
                disabled
                aria-disabled="true"
                className="w-full h-11 rounded-pill border border-hairline bg-white text-ink font-semibold text-sm flex items-center justify-center gap-2 cursor-not-allowed shadow-sm transition-colors"
              >
                <GitHubIcon size={18} className="text-ink" />
                <span>GitHub</span>
              </button>
            </div>

            <p className="text-center font-mono text-xs text-text-muted pt-1">
              (Not available yet)
            </p>
          </div>

          {/* Switch to Sign In */}
          <div className="mt-6 text-center text-sm text-text-secondary">
            <span>Already have an account?</span>
            <Link
              href="/login"
              className="font-semibold text-ink hover:text-accent hover:underline ml-1.5 focus:outline-none"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
