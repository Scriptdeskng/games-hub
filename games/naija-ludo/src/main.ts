import '@naija/core/ui-kit';
import '@naija/core/board-kit';
import '@naija/core/ai-kit';
import './style.css';
import { boot } from '@naija/core/boot';
import { imageTask, runLoader } from '@naija/core/loader';
import { createLoop } from '@naija/core/loop';
import { gameConfig } from '../game.config';
import { createApp } from './app';
import { ludoSfx } from './audio/sfx';
import en from './i18n/en.json';
import pcm from './i18n/pcm.json';
import { emptyProgress, sanitizeProgress } from './rules';

const root = document.getElementById('app') as HTMLElement;
const core = boot({ slug: gameConfig.slug, root, locales: { en, pcm } });
core.audio.registerSfx(ludoSfx);
root.classList.add(gameConfig.theme);

/** Art needed on the first screens and for the first roll, preloaded behind the loader. */
const PRELOAD = [
  './assets/board/board.svg',
  './assets/seeds/seed-red.svg',
  './assets/seeds/seed-green.svg',
  './assets/dice/die-roll.svg',
];

async function main(): Promise<void> {
  let progress = emptyProgress();
  const loader = runLoader({
    root,
    t: core.t,
    scope: core.scope,
    tasks: [
      ...PRELOAD.map((u) => imageTask(u)),
      {
        run: async () => {
          progress = sanitizeProgress(await core.portal.loadProgress(emptyProgress()));
        },
      },
    ],
  });
  await loader.done;

  const app = createApp(core, progress);
  if (__NAIJA_TEST__ && app.test) {
    const api = app.test;
    // this game has no frame loop of its own: a no-op loop feeds perf() so the hook reports real fps
    const frames = createLoop({ update: () => undefined, perf: core.perf });
    frames.start();
    core.scope.add(() => frames.destroy());
    core.exposeTestHook({
      autoplay: (opts) => api.autoplay(opts),
      getState: () => api.getState(),
      setSeed: (n) => api.setSeed(n),
      screen: () => api.screen,
      destroy: () => {
        app.destroy();
        core.destroy();
      },
    });
  }
  app.showMenu();
  core.portal.emit('ready', { version: gameConfig.version });
}

main().catch(() => core.portal.emit('error', { message: 'boot failed' }));
