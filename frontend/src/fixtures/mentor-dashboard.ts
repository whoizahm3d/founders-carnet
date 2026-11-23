/**
 * Mentor Dashboard Fixtures
 * Typed interfaces and realistic Pakistani ecosystem data for /mentor/dashboard.
 * Conforms to DESIGN.md v3.9.2 and project rules:
 * - Fictional startup names only (Munshi Books, Mehran Works, Chenab Pay, Indus Logistics, Ravi Health, Korangi Tech, Bolan Commerce)
 * - Zero raw contact details (no emails or phone numbers)
 * - Zero em dashes and en dashes
 * - Counts in summary card derive directly from fixture arrays
 */

export interface MentorProfileMeta {
  fullName: string;
  roleTitle: string;
  location: string;
  verificationBadgeText: string;
  openToMentees: boolean;
  expertiseAreas: string[];
}

export interface MentorshipRequest {
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

export interface ActiveMentee {
  id: string;
  startupName: string;
  founderName: string;
  city: string;
  sector: string;
  cadence: string;
  activeSince: string;
}

export interface MentorFounderMatch {
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

export interface MentorOnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  actionLabel: string;
}

export interface MentorDashboardData {
  profile: MentorProfileMeta;
  incomingRequests: MentorshipRequest[];
  activeMentees: ActiveMentee[];
  founderMatches: MentorFounderMatch[];
  onboardingChecklist: MentorOnboardingStep[];
}

export const INITIAL_MENTOR_DASHBOARD_DATA: MentorDashboardData = {
  profile: {
    fullName: 'Asad Khan',
    roleTitle: 'Mentor, Ex-VP Product Finja',
    location: 'Karachi',
    verificationBadgeText: 'Verified profile',
    openToMentees: true,
    expertiseAreas: [
      'B2B SaaS',
      'Product ops',
      'Fintech',
      'Unit economics',
      'Go-to-market',
    ],
  },
  incomingRequests: [
    {
      id: 'req-01',
      startupName: 'Munshi Books',
      founderName: 'Bilal Ahmed',
      sectorAndStage: 'Fintech and SME accounting, Seed',
      city: 'Karachi',
      requestedAt: '2 days ago',
      requestNote:
        'Seeking guidance on self-serve onboarding friction, cohort retention measurement, and pricing tiers for Pakistani merchant accounting.',
      discussionTopics: [
        'SME product onboarding workflows',
        'Unit economics on recurring subscription tiers',
        'Early retention metric instrumentation',
      ],
      simulationSummary:
        'High relevance to mentor track record in digital financial services and merchant tooling in Pakistan.',
    },
    {
      id: 'req-02',
      startupName: 'Mehran Works',
      founderName: 'Tariq Mehmood',
      sectorAndStage: 'B2B SaaS and infra, Pre-seed',
      city: 'Karachi',
      requestedAt: '4 days ago',
      requestNote:
        'Looking for feedback on corporate sales cycles, initial service-level agreements, and product operations for Pakistani B2B clients.',
      discussionTopics: [
        'Enterprise sales validation in local tech hubs',
        'Customer success and pilot milestones',
      ],
      simulationSummary:
        'Shared focus on local enterprise customer acquisition and operational delivery.',
    },
    {
      id: 'req-03',
      startupName: 'Chenab Pay',
      founderName: 'Daniyal Shah',
      sectorAndStage: 'Digital payments, Seed',
      city: 'Lahore',
      requestedAt: '5 days ago',
      requestNote:
        'Requesting product architecture review on partner API integrations and merchant settlement dashboards.',
      discussionTopics: [
        'Banking and wallet integration touchpoints',
        'Settlement dashboard user experience',
      ],
      simulationSummary:
        'Direct alignment with historical payments infrastructure leadership.',
    },
  ],
  activeMentees: [
    {
      id: 'mentee-01',
      startupName: 'Indus Logistics',
      founderName: 'Sara Malik',
      city: 'Lahore',
      sector: 'Supply chain logistics',
      cadence: 'Bi-weekly advisory',
      activeSince: 'October 2026',
    },
    {
      id: 'mentee-02',
      startupName: 'Ravi Health',
      founderName: 'Usman Qadir',
      city: 'Lahore',
      sector: 'Healthtech workflows',
      cadence: 'Monthly review',
      activeSince: 'September 2026',
    },
    {
      id: 'mentee-03',
      startupName: 'Korangi Tech',
      founderName: 'Zainab Raza',
      city: 'Islamabad',
      sector: 'Developer tooling',
      cadence: 'Bi-weekly advisory',
      activeSince: 'August 2026',
    },
    {
      id: 'mentee-04',
      startupName: 'Bolan Commerce',
      founderName: 'Haris Khan',
      city: 'Karachi',
      sector: 'Wholesale marketplace',
      cadence: 'Monthly review',
      activeSince: 'July 2026',
    },
  ],
  founderMatches: [
    {
      id: 'match-01',
      index: '01',
      startupName: 'Indus Logistics',
      founderName: 'Sara Malik',
      city: 'Karachi',
      sector: 'Supply chain',
      stage: 'Seed',
      similarityScore: 94,
      tags: ['B2B SaaS', 'Supply chain', 'Karachi'],
      simulationContext:
        'Matches advisory background in multi-party operational workflows and seed unit economics.',
    },
    {
      id: 'match-02',
      index: '02',
      startupName: 'Ravi Health',
      founderName: 'Usman Qadir',
      city: 'Lahore',
      sector: 'Healthtech',
      stage: 'Pre-seed',
      similarityScore: 88,
      tags: ['Product ops', 'Healthtech', 'Lahore'],
      simulationContext:
        'Strong alignment on B2B customer onboarding and operational metrics.',
    },
    {
      id: 'match-03',
      index: '03',
      startupName: 'Korangi Tech',
      founderName: 'Zainab Raza',
      city: 'Islamabad',
      sector: 'Developer tooling',
      stage: 'Seed',
      similarityScore: 85,
      tags: ['B2B SaaS', 'Developer tools', 'Islamabad'],
      simulationContext:
        'High overlap with enterprise SaaS product expansion and team structuring.',
    },
  ],
  onboardingChecklist: [
    {
      id: 'step-01',
      title: 'Complete mentor profile',
      description:
        'Record previous leadership roles, domain expertise, and active locations.',
      completed: true,
      href: '/mentor/profile',
      actionLabel: 'Edit profile',
    },
    {
      id: 'step-02',
      title: 'Confirm advisory expertise areas',
      description:
        'Select focus domains so the similarity engine suggests appropriate Pakistani startups.',
      completed: true,
      href: '/mentor/profile',
      actionLabel: 'Update expertise',
    },
    {
      id: 'step-03',
      title: 'Set mentee availability status',
      description:
        'Toggle whether your profile is actively accepting new founder requests.',
      completed: true,
      href: '/mentor/dashboard',
      actionLabel: 'Manage availability',
    },
    {
      id: 'step-04',
      title: 'Review first founder introduction request',
      description:
        'Assess pending inbound requests and decide whether to accept or decline.',
      completed: false,
      href: '/mentor/requests',
      actionLabel: 'Review requests',
    },
  ],
};
