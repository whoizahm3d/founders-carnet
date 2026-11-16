import { test, expect } from 'playwright/test';

test.describe('FT-03: Register Role Options (FR-22)', () => {
  test('registration form does not offer Admin as an option', async ({ page }) => {
    await page.goto('/register');

    const roleSelect = page.locator('select');
    await expect(roleSelect).toBeVisible();

    // 1. Inspect all option values and text labels
    const options = await roleSelect.locator('option').all();
    const optionValues: string[] = [];
    const optionTexts: string[] = [];

    for (const opt of options) {
      const val = await opt.getAttribute('value');
      const txt = await opt.innerText();
      if (val) optionValues.push(val.toLowerCase());
      if (txt) optionTexts.push(txt.trim().toLowerCase());
    }

    // 2. Ensure admin is strictly absent from role options
    expect(optionValues).not.toContain('admin');
    expect(optionTexts).not.toContain('admin');

    for (const val of optionValues) {
      expect(val).not.toContain('admin');
    }
    for (const txt of optionTexts) {
      expect(txt).not.toContain('admin');
    }

    // 3. Ensure expected public roles are available
    expect(optionValues).toEqual(['founder', 'talent', 'mentor', 'investor']);

    // 4. Ensure no other input or button offers admin role registration
    const adminElements = page.locator('text=/\\badmin\\b/i');
    await expect(adminElements).toHaveCount(0);
  });
});
