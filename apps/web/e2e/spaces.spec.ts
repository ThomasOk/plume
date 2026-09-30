import { test, expect } from '@playwright/test';

test('creates a space, lands in it, and finds it again after a reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const title = `Space ${Date.now()}`;
  const switcher = page.getByRole('button', { name: 'Switch space' }).first();
  await switcher.click();
  await page.getByRole('menuitem', { name: 'New space…' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page).toHaveURL(/\/spaces\/[^/]+$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  // Every view inside a new space runs on its scope, so all of them are empty.
  await expect(page.getByText('No memos in this space yet.')).toBeVisible();
  await expect(page.getByText('No tags yet').first()).toBeVisible();

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  // Back to personal memos through the switcher.
  await switcher.click();
  await page.getByRole('menuitem', { name: 'Personal' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByPlaceholder('Write your memo here...')).toBeVisible();
});

test('answers an unknown space as not found', async ({ page }) => {
  await page.goto('/spaces/no-such-space', { waitUntil: 'networkidle' });

  await expect(page.getByText('Space not found.')).toBeVisible();
});
