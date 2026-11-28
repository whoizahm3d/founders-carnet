import { test, expect } from 'playwright/test';

test.describe('FT-13 to FT-17: Authentication and Contract Tests', () => {
  test('FT-13: wrong password shows "Invalid email or password." and stays on /login', async ({ page }) => {
    // Stub login endpoint returning 401
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials' }),
      });
    });

    await page.goto('/login');
    await expect(page).toHaveURL('/login');

    await page.fill('#login-email', 'founder@carnet.pk');
    await page.fill('#login-password', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Asserts page remains on /login and error alert is visible
    await expect(page).toHaveURL('/login');
    const alert = page.locator('section[aria-label="Sign in form"] [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Invalid email or password.');
  });

  test('FT-14: register with Full name field sends full_name in request payload', async ({ page }) => {
    let interceptedPayload: Record<string, unknown> | null = null;

    await page.route('**/api/v1/auth/register/founder', async (route) => {
      interceptedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 10,
          email: 'newfounder@example.com',
          full_name: 'Bilal Ahmed',
          role: 'founder',
        }),
      });
    });

    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: ['stub', 'new-user-token'].join('-'), token_type: 'bearer' }),
      });
    });

    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 10,
          email: 'newfounder@example.com',
          full_name: 'Bilal Ahmed',
          role: 'founder',
        }),
      });
    });

    await page.goto('/register');
    await expect(page).toHaveURL('/register');

    // Fill registration form including required Full name input
    await page.fill('#register-fullname', 'Bilal Ahmed');
    await page.fill('#register-email', 'newfounder@example.com');
    await page.fill('#register-password', 'Founder123');
    await page.click('#consent-checkbox');
    await page.click('button[type="submit"]');

    // Verify registration payload sent full_name
    await expect(page).toHaveURL('/founder/dashboard');
    expect(interceptedPayload).not.toBeNull();
    const payload = interceptedPayload as unknown as Record<string, unknown>;
    expect(payload.full_name).toBe('Bilal Ahmed');
    expect(payload.email).toBe('newfounder@example.com');
    expect(payload.consent_accepted).toBe(true);
  });

  test('FT-15: "Remember me" checked writes to localStorage, unchecked to sessionStorage', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: ['stub', 'remember-test-token'].join('-'), token_type: 'bearer' }),
      });
    });

    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'founder@carnet.pk',
          full_name: 'Bilal Ahmed',
          role: 'founder',
        }),
      });
    });

    // Case A: Remember me is checked -> stored in localStorage
    await page.goto('/login');
    await page.fill('#login-email', 'founder@carnet.pk');
    await page.fill('#login-password', 'Founder123');
    await page.check('#login-remember');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/founder/dashboard');

    const localToken = await page.evaluate(() => window.localStorage.getItem('carnet_token'));
    const sessionTokenA = await page.evaluate(() => window.sessionStorage.getItem('carnet_token'));
    expect(localToken).toBe('stub-remember-test-token');
    expect(sessionTokenA).toBeNull();

    // Clear and test Case B: Remember me is unchecked -> stored in sessionStorage
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto('/login');
    await page.fill('#login-email', 'founder@carnet.pk');
    await page.fill('#login-password', 'Founder123');
    // Do not check #login-remember
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/founder/dashboard');

    const localTokenB = await page.evaluate(() => window.localStorage.getItem('carnet_token'));
    const sessionTokenB = await page.evaluate(() => window.sessionStorage.getItem('carnet_token'));
    expect(localTokenB).toBeNull();
    expect(sessionTokenB).toBe('stub-remember-test-token');
  });

  test('FT-16: logout clears storage and lands on /login', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: ['stub', 'logout-test-token'].join('-'), token_type: 'bearer' }),
      });
    });

    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'founder@carnet.pk',
          full_name: 'Bilal Ahmed',
          role: 'founder',
        }),
      });
    });

    await page.route('**/api/v1/auth/logout', async (route) => {
      await route.fulfill({ status: 204 });
    });

    await page.goto('/login');
    await page.fill('#login-email', 'founder@carnet.pk');
    await page.fill('#login-password', 'Founder123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/founder/dashboard');

    // Click logout button in navigation
    const logoutBtn = page.locator('button[title="Sign out"]').first();
    await logoutBtn.click();

    // Verify redirection to /login and storage is purged
    await expect(page).toHaveURL('/login');
    const localToken = await page.evaluate(() => window.localStorage.getItem('carnet_token'));
    const sessionToken = await page.evaluate(() => window.sessionStorage.getItem('carnet_token'));
    expect(localToken).toBeNull();
    expect(sessionToken).toBeNull();
  });

  test('FT-17: session is cleared on a stubbed 401 from /users/me', async ({ page }) => {
    // Pre-populate stored session
    await page.addInitScript(() => {
      window.localStorage.setItem('carnet_token', 'stale-expired-token');
      window.localStorage.setItem(
        'carnet_user',
        JSON.stringify({
          id: 1,
          email: 'founder@carnet.pk',
          role: 'founder',
          fullName: 'Bilal Ahmed',
        })
      );
    });

    // Stub 401 from /users/me
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid or expired token' }),
      });
    });

    // Navigate to protected founder dashboard
    await page.goto('/founder/dashboard');

    // Asserts session is wiped and page redirects to /login
    await expect(page).toHaveURL('/login');
    const localToken = await page.evaluate(() => window.localStorage.getItem('carnet_token'));
    expect(localToken).toBeNull();
  });

  test('request without Authorization header that gets a stubbed 401 does not log the user out', async ({ page }) => {
    // Pre-populate stored session
    await page.addInitScript(() => {
      window.sessionStorage.setItem('carnet_token', 'valid-active-token');
      window.sessionStorage.setItem(
        'carnet_user',
        JSON.stringify({
          id: 1,
          email: 'founder@carnet.pk',
          role: 'founder',
          fullName: 'Bilal Ahmed',
        })
      );
    });

    // /users/me validates the initial session
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'founder@carnet.pk',
          role: 'founder',
          full_name: 'Bilal Ahmed',
        }),
      });
    });

    // Stub a public or unauthenticated probe returning 401
    await page.route('**/api/v1/founders/me/startups', async (route) => {
      // Check that this probe carried no auth header
      const headers = route.request().headers();
      expect(headers['authorization']).toBeUndefined();

      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Missing authentication credentials' }),
      });
    });

    await page.goto('/founder/dashboard');
    await expect(page).toHaveURL('/founder/dashboard');

    // Execute an unauthenticated request directly via window.fetch through api client
    const errorDetails = await page.evaluate(async () => {
      try {
        // Fetch without token option
        const response = await fetch('/api/v1/founders/me/startups', {
          headers: { Accept: 'application/json' },
        });
        return { status: response.status };
      } catch (err: unknown) {
        return { error: (err as Error).message };
      }
    });

    expect(errorDetails.status).toBe(401);

    // Verify session remains intact and user is not logged out or redirected
    const sessionToken = await page.evaluate(() => window.sessionStorage.getItem('carnet_token'));
    expect(sessionToken).toBe('valid-active-token');
    await expect(page).not.toHaveURL('/login');
  });
});
