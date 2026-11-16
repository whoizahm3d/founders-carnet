import { test, expect } from 'playwright/test';

test.describe('FT-01: Founder Authentication and Role Guard (FR-23)', () => {
  test('signing in with founder sample account lands on /founder/dashboard and typing another role URL redirects away', async ({ page }) => {
    // 1. Visit login page
    await page.goto('/login');
    await expect(page).toHaveURL('/login');

    // 2. Submit credentials for the founder sample account
    await page.fill('#login-email', 'founder@carnet.pk');
    await page.fill('#login-password', 'ValidPassword123!');
    await page.click('button[type="submit"]');

    // 3. Confirm redirection to founder dashboard
    await expect(page).toHaveURL('/founder/dashboard');
    await expect(page.locator('text=Executive Carnet')).toBeVisible();
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    // 4. Attempt to navigate directly to talent dashboard URL
    await page.goto('/talent/dashboard');
    // Role guard in DashboardLayout must intercept and redirect back to founder dashboard
    await expect(page).toHaveURL('/founder/dashboard');
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    // 5. Attempt to navigate directly to investor dashboard URL
    await page.goto('/investor/dashboard');
    await expect(page).toHaveURL('/founder/dashboard');
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    // 6. Attempt to navigate directly to mentor dashboard URL
    await page.goto('/mentor/dashboard');
    await expect(page).toHaveURL('/founder/dashboard');
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    // 7. Attempt to navigate directly to admin dashboard URL
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('/founder/dashboard');
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();
  });
});
