import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/** Production-build smoke test of dist-hub/ (run `npm run build:hub` first, then `npm run e2e:hub`). */
const root = process.cwd();
const slugs: string[] = JSON.parse(fs.readFileSync(path.join(root, 'games/registry.json'), 'utf8'))
  .games.filter((g: { deploy: boolean }) => g.deploy)
  .map((g: { slug: string }) => g.slug);

test.beforeAll(() => {
  if (!fs.existsSync(path.join(root, 'dist-hub/index.html'))) {
    throw new Error('dist-hub/ not found: run `npm run build:hub` first');
  }
});

function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => {
    if (r.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`requestfailed: ${r.url()}`);
  });
  return errors;
}

const swScope = (page: Page): Promise<string> =>
  page.evaluate(async () => (await navigator.serviceWorker.ready).scope);

test.describe('hub page', () => {
  test('renders one card per game, no console errors, no overflow at 360x640', async ({ page }) => {
    const errors = watch(page);
    await page.goto('/');
    await expect(page.locator('.card')).toHaveCount(slugs.length);
    for (const c of await page.locator('.card').all()) {
      await expect(c.locator('.thumb')).toHaveAttribute('alt', /cover art$/);
      await expect(c.locator('.name')).not.toBeEmpty();
      await expect(c.locator('.desc')).not.toBeEmpty();
      await expect(c.locator('.cat')).not.toBeEmpty();
    }
    await expect(page.locator('h1')).toHaveText('Naija Games');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // every thumbnail actually decoded
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
    // tap targets >= 44 px
    for (const el of await page.locator('.play, .lang button').all()) {
      const box = (await el.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    expect(errors).toEqual([]);
  });

  test('every Play link resolves to a game page', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('.play')
      .evaluateAll((a) => a.map((x) => (x as HTMLAnchorElement).pathname));
    expect(hrefs).toEqual(slugs.map((s) => `/${s}/`));
    for (const h of hrefs) {
      const res = await request.get(h);
      expect(res.status(), h).toBe(200);
      expect(await res.text()).toContain('<div id="app">');
    }
    expect((await request.get('/no-such-game/')).status()).toBe(404);
  });

  test('language toggle switches to Pidgin, persists, and is keyboard operable', async ({
    page,
  }) => {
    await page.goto('/');
    const first = page.locator('.card').first();
    await expect(first.locator('.play')).toHaveText('Play');
    await page.getByRole('button', { name: 'Pidgin' }).focus();
    await page.keyboard.press('Enter');
    await expect(first.locator('.play')).toHaveText('Play am');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pcm');
    await expect(page.getByRole('button', { name: 'Pidgin' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(first.locator('.desc')).toContainText('Enter BRT');
    await expect(first.locator('.play')).toHaveAttribute('href', './snakes-ladders/?lang=pcm');
    await page.reload();
    await expect(first.locator('.play')).toHaveText('Play am');
    await page.getByRole('button', { name: 'English' }).click();
    await expect(first.locator('.play')).toHaveText('Play');
    await expect(first.locator('.thumb')).toHaveAttribute('alt', /cover art$/);
  });

  test('unknown path serves the hub 404 page', async ({ page }) => {
    const res = await page.goto('/nope/');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('link', { name: 'Back to games' })).toBeVisible();
  });
});

test.describe('games opened directly from the hub (production build, no portal)', () => {
  for (const slug of slugs) {
    test(`${slug}: loads clean, own SW scope, no test hook, local storage only`, async ({
      page,
    }) => {
      const errors = watch(page);
      const origins = new Set<string>();
      page.on('request', (r) => origins.add(new URL(r.url()).origin));
      const res = await page.goto(`/${slug}/`);
      expect(res?.status()).toBe(200);
      expect(res?.headers()['content-security-policy']).toContain(
        "frame-ancestors 'self' https://m.gamesplash.com.ng",
      );
      expect(await swScope(page)).toBe(`${new URL(page.url()).origin}/${slug}/`);
      await expect(page.locator('#app > *').first()).toBeAttached();
      expect(await page.evaluate(() => '__naijaTest' in window)).toBe(false);
      // a button anywhere in the first screen proves the UI mounted (no blank page)
      await expect(page.locator('#app button').first()).toBeVisible();
      expect([...origins]).toEqual([new URL(page.url()).origin]);
      // anything the game stored is namespaced and holds no token
      const keys = await page.evaluate(() => Object.keys(localStorage));
      for (const k of keys) expect(k).toMatch(new RegExp(`^naija:`));
      expect(errors).toEqual([]);
    });
  }

  test('a game opened with a token but no ?portal stays local: settings persist, no API calls', async ({
    page,
  }) => {
    const api: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/') || new URL(r.url()).origin !== 'http://localhost:4190') {
        api.push(`${r.method()} ${r.url()}`);
      }
    });
    await page.goto('/sabi-words/?token=abc123');
    await page.getByRole('button', { name: 'Sound: on' }).click();
    await expect(page.getByRole('button', { name: 'Sound: off' })).toBeVisible();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).toContain('naija:sabi-words:');
    expect(stored).not.toContain('abc123');
    await page.goto('/sabi-words/'); // fresh load, no params: the choice is read back from this phone
    await expect(page.getByRole('button', { name: 'Sound: off' })).toBeVisible();
    expect(api).toEqual([]);
  });

  test('pack JSON loads from /<slug>/assets/packs/ with revalidating cache headers', async ({
    request,
  }) => {
    for (const [slug, file] of [
      ['sabi-quiz', 'sabi-core-en.json'],
      ['sabi-words', 'naija-food.json'],
    ]) {
      const res = await request.get(`/${slug}/assets/packs/${file}`);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('application/json');
      expect(res.headers()['cache-control']).toContain('must-revalidate');
      expect(Array.isArray((await res.json()).entries ?? (await res.json()).questions ?? [1])).toBe(
        true,
      );
    }
  });
});

test.describe('offline after first load', () => {
  test('hub reloads offline with a root-scoped worker that leaves games alone', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    expect(await swScope(page)).toBe(`${new URL(page.url()).origin}/`);
    await page.reload(); // now controlled by the worker
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.card')).toHaveCount(slugs.length);
    await expect(page.locator('.thumb').first()).toBeVisible();
    expect(
      await page.evaluate(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      ),
    ).toBe(true);
    await context.setOffline(false);
  });

  for (const slug of ['snakes-ladders', 'sabi-quiz']) {
    test(`${slug} reloads offline from its own cache`, async ({ page, context }) => {
      await page.goto(`/${slug}/`);
      await swScope(page);
      await page.reload();
      await context.setOffline(true);
      await page.reload();
      await expect(page.locator('#app button').first()).toBeVisible();
      const names = await page.evaluate(() => caches.keys());
      expect(names.filter((n) => n.startsWith(`naija-${slug}-`))).toHaveLength(1);
      await context.setOffline(false);
    });
  }
});
