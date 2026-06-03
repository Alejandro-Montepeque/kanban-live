import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Functional specs run on each device project. responsive.spec.ts loops
  // through viewports internally so it runs only in its own project.
  projects: [
    {
      name: 'desktop',
      testIgnore: ['**/responsive.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-iphone',
      testIgnore: ['**/responsive.spec.ts'],
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'tablet-ipad',
      testIgnore: ['**/responsive.spec.ts'],
      use: { ...devices['iPad (gen 11)'] },
    },
    {
      name: 'responsive',
      testMatch: ['**/responsive.spec.ts'],
      // Viewport gets overridden per-test inside the spec.
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer:
    !process.env.CI && process.env.PW_USE_DEV_SERVER
      ? {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
          timeout: 60_000,
        }
      : undefined,
})
