import { test, expect } from 'playwright/test';

test.describe('FT-11: Readiness Rubric Dialog Read-Only Evaluation (FR-2)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock founder session
    await page.addInitScript(() => {
      window.localStorage.setItem('carnet_token', 'mock-token-founder-test');
      window.localStorage.setItem(
        'carnet_user',
        JSON.stringify({
          id: 1,
          email: 'founder@carnet.pk',
          role: 'founder',
          fullName: 'Bilal Ahmed',
          isVerified: true,
          createdAt: new Date().toISOString(),
        })
      );
    });
  });

  test('dialog shows 7 dimensions with score, reasoning, next action, has no editable controls, closes with Escape and Close button', async ({ page }) => {
    await page.goto('/founder/dashboard');
    await expect(page.locator('text=Munshi Books').first()).toBeVisible();

    // 1. Open the rubric modal via the hero card button
    const openButton = page.locator('button', { hasText: 'Inspect rubric breakdown' }).first();
    await expect(openButton).toBeVisible();
    await openButton.click();

    // 2. Dialog visibility check
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /7 core evaluation dimensions/i })).toBeVisible();
    await expect(dialog.locator('text=Written by a language model simulation')).toBeVisible();

    // 3. Verify all 7 dimensions exist with score, description/reasoning, and next action
    const expectedDimensions = [
      'Problem clarity',
      'Market definition',
      'Differentiation',
      'Business model',
      'Traction',
      'Team',
      'Scalability',
    ];

    for (const dimName of expectedDimensions) {
      const dimRow = dialog.locator('div.divide-y > div', { hasText: dimName });
      await expect(dimRow).toBeVisible();
      await expect(dimRow.locator('h4')).toContainText(dimName);
      await expect(dimRow.locator('span:has-text("/ 5")')).toBeVisible();
      await expect(dimRow.locator('text=Next action:')).toBeVisible();
    }

    // Verify exactly 7 dimension rows in the list
    const dimensionRows = dialog.locator('div.divide-y > div');
    await expect(dimensionRows).toHaveCount(7);

    // 4. Assert absence of editable score controls
    // Score selection buttons 1-5 must NOT exist
    const editableButtons = dialog.locator('button[aria-label*="Score "]');
    await expect(editableButtons).toHaveCount(0);

    // Baseline reset and apply buttons must NOT exist
    const resetBtn = dialog.locator('button:has-text("Reset to baseline")');
    await expect(resetBtn).toHaveCount(0);

    const applyBtn = dialog.locator('button:has-text("Apply to dashboard")');
    await expect(applyBtn).toHaveCount(0);

    // 5. Test closing via Escape key
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    // 6. Reopen dialog and test closing via Close button
    await openButton.click();
    await expect(dialog).toBeVisible();

    const closeButton = dialog.locator('button:has-text("Close")');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await expect(dialog).not.toBeVisible();
  });
});
