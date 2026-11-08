import '@naija/core/ui-kit';
import '@naija/core/board-kit';
import '@naija/core/ai-kit';
import '../assets/whot-art.css';
import './screens.css';
import './style.css';
import { boot } from '@naija/core/boot';
import { runLoader } from '@naija/core/loader';
import { createLoop } from '@naija/core/loop';
import { gameConfig } from '../game.config';
import { createApp } from './app';
import { whotSfx } from './audio/sfx';
import en from './i18n/en.json';
import pcm from './i18n/pcm.json';
import { emptyProgress, sanitizeProgress } from './rules';
import { mountSprite } from './view/cards';

const root = document.getElementById('app') as HTMLElement;
const core = boot({ slug: gameConfig.slug, root, locales: { en, pcm } });
// core cues (tap, select, back, turn, win, lose ...) are registered by default; add the card cues
core.audio.registerSfx(whotSfx);
root.classList.add(gameConfig.theme);
// the 54-card sprite goes into the page once; every card is a <use> of it
core.scope.add(mountSprite());

async function main(): Promise<void> {
  let progress = emptyProgress();
  const loader = runLoader({
    root,
    t: core.t,
    scope: core.scope,
    tasks: [
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
