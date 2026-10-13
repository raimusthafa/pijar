import { test, expect } from '@playwright/test';

test.describe('Pijar E2E Security & Route Guard Suite', () => {
  test('Unauthenticated user navigating to /dashboard is redirected to /auth/login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('Unauthenticated user navigating to /graph is redirected to /auth/login', async ({ page }) => {
    await page.goto('/graph');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('Public auth pages render correctly without redirect loop', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await page.goto('/auth/register');
    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

