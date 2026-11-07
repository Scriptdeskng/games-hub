import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests run against the e2e build (dist-e2e/, non-production mode so window.__naijaTest
 * exists), served on the GAME origin (4181). The mock portal lives on a different origin (4180)
 * so iframe/postMessage/CORS behave like the real portal.
 */
const mobile = (name: string, viewport: { width: number; height: number }) => ({
  name,
  use: {
    ...devices['Pixel 7'],
    viewport,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
});

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4181', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/mock-portal-server.mjs --dist dist-e2e',
    port: 4181,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    mobile('mobile-375x812', { width: 375, height: 812 }),
    mobile('mobile-360x640', { width: 360, height: 640 }),
  ],
});
