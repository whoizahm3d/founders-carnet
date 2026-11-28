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

test.describe('FT-11: Readiness Rubric Dialog Read-Only Evaluation (FR-2)', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await stubDashboardApi(page);
  });

  test('dialog shows 7 dimensions with score, reasoning, next action, has no editable controls, closes with Escape and Close button', async ({ page }) => {
    await page.goto('/founder/dashboard');
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    // 1. Open the rubric modal via the hero card button
    const openButton = page.locator('button', { hasText: 'Inspect rubric breakdown' }).first();
    await expect(openButton).toBeVisible();
    await openButton.click();

    // 2. Dialog visibility check
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /7 core evaluation dimensions/i })).toBeVisible();
    await expect(dialog.locator('text=Written by a language model simulation')).toBeVisible();

    // 3. Verify all 7 dimensions exist with score, description/reasoning, and next action
    const expectedDimensions = [
      'Problem clarity',
      'Market definition',
      'Differentiation',
      'Business model',
      'Traction',
      'Team',
      'Scalability',
    ];

    for (const dimName of expectedDimensions) {
      const dimRow = dialog.locator('div.divide-y > div', { hasText: dimName });
      await expect(dimRow).toBeVisible();
      await expect(dimRow.locator('h4')).toContainText(dimName);
      await expect(dimRow.locator('span:has-text("/ 5")')).toBeVisible();
      await expect(dimRow.locator('text=Next action:')).toBeVisible();
    }

    // Verify exactly 7 dimension rows in the list
    const dimensionRows = dialog.locator('div.divide-y > div');
    await expect(dimensionRows).toHaveCount(7);

    // 4. Assert absence of editable score controls
    const editableButtons = dialog.locator('button[aria-label*="Score "]');
    await expect(editableButtons).toHaveCount(0);

    const resetBtn = dialog.locator('button:has-text("Reset to baseline")');
    await expect(resetBtn).toHaveCount(0);

    const applyBtn = dialog.locator('button:has-text("Apply to dashboard")');
    await expect(applyBtn).toHaveCount(0);

    // 5. Test closing via Escape key
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    // 6. Reopen dialog and test closing via Close button
    await openButton.click();
    await expect(dialog).toBeVisible();

    const closeButton = dialog.locator('button:has-text("Close")');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await expect(dialog).not.toBeVisible();
  });

  test('next action done state persists across page reload in localStorage', async ({ page }) => {
    await page.goto('/founder/dashboard');
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    const nextActionsSection = page.locator('section[aria-label="Next Actions"]');
    await expect(nextActionsSection).toBeVisible();

    // Find the first action checkbox
    const firstCheckbox = nextActionsSection.locator('input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible();
    await expect(firstCheckbox).not.toBeChecked();

    // Mark as completed
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked();

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    // Verify checkbox is still checked after reload
    const reloadedCheckbox = page.locator('section[aria-label="Next Actions"] input[type="checkbox"]').first();
    await expect(reloadedCheckbox).toBeChecked();
  });
});
