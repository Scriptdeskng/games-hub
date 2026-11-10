import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { leakCounters } from '@naija/core/lifecycle';
import { createApp, type App } from './app';
import { emptyProgress } from './rules';
import { makeCore, stubCanvas } from './test-utils';

const geometry = JSON.parse(readFileSync(join(__dirname, '../assets/geometry.json'), 'utf8')) as {
  bracket: Record<string, unknown>;
};

describe('the app (jsdom)', () => {
  beforeEach(() => stubCanvas());
  afterEach(() => vi.useRealTimers());

  const setup = (search = '') => {
    const { core, root } = makeCore(search);
    const base = leakCounters();
    const app: App = createApp(core, emptyProgress());
    const test = app.test!;
    app.showMenu();
    const types = (): string[] => core.portal.log.map((e) => e.type);
    return { core, root, app, test, base, types };
  };
  const click = (root: HTMLElement, sel: string): void =>
    (root.querySelector(sel) as HTMLElement).click();

  it('shows the menu with the three modes, the three rivals and a way to stats and how-to', () => {
    const { root, test } = setup();
    expect(test.screen).toBe('menu');
    expect(root.querySelector('h1')?.textContent).toBe('Penalty King');
    expect([...root.querySelectorAll('.ng-seg')].map((g) => g.getAttribute('aria-label'))).toEqual([
      'Mode',
      'Difficulty',
    ]);
    expect(
      [...root.querySelectorAll('.ng-seg input')].map((i) => (i as HTMLInputElement).value),
    ).toEqual(['cup', 'quick', 'practice', 'easy', 'medium', 'hard']);
    expect(root.querySelector('.pk-rival')?.textContent).toContain('Ndako');
    for (const id of ['#menu-play', '#menu-howto', '#menu-stats'])
      expect(root.querySelector(id)).not.toBeNull();
  });

  it('choosing a level shows that rival, with the avatar and the line about them; the choice is saved', () => {
    const { root, core } = setup();
    for (const [value, name, face] of [
      ['easy', 'Ozavize', 'ozavize'],
      ['hard', 'Hamman', 'hamman'],
    ] as const) {
      const input = root.querySelector(`input[value="${value}"]`) as HTMLInputElement;
      input.checked = true;
      input.dispatchEvent(new Event('change'));
      expect(root.querySelector('.pk-rival')?.textContent).toContain(name);
      expect(root.querySelector('.pk-rival__face')?.getAttribute('src')).toBe(
        `./assets/avatars/${face}.svg`,
      );
    }
    expect(core.storage.get('progress', null)).toMatchObject({ lastDifficulty: 'hard' });
  });

  it('how-to and stats open and close; stats read from the saved progress', () => {
    const { root, test } = setup();
    click(root, '#menu-howto');
    expect(test.screen).toBe('howto');
    expect(root.querySelectorAll('.ng-howto__step')).toHaveLength(6);
    click(root, '.ng-sticky-actions button');
    expect(test.screen).toBe('menu');
    click(root, '#menu-stats');
    expect(test.screen).toBe('stats');
    expect(root.querySelectorAll('.ng-stat')).toHaveLength(8);
    (root.querySelector('.pk-actions button') as HTMLElement).click();
    expect(test.screen).toBe('menu');
  });

  it('a quick match won: results with the rival line, portal events in order, and no seed or token anywhere', async () => {
    const { test, root, types, core } = setup('?token=tok_secret_1&lang=en');
    test.setSeed(11);
    const s = await test.autoplay({ mode: 'quick', difficulty: 'easy', win: true });
    expect(s!.winner).toBe(0);
    expect(test.screen).toBe('results');
    expect(root.querySelector('.ng-results--win')).not.toBeNull();
    expect(root.querySelector('.ng-banter')?.textContent).toContain('Ozavize');
    expect(root.querySelectorAll('.ng-stat').length).toBe(6);
    expect(types()).toEqual(['start', 'level_complete', 'end']);
    const payload = JSON.stringify(core.portal.log);
    expect(payload.toLowerCase()).not.toContain('seed');
    expect(payload).not.toContain('tok_secret');
    expect(core.portal.log[0]!.data).toEqual({ level: 'easy', mode: 'quick' });
  });

  it('a quick match lost: no level_complete, end says won false, the streak resets, replay starts a new match', async () => {
    const { test, root, types, core } = setup();
    test.setSeed(3);
    await test.autoplay({ mode: 'quick', difficulty: 'hard', win: false });
    expect(test.screen).toBe('results');
    expect(root.querySelector('.ng-results--lose')).not.toBeNull();
    expect(types()).toEqual(['start', 'end']);
    expect(core.portal.log[1]!.data).toMatchObject({ won: false, level: 'hard', mode: 'quick' });
    click(root, '.ng-results__actions button');
    expect(test.screen).toBe('play');
    expect(types().filter((t) => t === 'start')).toHaveLength(2);
  });

  it('the cup: three wins make the player champion, with a level_complete and an end for every round', async () => {
    const { test, root, types, core } = setup();
    test.setSeed(21);
    await test.autoplay({ mode: 'cup', difficulty: 'easy', win: true });
    expect(test.screen).toBe('cup');
    expect(types()).toEqual([
      'start',
      'level_complete',
      'end',
      'start',
      'level_complete',
      'end',
      'start',
      'level_complete',
      'end',
    ]);
    const ends = core.portal.log
      .filter((e) => e.type === 'end')
      .map((e) => e.data as Record<string, unknown>);
    expect(ends.map((e) => e.round)).toEqual(['qf', 'sf', 'final']);
    expect(ends.map((e) => e.cup)).toEqual(['next', 'next', 'won']);
    expect(
      root.querySelector('.pk-cupline:nth-of-type(2)')?.textContent ?? root.textContent,
    ).toContain('Champions');
    expect(root.querySelector('.pk-trophy')?.hasAttribute('data-won')).toBe(true);
    expect(
      (test.getState() as { progress: { cupsWon: number; bestRun: number; cups: number } })
        .progress,
    ).toMatchObject({ cups: 1, cupsWon: 1, bestRun: 3 });
    expect(root.querySelectorAll('.pk-bslot.is-you').length).toBeGreaterThan(0);
  });

  it('a cup lost in the first round ends the run; the button starts a fresh cup', async () => {
    const { test, root } = setup();
    test.setSeed(8);
    await test.autoplay({ mode: 'cup', difficulty: 'hard', win: false });
    expect(test.screen).toBe('cup');
    expect(root.textContent).toContain('Knocked out in the Quarter-final');
    expect(root.querySelector('.pk-bslot.is-out')).not.toBeNull();
    expect(
      (test.getState() as { progress: { cups: number; cupsWon: number } }).progress,
    ).toMatchObject({ cups: 1, cupsWon: 0 });
    (root.querySelector('.pk-actions button') as HTMLElement).click();
    expect(test.screen).toBe('cup');
    expect(root.textContent).toContain('Quarter-final');
    expect((test.getState() as { cup: { stage: number } }).cup.stage).toBe(0);
  });

  it('the cup bracket screen has 14 slots with a badge class each, a trophy and crest names', async () => {
    const { test, root } = setup();
    test.setSeed(2);
    await test.autoplay({ mode: 'cup', difficulty: 'easy', win: true });
    expect(root.querySelectorAll('.pk-bslot')).toHaveLength(14);
    for (const s of root.querySelectorAll('.pk-bslot'))
      expect(s.getAttribute('aria-label')).toMatch(/: |To be decided/);
    expect(Object.keys(geometry.bracket)).toContain('slotW');
  });

  it('practice reports start and end only, never a score, and records nothing', async () => {
    const { test, root, types, core } = setup();
    await test.autoplay({ mode: 'practice' });
    expect(test.screen).toBe('play');
    expect(root.querySelector('.is-practice')).not.toBeNull();
    (root.querySelector('.pk-bar .ng-btn--secondary') as HTMLElement).click();
    expect(test.screen).toBe('menu');
    expect(types()).toEqual(['start', 'end']);
    expect(core.portal.log[1]!.data).toEqual({ practice: true, level: 'medium', mode: 'practice' });
    expect((test.getState() as { progress: { plays: number } }).progress.plays).toBe(0);
  });

  it('leaving a match early ends it for the portal (quit) without counting it', async () => {
    const { test, app, types, core } = setup();
    test.setSeed(5);
    void test.autoplay({ mode: 'quick', realtime: true, difficulty: 'easy' });
    expect(test.screen).toBe('play');
    app.showMenu();
    expect(types()).toEqual(['start', 'end']);
    expect(core.portal.log[1]!.data).toMatchObject({ won: false, quit: true, mode: 'quick' });
    expect((test.getState() as { progress: { plays: number } }).progress.plays).toBe(0);
  });

  it('switching to Pidgin redraws the menu in Pidgin and keeps the choices', () => {
    const { core, root } = setup();
    core.i18n.setLang('pcm');
    expect(root.querySelector('.pk-help')?.textContent).toContain('Carry Lagoon Lanterns');
    expect(root.querySelector('.pk-rival')?.textContent).toContain('Your rival na Ndako');
    expect((root.querySelector('input[value="cup"]') as HTMLInputElement).checked).toBe(true);
  });

  it('the quick-match rival team is seeded: the same seed gives the same opponent, other seeds vary', async () => {
    const rival = async (seed: number): Promise<string> => {
      const { test } = setup();
      test.setSeed(seed);
      await test.autoplay({ mode: 'quick', win: true });
      return (test.getState() as { match: { opp: string } }).match.opp;
    };
    expect(await rival(77)).toBe(await rival(77));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) seen.add(await rival(seed));
    expect(seen.size).toBeGreaterThan(2);
    expect(seen.has('lanterns')).toBe(false);
  });

  it('destroy leaves no listener, timer or frame behind', async () => {
    const { app, test, base } = setup();
    test.setSeed(4);
    await test.autoplay({ mode: 'quick', win: true });
    app.destroy();
    expect(leakCounters()).toEqual(base);
  });
});
