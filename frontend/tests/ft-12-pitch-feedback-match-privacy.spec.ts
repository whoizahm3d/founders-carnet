import { test, expect } from 'playwright/test';

test.describe('FT-12: Pitch Simulation Notices and Match Privacy Guard (FR-7, NFR-6)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock founder session
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

  test('pitch feedback carries language model simulation notice and match cards conceal contact details', async ({ page }) => {
    await page.goto('/founder/dashboard');
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    // 1. Pitch feedback simulation notice check
    const simulationNotices = page.locator('text=Written by a language model simulation');
    await expect(simulationNotices.first()).toBeVisible();
    const noticeCount = await simulationNotices.count();
    expect(noticeCount).toBeGreaterThanOrEqual(1);

    // Verify absence of promotional AI badges or sparkles
    const sparkles = page.locator('text=/powered by ai|ai powered/i');
    await expect(sparkles).toHaveCount(0);

    // 2. Match cards contact privacy check (FR-7, NFR-6)
    const matchSection = page.locator('section', { hasText: 'Investor and Mentor matches' });
    await expect(matchSection).toBeVisible();

    // Verify candidate cards are rendered
    await expect(matchSection.locator('text=Ayesha Qureshi')).toBeVisible();
    await expect(matchSection.locator('text=Hamza Iqbal')).toBeVisible();
    await expect(matchSection.locator('text=Sana Rauf')).toBeVisible();

    // Verify contact policy disclosures are rendered
    await expect(matchSection.locator('text=Contact revealed upon mutual accept')).toBeVisible();

    // Extract all text content from the match cards container
    const matchSectionText = await matchSection.innerText();

    // Assert that no email address is revealed
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const foundEmails = matchSectionText.match(emailRegex) || [];
    expect(foundEmails).toHaveLength(0);

    // Assert that no phone number or WhatsApp digits are revealed
    const phoneRegex = /(?:\+?92|0092|0)?\s?[3]\d{2}[\s.-]?\d{7}/g;
    const foundPhones = matchSectionText.match(phoneRegex) || [];
    expect(foundPhones).toHaveLength(0);
  });
});
