/**
 * Talent Dashboard typed fixtures (/talent/dashboard)
 * Conforms to DESIGN.md v3.9.2 and project content rules:
 * - Pakistani tech ecosystem context (Karachi, Lahore, Islamabad, PKR compensation ranges)
 * - Sentence case everywhere
 * - No em or en dashes (hyphens or commas only)
 * - Profile similarity metrics only (no hiring probability or success claims)
 * - Mandatory simulation notice on language model analysis
 * - Contact details hidden until mutual acceptance
 */

export interface TalentProfile {
  id: string;
  fullName: string;
  roleTitle: string;
  location: string;
  bio: string;
  completenessPercent: number;
  missingItem: string;
  githubUrl?: string;
  isVerified: boolean;
}

export interface TalentJobRole {
  id: string;
  title: string;
  company: string;
  location: string;
  stage: string;
  workType: string;
  tags: string[];
  description: string;
  alignmentNote: string;
  profileSimilarity: number;
  salaryPkrRange: string;
}

export interface TalentApplication {
  id: string;
  company: string;
  roleTitle: string;
  location: string;
  status: 'Applied' | 'In review' | 'Introduction accepted';
  department: string;
}

export interface FoundingTeamMatch {
  id: string;
  startupName: string;
  sector: string;
  location: string;
  stage: string;
  seekingRole: string;
  profileSimilarity: number;
  pitchSnippet: string;
}

export interface TalentResumeAnalysis {
  lastUpdated: string;
  detectedSkills: string[];
  suggestions: string[];
  simulationNotice: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface TalentDashboardData {
  profile: TalentProfile;
  stats: {
    applicationsSubmitted: number;
    introductionsAccepted: number;
    startupMatches: number;
  };
  recommendedRoles: TalentJobRole[];
  applications: TalentApplication[];
  teamMatches: FoundingTeamMatch[];
  resumeAnalysis: TalentResumeAnalysis;
  onboardingSteps: OnboardingStep[];
}

export const INITIAL_TALENT_DASHBOARD_DATA: TalentDashboardData = {
  profile: {
    id: 'talent-hamza-iqbal',
    fullName: 'Hamza Iqbal',
    roleTitle: 'Backend developer',
    location: 'Lahore',
    bio: 'Backend developer with 4 years building scalable services in Go, Python, and PostgreSQL across high-throughput transactional systems.',
    completenessPercent: 85,
    missingItem: 'Add GitHub repository link to reach 100%',
    githubUrl: '',
    isVerified: true,
  },
  stats: {
    applicationsSubmitted: 3,
    introductionsAccepted: 1,
    startupMatches: 8,
  },
  recommendedRoles: [
    {
      id: 'role-1',
      title: 'Lead Backend Engineer',
      company: 'Munshi Books',
      location: 'Karachi',
      stage: 'Seed stage',
      workType: 'Full-time',
      tags: ['PostgreSQL', 'Seed stage', 'Distributed queues'],
      description: 'Lead architecture of core transaction ledgers, idempotent webhook processors, and multi-tenant billing pipelines for Pakistani SME merchants.',
      alignmentNote: 'High alignment with your PostgreSQL, distributed queuing, and ledger sync experience.',
      profileSimilarity: 96,
      salaryPkrRange: 'PKR 350,000 - 500,000 / month',
    },
    {
      id: 'role-2',
      title: 'Senior Python / Go Engineer',
      company: 'Sindhu Pay',
      location: 'Lahore',
      stage: 'Series A',
      workType: 'Full-time',
      tags: ['Go / Python', 'Series A', 'Microservices'],
      description: 'Architect low-latency payment switch orchestrations, inter-bank messaging bridges, and resilient consumer-facing API microservices.',
      alignmentNote: 'Looking for payment switch orchestration and API microservices architect in Lahore.',
      profileSimilarity: 92,
      salaryPkrRange: 'PKR 400,000 - 600,000 / month',
    },
    {
      id: 'role-3',
      title: 'Platform Backend Engineer',
      company: 'Ravi Health',
      location: 'Lahore',
      stage: 'Seed stage',
      workType: 'Hybrid',
      tags: ['Hybrid', 'Seed stage', 'Distributed systems'],
      description: 'Build resilient telehealth streaming pipelines, provider scheduling engines, and asynchronous clinical data access services.',
      alignmentNote: 'Matches your experience with asynchronous event processing and data pipeline reliability.',
      profileSimilarity: 88,
      salaryPkrRange: 'PKR 300,000 - 450,000 / month',
    },
    {
      id: 'role-4',
      title: 'Distributed Systems Engineer',
      company: 'Mehran Works',
      location: 'Karachi',
      stage: 'Pre-seed',
      workType: 'On-site',
      tags: ['Streaming', 'Pre-seed', 'Event architectures'],
      description: 'Develop low-latency stream processing pipelines, real-time telemetry collectors, and fault-tolerant log replications.',
      alignmentNote: 'Matches your experience with high-throughput event streaming and transaction pipelines.',
      profileSimilarity: 84,
      salaryPkrRange: 'PKR 280,000 - 420,000 / month',
    },
  ],
  applications: [
    {
      id: 'app-1',
      company: 'Mehran Works',
      roleTitle: 'Data and backend infra',
      location: 'Karachi',
      status: 'Introduction accepted',
      department: 'Infrastructure',
    },
    {
      id: 'app-2',
      company: 'Chenab Pay',
      roleTitle: 'Core banking backend',
      location: 'Lahore',
      status: 'In review',
      department: 'Payments core',
    },
    {
      id: 'app-3',
      company: 'Ravi Health',
      roleTitle: 'DevOps and API lead',
      location: 'Lahore',
      status: 'Applied',
      department: 'Platform engineering',
    },
  ],
  teamMatches: [
    {
      id: 'team-1',
      startupName: 'Munshi Books',
      sector: 'Fintech and SME accounting',
      location: 'Karachi',
      stage: 'Seed stage',
      seekingRole: 'Founding Backend Engineer',
      profileSimilarity: 96,
      pitchSnippet: 'Building verified digital bookkeeping rails for retail merchants and distributors across Sindh and Punjab.',
    },
    {
      id: 'team-2',
      startupName: 'Indus Logistics',
      sector: 'Supply chain logistics',
      location: 'Lahore',
      stage: 'Pre-seed',
      seekingRole: 'Platform Architect',
      profileSimilarity: 90,
      pitchSnippet: 'Dispatch optimization and digital freight clearing network for inter-city transport corridors.',
    },
    {
      id: 'team-3',
      startupName: 'Chenab Pay',
      sector: 'Digital financial services',
      location: 'Lahore',
      stage: 'Seed stage',
      seekingRole: 'Senior Infrastructure Engineer',
      profileSimilarity: 86,
      pitchSnippet: 'Low-cost merchant settlement infrastructure connecting retail checkout counters directly with commercial banks.',
    },
  ],
  resumeAnalysis: {
    lastUpdated: '18 Nov 2026',
    detectedSkills: [
      'Go',
      'Python',
      'PostgreSQL',
      'Redis',
      'Kafka',
      'Docker',
      'gRPC',
      'Distributed systems',
    ],
    suggestions: [
      'Add concrete transaction throughput numbers to your distributed queue project.',
      'Specify latency reduction percentages achieved through database connection pooling.',
      'Document your practical experience with high-availability database failover drills.',
    ],
    simulationNotice: 'Written by a language model simulation',
  },
  onboardingSteps: [
    {
      id: 'step-1',
      title: 'Complete your technical profile',
      description: 'Detail your primary programming languages, frameworks, and database proficiencies.',
      completed: true,
    },
    {
      id: 'step-2',
      title: 'Upload your verified resume',
      description: 'Structured resume parsing generates suggestions without automated filtering.',
      completed: true,
    },
    {
      id: 'step-3',
      title: 'Link your public GitHub profile',
      description: 'Showcase repositories and active contributions to complete your profile.',
      completed: false,
    },
    {
      id: 'step-4',
      title: 'Review roles that match your profile',
      description: 'Evaluate open engineering openings with transparent salary ranges in PKR.',
      completed: false,
    },
    {
      id: 'step-5',
      title: 'Explore founding team matches',
      description: 'Mutual consent introductions protect contact details until both parties accept.',
      completed: false,
    },
  ],
};
