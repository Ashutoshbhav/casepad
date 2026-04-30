import { test, expect } from '@playwright/test';

test.describe('CasePad happy path', () => {
  test('cases page loads', async ({ page }) => {
    await page.goto('/cases');
    await expect(page).toHaveURL(/\/(cases|auth\/signin)/);
  });

  test('signin page renders', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page.getByText('Continue with Google')).toBeVisible();
  });
});
