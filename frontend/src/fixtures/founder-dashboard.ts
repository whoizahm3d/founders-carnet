/**
 * Founder Dashboard Typed Fixtures
 * Citing Requirements:
 * - FR-1: Founders create a profile; submit traction and business data
 * - FR-2: System gives AI mentor feedback and a readiness score per dimension (read-only; not founder-editable)
 * - FR-3: Pitch simulation and diagnostic feedback
 * - FR-7: Matching founders with mentors and investors; contact hidden until both accept
 * - FR-10: Investors see only verified startups that finished a readiness assessment
 * - FR-15: Users see their profile status and the reason
 */

export interface FounderCompanyMeta {
  founderName: string;
  companyName: string;
  sectorAndStage: string;
  hubLocation: string;
  cohortTarget?: string;
  activeCorridors?: string;
  isVerified: boolean;
}

export interface RubricDimension {
  id: 'problem' | 'market' | 'diff' | 'biz' | 'traction' | 'team' | 'scalability';
  number: number;
  name: string;
  score: number;
  maxScore: number;
  description: string;
  nextAction: string;
}

export interface ReadinessRubricData {
  compositeScore: number;
  maxScore: number;
  tier: string;
  progressPercent: number; // For slider / gauge display (e.g. 52.5% for 3.1 on 1-5 scale)
  disclaimer: string;
  evaluatedFrom: string;
  dimensions: RubricDimension[];
}

export interface NextActionItem {
  id: string;
  index: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  completed: boolean;
}

export interface PitchFeedbackRecord {
  id: string;
  date: string;
  sessionTitle: string;
  score: number;
  maxScore: number;
  gainNote: string;
  simulationMark: string;
}

export interface MatchPreviewItem {
  id: string;
  name: string;
  initials: string;
  role: 'Investor' | 'Mentor';
  titleAndFirm: string;
  similarityScore: number;
  tags: string[];
  whyMatch: string;
  contactPolicy: string;
  isFeatured?: boolean;
}

export interface OnboardingStep {
  stepNumber: string;
  title: string;
  description: string;
  statusText: string;
  statusVariant: 'progress' | 'ready' | 'locked';
  actionLabel: string;
  href: string;
  disabled?: boolean;
}

export interface FounderDashboardData {
  company: FounderCompanyMeta;
  readiness: ReadinessRubricData;
  nextActions: NextActionItem[];
  pitchFeedback: PitchFeedbackRecord[];
  matches: MatchPreviewItem[];
  onboardingSteps: OnboardingStep[];
}

export const INITIAL_FOUNDER_DASHBOARD_DATA: FounderDashboardData = {
  company: {
    founderName: 'Bilal Ahmed',
    companyName: 'Munshi Books',
    sectorAndStage: 'Seed fintech, Karachi',
    hubLocation: 'Karachi Hub',
    isVerified: true,
  },
  readiness: {
    compositeScore: 3.1,
    maxScore: 5.0,
    tier: 'Traction ready',
    progressPercent: 52.5,
    disclaimer: 'A rubric guide, not a funding probability.',
    evaluatedFrom: 'Pitch Deck v2.4 + Financial Model rev3',
    dimensions: [
      {
        id: 'problem',
        number: 1,
        name: 'Problem clarity',
        score: 4,
        maxScore: 5,
        description: 'Well-articulated pain point validated with frontline customers.',
        nextAction: 'Add a one-paragraph quantified problem statement with a cited customer count.',
      },
      {
        id: 'market',
        number: 2,
        name: 'Market definition',
        score: 2,
        maxScore: 5,
        description: 'TAM/SAM calculations need deeper corridor segmentation.',
        nextAction: 'Add bottom-up TAM and SAM calculations segmented by GCC and Pakistan trade corridors.',
      },
      {
        id: 'diff',
        number: 3,
        name: 'Differentiation',
        score: 3,
        maxScore: 5,
        description: 'Clear local moat, requires defensibility against regional incumbents.',
        nextAction: 'Document two specific barriers to entry that regional incumbents cannot replicate within 12 months.',
      },
      {
        id: 'biz',
        number: 4,
        name: 'Business model',
        score: 3,
        maxScore: 5,
        description: 'Take-rate unit economics proven in beta; test margins at scale.',
        nextAction: 'Model gross margin at 500 and 5,000 merchant accounts and present a unit economics one-pager.',
      },
      {
        id: 'traction',
        number: 5,
        name: 'Traction',
        score: 3,
        maxScore: 5,
        description: 'Early pilot revenue verified with 14 active trade merchants.',
        nextAction: 'Upload signed LOIs or revenue receipts from at least 5 paying merchants to the profile.',
      },
      {
        id: 'team',
        number: 6,
        name: 'Team',
        score: 4,
        maxScore: 5,
        description: 'Complementary domain and technical execution backgrounds.',
        nextAction: 'Add LinkedIn profiles and brief bios for all co-founders to the startup profile.',
      },
      {
        id: 'scalability',
        number: 7,
        name: 'Scalability',
        score: 3,
        maxScore: 5,
        description: 'Cross-border regulatory roadmap is in early drafting stage.',
        nextAction: 'Complete the regulatory roadmap for UAE and Saudi Arabia corridors with named legal advisors.',
      },
    ],
  },
  nextActions: [
    {
      id: 'act-1',
      index: '01',
      title: 'Add market sizing evidence',
      description: 'Include bottom-up TAM/SAM calculations for GCC and Pakistan corridors.',
      actionLabel: 'Start',
      href: '/founder/readiness',
      completed: false,
    },
    {
      id: 'act-2',
      index: '02',
      title: 'Practice pitch with AI investor',
      description: 'Complete a 7-minute simulated Q&A focusing on unit economics defenses.',
      actionLabel: 'Simulate',
      href: '/founder/pitch',
      completed: false,
    },
    {
      id: 'act-3',
      index: '03',
      title: 'Upload pitch deck / product link',
      description: 'Connect live interactive prototype or customer demo video.',
      actionLabel: 'Link',
      href: '/founder/profile',
      completed: false,
    },
  ],
  pitchFeedback: [
    {
      id: 'pf-1',
      date: '12 Mar 2026',
      sessionTitle: 'AI Investor Mock #4',
      score: 3.0,
      maxScore: 5.0,
      gainNote: 'Focus area: Unit Economics',
      simulationMark: 'Written by a language model simulation',
    },
    {
      id: 'pf-2',
      date: '08 Mar 2026',
      sessionTitle: 'AI Investor Mock #3',
      score: 2.8,
      maxScore: 5.0,
      gainNote: 'Focus area: Market Sizing',
      simulationMark: 'Written by a language model simulation',
    },
    {
      id: 'pf-3',
      date: '02 Mar 2026',
      sessionTitle: 'Initial Baseline Session',
      score: 2.5,
      maxScore: 5.0,
      gainNote: 'Diagnostic benchmark recorded',
      simulationMark: 'Written by a language model simulation',
    },
  ],
  matches: [
    {
      id: 'match-1',
      name: 'Ayesha Qureshi',
      initials: 'AQ',
      role: 'Investor',
      titleAndFirm: 'Partner · Indus Valley Capital, Karachi',
      similarityScore: 92,
      tags: ['Fintech', 'Seed stage', 'Ticket: PKR 10M-30M'],
      whyMatch: 'High thesis alignment for SME ledger automation, multi-branch cashflow oversight, and Pakistani B2B invoicing rails.',
      contactPolicy: 'Contact revealed upon mutual accept',
      isFeatured: true,
    },
    {
      id: 'match-2',
      name: 'Asad Khan',
      initials: 'AK',
      role: 'Mentor',
      titleAndFirm: 'Mentor · Ex-VP Product Sindhu Pay',
      similarityScore: 88,
      tags: ['B2B SaaS', 'Product ops'],
      whyMatch: 'Advises founders on merchant acquisition funnels and low-friction mobile ledger UX.',
      contactPolicy: 'Locked until accepted',
      isFeatured: false,
    },
    {
      id: 'match-3',
      name: 'Sana Rauf',
      initials: 'SR',
      role: 'Investor',
      titleAndFirm: 'Angel Investor · Karachi',
      similarityScore: 84,
      tags: ['Fintech', 'Pre-seed'],
      whyMatch: 'Active early operator in domestic digital commerce enablement and micro-lending software.',
      contactPolicy: 'Locked until accepted',
      isFeatured: false,
    },
  ],
  onboardingSteps: [
    {
      stepNumber: 'STEP 01',
      title: 'Complete startup profile',
      description: 'Company details, traction KPIs, pitch deck upload and sector classifications.',
      statusText: 'In Progress',
      statusVariant: 'progress',
      actionLabel: 'Edit startup profile',
      href: '/founder/profile',
      disabled: false,
    },
    {
      stepNumber: 'STEP 02',
      title: 'Get initial readiness score',
      description: 'Automated evaluation across the 7-dimension rubric to benchmark institutional readiness.',
      statusText: 'Ready to evaluate',
      statusVariant: 'ready',
      actionLabel: 'Calculate score',
      href: '/founder/readiness',
      disabled: false,
    },
    {
      stepNumber: 'STEP 03',
      title: 'Practice your investor pitch',
      description: 'Interactive simulated Q&A session with venture simulation before meeting angels.',
      statusText: 'Locked',
      statusVariant: 'locked',
      actionLabel: 'Start simulation',
      href: '/founder/pitch',
      disabled: true,
    },
  ],
};
