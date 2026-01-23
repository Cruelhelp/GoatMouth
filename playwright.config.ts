import { defineConfig } from '@playwright/test';

const runIdSource =
  process.env.PLAYWRIGHT_RUN_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  `${Date.now()}`;

const runId = runIdSource.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40);
const reportDir = `public/reports/playwright/${runId}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [
    ['html', { open: 'never', outputFolder: reportDir }],
    ['json', { outputFile: `${reportDir}/summary.json` }],
  ],
});
