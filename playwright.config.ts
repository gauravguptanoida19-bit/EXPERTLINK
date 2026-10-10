import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.WEB_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI
    ? [
        {
          command: 'npm run start --workspace=apps/api',
          port: 4000,
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
        {
          command: 'npm run start --workspace=apps/web',
          port: 4200,
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        }
      ]
    : undefined,
});
