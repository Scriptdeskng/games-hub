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

/**
 * The `start` events the portal received. They must never carry the game seed: the seed fixes
 * every shuffle and roll, so anyone who sees it can recompute the hidden cards.
 */
export const startPayloads = (page: Page): Promise<unknown[]> =>
  page.evaluate(() =>
    window
      .__naijaTest!.events()
      .filter((e) => e.type === 'start')
      .map((e) => e.data),
  );

export async function expectNoSeedInStart(page: Page): Promise<void> {
  const starts = await startPayloads(page);
  expect(starts.length).toBeGreaterThan(0);
  for (const data of starts) {
    expect(JSON.stringify(data ?? {}).toLowerCase()).not.toContain('seed');
  }
}

/** Wait for every finite animation (deal, entrance) to end: geometry is then the resting layout. */
export const settled = (page: Page): Promise<unknown> =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );

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
 * viewport horizontally. Decorative layers (aria-hidden, confetti, the play arena) are skipped
 * unless `include` (a CSS selector) names elements that must be checked anyway; `skip` (a CSS
 * selector) removes a whole subtree from the check.
 */
export async function layoutProblems(
  page: Page,
  opts: { include?: string; skip?: string } = {},
): Promise<string[]> {
  // let entrance animations (title slam, toasts) finish: measure the settled layout
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  return page.evaluate(
    ({ include, skip }) => {
      const vw = window.innerWidth;
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        // `skip`: a game-board layer whose art overflows its cell on purpose (rings, 44 px targets);
        // the game checks that layer with its own geometry tests
        if (skip && el.closest(skip)) continue;
        // `include` names elements that are checked even inside an aria-hidden layer (board labels)
        const forced = include ? el.matches(include) : false;
        if (
          !forced &&
          (el instanceof SVGElement ||
            el.closest('[aria-hidden="true"],.arena,.ng-confetti,.ng-sweep,.ng-sr'))
        )
          continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.display === 'inline' || cs.visibility === 'hidden')
          continue;
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
    },
    { include: opts.include, skip: opts.skip },
  );
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

/**
 * Results screens: no stat tile may sit under the sticky action bar (QA SL-01: on a short
 * landscape phone the bar used to hide tiles). Measured at the current scroll position.
 */
export function stickyOverlaps(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bar = document.querySelector('.ng-sticky-actions');
    if (!bar) return [];
    const b = bar.getBoundingClientRect();
    const out: string[] = [];
    for (const t of document.querySelectorAll('.ng-stat')) {
      const r = t.getBoundingClientRect();
      const x = Math.min(r.right, b.right) - Math.max(r.left, b.left);
      const y = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
      if (x > 1 && y > 1)
        out.push(`"${(t.textContent ?? '').trim().slice(0, 18)}" is under the action bar`);
    }
    return out;
  });
}

/** WCAG contrast ratio of an element's text colour on its own background colour. */
export function contrastOf(target: Locator): Promise<number> {
  return target.evaluate((el) => {
    const rgb = (c: string): number[] => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const lum = ([r, g, b]: number[]): number => {
      const f = (v: number): number => {
        const c = (v ?? 0) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
    };
    const cs = getComputedStyle(el);
    const a = lum(rgb(cs.color));
    const b = lum(rgb(cs.backgroundColor));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}
