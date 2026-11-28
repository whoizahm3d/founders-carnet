/**
 * FT-founder-pitch: Founder pitch simulation and feedback API integration tests (FR-5, FR-6, NFR-6).
 * Verifies:
 * - Empty state when no startup profile exists ("Add your startup profile first.")
 * - Starting a pitch session via POST /pitch/sessions with selected persona
 * - Pitch turn loop via POST /pitch/sessions/{id}/turns
 * - Preserving transcript and showing retry button on 502 error
 * - Showing 429 rate limit error message
 * - Redirecting to /founder/feedback?session_id={id} upon session completion
 * - Feedback page rendering clarity, confidence, and content scores (1-5) and reasoning
 * - Presence of honest simulation notice ("Written by a language model simulation")
 */

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
  skills: ['Python', 'React'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const ACTIVE_SESSION = {
  id: 42,
  startup_id: 1,
  persona: 'Seed-stage fintech investor',
  status: 'active',
  created_at: '2026-03-01T10:00:00Z',
  turns: [
    {
      turn_number: 1,
      speaker: 'investor',
      content: 'What is your core value proposition and who is your target customer in Pakistan?',
    },
  ],
  scores: null,
};

const COMPLETED_SESSION = {
  id: 42,
  startup_id: 1,
  persona: 'Seed-stage fintech investor',
  status: 'completed',
  created_at: '2026-03-01T10:00:00Z',
  turns: [
    {
      turn_number: 1,
      speaker: 'investor',
      content: 'What is your core value proposition and who is your target customer in Pakistan?',
    },
    {
      turn_number: 2,
      speaker: 'founder',
      content: 'We automate bookkeeping for Shopify merchants across Pakistan.',
    },
    {
      turn_number: 3,
      speaker: 'investor',
      content: 'How do you defend against existing accounting software in the market?',
    },
    {
      turn_number: 4,
      speaker: 'founder',
      content: 'Our direct bank integrations and local tax compliance automation are uniquely tailored.',
    },
  ],
  scores: {
    clarity: {
      score: 4,
      reasoning: 'Your value proposition was concise and direct. Keep target customer descriptions this clear.',
    },
    confidence: {
      score: 4,
      reasoning: 'Answers were direct and supported by specific operational examples.',
    },
    content: {
      score: 3,
      reasoning: 'Explain your unit economics and local acquisition channels with more precision.',
    },
  },
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

test.describe('FT-founder-pitch: Pitch simulation and feedback', () => {
  test('shows empty state when founder has no startup profile yet', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/founder/pitch');

    await expect(page.getByText('Add your startup profile first.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to startup profile' })).toBeVisible();
  });

  test('starts a pitch session and handles turns and completion redirect', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      });
    });

    await page.route('**/api/v1/pitch/sessions', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        expect(body.startup_id).toBe(1);
        expect(body.persona).toBeTruthy();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(ACTIVE_SESSION),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/v1/pitch/sessions/42/turns', async (route) => {
      const body = route.request().postDataJSON();
      expect(body.answer).toBe('We automate bookkeeping for Shopify merchants across Pakistan.');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(COMPLETED_SESSION),
      });
    });

    await page.route('**/api/v1/pitch/history**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([COMPLETED_SESSION]),
      });
    });

    await page.goto('/founder/pitch');

    // Start session
    const startButton = page.getByRole('button', { name: /start pitch session/i });
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Verify first question rendered
    await expect(
      page.getByText('What is your core value proposition and who is your target customer in Pakistan?')
    ).toBeVisible();

    // Answer question
    const textarea = page.getByPlaceholder('Type your response...');
    await textarea.fill('We automate bookkeeping for Shopify merchants across Pakistan.');

    const sendButton = page.getByRole('button', { name: 'Send' });
    await sendButton.click();

    // Wait for redirect to feedback page
    await page.waitForURL('**/founder/feedback?session_id=42');
    expect(page.url()).toContain('/founder/feedback?session_id=42');

    // Verify feedback scores rendered
    await expect(page.getByText(/Session average/i)).toBeVisible();
    await expect(page.getByText('Clarity').first()).toBeVisible();
    await expect(page.getByText('Confidence').first()).toBeVisible();
    await expect(page.getByText('Content').first()).toBeVisible();
    await expect(page.getByText(/Your value proposition was concise and direct/i).first()).toBeVisible();

    // Verify practice guide simulation notice
    await expect(
      page.getByText('Written by a language model simulation. This is a practice guide, not a funding prediction.').first()
    ).toBeVisible();
  });

  test('displays 429 rate limit error message', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      });
    });

    await page.route('**/api/v1/pitch/sessions', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Too many requests' }),
      });
    });

    await page.goto('/founder/pitch');

    const startButton = page.getByRole('button', { name: /start pitch session/i });
    await startButton.click();

    await expect(
      page.getByText('Too many requests. Please wait a moment before trying again.')
    ).toBeVisible();
  });

  test('handles 502 with preserved transcript and retry button', async ({ page }) => {
    await injectSession(page);
    await stubUsersMe(page);

    await page.route('**/api/v1/founders/me/startups', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([STARTUP_STUB]),
      });
    });

    await page.route('**/api/v1/pitch/sessions', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(ACTIVE_SESSION),
      });
    });

    let attempt = 0;
    await page.route('**/api/v1/pitch/sessions/42/turns', async (route) => {
      attempt++;
      if (attempt === 1) {
        await route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Bad Gateway' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(COMPLETED_SESSION),
        });
      }
    });

    await page.route('**/api/v1/pitch/history**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([COMPLETED_SESSION]),
      });
    });

    await page.goto('/founder/pitch');

    const startButton = page.getByRole('button', { name: /start pitch session/i });
    await startButton.click();

    const textarea = page.getByPlaceholder('Type your response...');
    await textarea.fill('We automate bookkeeping for Shopify merchants across Pakistan.');

    const sendButton = page.getByRole('button', { name: 'Send' });
    await sendButton.click();

    // Verify 502 error and transcript preserved
    await expect(
      page.getByText('Pitch response could not be generated; the transcript is preserved. You can retry sending your response.')
    ).toBeVisible();

    const retryButton = page.getByRole('button', { name: /retry/i });
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    // Redirect to feedback page on successful retry
    await page.waitForURL('**/founder/feedback?session_id=42');
    expect(page.url()).toContain('/founder/feedback?session_id=42');
  });
});
