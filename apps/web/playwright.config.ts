import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.test' });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8085',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'pnpm dev',
      cwd: import.meta.dirname,
      url: 'http://localhost:8085',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm dev',
      cwd: new URL('../server', import.meta.url).pathname,
      url: 'http://localhost:3035',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
