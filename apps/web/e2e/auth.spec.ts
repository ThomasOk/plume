import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('redirects to /explore when not authenticated', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/explore/);
});

test('signs in with valid credentials', async ({ page }) => {
  await page.goto('/sign-in');

  await page
    .getByPlaceholder('Enter email address')
    .fill(process.env.TEST_USER_EMAIL!);
  await page
    .getByPlaceholder('Enter password')
    .fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).not.toHaveURL(/sign-in/);
});
