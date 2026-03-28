import { test as setup } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page, request }) => {
  // Register the test user (no-op if already exists)
  await request.post('http://localhost:3035/api/auth/sign-up/email', {
    data: {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
      name: 'Test User',
    },
    failOnStatusCode: false,
  });

  await page.goto('/sign-in');

  await page
    .getByPlaceholder('Enter email address')
    .fill(process.env.TEST_USER_EMAIL!);
  await page
    .getByPlaceholder('Enter password')
    .fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL((url) => !url.pathname.includes('sign-in'));

  await page.context().storageState({ path: authFile });
});
