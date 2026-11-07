import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/** Throttled performance specs: `npm run e2e:perf -- <slug>`; the 10-minute soak: `npm run e2e:soak -- <slug>`. */
export default defineConfig({
  ...base,
  testDir: 'tests/perf',
  timeout: 90_000,
  projects: [
    {
      name: 'perf-mobile-375x812',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
