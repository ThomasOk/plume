import { test, expect } from '@playwright/test';

test('creates a space, lands in it, and finds it again after a reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const title = `Created space ${Date.now()}`;
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

test('writes a memo from inside a space into that space, and not into personal memos', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const title = `Writing space ${Date.now()}`;
  const switcher = page.getByRole('button', { name: 'Switch space' }).first();
  await switcher.click();
  await page.getByRole('menuitem', { name: 'New space…' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  // Inside the space, the form names the space and offers no audience to choose.
  const editor = page.getByPlaceholder('Write your memo here...');
  const form = page.locator('form').filter({ has: editor });
  await expect(form.getByText(title)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Audience/ })).toHaveCount(0);
  const content = `Pasta night ${Date.now()}`;
  await editor.fill(content);
  await page.getByRole('button', { name: 'Save' }).click();
  const card = page.getByTestId('memo-card').filter({ hasText: content });
  await expect(card).toBeVisible();

  // Editing it says the same thing: the memo stays in the space, named.
  await card.getByRole('button', { name: 'Memo actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const editingCard = page.getByTestId('memo-card').filter({ has: page.getByRole('textbox') });
  await expect(editingCard.getByText(title)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Audience/ })).toHaveCount(0);
  await editingCard.getByRole('button', { name: 'Cancel' }).click();

  // On its own page, the memo still names its space, and leads back to it.
  await card.getByRole('button', { name: 'Memo actions' }).click();
  await page.getByRole('menuitem', { name: 'Open' }).click();
  await expect(page).toHaveURL(/\/memos\//);
  await page.getByRole('link', { name: title }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await switcher.click();
  await page.getByRole('menuitem', { name: 'Personal' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(content)).toHaveCount(0);

  // In the personal scope, the audience is private or public: a space is reached by
  // writing in it.
  await page.getByRole('button', { name: 'Audience: Private' }).click();
  await expect(page.getByRole('menuitem', { name: 'Public' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: title })).toHaveCount(0);
  await page.keyboard.press('Escape');
});

test('moves a personal memo into a space, and back out as private', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const title = `Moving space ${Date.now()}`;
  const switcher = page.getByRole('button', { name: 'Switch space' }).first();
  await switcher.click();
  await page.getByRole('menuitem', { name: 'New space…' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await switcher.click();
  await page.getByRole('menuitem', { name: 'Personal' }).click();
  const content = `Team business ${Date.now()}`;
  await page.getByPlaceholder('Write your memo here...').fill(content);
  await page.getByRole('button', { name: 'Save' }).click();
  const card = page.getByTestId('memo-card').filter({ hasText: content });
  await expect(card).toBeVisible();

  await card.getByRole('button', { name: 'Memo actions' }).click();
  await page.getByRole('menuitem', { name: 'Move to' }).click();
  await page.getByRole('menuitem', { name: title }).click();
  await expect(card).toHaveCount(0);

  await switcher.click();
  await page.getByRole('menuitem', { name: title }).click();
  await expect(card).toBeVisible();

  // Out of the space, the author says who reads it next.
  await card.getByRole('button', { name: 'Memo actions' }).click();
  await page.getByRole('menuitem', { name: 'Move to' }).click();
  await page.getByRole('menuitem', { name: 'Private' }).click();
  await expect(card).toHaveCount(0);
});
