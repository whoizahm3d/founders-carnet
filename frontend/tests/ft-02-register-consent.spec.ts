import { test, expect } from 'playwright/test';

test.describe('FT-02: Register Consent Enforcement (FR-17)', () => {
  test('Create account button cannot be submitted until consent box is ticked', async ({ page }) => {
    await page.goto('/register');

    const consentCheckbox = page.locator('#consent-checkbox');
    const submitButton = page.locator('button[type="submit"]', { hasText: 'Create account' });
    const helperNotice = page.locator('text=Create account is disabled until you agree to the terms above.');

    // 1. Initial state: consent box is not ticked and submit button is disabled
    await expect(consentCheckbox).toBeVisible();
    await expect(consentCheckbox).toHaveAttribute('aria-checked', 'false');
    await expect(submitButton).toBeDisabled();
    await expect(helperNotice).toBeVisible();

    // 2. Fill credentials but leave consent unticked: submit button must remain disabled
    await page.fill('input[type="email"]', 'founder.test@example.com');
    await page.fill('input[type="password"]', 'Founder123');
    await expect(submitButton).toBeDisabled();

    // 3. Tick consent box: submit button becomes enabled and helper notice disappears
    await consentCheckbox.click();
    await expect(consentCheckbox).toHaveAttribute('aria-checked', 'true');
    await expect(submitButton).toBeEnabled();
    await expect(helperNotice).not.toBeVisible();

    // 4. Untick consent box again: submit button must revert to disabled
    await consentCheckbox.click();
    await expect(consentCheckbox).toHaveAttribute('aria-checked', 'false');
    await expect(submitButton).toBeDisabled();
    await expect(helperNotice).toBeVisible();
  });
});
