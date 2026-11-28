/**
 * FT-founder-readiness: Founder readiness score API integration tests (FR-2).
 * Verifies:
 * - Empty state when no startup exists
 * - Loading and rendering 7 dimensions from real API response without "Gap:" chips
 * - Recalculate score (POST) triggering assessment and updating scores
 * - 429 Rate Limit error handling with readable message
 * - 502 Bad Gateway error handling with readable message
 * - 503 Service Unavailable error handling with readable message
 */

import { test, expect } from 'playwright/test';

const TOKEN = ['stub', 'test-token-founder'].join('-');
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
  skills: ['Python', 'React'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const READINESS_STUB = {
  id: 1,
  startup_id: 1,
  rubric_version: 'readiness-v1',
  result: {
    rubric_version: 'readiness-v1',
    dimensions: [
      {
        dimension: 'problem_clarity',
        score: 4,
        reasoning: 'The pain point is clear and targeted at Pakistani e-commerce merchants.',
        next_action: 'Interview 5 more direct-to-consumer merchants on billing friction.',
      },
      {
        dimension: 'market_definition',
        score: 3,
        reasoning: 'Target sector is well established, but overall addressable market size needs quantification.',
        next_action: 'Add estimates of active Shopify and WooCommerce stores in Pakistan.',
      },
      {
        dimension: 'differentiation',
        score: 3,
        reasoning: 'Local tax compliance and invoice formatting is a defensible local advantage.',
        next_action: 'Document specific differences against regional competitors.',
      },
      {
        dimension: 'business_model_coherence',
        score: 4,
        reasoning: 'Monthly subscription pricing model aligns with recurring merchant cash flows.',
        next_action: 'Test tiered pricing based on monthly invoice volumes.',
      },
      {
        dimension: 'traction',
        score: 3,
        reasoning: '12 active merchants paying consistently provides early validation.',
        next_action: 'Track monthly churn rate and expansion revenue.',
      },
      {
        dimension: 'team',
        score: 4,
        reasoning: 'Founders possess relevant engineering and fintech domain experience.',
        next_action: 'Recruit an advisor with sales experience in regional SaaS.',
      },
      {
        dimension: 'scalability',
        score: 3,
        reasoning: 'Cloud infrastructure can support scale, but customer onboarding requires automation.',
        next_action: 'Build automated onboarding flow to reduce manual merchant setup time.',
      },
    ],
  },
  created_at: '2026-01-01T00:00:00Z',
};

async function injectSession(page: import('playwright/test').Page) {
  await page.addInitScript(([token, user]) => {
    window.sessionStorage.setItem('carnet_token', token as string);
    window.sessionStorage.setItem('carnet_user', user as string);
  }, [TOKEN, SESSION_USER]);
}

async function stubUsersMe(page: import('playwright/test').Page) {
  await page.route('**/api/v1/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        email: 'bilal@example.com',
        role: 'founder',
        full_name: 'Bilal Ahmed',
      }),
    })
  );
}

test.describe('Founder readiness score page', () => {
  test('displays empty state when no startup profile exists', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    );

    await page.goto('/founder/readiness');

    await expect(page.locator('text=Add your startup profile first.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to startup profile' })).toBeVisible();
  });

  test('loads and displays 7 dimensions from real API response without Gap chips', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/startups/1/readiness*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([READINESS_STUB]),
      })
    );

    await page.goto('/founder/readiness');

    // Confirm all 7 dimension titles appear as defined in backend keys / main.tex
    await expect(page.getByText('Problem clarity')).toBeVisible();
    await expect(page.getByText('Market definition')).toBeVisible();
    await expect(page.getByText('Differentiation')).toBeVisible();
    await expect(page.getByText('Business model')).toBeVisible();
    await expect(page.getByText('Traction')).toBeVisible();
    await expect(page.getByText('Team')).toBeVisible();
    await expect(page.getByText('Scalability')).toBeVisible();

    // Confirm next actions are rendered
    await expect(page.getByText('Suggested next action').first()).toBeVisible();
    await expect(page.getByText('Interview 5 more direct-to-consumer merchants')).toBeVisible();

    // Confirm no "Gap:" chips are shown anywhere
    const gapElements = page.locator('text=/Gap:/i');
    await expect(gapElements).toHaveCount(0);

    // Summary calculation: (4 + 3 + 3 + 4 + 3 + 4 + 3) / 7 = 3.4
    await expect(page.locator('text=3.4 / 5')).toBeVisible();
  });

  test('recalculate button triggers POST and updates score', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );

    // Initial GET returns existing score
    await page.route('**/api/v1/startups/1/readiness*', async (route) => {
      if (route.request().method() === 'POST') {
        const updatedStub = {
          ...READINESS_STUB,
          result: {
            ...READINESS_STUB.result,
            dimensions: READINESS_STUB.result.dimensions.map((d) => ({
              ...d,
              score: 5,
            })),
          },
        };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(updatedStub),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([READINESS_STUB]),
        });
      }
    });

    await page.goto('/founder/readiness');
    await expect(page.locator('text=3.4 / 5')).toBeVisible();

    await page.getByRole('button', { name: 'Recalculate score' }).click();

    await expect(page.getByRole('status')).toContainText('Readiness score updated successfully.');
    // Score should now be 5.0 / 5
    await expect(page.locator('text=5.0 / 5')).toBeVisible();
  });

  test('displays readable message on 429 rate limit error', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/startups/1/readiness*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Rate limit exceeded' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([READINESS_STUB]),
        });
      }
    });

    await page.goto('/founder/readiness');
    await page.getByRole('button', { name: 'Recalculate score' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Too many requests' })).toContainText(
      'Too many requests. Please wait a moment before running another assessment.'
    );
  });

  test('displays readable message on 502 bad gateway error', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/startups/1/readiness*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Readiness assessment could not be generated' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([READINESS_STUB]),
        });
      }
    });

    await page.goto('/founder/readiness');
    await page.getByRole('button', { name: 'Recalculate score' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Readiness assessment could not be generated' })).toContainText(
      'Readiness assessment could not be generated. Please try again later.'
    );
  });

  test('displays readable message on 503 service unavailable error', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/startups/1/readiness*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Service temporarily unavailable' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([READINESS_STUB]),
        });
      }
    });

    await page.goto('/founder/readiness');
    await page.getByRole('button', { name: 'Recalculate score' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Service is temporarily unavailable' })).toContainText(
      'Service is temporarily unavailable. Please try again shortly.'
    );
  });
});
