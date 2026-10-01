import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { deriveInvitationToken } from '@repo/api/server';
import { config } from 'dotenv';

// The link only ever exists in the email, and the dev server has no mailbox to read. The spec
// rebuilds it the way the email subscriber does: the invitation id, which the admin can list,
// signed with the server's secret.
const serverEnv: Record<string, string> = {};
config({ path: new URL('../../server/.env', import.meta.url).pathname, processEnv: serverEnv });
const SERVER_URL = 'http://localhost:3035';

const pendingInvitationId = async (request: APIRequestContext, spaceId: string, email: string) => {
  const input = encodeURIComponent(JSON.stringify({ json: { spaceId } }));
  const response = await request.get(`${SERVER_URL}/trpc/invitations.list?input=${input}`);
  const body = (await response.json()) as {
    result: { data: { json: { id: string; email: string }[] } };
  };
  const invitation = body.result.data.json.find((i) => i.email === email);
  if (!invitation) throw new Error(`no pending invitation for ${email}`);
  return invitation.id;
};

// The admin (the setup user) creates a space, writes into it and invites `email`; returns
// what the invitee needs to check they landed in it, and the link's token.
const inviteIntoNewSpace = async (page: Page, email: string) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const title = `Space ${Date.now()}`;
  await page.getByRole('button', { name: 'Switch space' }).first().click();
  await page.getByRole('menuitem', { name: 'New space…' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  const spaceId = new URL(page.url()).pathname.split('/').pop()!;

  const content = `Team note ${Date.now()}`;
  await page.getByPlaceholder('Write your memo here...').fill(content);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('memo-card').filter({ hasText: content })).toBeVisible();

  await page.getByRole('link', { name: 'Members' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Invite' }).click();
  await expect(page.getByRole('list', { name: 'Pending invitations' })).toContainText(email);

  const invitationId = await pendingInvitationId(page.request, spaceId, email);
  const token = deriveInvitationToken(serverEnv.SERVER_AUTH_SECRET!, invitationId);
  return { title, spaceId, content, token };
};

const signedOut = { storageState: { cookies: [], origins: [] } };

test('an admin invites an address with no account; the invitee signs up and reads the space', async ({
  page,
  browser,
}) => {
  const email = `invitee-${Date.now()}@example.com`;
  const { title, spaceId, content, token } = await inviteIntoNewSpace(page, email);

  // The invitee, signed out, follows the link and signs up from it.
  const invitee = await browser.newContext(signedOut);
  const inviteePage = await invitee.newPage();
  await inviteePage.goto(`/invitations/${token}`, { waitUntil: 'networkidle' });
  await expect(inviteePage.getByRole('heading', { name: `Join ${title}` })).toBeVisible();
  await inviteePage.getByRole('link', { name: 'Create an account to join' }).click();

  await inviteePage.getByPlaceholder('Enter your name').fill('Invitee');
  await inviteePage.getByPlaceholder('Enter email address').fill(email);
  await inviteePage.getByPlaceholder('Enter your password').fill('a-long-password');
  await inviteePage.getByRole('button', { name: 'Sign Up', exact: true }).click();

  // Back through the link with the token intact, accepted, and into the space.
  await expect(inviteePage).toHaveURL(new RegExp(`/spaces/${spaceId}$`));
  await expect(inviteePage.getByRole('heading', { name: title })).toBeVisible();
  await expect(inviteePage.getByTestId('memo-card').filter({ hasText: content })).toBeVisible();
  // A member is not offered governance.
  await expect(inviteePage.getByRole('link', { name: 'Members' })).toHaveCount(0);

  // The link worked once.
  await inviteePage.goto(`/invitations/${token}`, { waitUntil: 'networkidle' });
  await expect(inviteePage.getByText('This invitation is no longer valid.', { exact: false })).toBeVisible();

  await invitee.close();
});

test('an invitee with an account, signed out, signs in from the link and lands in the space', async ({
  page,
  browser,
}) => {
  const email = `member-${Date.now()}@example.com`;
  const password = 'a-long-password';
  // The account exists before the invitation; the session it opens is thrown away.
  await browser.newContext(signedOut).then(async (context) => {
    await context.request.post(`${SERVER_URL}/api/auth/sign-up/email`, {
      data: { email, password, name: 'Existing user' },
    });
    await context.close();
  });

  const { title, spaceId, content, token } = await inviteIntoNewSpace(page, email);

  const invitee = await browser.newContext(signedOut);
  const inviteePage = await invitee.newPage();
  await inviteePage.goto(`/invitations/${token}`, { waitUntil: 'networkidle' });
  await inviteePage.getByRole('link', { name: 'Sign in to join' }).click();

  await inviteePage.getByPlaceholder('Enter email address').fill(email);
  await inviteePage.getByPlaceholder('Enter password').fill(password);
  await inviteePage.getByRole('button', { name: 'Sign In', exact: true }).click();

  await expect(inviteePage).toHaveURL(new RegExp(`/spaces/${spaceId}$`));
  await expect(inviteePage.getByRole('heading', { name: title })).toBeVisible();
  await expect(inviteePage.getByTestId('memo-card').filter({ hasText: content })).toBeVisible();

  await invitee.close();
});
