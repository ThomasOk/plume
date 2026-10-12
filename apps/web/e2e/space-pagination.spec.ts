import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { unique } from './unique';

const SERVER = 'http://localhost:3035/trpc';
const PAGE_SIZE = 20;
const MEMOS = 25;

// The memo written `index`-th, oldest first: it is listed newest first, so the 5 written
// first make the second page.
const contentOf = (index: number) => `Space paging memo ${String(index).padStart(2, '0')}`;

const call = async (request: APIRequestContext, procedure: string, input: unknown) => {
  const response = await request.post(`${SERVER}/${procedure}`, { data: { json: input } });
  expect(response.ok(), `${procedure} answered ${response.status()}`).toBe(true);
  return (await response.json()).result.data.json;
};

let spaceId = '';

// A space of its own per test and run, holding exactly the memos the test wrote: a first
// page of 20, then a second of 5. Written through the API, one after the other: the list is
// what is under test, not the form.
test.beforeEach(async ({ page }) => {
  spaceId = (await call(page.request, 'spaces.create', { title: `Paging space ${unique()}` })).id;
  for (let i = 0; i < MEMOS; i++) {
    await call(page.request, 'memos.space.create', { spaceId, content: contentOf(i) });
  }
});

// The fixture cleans up what the page wrote; the space the API created goes here, its memos
// with it.
test.afterEach(async ({ page }) => {
  await call(page.request, 'spaces.delete', { spaceId });
});

const memos = (page: Page) => page.getByRole('feed', { name: 'Memos' }).getByRole('article');

test('scrolling to the end of a space loads the next page, then says there is nothing more', async ({ page }) => {
  await page.goto(`/spaces/${spaceId}`);
  await expect(memos(page)).toHaveCount(PAGE_SIZE);
  await expect(page.getByText('You’ve reached the end.')).toHaveCount(0);

  await memos(page).last().scrollIntoViewIfNeeded();

  await expect(memos(page)).toHaveCount(MEMOS);
  await expect(memos(page).last()).toContainText(contentOf(0));
  await expect(memos(page).last()).toHaveAttribute('aria-setsize', String(MEMOS));
  await expect(page.getByText('You’ve reached the end.')).toBeVisible();
});
