'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';

interface PreviewRole {
  id: 'founder' | 'talent' | 'mentor' | 'investor' | 'admin';
  label: string;
  image: string;
  alt: string;
  caption: string;
}

const PREVIEW_ROLES: PreviewRole[] = [
  {
    id: 'founder',
    label: 'Founders',
    image: '/previews/founder_dashboard_1440.png',
    alt: 'Founder dashboard with readiness rubric and matches',
    caption:
      'Review your profile, see matched mentors and investors, and request introductions.',
  },
  {
    id: 'talent',
    label: 'Talent',
    image: '/previews/talent_dashboard_1440.png',
    alt: 'Talent dashboard with matched roles and application tracking',
    caption:
      'Manage applications and explore startup roles matched to your profile across Pakistan.',
  },
  {
    id: 'mentor',
    label: 'Mentors',
    image: '/previews/mentor_dashboard_1440.png',
    alt: 'Mentor dashboard with advisory requests and mentee list',
    caption:
      'Review advisory requests, manage active mentees, and update your mentee availability.',
  },
  {
    id: 'investor',
    label: 'Investors',
    image: '/previews/investor_dashboard_1440.png',
    alt: 'Investor dashboard with thesis summary and founder matches',
    caption:
      'Explore founder matches aligned with your thesis and review inbound introduction requests.',
  },
  {
    id: 'admin',
    label: 'Admin',
    image: '/previews/admin_dashboard_1440.png',
    alt: 'Admin console with review queue and profile escalations',
    caption:
      'Review escalated profiles, inspect applicant documentation, and adjudicate appeals.',
  },
];

export function ProductPreview() {
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentRole = PREVIEW_ROLES[activeRoleIndex];

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;

    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % PREVIEW_ROLES.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + PREVIEW_ROLES.length) % PREVIEW_ROLES.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = PREVIEW_ROLES.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    setActiveRoleIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      id="preview"
      className="bg-canvas px-4 sm:px-6 md:px-16 py-16 lg:py-20 border-t border-hairline-row"
      aria-labelledby="product-preview-heading"
    >
      <div className="w-full max-w-auth-card lg:max-w-6xl mx-auto flex flex-col items-center">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <p className="font-sans text-xs text-text-muted mb-2">Preview</p>
          <h2
            id="product-preview-heading"
            className="text-3xl sm:text-4xl font-semibold text-ink tracking-tight mb-3"
          >
            A look inside{' '}
            <span className="font-serif italic font-normal text-accent">
              the workspace.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
            Explore the dashboard designed for each role in the network.
          </p>
        </div>

        {/* Accessible Switcher (Roving tabIndex) */}
        <div
          role="tablist"
          aria-label="Dashboard role previews"
          className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-pill bg-fill border border-hairline-subtle shadow-sm mb-6 sm:mb-8"
        >
          {PREVIEW_ROLES.map((role, idx) => {
            const isSelected = activeRoleIndex === idx;
            return (
              <button
                key={role.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                type="button"
                role="tab"
                id={`preview-tab-${role.id}`}
                aria-controls={`preview-panel-${role.id}`}
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveRoleIndex(idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`min-h-[44px] min-w-[44px] px-3.5 sm:px-4 py-2 rounded-pill font-mono text-xs uppercase tracking-[0.05em] transition-colors duration-200 motion-reduce:transition-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-[0.98] ${
                  isSelected
                    ? 'bg-ink text-white font-semibold shadow-sm'
                    : 'text-text-secondary hover:text-ink hover:bg-white/60'
                }`}
              >
                {role.label}
              </button>
            );
          })}
        </div>

        {/* Preview Frame with Ambient Glow */}
        <div className="relative w-full max-w-5xl mx-auto">
          {/* Ambient Glow */}
          <div
            className="absolute -inset-4 sm:-inset-6 bg-accent/15 blur-3xl rounded-full pointer-events-none -z-10"
            aria-hidden="true"
          />

          {/* Tab Panel */}
          <div
            role="tabpanel"
            id={`preview-panel-${currentRole.id}`}
            aria-labelledby={`preview-tab-${currentRole.id}`}
            tabIndex={0}
            className="relative rounded-card border border-hairline/70 bg-white/70 backdrop-blur-glass p-2 sm:p-3 shadow-glass overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="relative w-full aspect-[16/10] overflow-hidden rounded-control sm:rounded-[20px] bg-canvas">
              <Image
                src={currentRole.image}
                alt={currentRole.alt}
                width={2880}
                height={1800}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1152px"
                priority={currentRole.id === 'founder'}
                loading={currentRole.id === 'founder' ? 'eager' : 'lazy'}
                className="w-full h-auto object-cover transition-opacity duration-300 ease-carnet motion-reduce:transition-none"
              />
            </div>
          </div>

          {/* Sample data line */}
          <p className="font-mono text-xs text-text-muted text-center mt-3 uppercase tracking-wider select-none">
            Screens show sample data.
          </p>

          {/* Role Caption */}
          <p className="text-sm sm:text-base text-text-secondary text-center max-w-2xl mx-auto mt-3 leading-relaxed font-normal">
            {currentRole.caption}
          </p>
        </div>
      </div>
    </section>
  );
}
