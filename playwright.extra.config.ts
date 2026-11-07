import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/** Landscape phone and desktop runs: `npm run e2e:extra -- <slug>`. */
export default defineConfig({
  ...base,
  projects: [
    {
      name: 'mobile-landscape-812x375',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 812, height: 375 },
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: 'desktop-1280x800', use: { viewport: { width: 1280, height: 800 }, hasTouch: false } },
  ],
});
