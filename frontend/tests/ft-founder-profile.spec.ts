/**
 * FT-founder-profile: Founder profile page API integration tests.
 * Tests load, save, create, and verification-submit flows
 * using page.route stubs (no real backend required).
 * Selectors use element IDs to match the existing spec style.
 */

import { test, expect } from 'playwright/test';

const TOKEN = ['stub', 'founder'].join('-');
const SESSION_USER = JSON.stringify({
  id: 1,
  email: 'bilal@example.com',
  role: 'founder',
  fullName: 'Bilal Ahmed',
});

const PROFILE_STUB = {
  id: 1,
  user_id: 1,
  bio: 'Fintech founder from Karachi.',
  location: 'Karachi',
  consent_accepted: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

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

const VERIF_PENDING = {
  id: 1,
  startup_id: 1,
  status: 'pending',
  note: 'Please verify our registered fintech business in Karachi.',
  reason: null,
  reviewed_by_user_id: null,
  created_at: '2026-01-01T00:00:00Z',
  reviewed_at: null,
};

const VERIF_REJECTED = {
  id: 1,
  startup_id: 1,
  status: 'rejected',
  note: 'Please verify our business.',
  reason: 'SECP registration could not be verified from public records.',
  reviewed_by_user_id: 99,
  created_at: '2026-01-01T00:00:00Z',
  reviewed_at: '2026-01-02T00:00:00Z',
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

test.describe('Founder profile page', () => {
  test('loads and populates fields from API stubs', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/profile', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PROFILE_STUB),
      })
    );
    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/founders/me/startups/1/verification-request', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(VERIF_PENDING),
      })
    );

    await page.goto('/founder/profile');

    // Wait for spinner to clear
    await expect(page.locator('#startup-name')).toBeVisible();

    await expect(page.locator('#startup-name')).toHaveValue('Munshi Books');
    await expect(page.locator('#one-line')).toHaveValue(
      'Automated accounting workflows for e-commerce founders'
    );
    await expect(page.locator('#location-input')).toHaveValue('Karachi');
    await expect(page.locator('#customer-count-input')).toHaveValue('12');
    await expect(page.locator('#business-model-desc')).toHaveValue(
      'SaaS subscription at PKR 5,000/mo per merchant'
    );
    await expect(page.locator('#traction-desc')).toHaveValue('12 active merchants, PKR 1.2M ARR');
    await expect(page.locator('#skills-input')).toHaveValue('Python, React');
    // Verification badge shows pending
    await expect(page.getByText('Pending review').first()).toBeVisible();
    // Submitted note is visible in read-only view
    await expect(page.locator('#submitted-verification-note')).toContainText('Please verify our registered fintech business');
    // Submit for review button is hidden when pending
    await expect(page.getByRole('button', { name: 'Submit for review' })).toHaveCount(0);
  });

  test('Save profile triggers PATCH and shows success message', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/profile', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PROFILE_STUB),
      })
    );
    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/founders/me/startups/1/verification-request', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(VERIF_PENDING),
      })
    );

    let patchCalled = false;
    await page.route('**/api/v1/founders/me/startups/1', async (route) => {
      patchCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STARTUP_STUB),
      });
    });

    await page.goto('/founder/profile');
    await expect(page.locator('#startup-name')).toBeVisible();
    await expect(page.locator('#startup-name')).toHaveValue('Munshi Books');

    await page.click('button[type="submit"]');

    await expect(page.locator('[role="status"]')).toContainText('Profile saved successfully');
    expect(patchCalled).toBe(true);
  });

  test('Submit for review validates note and triggers POST with note payload', async ({
    page,
  }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/profile', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PROFILE_STUB),
      })
    );
    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/founders/me/startups/1', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STARTUP_STUB),
      })
    );

    let postRequestBody: { note?: string } | null = null;
    await page.route('**/api/v1/founders/me/startups/1/verification-request', async (route) => {
      if (route.request().method() === 'POST') {
        postRequestBody = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ...VERIF_PENDING, status: 'pending', note: postRequestBody?.note || '' }),
        });
      } else {
        // GET returns 404 (not yet submitted initially)
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Verification request not found' }),
        });
      }
    });

    await page.goto('/founder/profile');
    await expect(page.locator('#startup-name')).toBeVisible();

    // Verify initial GET 404 displays "Not submitted"
    await expect(page.getByText('Not submitted').first()).toBeVisible();

    // Submit button should be disabled when note is blank
    const submitBtn = page.getByRole('button', { name: 'Submit for review' });
    await expect(submitBtn).toBeDisabled();

    // Enter note
    await page.fill('#verification-note', 'We are an operating fintech company with SECP registration pending.');
    await expect(submitBtn).toBeEnabled();

    // Click submit
    await submitBtn.click();

    await expect(page.locator('[role="status"]')).toContainText(
      'submitted for human verification review'
    );
    await expect(page.getByText('Pending review').first()).toBeVisible();
    expect(postRequestBody).not.toBeNull();
    const recordedBody = postRequestBody as { note?: string } | null;
    expect(recordedBody?.note).toBe('We are an operating fintech company with SECP registration pending.');
  });

  test('POST 409 conflict displays user-friendly already under review message', async ({
    page,
  }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/profile', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PROFILE_STUB),
      })
    );
    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/founders/me/startups/1', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STARTUP_STUB),
      })
    );
    await page.route('**/api/v1/founders/me/startups/1/verification-request', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'A verification request is already open' }),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Verification request not found' }),
        });
      }
    });

    await page.goto('/founder/profile');
    await expect(page.locator('#startup-name')).toBeVisible();

    await page.fill('#verification-note', 'Test note');
    await page.getByRole('button', { name: 'Submit for review' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Your startup is already under review.' })).toBeVisible();
  });

  test('Rejected verification displays reviewer reason', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/profile', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PROFILE_STUB),
      })
    );
    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/founders/me/startups/1/verification-request', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(VERIF_REJECTED),
      })
    );

    await page.goto('/founder/profile');
    await expect(page.locator('#startup-name')).toBeVisible();

    // Status badge shows Rejected
    await expect(page.getByText('Rejected').first()).toBeVisible();
    // Reviewer reason text is displayed
    await expect(page.locator('text=SECP registration could not be verified')).toBeVisible();
  });

  test('Empty startup state shows blank form; create triggers POST startups', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/profile', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PROFILE_STUB),
      })
    );

    let postStartupCalled = false;
    await page.route('**/api/v1/founders/me/startups', async (route) => {
      if (route.request().method() === 'POST') {
        postStartupCalled = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ...STARTUP_STUB, id: 2 }),
        });
      } else {
        // GET returns empty list (no startups yet)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.goto('/founder/profile');

    // Form should render (spinner cleared); fields blank because no startup
    await expect(page.locator('#startup-name')).toBeVisible();
    await expect(page.locator('#startup-name')).toHaveValue('');

    // Fill in required fields
    await page.fill('#startup-name', 'New Startup');
    await page.fill('#one-line', 'A brand new idea');
    await page.fill('#location-input', 'Lahore');
    await page.fill('#business-model-desc', 'Freemium SaaS');
    await page.fill('#traction-desc', '5 beta users');
    await page.fill('#customer-count-input', '5');

    await page.click('button[type="submit"]');

    await expect(page.locator('[role="status"]')).toContainText('Profile saved successfully');
    expect(postStartupCalled).toBe(true);
  });
});
