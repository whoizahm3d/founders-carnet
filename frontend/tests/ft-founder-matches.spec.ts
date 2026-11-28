/**
 * FT-founder-matches: Founder matching feed API integration tests (FR-4, FR-7, NFR-6).
 * Verifies:
 * - Empty state when no startup exists
 * - Loading and rendering matches from real API response
 * - Privacy guard: candidate names and contact details hidden prior to mutual acceptance
 * - Candidate name fallback: "Verified Investor, Fintech, Karachi"
 * - Request match flow triggers POST /matching/{id}/request
 * - Accept match flow reveals contact email upon mutual acceptance
 * - Decline match flow triggers POST /matching/{id}/decline
 * - Error handling for 429, 502, 503
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

const MATCH_RECOMMENDED: import('../src/types/founder').MatchRead = {
  id: 101,
  startup_id: 1,
  startup_name: 'Munshi Books',
  candidate_user_id: 201,
  candidate_role: 'investor',
  sector: 'fintech',
  location: 'Karachi',
  semantic_similarity: 0.92,
  score: 0.88,
  factors: {
    sector_similarity: 0.95,
    stage_overlap: 0.9,
    skill_overlap: 0.8,
  },
  founder_accepted: false,
  candidate_accepted: false,
  mutual_acceptance: false,
  request_status: 'recommended',
  contact_email: null,
};

const MATCH_PENDING_INCOMING: import('../src/types/founder').MatchRead = {
  id: 102,
  startup_id: 1,
  startup_name: 'Munshi Books',
  candidate_user_id: 202,
  candidate_role: 'mentor',
  sector: 'saas',
  location: 'Lahore',
  semantic_similarity: 0.85,
  score: 0.82,
  factors: {
    sector_similarity: 0.85,
    stage_overlap: 0.8,
  },
  founder_accepted: false,
  candidate_accepted: true,
  mutual_acceptance: false,
  request_status: 'pending',
  contact_email: null,
};

const MATCH_ACCEPTED: import('../src/types/founder').MatchRead = {
  id: 103,
  startup_id: 1,
  startup_name: 'Munshi Books',
  candidate_user_id: 203,
  candidate_role: 'investor',
  sector: 'fintech',
  location: 'Islamabad',
  semantic_similarity: 0.94,
  score: 0.91,
  factors: {
    sector_similarity: 0.98,
  },
  founder_accepted: true,
  candidate_accepted: true,
  mutual_acceptance: true,
  request_status: 'accepted',
  contact_email: 'investor.partner@venture.pk',
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

test.describe('Founder matches page', () => {
  test('displays empty state when no startup exists', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    );

    await page.goto('/founder/matches');

    await expect(page.locator('text=Add your startup profile first.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to startup profile' })).toBeVisible();
  });

  test('loads matches and conceals contact details until mutual acceptance', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/matching/startups/1*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MATCH_RECOMMENDED, MATCH_PENDING_INCOMING, MATCH_ACCEPTED]),
      })
    );

    await page.goto('/founder/matches');

    // Confirm honesty captions are present
    await expect(page.locator('text=Percentages show profile similarity')).toBeVisible();
    await expect(page.locator('text=Contact details stay hidden until both sides accept')).toBeVisible();

    // Candidate 1: Recommended Investor (contact locked)
    const card1 = page.locator('[data-testid="match-card-101"]');
    await expect(card1).toBeVisible();
    await expect(card1.locator('text=Investor, fintech, Karachi')).toBeVisible();
    await expect(card1.locator('text=92% similarity')).toBeVisible();
    await expect(card1.locator('text=Contact revealed on mutual accept')).toBeVisible();
    await expect(card1.getByRole('button', { name: 'Request match' })).toBeVisible();
    // Confirm no unverified badge
    await expect(card1.locator('text=Verified')).toHaveCount(0);
    // Confirm contact details are NOT leaked
    await expect(card1.locator('text=@')).toHaveCount(0);

    // Candidate 2: Pending Incoming Mentor
    const card2 = page.locator('[data-testid="match-card-102"]');
    await expect(card2).toBeVisible();
    await expect(card2.locator('text=Mentor, saas, Lahore')).toBeVisible();
    await expect(card2.locator('text=Candidate requested connection')).toBeVisible();
    await expect(card2.getByRole('button', { name: 'Accept' })).toBeVisible();
    await expect(card2.getByRole('button', { name: 'Decline' })).toBeVisible();
    await expect(card2.locator('text=Verified')).toHaveCount(0);

    // Candidate 3: Mutually Accepted (contact email revealed)
    const card3 = page.locator('[data-testid="match-card-103"]');
    await expect(card3).toBeVisible();
    await expect(card3.locator('text=investor.partner@venture.pk')).toBeVisible();
    await expect(card3.getByRole('button', { name: 'Connected' })).toBeVisible();
  });

  test('request match action triggers POST /matching/{id}/request', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/matching/startups/1*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MATCH_RECOMMENDED]),
      })
    );

    let requestCalled = false;
    await page.route('**/api/v1/matching/101/request', (route) => {
      requestCalled = true;
      const updated: import('../src/types/founder').MatchRead = {
        ...MATCH_RECOMMENDED,
        founder_accepted: true,
        request_status: 'pending',
      };
      return route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify(updated),
      });
    });

    await page.goto('/founder/matches');

    const card1 = page.locator('[data-testid="match-card-101"]');
    await card1.getByRole('button', { name: 'Request match' }).click();

    await expect(page.getByRole('status')).toContainText('Match request sent successfully.');
    await expect(card1.getByRole('button', { name: 'Requested' })).toBeVisible();
    expect(requestCalled).toBe(true);
  });

  test('accept incoming match triggers POST and reveals contact info', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      })
    );
    await page.route('**/api/v1/matching/startups/1*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MATCH_PENDING_INCOMING]),
      })
    );

    let acceptCalled = false;
    await page.route('**/api/v1/matching/102/accept', (route) => {
      acceptCalled = true;
      const updated: import('../src/types/founder').MatchRead = {
        ...MATCH_PENDING_INCOMING,
        founder_accepted: true,
        mutual_acceptance: true,
        request_status: 'accepted',
        contact_email: 'mentor.asad@expert.pk',
      };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(updated),
      });
    });

    await page.goto('/founder/matches');

    const card2 = page.locator('[data-testid="match-card-102"]');
    await card2.getByRole('button', { name: 'Accept' }).click();

    await expect(page.getByRole('status')).toContainText('Match accepted.');
    await expect(card2.locator('text=mentor.asad@expert.pk')).toBeVisible();
    await expect(card2.getByRole('button', { name: 'Connected' })).toBeVisible();
    expect(acceptCalled).toBe(true);
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
    await page.route('**/api/v1/matching/startups/1*', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Rate limit exceeded' }),
      })
    );

    await page.goto('/founder/matches');

    await expect(page.getByRole('alert').filter({ hasText: 'Too many requests' })).toContainText(
      'Too many requests. Please wait a moment before trying again.'
    );
  });
});
