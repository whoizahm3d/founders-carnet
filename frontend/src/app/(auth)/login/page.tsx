'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button, Spinner } from '@/components/ui';
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

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(`/${user.role}/dashboard`);
    }
  }, [user, isLoading, router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      const loggedInUser = await login({ email, password, rememberMe });
      router.push(`/${loggedInUser.role}/dashboard`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Invalid email or password.');
        } else if (err.status === 429) {
          setError('Too many attempts. Please wait a minute and try again.');
        } else if (err.status === 0) {
          setError('Unable to reach server. Please check your internet connection.');
        } else {
          setError(err.detail || 'An unexpected error occurred. Please try again.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Invalid email or password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Prevent flash while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 pt-2 pb-12">
      {/* Left Column: Brand Story and Note Card */}
      <AuthHeroPanel />

      {/* Right Column: Form Container Card */}
      <section
        aria-label="Sign in form"
        className="w-full max-w-auth-card lg:w-[480px] bg-white rounded-auth-card border border-hairline shadow-auth-card p-6 sm:p-10 mx-auto lg:mr-0 lg:ml-auto transition-all duration-300 ease-carnet"
      >
        <div className="w-full">
          {/* Segmented Control Tabs */}
          <div
            role="tablist"
            aria-label="Authentication Options"
            className="flex p-1 mb-8 rounded-pill bg-canvas border border-hairline shadow-inner max-w-[280px]"
          >
            <button
              type="button"
              role="tab"
              aria-selected="true"
              className="flex-1 py-1.5 px-4 rounded-pill text-xs font-mono uppercase tracking-wider font-semibold transition-all duration-300 ease-carnet bg-white text-ink shadow-sm cursor-default"
            >
              Sign in
            </button>
            <Link
              href="/register"
              role="tab"
              aria-selected="false"
              className="flex-1 py-1.5 px-4 rounded-pill text-xs font-mono uppercase tracking-wider font-semibold transition-all duration-300 ease-carnet text-text-muted hover:text-ink text-center"
            >
              Register
            </Link>
          </div>

          {/* Form Header */}
          <div className="space-y-2 mb-6">
            <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Welcome back
            </h1>
            <p className="font-sans text-sm text-text-secondary leading-relaxed">
              Enter your credentials to access your workspace.
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
            {/* Email input */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block font-sans text-sm font-semibold text-text tracking-wide">
                Email address
              </label>
              <input
                id="login-email"
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

            {/* Password input with show/hide and Forgot password link below field */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block font-sans text-sm font-semibold text-text tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="current-password"
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
              {/* Forgot password placed below field, right-aligned, single line at all widths */}
              <div className="flex justify-end pt-1">
                <span className="font-mono text-xs text-text-muted cursor-not-allowed select-none whitespace-nowrap">
                  Forgot password? <span className="text-[11px] text-text-muted/80">(Not available yet)</span>
                </span>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  id="login-remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-hairline text-ink cursor-pointer focus:ring-accent"
                />
                <span className="text-sm font-medium text-text-secondary select-none">
                  Remember me
                </span>
              </label>
            </div>

            {/* Primary Action Button: 48px high, full pill, circular arrow badge */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                block
                hasBadge
                loading={submitting}
              >
                {submitting ? 'Signing in' : 'Sign in'}
              </Button>
            </div>
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

          {/* Switch to Register */}
          <div className="mt-6 text-center text-sm text-text-secondary">
            <span>Don&apos;t have an account?</span>
            <Link
              href="/register"
              className="font-semibold text-ink hover:text-accent hover:underline ml-1.5 focus:outline-none"
            >
              Register
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
