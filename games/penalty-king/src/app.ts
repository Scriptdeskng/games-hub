import type { Core } from '@naija/core/boot';
import { createRng, randomSeed } from '@naija/core/rng';
import {
  createResults,
  createScreenHost,
  type Component,
  type Difficulty,
} from '@naija/core/ui-kit';
import { personaFor } from './ai';
import { menuMusic, playMusic } from './audio/music';
import { createTestKit, type TestApi } from './testkit';
import {
  TEAM_IDS,
  YOU,
  advanceCup,
  createCup,
  liveScore,
  nextOpponent,
  recordCup,
  recordResult,
  saves,
  starsFor,
  STAGE_NAMES,
  sweetGoals,
  teamById,
  type Cup,
  type Mode,
  type Progress,
  type Shootout,
  type TeamId,
} from './rules';
import { createPlay, type Play } from './view/play';
import { createCupScreen } from './view/cup-screen';
import { createSounds } from './view/sounds';
import { createHowToScreen, createMenuScreen, createStatsScreen } from './view/screens';
import type { Venue } from './view/stage';

export type { AutoplayOptions, TestApi } from './testkit';

export interface App {
  showMenu(): void;
  destroy(): void;
  /** present only when `__NAIJA_TEST__` is true: production builds carry no test members at all */
  readonly test?: TestApi;
}

/** What the test kit may ask of a match (test builds only). */
export interface MatchExtras {
  seed?: number;
  tempo?: number;
  bot?: import('./ai').HumanBot;
}

export function createApp(core: Core, initial: Progress): App {
  const host = createScreenHost(core.root);
  const { t } = core;
  const sounds = createSounds(core, core.scope);
  let progress = initial;
  let play: Play | null = null;
  let roundOpen = false;
  let mode: Mode = progress.lastMode;
  let difficulty: Difficulty = progress.lastDifficulty;
  let cup: Cup | null = null;
  let current: { mode: Mode; round: string | null; opp: TeamId } | null = null;
  let seedOverride: number | null = null;
  let rerender: (() => void) | null = null;
  let waiters: ((s: Shootout) => void)[] = [];
  /** test builds only: `?tempo=0.25` runs every match four times faster */
  const urlTempo = __NAIJA_TEST__
    ? Number(new URLSearchParams(location.search).get('tempo')) || undefined
    : undefined;

  const save = (next: Progress): void => {
    progress = next;
    void core.portal.saveProgress(progress);
  };
  const nextSeed = (): number => seedOverride ?? randomSeed();
  const show = (id: string, c: Component, again: (() => void) | null): void => {
    rerender = again;
    host.show(id, c);
  };
  core.scope.add(core.i18n.onChange(() => rerender?.()));

  function showMenu(): void {
    abandonRound();
    cup = null;
    core.audio.playMusic(menuMusic);
    show(
      'menu',
      createMenuScreen(core, {
        mode,
        difficulty,
        onMode: (m) => {
          mode = m;
          save({ ...progress, lastMode: m });
        },
        onDifficulty: (d) => {
          difficulty = d;
          save({ ...progress, lastDifficulty: d });
        },
        onPlay: startSelected,
        onHowTo: showHowTo,
        onStats: showStats,
      }),
      showMenu,
    );
  }
  const showHowTo = (): void => show('howto', createHowToScreen(core, showMenu), showHowTo);
  const showStats = (): void =>
    show('stats', createStatsScreen(core, progress, showMenu), showStats);

  function startSelected(): void {
    if (mode === 'cup') startCup();
    else startMatch(mode, quickOpponent(), null, mode === 'practice' ? 'community' : 'stadium');
  }

  /** The rival team for a quick match or practice: seeded, so a test with setSeed always gets the same one. */
  function quickOpponent(): TeamId {
    const rng = createRng((seedOverride ?? randomSeed()) ^ 0x7e5a);
    return TEAM_IDS[1 + rng.int(0, TEAM_IDS.length - 2)] as TeamId;
  }

  function startCup(): void {
    abandonRound();
    cup = createCup(nextSeed());
    core.audio.playMusic(menuMusic);
    showCup();
  }

  function showCup(summary?: string): void {
    if (!cup) return showMenu();
    const c = cup;
    show(
      'cup',
      createCupScreen(core, {
        cup: c,
        summary,
        onKickoff: c.over ? startCup : playCupMatch,
        onMenu: showMenu,
      }),
      () => showCup(summary),
    );
  }

  function playCupMatch(extra: MatchExtras = {}): void {
    if (!cup || cup.over) return;
    const stage = cup.stage as 0 | 1 | 2;
    startMatch(
      'cup',
      nextOpponent(cup) as TeamId,
      STAGE_NAMES[stage],
      stage === 0 ? 'community' : 'stadium',
      extra,
    );
  }

  function startMatch(
    m: Mode,
    opp: TeamId,
    round: string | null,
    venue: Venue,
    extra: MatchExtras = {},
  ): void {
    abandonRound();
    mode = m;
    current = { mode: m, round, opp };
    const seed = extra.seed ?? nextSeed();
    const teams = [YOU, opp] as const;
    play = createPlay(core, {
      mode: m,
      difficulty,
      seed,
      teams,
      habit: progress.habit,
      venue,
      intro: t(round ? `round.${round}` : m === 'practice' ? 'round.practice' : 'round.quick'),
      ...(__NAIJA_TEST__ ? { tempo: extra.tempo ?? urlTempo } : {}),
      onKick: (s) => core.portal.emit('score', { score: liveScore(s, difficulty) }),
      onEnd: finishMatch,
      onQuit: showMenu,
      onRestart: () => (m === 'cup' ? playCupMatch() : startMatch(m, opp, round, venue)),
    });
    roundOpen = true;
    save({ ...progress, lastMode: m, lastDifficulty: difficulty });
    core.audio.playMusic(playMusic);
    // no seed and no token in the payload: the portal learns the level, the mode and the round only
    core.portal.emit('start', { level: difficulty, mode: m, ...(round ? { round } : {}) });
    show('play', play, null); // the play screen keeps its own state: a language change must not rebuild it
    play.start();
    if (__NAIJA_TEST__ && extra.bot) play.setBot?.(extra.bot);
  }

  /** Leaving a match that is still running (quit, restart) ends it for the portal too. Practice never reports a score. */
  function abandonRound(): void {
    if (roundOpen && play && current) {
      const s = play.snapshot();
      if (current.mode === 'practice')
        core.portal.emit('end', { practice: true, level: difficulty, mode: 'practice' });
      else
        core.portal.emit('end', {
          score: liveScore(s.state, difficulty),
          won: false,
          quit: true,
          level: difficulty,
          mode: current.mode,
        });
    }
    roundOpen = false;
    play = null;
  }

  function finishMatch(s: Shootout): void {
    const info = current as NonNullable<typeof current>;
    roundOpen = false;
    play = null;
    const won = s.winner === 0;
    const r = recordResult(progress, s, difficulty, info.mode);
    let next = r.next;
    const stars = starsFor(s);
    const common = { score: r.score, won, level: difficulty, mode: info.mode };
    if (won)
      core.portal.emit('level_complete', {
        level: difficulty,
        mode: info.mode,
        score: r.score,
        stars,
        ...(info.round ? { round: info.round } : {}),
      });

    if (info.mode === 'cup' && cup) {
      cup = advanceCup(cup, won);
      if (cup.over) next = recordCup(next, cup.won, cup.champion === YOU);
      save(next);
      core.portal.emit('end', {
        ...common,
        round: info.round,
        cup: cup.over ? (cup.champion === YOU ? 'won' : 'out') : 'next',
      });
      if (won) sounds.bracketAdvance();
      if (cup.over && cup.champion === YOU) sounds.shootoutWin();
      else if (!won) sounds.shootoutLose();
      const opp = teamById(info.opp).name;
      const summary = t(won ? 'cup.won' : 'cup.lost', { opp, you: s.goals[0], cpu: s.goals[1] });
      done(s);
      showCup(summary);
      return;
    }
    save(next);
    core.portal.emit('end', { ...common, stars });
    if (won) sounds.shootoutWin();
    else sounds.shootoutLose();
    done(s);
    const render = (): void => {
      const persona = personaFor(difficulty);
      show(
        'results',
        createResults(core, {
          won,
          score: r.score,
          best: progress.best[difficulty],
          newBest: r.newBest,
          stars: won ? stars : undefined,
          banter: `${t(persona.nameKey)}: ${t(persona.banter[won ? 'lose' : 'win']?.[0] ?? 'persona.ozavize.8')}`,
          rows: [
            { label: t('results.goals'), value: s.goals[0] },
            { label: t('results.saves'), value: saves(s, 0) },
            { label: t('results.sweet'), value: sweetGoals(s, 0) },
            {
              label: t('results.vs', { you: s.goals[0], opp: s.goals[1] }),
              value: t(`difficulty.${difficulty}`),
            },
          ],
          onReplay: () => startMatch(info.mode, quickOpponent(), null, 'stadium'),
          onMenu: showMenu,
        }),
        render,
      );
    };
    render();
  }

  function done(s: Shootout): void {
    const w = waiters;
    waiters = [];
    w.forEach((f) => f(s));
  }

  // Test-only: `__NAIJA_TEST__` is false in production builds, so the kit and everything it names are
  // removed from the shipped bundle. scripts/prod-gate.mjs enforces it.
  const test: TestApi | undefined = __NAIJA_TEST__
    ? createTestKit({
        screenId: () => host.screenId,
        difficulty: () => difficulty,
        setDifficulty: (d) => void (difficulty = d),
        mode: () => mode,
        seed: () => seedOverride,
        setSeed: (n) => void (seedOverride = n >>> 0),
        progress: () => progress,
        play: () => play,
        cup: () => cup,
        current: () => current,
        nextSeed,
        startQuick: (m, extra) =>
          startMatch(m, quickOpponent(), null, m === 'practice' ? 'community' : 'stadium', extra),
        startCup,
        playCupMatch,
        finish: finishMatch,
        waitForEnd: () => new Promise<Shootout>((resolve) => waiters.push(resolve)),
      })
    : undefined;

  return {
    showMenu,
    destroy() {
      abandonRound();
      host.destroy();
      rerender = null;
    },
    ...(test ? { test } : {}),
  };
}
