#!/usr/bin/env node
// Generates the original SVG art for Penalty King (asset-designer, in-repo). No <text>, no <image>, no external refs.
// Output: games/penalty-king/assets/{scene,goal,ball,keeper,striker,hud,banners,scoreboard,cup,teams,fx,avatars,icon,thumb,audio}.
// ART_OUT overrides the folder.
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEAMS, KEEPER, KEEPER_SKINS, svg, inner, kitIcon, f1 } from './penalty-king-common.mjs';
import { figure, sheet } from './penalty-king-figures.mjs';
import { KEEPER_POSES, KEEPER_ORDER, STRIKER_POSES, STRIKER_ORDER } from './penalty-king-poses.mjs';
import { scene, GEO } from './penalty-king-scenes.mjs';
import * as PR from './penalty-king-props.mjs';
import { HUD, BANNERS, PLATES, scoreboard, bracket, SB, BR } from './penalty-king-hud.mjs';
import { crest, CREST_IDS, menuMark } from './penalty-king-crests.mjs';
import { AVATARS, VOICE } from './penalty-king-people.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.ART_OUT ?? join(ROOT, 'games', 'penalty-king', 'assets');
const w = (p, s) => {
  mkdirSync(dirname(join(OUT, p)), { recursive: true });
  writeFileSync(join(OUT, p), s);
};
export { VOICE, PLATES };

const geometry = () => {
  const o = {
    _readme:
      'Scene geometry in scene units. scale(y) = (y - horizon) / (goalLine - horizon). Sprite cells are 128 x 128, anchor = bottom centre (64, 120). Goal sprite 240 x 96 has its 180-wide opening at x 30..210, y 20..80; scale the goal sprite by goalW / 180 and place its opening bottom on goalLine.',
    keeperSheet: { cell: 128, cols: 3, order: KEEPER_ORDER },
    strikerSheet: { cell: 128, cols: 3, order: STRIKER_ORDER },
    ball: {
      sizeAtGoal: 5.4,
      note: 'ball sprite 64 px: draw at 5.4 * scale(y) * (goalW / 180) px diameter',
    },
    scoreboard: SB,
    bracket: { ...BR, order: TEAMS.map((t) => t.id) },
    teams: TEAMS.map(({ id, name, short, shirt, trim, shorts, pattern, skin }) => ({
      id,
      name,
      short,
      shirt,
      trim,
      shorts,
      pattern,
      skin,
    })),
  };
  for (const [k, g] of Object.entries(GEO)) {
    o[k] = {
      ...g,
      goalH: f1(g.goalW / 3),
      goalSpriteScale: f1(g.goalW / 180),
      goalSpriteOrigin: [
        f1(g.W / 2 - 120 * (g.goalW / 180)),
        f1(g.goalLine - 80 * (g.goalW / 180)),
      ],
      keeperScaleAtGoal: 0.46 * (g.goalW / 180),
      unitsPerMetre: f1(g.goalW / 7.32),
    };
  }
  return JSON.stringify(o, null, 2) + '\n';
};

const place = (inside, x, y, s) =>
  `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">${inside}</g>`;
/** Hero thumb: stadium scene, goal, a keeper in a high dive, and the ball arriving. */
const thumb = (W, H) => {
  const orient = W >= H ? 'landscape' : 'portrait',
    g = GEO[orient],
    k = Math.max(W / g.W, H / g.H),
    ox = (W - g.W * k) / 2,
    oy = orient === 'portrait' ? -40 * k : (H - g.H * k) / 2;
  const gs = (g.goalW / 180) * k,
    gx = ox + (g.W / 2 - 120 * (g.goalW / 180)) * k,
    gy = oy + (g.goalLine - 80 * (g.goalW / 180)) * k;
  const kp = figure(KEEPER_POSES['dive-high-l'], {
    kit: KEEPER,
    skin: KEEPER_SKINS.mid,
    view: 'front',
    sleeves: 'long',
    gloves: true,
    hair: 'low',
    uid: 'th',
  });
  const ks = 0.9 * gs * 1.2;
  return svg(
    `0 0 ${W} ${H}`,
    place(inner(scene('stadium', orient)), ox, oy, k) +
      place(inner(PR.goalBack()), gx, gy, gs) +
      place(kp, gx + (120 - 64 * 1.0) * gs - 10, gy + (80 - 120) * gs * 1.0 - 4, ks * 0.9) +
      place(inner(PR.goalFront(false)), gx, gy, gs) +
      place(inner(PR.ball()), W / 2 - 24 * k, oy + (g.spot[1] - 40) * k, 0.75 * k) +
      place(inner(PR.goalRibbons()), W - 230 * k * 0.8, 20 * k, 0.9 * k),
    ` width="${W}" height="${H}"`,
  );
};

export const build = () => {
  for (const v of ['community', 'stadium'])
    for (const o of ['portrait', 'landscape']) w(`scene/${v}-${o}.svg`, scene(v, o));
  w('scene/crowd-cheer.svg', PR.crowdCheer());
  w('goal/goal-back.svg', PR.goalBack());
  w('goal/goal-front.svg', PR.goalFront(false));
  w('goal/goal-front-wood.svg', PR.goalFront(true));
  w('ball/ball.svg', PR.ball());
  w('ball/ball-shadow.svg', PR.ballShadow());
  for (const [id, skin] of Object.entries(KEEPER_SKINS))
    w(
      `keeper/keeper-${id}.svg`,
      sheet(KEEPER_ORDER, KEEPER_POSES, {
        id: `k${id[0]}`,
        kit: KEEPER,
        skin,
        view: 'front',
        sleeves: 'long',
        gloves: true,
        hair: 'low',
      }),
    );
  for (const t of TEAMS) {
    w(
      `striker/striker-${t.id}.svg`,
      sheet(STRIKER_ORDER, STRIKER_POSES, {
        id: `s${t.id[0]}`,
        kit: t,
        skin: t.skin,
        view: 'back',
        sleeves: 'short',
        gloves: false,
        hair: t.hair,
      }),
    );
    w(`teams/kit-${t.id}.svg`, kitIcon(t, t.id[0]));
  }
  for (const id of CREST_IDS) w(`teams/crest-${id}.svg`, crest(id));
  for (const [k, fn] of Object.entries(HUD)) w(`hud/${k}.svg`, fn());
  for (const [k, fn] of Object.entries(BANNERS)) w(`banners/${k}.svg`, fn());
  w('scoreboard/board-frame.svg', scoreboard());
  w('cup/bracket-8.svg', bracket());
  w('cup/trophy.svg', PR.trophy());
  w('fx/net-bulge.svg', PR.netBulge());
  w('fx/goal-ribbons.svg', PR.goalRibbons());
  w('fx/save-ring.svg', PR.saveRing());
  w('fx/post-clang.svg', PR.postClang());
  w('fx/dust.svg', PR.dust());
  w('fx/floodlight-glow.svg', PR.floodGlow());
  w('icon/menu-mark.svg', menuMark());
  for (const [id, fn] of Object.entries(AVATARS)) w(`avatars/${id}.svg`, fn());
  w('thumb/thumb-512x512.svg', thumb(512, 512));
  w('thumb/thumb-1024x500.svg', thumb(1024, 500));
  w('geometry.json', geometry());

  // silent audio placeholders (copied from the Ludo ones; awaiting composer and voice actor)
  const SRC = join(ROOT, 'games', 'naija-ludo', 'assets', 'audio');
  const cp = (from, to) => {
    if (existsSync(from)) {
      mkdirSync(dirname(join(OUT, to)), { recursive: true });
      copyFileSync(from, join(OUT, to));
    }
  };
  for (const m of ['penalty-menu-chant', 'penalty-play-chant'])
    cp(join(SRC, 'music', 'ludo-menu-highlife.mp3'), `audio/music/${m}.mp3`);
  for (const v of VOICE) cp(join(SRC, 'voice', 'vo-ld-six.mp3'), `audio/voice/vo-${v.id}.mp3`);
  w(
    'audio/voice-manifest.json',
    JSON.stringify(
      {
        _readme:
          'Penalty King voice placeholders (silent mp3, ogg null until human delivery). Speaker: the pitch commentator (invented generic voice, no real commentator). Shared lines (goal, saved, ready-go, chai, madalla, e-ku-ise, you-don-win, e-don-do) live in packages/core/assets/audio/voice-manifest.json.',
        lines: VOICE.map((v) => ({
          id: v.id,
          speaker: 'commentator',
          text: { pcm: v.pcm, en: v.en },
          files: { mp3: `voice/vo-${v.id}.mp3`, ogg: null },
          emotion: v.note,
          usedFor: v.used,
          status: 'placeholder-silent-mp3',
          needsNativeReview: true,
          _review: true,
        })),
      },
      null,
      2,
    ) + '\n',
  );
  // ship.json: only what the game code loads by name (view/sprites.ts and main.ts). The striker sheets are named at run time.
  w(
    'ship.json',
    JSON.stringify(
      {
        include: [
          'icon/menu-mark.svg',
          'avatars/ozavize.svg',
          'avatars/ndako.svg',
          'avatars/hamman.svg',
          'goal/goal-back.svg',
          'goal/goal-front.svg',
          'goal/goal-front-wood.svg',
          'ball/ball.svg',
          'ball/ball-shadow.svg',
          'keeper/keeper-dark.svg',
          'keeper/keeper-mid.svg',
          'keeper/keeper-light.svg',
          'striker/striker-*.svg',
        ],
        dynamic: ['striker/striker-*.svg'],
        keep: [],
      },
      null,
      2,
    ) + '\n',
  );
};
if (process.argv[1] === fileURLToPath(import.meta.url)) build();
