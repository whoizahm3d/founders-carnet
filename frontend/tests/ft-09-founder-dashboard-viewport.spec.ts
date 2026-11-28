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
          reasoning: 'Target market addressability and corridor sizing need deeper quantification.',
          next_action: 'Add bottom-up TAM and SAM calculations segmented by trade corridors.',
        },
        {
          dimension: 'differentiation',
          score: 3,
          reasoning: 'Local tax compliance is defensible against regional incumbents.',
          next_action: 'Document two specific barriers to entry that regional incumbents cannot replicate.',
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
          next_action: 'Build automated onboarding flow to reduce manual merchant setup time.',
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
    whyMatch: 'High thesis alignment for SME ledger automation and Pakistani B2B invoicing rails.',
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

async function stubDashboardApi(
  page: import('playwright/test').Page,
  options?: { startups?: unknown[]; readiness?: unknown[]; matches?: unknown[]; pitchHistory?: unknown[] }
) {
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
      body: JSON.stringify(options?.startups !== undefined ? options.startups : [STARTUP_STUB]),
    })
  );

  await page.route('**/api/v1/startups/*/readiness*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options?.readiness !== undefined ? options.readiness : READINESS_STUB),
    })
  );

  await page.route('**/api/v1/matching/startups/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options?.matches !== undefined ? options.matches : MATCHES_STUB),
    })
  );

  await page.route('**/api/v1/pitch/history*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options?.pitchHistory !== undefined ? options.pitchHistory : PITCH_HISTORY_STUB),
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

test.describe('FT-09 (Dashboard): Mobile and Desktop Viewport Overflow (Usability)', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await stubDashboardApi(page);
  });

  test('/founder/dashboard has no horizontal scroll at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto('/founder/dashboard', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // Wait for content to render
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();
    await page.waitForTimeout(300);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return {
        rootClientWidth: root.clientWidth,
        rootScrollWidth: root.scrollWidth,
        bodyScrollWidth: body.scrollWidth,
      };
    });

    expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.rootClientWidth);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(390);

    // Attempt horizontal scroll
    await page.evaluate(() => window.scrollTo(200, 0));
    const scrollX = await page.evaluate(() => window.scrollX || window.pageXOffset || 0);
    expect(scrollX).toBe(0);
  });

  test('/founder/dashboard has no horizontal scroll at 768 px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const response = await page.goto('/founder/dashboard', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await expect(page.locator('text=Munshi Books').first()).toBeVisible();
    await page.waitForTimeout(300);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return {
        rootClientWidth: root.clientWidth,
        rootScrollWidth: root.scrollWidth,
        bodyScrollWidth: body.scrollWidth,
      };
    });

    expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.rootClientWidth);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(768);

    await page.evaluate(() => window.scrollTo(200, 0));
    const scrollX = await page.evaluate(() => window.scrollX || window.pageXOffset || 0);
    expect(scrollX).toBe(0);
  });

  test('/founder/dashboard has no horizontal scroll at 1024 px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const response = await page.goto('/founder/dashboard', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await expect(page.locator('text=Munshi Books').first()).toBeVisible();
    await page.waitForTimeout(300);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return {
        rootClientWidth: root.clientWidth,
        rootScrollWidth: root.scrollWidth,
        bodyScrollWidth: body.scrollWidth,
      };
    });

    expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.rootClientWidth);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(1024);

    await page.evaluate(() => window.scrollTo(200, 0));
    const scrollX = await page.evaluate(() => window.scrollX || window.pageXOffset || 0);
    expect(scrollX).toBe(0);
  });

  test('/founder/dashboard has no horizontal scroll at 1440 px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto('/founder/dashboard', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await expect(page.locator('text=Munshi Books').first()).toBeVisible();
    await page.waitForTimeout(300);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return {
        rootClientWidth: root.clientWidth,
        rootScrollWidth: root.scrollWidth,
        bodyScrollWidth: body.scrollWidth,
      };
    });

    expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.rootClientWidth);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(1440);

    await page.evaluate(() => window.scrollTo(200, 0));
    const scrollX = await page.evaluate(() => window.scrollX || window.pageXOffset || 0);
    expect(scrollX).toBe(0);
  });

  test('onboarding state when no startup exists shows call to action to /founder/profile and has no horizontal scroll at 390 px', async ({ page }) => {
    // Stub empty startups list to trigger onboarding state
    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    );

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto('/founder/dashboard', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // Onboarding checklist elements are visible
    await expect(page.getByText('Founder Onboarding Checklist')).toBeVisible();
    await expect(page.getByRole('heading', { name: /get your startup ready for/i })).toBeVisible();

    // CTA to profile exists in main content
    const profileLink = page.locator('main a[href="/founder/profile"]').first();
    await expect(profileLink).toBeVisible();

    // Check no horizontal scroll at 390 px in onboarding state
    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return {
        rootClientWidth: root.clientWidth,
        rootScrollWidth: root.scrollWidth,
        bodyScrollWidth: body.scrollWidth,
      };
    });

    expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.rootClientWidth);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(390);
  });

  test('active state renders live startup data across all sections', async ({ page }) => {
    await page.goto('/founder/dashboard');
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    // Check greeting company line
    await expect(page.locator('text=Munshi Books · Fintech (MVP), Karachi')).toBeVisible();

    // Check readiness section
    await expect(page.getByText('Readiness rubric · Updated today')).toBeVisible();
    await expect(page.getByText('A rubric guide, not a funding probability.').first()).toBeVisible();

    // Check next actions section
    await expect(page.getByRole('heading', { name: 'Next actions' })).toBeVisible();

    // Check pitch feedback section
    await expect(page.getByRole('heading', { name: 'Recent pitch feedback' })).toBeVisible();
    await expect(page.getByText('Written by a language model simulation').first()).toBeVisible();

    // Check matches section
    await expect(page.getByRole('heading', { name: /Investor and mentor/i })).toBeVisible();
    await expect(page.getByText('Ayesha Qureshi')).toBeVisible();
  });
});
