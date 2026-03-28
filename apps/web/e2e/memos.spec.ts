import { test, expect, type Page } from '@playwright/test';

async function createMemo(page: Page, content: string) {
  await page.getByPlaceholder('Write your memo here...').fill(content);
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForResponse((resp) => resp.url().includes('memos.create') && resp.status() === 200);
  await page.waitForResponse((resp) => resp.url().includes('memos.list') && resp.status() === 200);
}

test('creates a memo and it appears in the list', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const memoContent = `Test memo ${Date.now()}`;
  await createMemo(page, memoContent);

  await expect(page.getByTestId('memo-card').filter({ hasText: memoContent })).toBeVisible();
});

test('creates a memo then deletes it', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const memoContent = `Test memo ${Date.now()}`;
  await createMemo(page, memoContent);

  const memoCard = page.getByTestId('memo-card').filter({ hasText: memoContent });
  await expect(memoCard).toBeVisible();

  await memoCard.getByRole('button', { name: 'Memo actions' }).click();
  await page.getByText('Delete').click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText(memoContent)).not.toBeVisible();
});

test('creates a memo then updates it', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const memoContent = `Test memo ${Date.now()}`;
  await createMemo(page, memoContent);

  const memoCard = page.getByTestId('memo-card').filter({ hasText: memoContent });
  await expect(memoCard).toBeVisible();

  await memoCard.getByRole('button', { name: 'Memo actions' }).click();
  await page.getByText('Edit').click();

  const editingCard = page
    .getByTestId('memo-card')
    .filter({ has: page.getByRole('textbox') });

  const updatedContent = `Test memo updated ${Date.now()}`;
  await editingCard.getByRole('textbox').fill(updatedContent);

  const updateResponse = page.waitForResponse(
    (resp) => resp.url().includes('memos.update') && resp.status() === 200,
  );
  await editingCard.getByRole('button', { name: 'Save' }).click();
  await updateResponse;

  await expect(page.getByText(updatedContent)).toBeVisible({ timeout: 10000 });
});
