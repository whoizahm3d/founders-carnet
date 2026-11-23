/**
 * Investor Dashboard Fixtures
 * Typed interfaces and realistic Pakistani ecosystem data for /investor/dashboard.
 * Conforms to DESIGN.md v3.9.2 and project rules:
 * - Fictional startup names only (Munshi Books, Chenab Pay, Mehran Works, Indus Logistics, Ravi Health, Korangi Tech, Bolan Commerce)
 * - Zero raw contact details (no emails or phone numbers)
 * - Zero em dashes and en dashes
 * - Counts in summary card derive directly from fixture arrays
 * - Sana Rauf persona: Angel Investor, Karachi; Fintech and Digital commerce; Pre-seed; PKR 2.5M to 10M ticket
 */

export interface InvestorProfileMeta {
  fullName: string;
  roleTitle: string;
  location: string;
  verificationBadgeText: string;
  thesis: {
    sectors: string[];
    stages: string[];
    ticketRange: string;
    focusNote: string;
  };
}

export interface InvestorIntroductionRequest {
  id: string;
  startupName: string;
  founderName: string;
  sectorAndStage: string;
  city: string;
  requestedAt: string;
  requestNote: string;
  discussionTopics: string[];
  simulationSummary: string;
}

export interface InvestorActiveIntroduction {
  id: string;
  startupName: string;
  founderName: string;
  city: string;
  sector: string;
  statusText: string;
  since: string;
}

export interface InvestorFounderMatch {
  id: string;
  index: string;
  startupName: string;
  founderName: string;
  city: string;
  sector: string;
  stage: string;
  similarityScore: number;
  tags: string[];
  simulationContext: string;
}

export interface InvestorOnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  actionLabel: string;
}

export interface InvestorDashboardData {
  profile: InvestorProfileMeta;
  incomingRequests: InvestorIntroductionRequest[];
  activeIntroductions: InvestorActiveIntroduction[];
  founderMatches: InvestorFounderMatch[];
  onboardingChecklist: InvestorOnboardingStep[];
}

export const INITIAL_INVESTOR_DASHBOARD_DATA: InvestorDashboardData = {
  profile: {
    fullName: 'Sana Rauf',
    roleTitle: 'Angel Investor',
    location: 'Karachi',
    verificationBadgeText: 'Verified profile',
    thesis: {
      sectors: ['Fintech', 'Digital commerce'],
      stages: ['Pre-seed'],
      ticketRange: 'PKR 2.5M to 10M',
      focusNote:
        'Actively evaluating pre-seed Pakistani fintech platforms with initial traction, digital commerce enablement, and micro-lending software.',
    },
  },
  incomingRequests: [
    {
      id: 'req-inv-01',
      startupName: 'Indus Logistics',
      founderName: 'Sara Malik',
      sectorAndStage: 'Supply chain logistics, Seed',
      city: 'Lahore',
      requestedAt: '1 day ago',
      requestNote:
        'Seeking angel discussion on digital merchant delivery integrations in Sindh and Punjab, and early working capital requirements.',
      discussionTopics: [
        'Merchant logistics software integration',
        'Working capital management for delivery corridors',
      ],
      simulationSummary:
        'Direct alignment with digital commerce enablement and merchant transaction volume.',
    },
    {
      id: 'req-inv-02',
      startupName: 'Ravi Health',
      founderName: 'Usman Qadir',
      sectorAndStage: 'Healthtech workflows, Pre-seed',
      city: 'Lahore',
      requestedAt: '3 days ago',
      requestNote:
        'Exploring angel discussion for clinic workflow software and digital patient billing across private clinics in Lahore.',
      discussionTopics: [
        'Clinic digital billing workflows',
        'Pre-seed ticket fit for clinic workflow software',
      ],
      simulationSummary:
        'Moderate fit on healthcare software with payment settlement touchpoints.',
    },
  ],
  activeIntroductions: [
    {
      id: 'active-inv-01',
      startupName: 'Korangi Tech',
      founderName: 'Zainab Raza',
      city: 'Islamabad',
      sector: 'Developer tooling',
      statusText: 'Discussion active',
      since: 'October 2026',
    },
    {
      id: 'active-inv-02',
      startupName: 'Bolan Commerce',
      founderName: 'Haris Khan',
      city: 'Karachi',
      sector: 'Wholesale marketplace',
      statusText: 'Mutual acceptance confirmed',
      since: 'September 2026',
    },
  ],
  founderMatches: [
    {
      id: 'match-inv-01',
      index: '01',
      startupName: 'Munshi Books',
      founderName: 'Bilal Ahmed',
      city: 'Karachi',
      sector: 'Fintech and SME accounting',
      stage: 'Seed',
      similarityScore: 92,
      tags: ['Fintech', 'Digital commerce', 'Karachi'],
      simulationContext:
        'High thesis overlap with merchant bookkeeping automation, micro-lending software integration, and digital commerce enablement.',
    },
    {
      id: 'match-inv-02',
      index: '02',
      startupName: 'Chenab Pay',
      founderName: 'Daniyal Shah',
      city: 'Lahore',
      sector: 'Digital payments',
      stage: 'Seed',
      similarityScore: 87,
      tags: ['Fintech', 'Payments', 'Lahore'],
      simulationContext:
        'Strong alignment on merchant wallet integration, API settlement architecture, and payment gateways for local businesses.',
    },
    {
      id: 'match-inv-03',
      index: '03',
      startupName: 'Mehran Works',
      founderName: 'Tariq Mehmood',
      city: 'Karachi',
      sector: 'Commerce enablement',
      stage: 'Pre-seed',
      similarityScore: 84,
      tags: ['Digital commerce', 'Pre-seed', 'Karachi'],
      simulationContext:
        'Direct fit for digital commerce tooling, enterprise merchant onboarding, and pre-seed ticket parameters.',
    },
  ],
  onboardingChecklist: [
    {
      id: 'step-inv-01',
      title: 'Complete angel investor profile',
      description:
        'Record investment background, angel network associations, and geographic presence.',
      completed: true,
      href: '/investor/profile',
      actionLabel: 'Edit profile',
    },
    {
      id: 'step-inv-02',
      title: 'Define investment thesis and ticket range',
      description:
        'Confirm preferred sectors, stages, and typical investment ticket amounts.',
      completed: true,
      href: '/investor/profile',
      actionLabel: 'Update thesis',
    },
    {
      id: 'step-inv-03',
      title: 'Review inbound founder introduction requests',
      description:
        'Assess pending introduction requests submitted by verified Pakistani startup founders.',
      completed: false,
      href: '/investor/requests',
      actionLabel: 'Review requests',
    },
    {
      id: 'step-inv-04',
      title: 'Explore recommended founder matches',
      description:
        'Review Pakistani startups curated by profile similarity to your investment thesis.',
      completed: true,
      href: '/investor/founders',
      actionLabel: 'Explore founders',
    },
  ],
};
