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

/**
 * Layout problems on the current screen: any element whose content is wider than its box
 * (clipped or overflowing text, e.g. a stat tile that cuts "Medium"), or that sits outside the
 * viewport horizontally. Decorative layers (aria-hidden, confetti, the play arena) are skipped.
 */
export async function layoutProblems(page: Page): Promise<string[]> {
  // let entrance animations (title slam, toasts) finish: measure the settled layout
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (
        el instanceof SVGElement ||
        el.closest('[aria-hidden="true"],.arena,.ng-confetti,.ng-sweep,.ng-sr')
      )
        continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.display === 'inline' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue; // visually hidden native radios
      const name = `${el.tagName.toLowerCase()}.${el.className.toString().split(' ')[0]} "${(el.textContent ?? '').trim().slice(0, 20)}"`;
      if (el.scrollWidth > el.clientWidth + 1 && !['auto', 'scroll'].includes(cs.overflowX)) {
        out.push(`${name} content ${el.scrollWidth}px > box ${el.clientWidth}px`);
      }
      if (r.left < -1 || r.right > vw + 1)
        out.push(
          `${name} outside viewport (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`,
        );
    }
    return out;
  });
}

/** Is the element fully inside the viewport right now, without scrolling? */
export function inViewport(target: Locator): Promise<boolean> {
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return (
      r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth
    );
  });
}
