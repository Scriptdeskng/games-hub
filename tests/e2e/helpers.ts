import { expect, type Locator, type Page } from '@playwright/test';

export interface Watch {
  errors: string[];
}

/** Collect console errors, page errors and failed requests: a clean run has none. */
export function watchErrors(page: Page): Watch {
  const w: Watch = { errors: [] };
  page.on('console', (m) => {
    if (m.type() === 'error') w.errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => w.errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => {
    // a reload or navigation legitimately aborts requests that are still in flight
    if (r.failure()?.errorText !== 'net::ERR_ABORTED') w.errors.push(`requestfailed: ${r.url()}`);
  });
  return w;
}

export async function openGame(page: Page, slug: string, query = ''): Promise<void> {
  await page.goto(`/${slug}/${query}`);
  await page.waitForFunction(() => Boolean(window.__naijaTest));
}

export const screenOf = (page: Page): Promise<string> =>
  page.evaluate(() => window.__naijaTest?.screen() ?? '');

export async function expectScreen(page: Page, id: string): Promise<void> {
  await expect.poll(() => screenOf(page)).toBe(id);
}

export const counters = (
  page: Page,
): Promise<{ listeners: number; timers: number; rafs: number }> =>
  page.evaluate(() => window.__naijaTest!.counters());

export const eventTypes = (page: Page): Promise<string[]> =>
  page.evaluate(() => window.__naijaTest!.events().map((e) => e.type));

const touchPages = new WeakMap<Page, boolean>();

/** Touch tap on touch projects, mouse click on the desktop project. */
export async function press(target: Locator, opts: { timeout?: number } = {}): Promise<void> {
  const page = target.page();
  let touch = touchPages.get(page);
  if (touch === undefined) {
    touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
    touchPages.set(page, touch);
  }
  await (touch ? target.tap(opts) : target.click(opts));
}
