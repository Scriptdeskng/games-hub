import '@naija/core/ui-kit';
import '@naija/core/ai-kit';
import '../assets/words-art.css';
import './style.css';
import { boot } from '@naija/core/boot';
import { imageTask, runLoader } from '@naija/core/loader';
import { gameConfig } from '../game.config';
import { createApp } from './app';
import { wordsSfx } from './audio/sfx';
import { PACK_IDS } from './content';
import en from './i18n/en.json';
import pcm from './i18n/pcm.json';
import { emptyProgress, sanitizeDaily, sanitizeProgress } from './rules';

const root = document.getElementById('app') as HTMLElement;
const core = boot({ slug: gameConfig.slug, root, locales: { en, pcm } });
// core's own cues (tap, select, back, ...) are already in the engine; the words cues are added on top
core.audio.registerSfx(wordsSfx);
root.classList.add(gameConfig.theme);

/** Art needed on the first screens, preloaded behind the loader. */
const PRELOAD = ['./assets/icon/menu-mark.svg'];

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
          progress = sanitizeProgress(await core.portal.loadProgress(emptyProgress()), PACK_IDS);
        },
      },
    ],
  });
  await loader.done;

  // today's scored attempt lives on this device only (core storage), under a date, never a user id
  const daily = sanitizeDaily(core.storage.get('daily', null));
  const app = createApp(core, progress, daily);
  if (__NAIJA_TEST__ && app.test) {
    const api = app.test;
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
