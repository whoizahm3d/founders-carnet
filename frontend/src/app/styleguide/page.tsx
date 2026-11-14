'use client';

import React, { useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import {
  Button,
  Input,
  Textarea,
  Select,
  Card,
  Badge,
  ConsentBox,
  ProgressBar,
  Spinner,
  StatCard,
  Dialog,
  Drawer,
  Tabs,
} from '@/components/ui';
import {
  CheckIcon,
  UserIcon,
} from '@/components/ui/icons';
import { FormattedHeading } from '@/components/layout/PageHeader';

export default function StyleguidePage() {
  const [consentChecked, setConsentChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [progress, setProgress] = useState(68);

  const colors = [
    { name: 'Canvas', hex: '#FAF9F7', bg: 'bg-canvas', text: 'text-ink' },
    { name: 'Fill', hex: '#F1F0EE', bg: 'bg-fill', text: 'text-ink' },
    { name: 'Card', hex: '#FFFFFF', bg: 'bg-card', text: 'text-ink', border: true },
    { name: 'Trough', hex: '#E8E6E1', bg: 'bg-trough', text: 'text-ink' },
    { name: 'Ink', hex: '#0A0A0A', bg: 'bg-ink', text: 'text-white' },
    { name: 'Ink Raised', hex: '#171717', bg: 'bg-ink-raised', text: 'text-white' },
    { name: 'Ink Border', hex: '#262626', bg: 'bg-ink-border', text: 'text-white' },
    { name: 'Accent', hex: '#B15F2C', bg: 'bg-accent', text: 'text-white' },
    { name: 'Accent Deep', hex: '#964E22', bg: 'bg-accent-deep', text: 'text-white' },
    { name: 'Accent Wash', hex: '#F8EDE5', bg: 'bg-accent-wash', text: 'text-accent' },
    { name: 'Text Primary', hex: '#0A0A0A', bg: 'bg-text-primary', text: 'text-white' },
    { name: 'Text Secondary', hex: '#52525B', bg: 'bg-text-secondary', text: 'text-white' },
    { name: 'Text Muted', hex: '#71717A', bg: 'bg-text-muted', text: 'text-white' },
    { name: 'Hairline', hex: '#E2DFD9', bg: 'bg-hairline', text: 'text-ink' },
    { name: 'Row Line', hex: '#E6E5E2', bg: 'bg-hairline-row', text: 'text-ink' },
    { name: 'Disabled', hex: '#E3E2DF', bg: 'bg-disabled', text: 'text-ink' },
    { name: 'Input Border', hex: '#8D8D8D', bg: 'bg-input-border', text: 'text-white' },
    { name: 'Success', hex: '#047857', bg: 'bg-status-success', text: 'text-white' },
    { name: 'Success Wash', hex: '#ECFDF5', bg: 'bg-status-success-wash', text: 'text-status-success' },
    { name: 'Warning', hex: '#B45309', bg: 'bg-status-warning', text: 'text-white' },
    { name: 'Warning Wash', hex: '#FFFBEB', bg: 'bg-status-warning-wash', text: 'text-status-warning' },
    { name: 'Error', hex: '#B91C1C', bg: 'bg-status-error', text: 'text-white' },
    { name: 'Error Wash', hex: '#FEF2F2', bg: 'bg-status-error-wash', text: 'text-status-error' },
  ];

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-[1280px] mx-auto text-ink">
      {/* Header over Gradient */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.05em] text-white/70 mb-3 px-3 py-1 rounded-pill glass-chip">
          <span>Design System v3.8</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span>The Founder&apos;s Carnet</span>
        </div>

        <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white">
          <FormattedHeading
            text="Visual foundation and design tokens"
            italicWordsCount={2}
            onGradient={true}
          />
        </h1>
        <p className="mt-3 text-white/80 max-w-2xl text-base leading-relaxed">
          Editorial design system strictly aligned with DESIGN.md. No raw hex in components, no
          invented stats or compliance claims, and no icon packages.
        </p>
      </div>

      <div className="space-y-10">
        {/* 1. Palette Lock */}
        <Card variant="white" padding="featured">
          <div className="mb-6">
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-accent font-semibold">
              01 • Palette Lock
            </span>
            <h2 className="font-sans text-2xl font-bold text-ink mt-1">
              <FormattedHeading text="Locked system palette" italicWordsCount={1} onGradient={false} />
            </h2>
            <p className="font-sans text-sm text-text-secondary mt-1">
              Exact tokens from DESIGN.md lines 5-30. No colors outside this list exist in the UI.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {colors.map((c) => (
              <div
                key={c.name}
                className="p-3 rounded-control border border-hairline flex flex-col justify-between h-24"
              >
                <div
                  className={`w-full h-8 rounded-[6px] ${c.bg} ${c.border ? 'border border-hairline' : ''}`}
                />
                <div className="mt-2">
                  <p className="font-sans text-xs font-semibold text-ink leading-tight">
                    {c.name}
                  </p>
                  <p className="font-mono text-[11px] text-text-muted uppercase">
                    {c.hex}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 2. Typography Lock */}
        <Card variant="white" padding="featured">
          <div className="mb-6">
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-accent font-semibold">
              02 • Typography
            </span>
            <h2 className="font-sans text-2xl font-bold text-ink mt-1">
              <FormattedHeading text="Font scale and hierarchy" italicWordsCount={1} onGradient={false} />
            </h2>
            <p className="font-sans text-sm text-text-secondary mt-1">
              Hanken Grotesk (body/headlines), Instrument Serif italic (last 1-2 words), JetBrains Mono (labels/nav/status).
            </p>
          </div>

          <div className="space-y-6 divide-y divide-hairline">
            <div className="pt-2">
              <p className="font-mono text-xs text-text-muted uppercase mb-1">Display 1 (60px bold -2.5%)</p>
              <div className="font-sans text-5xl md:text-6xl font-bold tracking-tight text-ink">
                Capital with <span className="font-serif italic font-normal text-accent">conviction.</span>
              </div>
            </div>

            <div className="pt-4">
              <p className="font-mono text-xs text-text-muted uppercase mb-1">Display 2 (48px bold -2%)</p>
              <div className="font-sans text-4xl md:text-5xl font-bold tracking-tight text-ink">
                Welcome back, <span className="font-serif italic font-normal text-accent">Bilal</span>
              </div>
            </div>

            <div className="pt-4">
              <p className="font-mono text-xs text-text-muted uppercase mb-1">Heading 1 (30px bold -2%)</p>
              <div className="font-sans text-3xl font-bold tracking-tight text-ink">
                Verification & Moderation <span className="font-serif italic font-normal text-accent">Console</span>
              </div>
            </div>

            <div className="pt-4">
              <p className="font-mono text-xs text-text-muted uppercase mb-1">Heading 2 (24px semibold -1.5%)</p>
              <div className="font-sans text-2xl font-semibold tracking-tight text-ink">
                Recommended <span className="font-serif italic font-normal text-accent">founders</span>
              </div>
            </div>

            <div className="pt-4">
              <p className="font-mono text-xs text-text-muted uppercase mb-1">Body Text (16px / 24px)</p>
              <p className="font-sans text-base text-text-secondary max-w-2xl leading-relaxed">
                The Founder&apos;s Carnet connects founders, startup talent, and mentors across Pakistan.
                Introductions are made with mutual consent. Contact details remain locked until both parties accept.
              </p>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <span className="font-mono text-xs uppercase tracking-[0.05em] text-text-secondary">
                JETBRAINS MONO 12PX UPPERCASE TRACKING 0.05EM
              </span>
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.05em] text-accent">
                ACTIVE STATUS 01
              </span>
            </div>
          </div>
        </Card>

        {/* 3. Canonical Logo */}
        <Card variant="white" padding="featured">
          <div className="mb-6">
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-accent font-semibold">
              03 • Canonical Mark
            </span>
            <h2 className="font-sans text-2xl font-bold text-ink mt-1">
              <FormattedHeading text="Official brand mark" italicWordsCount={1} onGradient={false} />
            </h2>
            <p className="font-sans text-sm text-text-secondary mt-1">
              Single SVG tile with white F and burnt orange bookmark ribbon (DESIGN.md line 214-219).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-8 p-6 bg-fill rounded-control">
            <div>
              <p className="font-mono text-xs text-text-muted uppercase mb-2">On Light Surface</p>
              <Logo size={40} />
            </div>

            <div className="bg-ink p-4 rounded-card">
              <p className="font-mono text-xs text-white/50 uppercase mb-2">On Ink Surface</p>
              <Logo inverted size={40} />
            </div>

            <div>
              <p className="font-mono text-xs text-text-muted uppercase mb-2">Compact (28px)</p>
              <Logo size={28} />
            </div>
          </div>
        </Card>

        {/* 4. Buttons & Badges */}
        <Card variant="white" padding="featured">
          <div className="mb-6">
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-accent font-semibold">
              04 • Buttons & States
            </span>
            <h2 className="font-sans text-2xl font-bold text-ink mt-1">
              <FormattedHeading text="Actions and badges" italicWordsCount={1} onGradient={false} />
            </h2>
            <p className="font-sans text-sm text-text-secondary mt-1">
              Full pill radius, 44px min-height (48 mobile). Main action has inset 36px circular arrow badge.
            </p>
          </div>

          <div className="space-y-6">
            {/* Button Variants */}
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" hasBadge>
                Submit for review
              </Button>

              <Button variant="accent">
                Practice pitch
              </Button>

              <Button variant="secondary">
                View founder carnet
              </Button>

              <Button variant="neutral">
                Decline request
              </Button>

              <Button variant="primary" disabled hasBadge>
                Disabled action
              </Button>

              <Button variant="tertiary">
                Tertiary link action
              </Button>
            </div>

            {/* Badges / Chips */}
            <div className="pt-4 border-t border-hairline">
              <p className="font-mono text-xs text-text-muted uppercase mb-3">Status Badges (DESIGN.md)</p>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="default">Neutral tag</Badge>
                <Badge variant="accent">Founder</Badge>
                <Badge variant="dark">Monolith</Badge>
                <Badge variant="success" icon={<CheckIcon size={12} />}>
                  Mutual accept
                </Badge>
                <Badge variant="warning">
                  Pending review
                </Badge>
                <Badge variant="error">
                  Appeal filed
                </Badge>
                <Badge variant="outlined">
                  Karachi • PKT
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* 5. Inputs & Consent */}
        <Card variant="white" padding="featured">
          <div className="mb-6">
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-accent font-semibold">
              05 • Form Controls
            </span>
            <h2 className="font-sans text-2xl font-bold text-ink mt-1">
              <FormattedHeading text="Inputs and consent" italicWordsCount={1} onGradient={false} />
            </h2>
            <p className="font-sans text-sm text-text-secondary mt-1">
              Radius 12, 1px #8D8D8D border, 3px #F8EDE5 focus ring. ConsentBox with 20px checkbox.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Official Startup Name"
              placeholder="e.g. Dastgyr Technologies"
              hint="Registered company name or verified trade name"
            />

            <Input
              label="Lead Founder Email"
              defaultValue="founder@karachi.pk"
              leftIcon={<UserIcon size={16} />}
            />

            <Input
              label="CNIC / Identifier Input (Error Test)"
              defaultValue="42101-invalid"
              error="Valid 13-digit Pakistani CNIC format required"
            />

            <Select
              label="Primary Sector"
              options={[
                { value: 'fintech', label: 'Fintech & Payments' },
                { value: 'b2b', label: 'B2B Commerce & Retail' },
                { value: 'health', label: 'Healthtech & Diagnostics' },
                { value: 'agri', label: 'Agritech & Supply Chain' },
              ]}
            />

            <div className="md:col-span-2">
              <Textarea
                label="Problem Statement"
                placeholder="Explain the specific market friction your startup addresses in Pakistan..."
              />
            </div>

            <div className="md:col-span-2">
              <ConsentBox
                id="styleguide-consent"
                checked={consentChecked}
                onChange={setConsentChecked}
                label="Consent to profile verification and mutual contact release protocol"
                details="I acknowledge that contact details remain locked until mutual introduction acceptance. Profile similarity is a rubric match, not a funding probability."
              />
            </div>
          </div>
        </Card>

        {/* 6. Card Containers & Depth */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ink Monolith Card */}
          <Card variant="ink" padding="featured">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.05em] text-white/50 mb-4">
              <span>Readiness Score • Rubric 3.8</span>
              <span className="text-accent font-semibold">7 Dimensions</span>
            </div>

            <div className="my-4">
              <div className="font-sans text-5xl font-bold tracking-tight text-white tabular-nums">
                3.8 <span className="text-white/40 text-2xl font-normal">/ 5.0</span>
              </div>
              <p className="font-sans text-xs text-white/60 mt-1">
                A rubric guide, not a funding probability.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-ink-border">
              <StatCard
                variant="ink"
                label="Verified Matches"
                value="14"
                subtext="Active in Karachi"
              />
              <StatCard
                variant="ink"
                label="Advisory Requests"
                value="3"
                subtext="Pending response"
              />
            </div>
          </Card>

          {/* Glass Card */}
          <Card variant="glass" padding="featured">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.05em] text-text-secondary mb-4">
              <span>Floating Glass Card</span>
              <span className="text-accent">Blur 12px</span>
            </div>

            <h3 className="font-sans text-2xl font-bold text-ink">
              Layered <span className="font-serif italic font-normal text-accent">depth</span>
            </h3>
            <p className="font-sans text-sm text-text-secondary mt-2 leading-relaxed">
              Glass cards sit over glows or ink panels. Text on glass retains 4.5:1 minimum contrast.
            </p>

            <div className="mt-6 space-y-4">
              <ProgressBar
                label="Profile completeness"
                value={progress}
              />
              <div className="flex items-center gap-3">
                <Spinner size="sm" />
                <span className="font-mono text-xs uppercase tracking-[0.05em] text-text-secondary">
                  Calculating similarity baseline...
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* 7. Interactive Primitives & Overlays */}
        <Card variant="white" padding="featured">
          <div className="mb-6">
            <span className="font-mono text-xs uppercase tracking-[0.05em] text-accent font-semibold">
              06 • Overlays & Navigation
            </span>
            <h2 className="font-sans text-2xl font-bold text-ink mt-1">
              <FormattedHeading text="Accessible drawers and modals" italicWordsCount={1} onGradient={false} />
            </h2>
            <p className="font-sans text-sm text-text-secondary mt-1">
              Accessible dialogs with ink/30 blur backdrop. Tabs with ink active pill.
            </p>
          </div>

          <div className="space-y-6">
            <Tabs
              items={[
                { id: 'overview', label: 'All Requests', count: 12 },
                { id: 'pending', label: 'Pending Review', count: 3 },
                { id: 'accepted', label: 'Mutual Accept', count: 9 },
              ]}
              activeId={activeTab}
              onChange={setActiveTab}
            />

            <div className="flex flex-wrap gap-4 pt-2">
              <Button
                variant="primary"
                onClick={() => setDialogOpen(true)}
              >
                Open Accessible Modal
              </Button>

              <Button
                variant="secondary"
                onClick={() => setDrawerOpen(true)}
              >
                Open Compliance Drawer
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Test Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Mutual Introduction Protocol"
        description="Review before accepting this advisory request. Contact details will be unlocked for both parties."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-control bg-fill text-xs font-sans text-text-secondary leading-relaxed">
            By accepting, your verified business email will be disclosed to the mentor.
            Advisory sessions adhere to the non-brokerage charter.
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              hasBadge
              onClick={() => setDialogOpen(false)}
            >
              Confirm acceptance
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Test Drawer */}
      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Official Regulatory Citations"
        subtitle="Income Tax Ordinance 2001 (Amended 2026)"
      >
        <div className="space-y-4 font-sans text-sm text-text-secondary">
          <div className="p-4 rounded-control bg-fill">
            <p className="font-mono text-xs uppercase tracking-wider text-accent font-semibold mb-1">
              Section 65F • Tax Credits
            </p>
            <p className="leading-relaxed">
              Tax credit for qualifying IT startups registered with PSEB effective until June 30, 2026.
            </p>
          </div>

          <div className="p-4 rounded-control bg-status-success-wash text-status-success text-xs">
            Official citation verified against committed corpus manifest.
          </div>
        </div>
      </Drawer>
    </div>
  );
}
