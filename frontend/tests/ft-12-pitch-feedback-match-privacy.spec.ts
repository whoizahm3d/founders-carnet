import { test, expect } from 'playwright/test';

const TOKEN = ['stub', 'founder'].join('-');
const SESSION_USER = JSON.stringify({
  id: 1,
  email: 'bilal@example.com',
  role: 'founder',
  fullName: 'Bilal Ahmed',
});

const STARTUP_STUB = {
  id: 1,
  founder_id: 1,
  name: 'Munshi Books',
  description: 'Automated accounting workflows for e-commerce founders',
  sector: 'fintech',
  stage: 'mvp',
  location: 'Karachi',
  business_model: 'SaaS subscription at PKR 5,000/mo per merchant',
  traction_summary: '12 active merchants, PKR 1.2M ARR',
  customer_count: 12,
  monthly_revenue: 100000,
  skills: ['Python', 'React'],
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const READINESS_STUB = [
  {
    id: 1,
    startup_id: 1,
    rubric_version: 'readiness-v1',
    result: {
      rubric_version: 'readiness-v1',
      dimensions: [
        {
          dimension: 'problem_clarity',
          score: 4,
          reasoning: 'Well-articulated pain point validated with frontline customers.',
          next_action: 'Interview 5 more direct-to-consumer merchants on billing friction.',
        },
        {
          dimension: 'market_definition',
          score: 2,
          reasoning: 'Target market addressability and corridor sizing need deeper detail.',
          next_action: 'Add bottom-up TAM and SAM calculations segmented by corridors.',
        },
        {
          dimension: 'differentiation',
          score: 3,
          reasoning: 'Local tax compliance is defensible against regional incumbents.',
          next_action: 'Document specific barriers to entry that competitors cannot replicate.',
        },
        {
          dimension: 'business_model_coherence',
          score: 3,
          reasoning: 'Unit economics and recurring merchant subscription cash flows align.',
          next_action: 'Model gross margin and customer unit economics at scale.',
        },
        {
          dimension: 'traction',
          score: 3,
          reasoning: 'Active paying merchants providing consistent early validation.',
          next_action: 'Track monthly churn rate and merchant expansion revenue.',
        },
        {
          dimension: 'team',
          score: 4,
          reasoning: 'Complementary engineering and domain execution experience.',
          next_action: 'Highlight relevant engineering and domain background.',
        },
        {
          dimension: 'scalability',
          score: 3,
          reasoning: 'Cloud infrastructure readiness and automated customer onboarding.',
          next_action: 'Build automated onboarding flow to reduce manual setup time.',
        },
      ],
    },
    created_at: '2026-01-01T00:00:00Z',
  },
];

const MATCHES_STUB = [
  {
    id: 1,
    startup_id: 1,
    startup_name: 'Munshi Books',
    candidate_user_id: 10,
    candidate_role: 'investor',
    candidate_name: 'Ayesha Qureshi',
    titleAndFirm: 'Partner · Indus Valley Capital, Karachi',
    sector: 'fintech',
    location: 'Karachi',
    semantic_similarity: 0.92,
    score: 0.92,
    factors: { sector_fit: 0.95, stage_fit: 0.9 },
    founder_accepted: false,
    candidate_accepted: false,
    mutual_acceptance: false,
    request_status: 'recommended',
    contact_email: null,
    tags: ['Fintech', 'Seed stage', 'Ticket: PKR 10M-30M'],
    whyMatch: 'High thesis alignment for SME ledger automation, multi-branch cashflow oversight, and Pakistani B2B invoicing rails.',
    contactPolicy: 'Contact revealed upon mutual accept',
  },
  {
    id: 2,
    startup_id: 1,
    startup_name: 'Munshi Books',
    candidate_user_id: 11,
    candidate_role: 'mentor',
    candidate_name: 'Asad Khan',
    titleAndFirm: 'Mentor · Ex-VP Product Sindhu Pay',
    sector: 'saas',
    location: 'Karachi',
    semantic_similarity: 0.88,
    score: 0.88,
    factors: { sector_fit: 0.85, stage_fit: 0.9 },
    founder_accepted: false,
    candidate_accepted: false,
    mutual_acceptance: false,
    request_status: 'recommended',
    contact_email: null,
    tags: ['B2B SaaS', 'Product ops'],
    whyMatch: 'Advises founders on merchant acquisition funnels and low-friction mobile ledger UX.',
    contactPolicy: 'Locked until accepted',
  },
  {
    id: 3,
    startup_id: 1,
    startup_name: 'Munshi Books',
    candidate_user_id: 12,
    candidate_role: 'investor',
    candidate_name: 'Sana Rauf',
    titleAndFirm: 'Angel Investor · Karachi',
    sector: 'fintech',
    location: 'Karachi',
    semantic_similarity: 0.84,
    score: 0.84,
    factors: { sector_fit: 0.8, stage_fit: 0.85 },
    founder_accepted: false,
    candidate_accepted: false,
    mutual_acceptance: false,
    request_status: 'recommended',
    contact_email: null,
    tags: ['Fintech', 'Pre-seed'],
    whyMatch: 'Active early operator in domestic digital commerce enablement and micro-lending software.',
    contactPolicy: 'Locked until accepted',
  },
];

const PITCH_HISTORY_STUB = [
  {
    id: 1,
    startup_id: 1,
    persona: 'Seed-stage fintech investor',
    status: 'completed',
    scores: {
      clarity: { score: 4, reasoning: 'Clear problem articulation.' },
      confidence: { score: 3, reasoning: 'Defensive responses on market size.' },
      content: { score: 3, reasoning: 'Unit economics sound.' },
    },
    rubric_version: 'pitch-v1',
    created_at: '2026-03-12T10:00:00Z',
    completed_at: '2026-03-12T10:15:00Z',
    turns: [],
  },
];

async function injectSession(page: import('playwright/test').Page) {
  await page.addInitScript(
    ([token, user]) => {
      window.sessionStorage.setItem('carnet_token', token as string);
      window.sessionStorage.setItem('carnet_user', user as string);
      window.localStorage.setItem('carnet_token', token as string);
      window.localStorage.setItem('carnet_user', user as string);
    },
    [TOKEN, SESSION_USER]
  );
}

async function stubDashboardApi(page: import('playwright/test').Page) {
  await page.route('**/api/v1/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: SESSION_USER,
    })
  );

  await page.route('**/api/v1/founders/me/startups', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([STARTUP_STUB]),
    })
  );

  await page.route('**/api/v1/startups/*/readiness*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(READINESS_STUB),
    })
  );

  await page.route('**/api/v1/matching/startups/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MATCHES_STUB),
    })
  );

  await page.route('**/api/v1/pitch/history*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PITCH_HISTORY_STUB),
    })
  );

  await page.route('**/api/v1/founders/me/startups/*/verification-request', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        startup_id: 1,
        status: 'approved',
        note: 'Verified profile',
        reason: null,
        reviewed_by_user_id: 2,
        created_at: '2026-01-01T00:00:00Z',
        reviewed_at: '2026-01-02T00:00:00Z',
      }),
    })
  );
}

test.describe('FT-12: Pitch Simulation Notices and Match Privacy Guard (FR-7, NFR-6)', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await stubDashboardApi(page);
  });

  test('pitch feedback carries language model simulation notice and match cards conceal contact details', async ({ page }) => {
    await page.goto('/founder/dashboard');
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    // 1. Pitch feedback simulation notice check
    const simulationNotices = page.locator('text=Written by a language model simulation');
    await expect(simulationNotices.first()).toBeVisible();
    const noticeCount = await simulationNotices.count();
    expect(noticeCount).toBeGreaterThanOrEqual(1);

    // Verify absence of promotional AI badges or sparkles
    const sparkles = page.locator('text=/powered by ai|ai powered/i');
    await expect(sparkles).toHaveCount(0);

    // 2. Match cards contact privacy check (FR-7, NFR-6)
    const matchSection = page.locator('section[aria-label="Investor and Mentor Matches"]');
    await expect(matchSection).toBeVisible();

    // Verify candidate cards are rendered
    await expect(matchSection.locator('text=Ayesha Qureshi')).toBeVisible();
    await expect(matchSection.locator('text=Asad Khan')).toBeVisible();
    await expect(matchSection.locator('text=Sana Rauf')).toBeVisible();

    // Verify contact policy disclosures are rendered
    await expect(matchSection.locator('text=Contact revealed upon mutual accept').first()).toBeVisible();

    // Extract all text content from the match cards container
    const matchSectionText = await matchSection.innerText();

    // Assert that no email address is revealed
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const foundEmails = matchSectionText.match(emailRegex) || [];
    expect(foundEmails).toHaveLength(0);

    // Assert that no phone number or WhatsApp digits are revealed
    const phoneRegex = /(?:\+?92|0092|0)?\s?[3]\d{2}[\s.-]?\d{7}/g;
    const foundPhones = matchSectionText.match(phoneRegex) || [];
    expect(foundPhones).toHaveLength(0);
  });

  test('one section failing does not break the other sections (isolated section failure)', async ({ page }) => {
    // Override readiness API route with a 502 error
    await page.route('**/api/v1/startups/*/readiness*', (route) =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'The readiness evaluation service is currently unavailable. Please try again later.',
        }),
      })
    );

    await page.goto('/founder/dashboard');
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    // Readiness section shows error message
    await expect(page.getByText('Unable to load readiness assessment')).toBeVisible();

    // Pitch feedback section still loads cleanly
    await expect(page.getByRole('heading', { name: 'Recent pitch feedback' })).toBeVisible();
    await expect(page.getByText('Written by a language model simulation').first()).toBeVisible();

    // Next actions section still renders
    await expect(page.getByRole('heading', { name: 'Next actions' })).toBeVisible();

    // Matches section still renders candidates
    const matchSection = page.locator('section[aria-label="Investor and Mentor Matches"]');
    await expect(matchSection).toBeVisible();
    await expect(matchSection.locator('text=Ayesha Qureshi')).toBeVisible();
  });
});
