import { test, expect } from 'playwright/test';

test.describe('FT-09 (Dashboard): Mobile and Desktop Viewport Overflow (Usability)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock founder session into localStorage before navigation
    await page.addInitScript(() => {
      window.localStorage.setItem('carnet_token', 'mock-token-founder-test');
      window.localStorage.setItem(
        'carnet_user',
        JSON.stringify({
          id: 'mock-founder-bilal',
          email: 'founder@carnet.pk',
          role: 'founder',
          fullName: 'Bilal Ahmed',
          isVerified: true,
          createdAt: new Date().toISOString(),
        })
      );
    });
  });

  test('/founder/dashboard has no horizontal scroll at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto('/founder/dashboard', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // Wait for content to render
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();
    await page.waitForTimeout(500);

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

  test('/founder/dashboard has no horizontal scroll at 1440 px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto('/founder/dashboard', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await expect(page.locator('text=Munshi Books').first()).toBeVisible();
    await page.waitForTimeout(500);

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
});
