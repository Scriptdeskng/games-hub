import { defineConfig, devices } from '@playwright/test';

/**
 * Hub smoke test against the PRODUCTION deploy folder: `npm run build:hub && npm run e2e:hub`.
 * Served by scripts/serve-hub.mjs, which applies dist-hub/_headers (CSP, cache rules) like the real host.
 * Not part of `npm run e2e` (that one runs the per-game specs against dist-e2e/ with the test hook).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'hub.spec.ts',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4190', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/serve-hub.mjs --dir dist-hub --port 4190',
    port: 4190,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'hub-mobile-360x640',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 360, height: 640 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
  ],
});
