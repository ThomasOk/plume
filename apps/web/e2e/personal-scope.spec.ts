import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { unique } from './unique';

const SERVER = 'http://localhost:3035/trpc';
const PAGE_SIZE = 20;
const MEMOS = 25;

// The memo written `index`-th, oldest first: it is listed newest first, so the 5 written
// first make the second page.
const contentOf = (tag: string, index: number) => `Personal paging memo ${String(index).padStart(2, '0')} #${tag}`;

const call = async (request: APIRequestContext, procedure: string, input: unknown) => {
  const response = await request.post(`${SERVER}/${procedure}`, { data: { json: input } });
  expect(response.ok(), `${procedure} answered ${response.status()}`).toBe(true);
  return (await response.json()).result.data.json;
};

let written: string[] = [];
let tag = '';

// One tag per test and run, so the personal scope filtered on it holds exactly the memos the
// test wrote, whatever else the test user has: a first page of 20, then a second of 5. Written
// through the API, one after the other: the list is what is under test, not the form.
test.beforeEach(async ({ page }) => {
  tag = `personal${unique()}`.toLowerCase();
  written = [];
  for (let i = 0; i < MEMOS; i++) {
    written.push((await call(page.request, 'memos.create', { content: contentOf(tag, i), visibility: 'private' })).id);
  }
});

// The fixture cleans up what the page wrote; what the API wrote is deleted here.
test.afterEach(async ({ page }) => {
  for (const id of written) await call(page.request, 'memos.delete', { id });
});

const memos = (page: Page) => page.getByRole('feed', { name: 'Memos' }).getByRole('article');

const openPersonalScope = async (page: Page) => {
  await page.goto(`/?tag=${tag}`);
  await expect(memos(page)).toHaveCount(PAGE_SIZE);
};

test('scrolling to the end of the personal scope loads the next page, then says there is nothing more', async ({ page }) => {
  await openPersonalScope(page);
  await expect(page.getByText('You’ve reached the end.')).toHaveCount(0);

  await memos(page).last().scrollIntoViewIfNeeded();

  await expect(memos(page)).toHaveCount(MEMOS);
  await expect(memos(page).last()).toContainText(contentOf(tag, 0));
  await expect(memos(page).last()).toHaveAttribute('aria-setsize', String(MEMOS));
  await expect(page.getByText('You’ve reached the end.')).toBeVisible();
});

test('the list scrolls in its own container, not the window as well', async ({ page }) => {
  await openPersonalScope(page);

  const pageHeight = await page.locator('html').evaluate((html) => html.scrollHeight);
  expect(pageHeight).toBeLessThanOrEqual(page.viewportSize()!.height);
});

test('a memo written once two pages are loaded appears at the top', async ({ page }) => {
  await openPersonalScope(page);
  await memos(page).last().scrollIntoViewIfNeeded();
  await expect(memos(page)).toHaveCount(MEMOS);

  const content = `Personal paging memo, the newest #${tag}`;
  await page.getByPlaceholder('Write your memo here...').fill(content);
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(memos(page).first()).toContainText(content);
  await expect(memos(page)).toHaveCount(MEMOS + 1);
});
