import '@naija/core/ui-kit';
import './style.css';
import { boot } from '@naija/core/boot';
import { imageTask, runLoader } from '@naija/core/loader';
import { gameConfig } from '../game.config';
import { createApp } from './app';
import en from './i18n/en.json';
import pcm from './i18n/pcm.json';
import { emptyProgress, sanitizeProgress } from './rules';
import { gameSfx } from './sfx';

const root = document.getElementById('app') as HTMLElement;
const core = boot({ slug: gameConfig.slug, root, locales: { en, pcm } });
core.audio.registerSfx(gameSfx);
root.classList.add(gameConfig.theme);

async function main(): Promise<void> {
  let progress = emptyProgress();
  const loader = runLoader({
    root,
    t: core.t,
    scope: core.scope,
    tasks: [
      imageTask('./assets/agogo.svg'),
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
