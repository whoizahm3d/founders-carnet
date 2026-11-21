import { test, expect } from 'playwright/test';

const PAGES = [
  { name: 'Landing Page', path: '/' },
  { name: 'Login Page', path: '/login' },
  { name: 'Register Page', path: '/register' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Terms of Service', path: '/terms' },
];

test.describe('FT-09: Mobile Responsive 390px Viewport (Usability)', () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  for (const p of PAGES) {
    test(`${p.name} (${p.path}) has zero horizontal overflow at 390px`, async ({ page }) => {
      const response = await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      // Give fonts and layout 500ms to stabilize
      await page.waitForTimeout(500);

      const metrics = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        return {
          windowInnerWidth: window.innerWidth,
          rootClientWidth: root.clientWidth,
          rootScrollWidth: root.scrollWidth,
          bodyScrollWidth: body.scrollWidth,
        };
      });

      // Assert that scrollWidth does not exceed clientWidth (390px)
      expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.rootClientWidth);
      expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(390);

      // Verify that page cannot be scrolled horizontally
      await page.evaluate(() => window.scrollTo(200, 0));
      const scrollX = await page.evaluate(() => window.scrollX || window.pageXOffset || 0);
      expect(scrollX).toBe(0);
    });
  }
});
