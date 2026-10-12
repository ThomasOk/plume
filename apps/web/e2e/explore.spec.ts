import { test, expect, type APIRequestContext, type Page, type Route } from '@playwright/test';

const SERVER = 'http://localhost:3035/trpc';
const PAGE_SIZE = 20;
const MEMOS = 25;

// One tag per test and run, so its Explore holds exactly the memos it wrote, whatever else
// the instance has, other tests running alongside included: a first page of 20, then a
// second of 5. A test id starts with its file's hash, shared by every test in the file.
const tagFor = (testId: string) =>
  `paging${testId.split('-').at(-1)}${Math.random().toString(36).slice(2, 8)}`.toLowerCase();

// The memo written `index`-th, oldest first: it is listed newest first, so the 5 written
// first make the second page.
const contentOf = (tag: string, index: number) => `Paging memo ${String(index).padStart(2, '0')} #${tag}`;

const call = async (request: APIRequestContext, procedure: string, input: unknown) => {
  const response = await request.post(`${SERVER}/${procedure}`, { data: { json: input } });
  expect(response.ok(), `${procedure} answered ${response.status()}`).toBe(true);
  return (await response.json()).result.data.json;
};

// Written one after the other, as the signed-in test user, through the API: the list is
// what is under test, not the form.
const writePublicMemos = async (request: APIRequestContext, tag: string) => {
  const ids: string[] = [];
  for (let i = 0; i < MEMOS; i++) {
    ids.push((await call(request, 'memos.create', { content: contentOf(tag, i), visibility: 'public' })).id);
  }
  return ids;
};

let written: string[] = [];
let tag = '';

test.beforeEach(async ({ page }, testInfo) => {
  tag = tagFor(testInfo.testId);
  written = await writePublicMemos(page.request, tag);
});

test.afterEach(async ({ page }) => {
  for (const id of written) await call(page.request, 'memos.delete', { id });
});

const memos = (page: Page) => page.getByRole('feed', { name: 'Memos' }).getByRole('article');

// How far the list is scrolled: the memos scroll in their own container, not the window.
const scrollOf = (page: Page) => page.locator('[data-scroll-restoration-id="memos"]').evaluate((element) => element.scrollTop);

const openExplore = async (page: Page) => {
  await page.goto(`/explore?tag=${tag}`);
  await expect(memos(page)).toHaveCount(PAGE_SIZE);
};

// A request for Explore's next page, not its first: only those carry a cursor.
const isNextPage = (route: Route) => {
  const url = decodeURIComponent(route.request().url());
  return url.includes('memos.listPublic') && url.includes('"cursor"');
};

test('scrolling to the end of Explore loads the next page, then says there is nothing more', async ({ page }) => {
  await openExplore(page);
  await expect(page.getByText('You’ve reached the end.')).toHaveCount(0);

  await memos(page).last().scrollIntoViewIfNeeded();

  await expect(memos(page)).toHaveCount(MEMOS);
  await expect(memos(page).last()).toHaveAttribute('aria-setsize', String(MEMOS));
  await expect(memos(page).last()).toHaveAttribute('aria-posinset', String(MEMOS));
  await expect(page.getByText('You’ve reached the end.')).toBeVisible();
});

test('a page that fails to load offers "Load more", reachable by keyboard, which loads it', async ({ page }) => {
  let failing = true;
  await page.route(`${SERVER}/**`, (route) => (failing && isNextPage(route) ? route.abort() : route.fallback()));
  await openExplore(page);

  await memos(page).last().scrollIntoViewIfNeeded();
  // The query retries before giving up.
  const loadMore = page.getByRole('button', { name: 'Load more' });
  await expect(loadMore).toBeVisible({ timeout: 20_000 });
  await expect(memos(page)).toHaveCount(PAGE_SIZE);

  failing = false;
  // Tabbing on from the last memo loaded reaches the button.
  await memos(page).last().getByRole('button', { name: 'Memo actions' }).focus();
  for (let i = 0; i < 10 && !(await loadMore.evaluate((button) => button.matches(':focus'))); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(loadMore).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(memos(page)).toHaveCount(MEMOS);
  // Focus moves on to the first memo loaded, not back to the top of the page.
  await expect(memos(page).nth(PAGE_SIZE)).toBeFocused();
  await expect(page.getByText('You’ve reached the end.')).toBeVisible();
});

test('opening a memo then going back restores the loaded memos and the scroll position', async ({ page }) => {
  await openExplore(page);
  await memos(page).last().scrollIntoViewIfNeeded();
  await expect(memos(page)).toHaveCount(MEMOS);

  const onSecondPage = page.getByTestId('memo-card').filter({ hasText: contentOf(tag, 2) });
  await onSecondPage.scrollIntoViewIfNeeded();
  const scrolled = await scrollOf(page);
  expect(scrolled).toBeGreaterThan(0);

  await onSecondPage.getByRole('button', { name: 'Memo actions' }).click();
  await page.getByRole('menuitem', { name: 'Open' }).click();
  await expect(page).toHaveURL(/\/memos\//);

  await page.goBack();

  await expect(page).toHaveURL(/\/explore/);
  await expect(memos(page)).toHaveCount(MEMOS);
  // Within a few pixels: what sits under the last memo may not be exactly as tall as before.
  await expect.poll(async () => Math.abs((await scrollOf(page)) - scrolled)).toBeLessThan(20);
  await expect(onSecondPage).toBeInViewport();
});

test('reacting to a memo on the second page shows the reaction at once', async ({ page }) => {
  await openExplore(page);
  await memos(page).last().scrollIntoViewIfNeeded();
  await expect(memos(page)).toHaveCount(MEMOS);

  // The server's answer is held back: what shows before it is the optimistic update.
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(`${SERVER}/memos.react**`, async (route) => {
    await held;
    await route.fallback();
  });

  const card = page.getByTestId('memo-card').filter({ hasText: contentOf(tag, 2) });
  await card.getByRole('button', { name: 'React' }).click();
  await page.getByRole('dialog', { name: 'Pick a reaction' }).getByRole('button', { name: '🎉' }).click();

  const summary = card.getByRole('group', { name: 'Reactions' });
  await expect(summary.getByRole('button', { pressed: true })).toContainText('🎉');

  release();
  await page.waitForResponse((response) => response.url().includes('memos.react'));
  await expect(summary.getByRole('button', { pressed: true })).toContainText('🎉');
});
