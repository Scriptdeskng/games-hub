import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEAM_IDS } from '../rules/teams';
import { BRACKET } from './bracket-layout';
import { KEEPER_URLS, URLS, strikerUrl } from './sprites';
import { KEEPER_OF, SHIRT, youKeeper } from './theme';

const ASSETS = join(__dirname, '../../assets');
const read = (f: string): string => readFileSync(join(ASSETS, f), 'utf8');
const geometry = JSON.parse(read('geometry.json')) as {
  bracket: {
    w: number;
    h: number;
    slotW: number;
    slotH: number;
    cols: number[];
    r1: number[];
    r2: number[];
    r3: number[];
    winnerX: number;
  };
  teams: { id: string; shirt: string }[];
};
const ship = JSON.parse(read('ship.json')) as { include: string[]; dynamic: string[] };
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) =>
    statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)],
  );

describe('assets the code loads', () => {
  const urls = [...Object.values(URLS), ...Object.values(KEEPER_URLS), ...TEAM_IDS.map(strikerUrl)];

  it('every sprite URL exists on disk and is in ship.json', () => {
    for (const u of urls) {
      const rel = u.replace('./assets/', '');
      expect(existsSync(join(ASSETS, rel)), rel).toBe(true);
      const shipped = ship.include.some((g) =>
        g.includes('*')
          ? new RegExp(`^${g.replace(/[.]/g, '\\.').replace(/\*/g, '[^/]*')}$`).test(rel)
          : g === rel,
      );
      expect(shipped, `${rel} is in ship.json`).toBe(true);
    }
  });

  it('ship.json lists only files that exist, and the scaffold agogo is gone', () => {
    for (const g of ship.include)
      if (!g.includes('*')) expect(existsSync(join(ASSETS, g)), g).toBe(true);
    expect(existsSync(join(ASSETS, 'agogo.svg'))).toBe(false);
    expect(ship.include.join()).not.toContain('agogo');
    expect(ship.dynamic).toEqual(['striker/striker-*.svg']);
  });

  it('keeper skins: each rival has one, the player never has the same', () => {
    expect(new Set(Object.values(KEEPER_OF)).size).toBe(3);
    for (const id of Object.keys(KEEPER_OF))
      expect(youKeeper(KEEPER_OF[id]!)).not.toBe(KEEPER_OF[id]);
  });

  it('fallback shirt colours match the asset geometry', () => {
    for (const t of geometry.teams) expect(SHIRT[t.id as keyof typeof SHIRT]).toBe(t.shirt);
  });
});

describe('bracket layout matches assets/geometry.json', () => {
  it('sizes, columns, rows and the winner well', () => {
    const g = geometry.bracket;
    expect(BRACKET).toMatchObject({ w: g.w, h: g.h, slotW: g.slotW, slotH: g.slotH });
    expect([...BRACKET.cols]).toEqual(g.cols);
    expect([...BRACKET.rows[0]]).toEqual(g.r1);
    expect([...BRACKET.rows[1]]).toEqual(g.r2);
    expect([...BRACKET.rows[2]]).toEqual(g.r3);
    expect(BRACKET.well.x).toBe(g.winnerX);
  });
});

/** the bodies of every @keyframes block (balanced braces) */
const keyframes = (text: string): string[] => {
  const out: string[] = [];
  for (const m of text.matchAll(/@keyframes\s+[\w-]+\s*\{/g)) {
    let depth = 1;
    let i = (m.index ?? 0) + m[0].length;
    const start = i;
    while (depth > 0 && i < text.length)
      depth += text[i++] === '{' ? 1 : text[i - 1] === '}' ? -1 : 0;
    out.push(text.slice(start, i));
  }
  return out;
};

describe('art hooks and the stylesheet', () => {
  const css =
    ['penalty-art.css', 'penalty-art-hud.css', 'penalty-art-fx.css'].map(read).join('\n') +
    readFileSync(join(__dirname, '../style.css'), 'utf8');
  const src = walk(join(__dirname, '..'))
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

  it('every pk- class the code builds has a rule in the art or game CSS (no typos)', () => {
    const used = new Set(
      [...src.matchAll(/['"`\s]((?:pk-[a-z]+)(?:__[a-z]+)?(?:--[a-z]+)?)['"`\s]/g)].map(
        (m) => m[1]!,
      ),
    );
    const missing = [...used].filter(
      (c) => !css.includes(`.${c}`) && !['pk-venue', 'pk-venue--stadium', 'pk-hudwrap'].includes(c),
    );
    expect(missing).toEqual([]);
  });

  it('dive buttons are 44 px or more, and the art keeps motion to transform and opacity', () => {
    expect(css).toMatch(/\.pk-dive__zone\s*\{[^}]*min-height:\s*44px/);
    for (const body of keyframes(css))
      expect(body).not.toMatch(/\b(top|left|right|bottom|width|height|margin|padding)\s*:/);
  });

  it('the main stylesheet is imported by main.ts along with the art', () => {
    const main = readFileSync(join(__dirname, '../main.ts'), 'utf8');
    expect(main).toContain("'../assets/penalty-art.css'");
    expect(main).toContain('theme');
    expect(readFileSync(join(__dirname, '../../game.config.ts'), 'utf8')).toContain(
      'theme-naija-green',
    );
  });
});
