import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    trace: 'retain-on-failure',
    actionTimeout: 20000,
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: existsSync(chromePath) ? chromePath : undefined,
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});
