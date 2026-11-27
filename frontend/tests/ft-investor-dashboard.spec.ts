import { test, expect } from 'playwright/test';

test.describe('FT-01 & FT-09 & FT-04 & FT-06: Investor Dashboard Specs', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: ['stub', 'test-token-investor'].join('-'), token_type: 'bearer' }),
      });
    });
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 4, email: 'investor@carnet.pk', full_name: 'Sana Rauf', role: 'investor' }),
      });
    });
  });

  test.describe('FT-01: Investor Authentication and Role Guard (FR-23)', () => {
    test('signing in with investor account lands on /investor/dashboard and typing another role URL redirects away', async ({ page }) => {
      // 1. Visit login page
      await page.goto('/login');
      await expect(page).toHaveURL('/login');

      // 2. Submit credentials for investor account
      await page.fill('#login-email', 'investor@carnet.pk');
      await page.fill('#login-password', 'Founder123');
      await page.click('button[type="submit"]');

      // 3. Confirm landing on investor dashboard
      await expect(page).toHaveURL('/investor/dashboard');
      await expect(page.locator('text=Operational summary').first()).toBeVisible();

      // 4. Attempt to navigate directly to founder dashboard URL
      await page.goto('/founder/dashboard');
      await expect(page).toHaveURL('/investor/dashboard');
      await expect(page.locator('text=Operational summary').first()).toBeVisible();

      // 5. Attempt to navigate directly to talent dashboard URL
      await page.goto('/talent/dashboard');
      await expect(page).toHaveURL('/investor/dashboard');
      await expect(page.locator('text=Operational summary').first()).toBeVisible();

      // 6. Attempt to navigate directly to mentor dashboard URL
      await page.goto('/mentor/dashboard');
      await expect(page).toHaveURL('/investor/dashboard');
      await expect(page.locator('text=Operational summary').first()).toBeVisible();

      // 7. Attempt to navigate directly to admin dashboard URL
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL('/investor/dashboard');
      await expect(page.locator('text=Operational summary').first()).toBeVisible();
    });
  });

  test.describe('FT-09: Investor Dashboard Viewport Overflow (Usability)', () => {
    test.beforeEach(async ({ page }) => {
      // Inject mock investor session into localStorage before navigation
      await page.addInitScript(() => {
        window.localStorage.setItem('carnet_token', 'mock-token-investor-test');
        window.localStorage.setItem(
          'carnet_user',
          JSON.stringify({
            id: 4,
            email: 'investor@carnet.pk',
            role: 'investor',
            fullName: 'Sana Rauf',
            isVerified: true,
            createdAt: new Date().toISOString(),
          })
        );
      });
    });

    const viewports = [
      { name: 'mobile (390 px)', width: 390, height: 844 },
      { name: 'tablet (768 px)', width: 768, height: 1024 },
      { name: 'desktop (1024 px)', width: 1024, height: 768 },
      { name: 'large desktop (1440 px)', width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      test(`/investor/dashboard has no horizontal scroll at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const response = await page.goto('/investor/dashboard', { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);

        // Wait for key elements to render
        await expect(page.locator('text=Operational summary').first()).toBeVisible();
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
        expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(vp.width);

        // Verify horizontal scroll offset remains 0
        await page.evaluate(() => window.scrollTo(200, 0));
        const scrollX = await page.evaluate(() => window.scrollX || window.pageXOffset || 0);
        expect(scrollX).toBe(0);
      });
    }
  });

  test.describe('FT-04 & FT-06: Language Model Attribution and Privacy Guard (FR-7, NFR-6)', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('carnet_token', 'mock-token-investor-test');
        window.localStorage.setItem(
          'carnet_user',
          JSON.stringify({
            id: 4,
            email: 'investor@carnet.pk',
            role: 'investor',
            fullName: 'Sana Rauf',
            isVerified: true,
            createdAt: new Date().toISOString(),
          })
        );
      });
    });

    test('founder matches carry simulation notice and contact details stay hidden', async ({ page }) => {
      await page.goto('/investor/dashboard');
      await expect(page.locator('text=Operational summary').first()).toBeVisible();

      // 1. Language model simulation notice verification (FT-06)
      const simulationNotice = page.locator('text=Written by a language model simulation');
      await expect(simulationNotice.first()).toBeVisible();

      // Ensure no prohibited promotional AI badges exist
      const aiPromotional = page.locator('text=/powered by ai|ai powered/i');
      await expect(aiPromotional).toHaveCount(0);

      // 2. Contact details hidden disclosure verification (FT-04, FR-7, NFR-6)
      const privacyNotes = page.locator('text=Contact details stay hidden until both sides accept.');
      await expect(privacyNotes.first()).toBeVisible();

      // Extract all text content from main section
      const pageText = await page.innerText('main');

      // Assert no raw email is exposed
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const foundEmails = pageText.match(emailRegex) || [];
      expect(foundEmails).toHaveLength(0);

      // Assert no raw Pakistani phone or WhatsApp number is exposed
      const phoneRegex = /(?:\+?92|0092|0)?\s?[3]\d{2}[\s.-]?\d{7}/g;
      const foundPhones = pageText.match(phoneRegex) || [];
      expect(foundPhones).toHaveLength(0);
    });
  });
});
