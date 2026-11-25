/**
 * Admin Dashboard Fixtures
 * Typed interfaces and realistic ecosystem data for /admin/dashboard.
 * Conforms to DESIGN.md v3.9.2 and project rules:
 * - Fictional cast only (Munshi Books / Bilal Ahmed, Chenab Pay / Daniyal Shah, Mehran Works / Tariq Mehmood, Bolan Commerce / Haris Khan, Nida Farooq)
 * - Zero raw contact details (no emails or phone numbers)
 * - Zero em dashes and en dashes
 * - Counts in summary card derive directly from fixture arrays
 * - Exact finality wording: "Rejection is final." and "Rejection is final. The user cannot appeal."
 * - SECP only as plain field label ("Provided" or "Not provided")
 * - Readiness score carries "A rubric guide, not a funding probability"
 * - Language model text carries "Written by a language model simulation"
 * - Mutual privacy disclosure: "Contact details stay hidden until both sides accept."
 */

export interface AdminProfileMeta {
  fullName: string;
  roleTitle: string;
  location: string;
  consoleBadgeText: string;
}

export interface AdminSignalItem {
  label: string;
  value: string;
  isFailed?: boolean;
}

export interface AdminReviewItem {
  id: string;
  name: string;
  applicantName: string;
  roleType: 'founder' | 'talent' | 'mentor' | 'investor';
  roleTypeLabel: string;
  sectorOrSpecialty: string;
  city: string;
  badgeLabel: string;
  badgeVariant: 'accent' | 'warning' | 'neutral' | 'success';
  statusTag: string;
  statusDesc: string;
  signals: AdminSignalItem[];
  scoreLabel?: string;
  scoreValue?: string;
  scoreCaption?: string;
  simulationSummary: string;
}

export interface AdminAppealItem {
  id: string;
  name: string;
  applicantName: string;
  roleType: 'founder' | 'talent' | 'mentor' | 'investor';
  roleTypeLabel: string;
  sectorOrSpecialty: string;
  city: string;
  badgeLabel: string;
  badgeVariant: 'accent' | 'warning' | 'neutral' | 'success';
  statusTag: string;
  statusDesc: string;
  lodgedAt: string;
  appealNote: string;
  evidenceItems: string[];
  signals: AdminSignalItem[];
  simulationSummary: string;
}

export interface AdminDecidedItem {
  id: string;
  name: string;
  roleTypeLabel: string;
  decision: 'approved' | 'rejected';
  decidedAt: string;
  reason: string;
}

export interface AdminDashboardData {
  profile: AdminProfileMeta;
  escalatedProfiles: AdminReviewItem[];
  appeals: AdminAppealItem[];
  decidedToday: AdminDecidedItem[];
}

export const INITIAL_ADMIN_DASHBOARD_DATA: AdminDashboardData = {
  profile: {
    fullName: 'Maryam Siddiqui',
    roleTitle: 'Platform Administrator',
    location: 'Karachi',
    consoleBadgeText: 'Admin console',
  },
  escalatedProfiles: [
    {
      id: 'munshi-books',
      name: 'Munshi Books',
      applicantName: 'Bilal Ahmed',
      roleType: 'founder',
      roleTypeLabel: 'Founder profile',
      sectorOrSpecialty: 'SME accounting software, Seed',
      city: 'Karachi',
      badgeLabel: 'Pending review',
      badgeVariant: 'neutral',
      statusTag: 'Pending review',
      statusDesc: 'Manual verification required',
      signals: [
        { label: 'LinkedIn', value: 'Connected' },
        { label: 'Link check', value: 'Pending' },
        { label: 'Completeness', value: '70%' },
        { label: 'SECP registration', value: 'Provided' },
      ],
      scoreLabel: 'SCORE',
      scoreValue: 'Readiness 3.1 / 5',
      scoreCaption: 'A rubric guide, not a funding probability',
      simulationSummary:
        'Inbound founder profile flagged for manual verification due to pending external domain check.',
    },
    {
      id: 'chenab-pay',
      name: 'Chenab Pay',
      applicantName: 'Daniyal Shah',
      roleType: 'founder',
      roleTypeLabel: 'Founder profile',
      sectorOrSpecialty: 'Digital merchant billing, Seed',
      city: 'Lahore',
      badgeLabel: 'Pending review',
      badgeVariant: 'neutral',
      statusTag: 'Pending review',
      statusDesc: 'Manual verification required',
      signals: [
        { label: 'LinkedIn', value: 'Connected' },
        { label: 'Link check', value: 'Pending' },
        { label: 'Completeness', value: '75%' },
        { label: 'SECP registration', value: 'Provided' },
      ],
      scoreLabel: 'SCORE',
      scoreValue: 'Readiness 2.8 / 5',
      scoreCaption: 'A rubric guide, not a funding probability',
      simulationSummary:
        'Inbound founder profile requiring manual review of billing domain endpoints.',
    },
  ],
  appeals: [
    {
      id: 'nida-farooq',
      name: 'Nida Farooq',
      applicantName: 'Nida Farooq',
      roleType: 'talent',
      roleTypeLabel: 'Talent profile',
      sectorOrSpecialty: 'Senior Flutter Developer',
      city: 'Karachi',
      badgeLabel: 'Appeal',
      badgeVariant: 'accent',
      statusTag: 'Appeal pending',
      statusDesc: 'Auto-rejected: Product link unreachable',
      lodgedAt: '9 November 2026',
      appealNote:
        'My initial portfolio link was temporarily unreachable during DNS configuration. I have attached authorized repository proof and updated links.',
      evidenceItems: ['Work_Authorization_Proof.pdf', 'github.com/nidafarooq'],
      signals: [
        { label: 'LinkedIn', value: 'Connected' },
        { label: 'Link check', value: 'Failed', isFailed: true },
        { label: 'Completeness', value: '85%' },
      ],
      simulationSummary:
        'Single appeal submitted following automatic rejection caused by an unreachable portfolio link.',
    },
  ],
  decidedToday: [
    {
      id: 'decided-01',
      name: 'Mehran Works',
      roleTypeLabel: 'Founder profile',
      decision: 'approved',
      decidedAt: '2 hours ago',
      reason: 'Identity confirmed and business registration documentation provided.',
    },
    {
      id: 'decided-02',
      name: 'Bolan Commerce',
      roleTypeLabel: 'Founder profile',
      decision: 'approved',
      decidedAt: '4 hours ago',
      reason: 'Platform documentation verified and link check passed.',
    },
  ],
};
