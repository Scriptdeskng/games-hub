import { createBanter, createBubbleView } from '@naija/core/ai-kit';
import type { Core } from '@naija/core/boot';
import { createLoop } from '@naija/core/loop';
import { createScope } from '@naija/core/lifecycle';
import { createRng } from '@naija/core/rng';
import { button, createPause, type Component, type Modal } from '@naija/core/ui-kit';
import { personaFor } from '../ai';
import type { HumanBot } from '../ai';
import { createFlow, type Flow, type FlowEvent } from '../play/flow';
import type { ShotInput, Zone } from '../physics';
import type { Difficulty, Mode, Side } from '../rules/config';
import { isSudden, slotsOf, type KickRecord, type Shootout } from '../rules/shootout';
import { KEEPER_OF, youKeeper } from './theme';
import type { TeamId } from '../rules/teams';
import { loadArt } from './sprites';
import { outcomeBanner } from './hud';
import { createSounds } from './sounds';
import { createStage, type Venue } from './stage';

export interface PlayOptions {
  mode: Mode;
  difficulty: Difficulty;
  seed: number;
  teams: readonly [TeamId, TeamId];
  habit: Readonly<Record<Zone, number>>;
  first?: Side;
  venue: Venue;
  /** the banner at kick-off (round name), already translated */
  intro: string;
  /** test builds only: a duration scale (0.25 = four times faster) */
  tempo?: number;
  /** after every kick (not in practice) */
  onKick(state: Shootout, record: KickRecord): void;
  /** the shootout is decided and the celebration is over */
  onEnd(state: Shootout): void;
  onQuit(): void;
  onRestart(): void;
}

export interface PlaySnapshot {
  phase: string;
  striker: Side;
  state: Shootout;
  practice: { kicks: number; goals: number; saves: number };
  paused: boolean;
  watchdog: number;
  frames: { w: number; h: number; landscape: boolean };
}

export interface Play extends Component {
  start(): void;
  snapshot(): PlaySnapshot;
  /** the watchdog's action, also callable by a test */
  rescue(): boolean;
  /** test builds only: a scripted human plays the match in real time */
  setBot?: (bot: HumanBot | null) => void;
  /** test builds only: finish the round at once */
  fastForward?: () => void;
}

/** A CPU or animation phase that has not moved on for this long (wall clock, not paused) is moved on by force. */
export const WATCHDOG_MS = 8000;
/** firings that find a kick in progress before the watchdog finishes it (so a dead loop costs a human about 16 s, never his decision) */
export const STALL_GUARD = 2;

export function createPlay(core: Core, o: PlayOptions): Play {
  const { t } = core;
  const scope = createScope();
  const persona = personaFor(o.difficulty);
  const practice = o.mode === 'practice';
  let modal: Modal | null = null;
  let destroyed = false;
  let began = false;
  let clock = 0;
  let rescues = 0;
  let blocked = 0;
  let bot: HumanBot | null = null;
  let botWait = 0;
  let botRng = createRng(o.seed ^ 0x600d);
  let watchOff: () => void = () => undefined;
  /** test builds: `tempo` 0.25 runs the match four times faster */
  const speed = __NAIJA_TEST__ && o.tempo ? 1 / o.tempo : 1;

  const bubble = createBubbleView(scope, { name: (p) => t(p.nameKey) });
  const banter = createBanter({
    t,
    rng: createRng(o.seed ^ 0xba17),
    show: (l) => bubble.show(l),
    now: () => clock * 1000,
  });

  const sounds = createSounds(core, scope);
  const stage = createStage(core, o.venue, {
    shoot: (input: ShotInput) => {
      if (modal || !flow.shoot(input)) return;
      stage.controls.setMode('idle');
      stage.controls.showShot({ power: input.power, curve: input.curve });
      sync();
    },
    dive: (zone) => {
      if (modal || !flow.dive(zone)) return;
      stage.controls.setMode('idle');
      sync();
    },
    pause: () => pause(),
    aimMoved: () => sounds.aimTick(clock),
    aimLocked: () => sounds.aimLock(),
    powerTick: (n) => sounds.powerTick(n),
    cancelled: () => stage.hud.announce(t('hint.swipe')),
  });

  const flow: Flow = createFlow({
    mode: o.mode,
    difficulty: o.difficulty,
    seed: o.seed,
    teams: o.teams,
    habit: o.habit,
    first: o.first,
    emit: (e) => onFlow(e),
  });

  const pauseBtn = button(core, scope, {
    label: t('ui.pause'),
    icon: 'pause',
    ariaLabel: t('ui.pause'),
    variant: 'icon',
    onClick: () => pause(),
  });
  stage.hud.bar.append(pauseBtn);
  if (practice) {
    stage.el.classList.add('is-practice');
    stage.hud.bar.append(
      button(core, scope, {
        label: t('practice.done'),
        variant: 'secondary',
        onClick: () => o.onQuit(),
        sfx: 'back',
      }),
    );
  }
  stage.persona.append(bubble.el);
  stage.hud.setTeams(o.teams[0], o.teams[1]);

  /** The scoreboard, role chip, phase chip and controls for what the match is doing right now. */
  function sync(): void {
    const st = flow.state();
    const f = flow.frame;
    const p = flow.practice();
    if (practice) {
      stage.hud.setScore([slotsOf(st, 0), slotsOf(st, 1)], [p.goals, p.saves], false);
    } else
      stage.hud.setScore(
        [slotsOf(st, 0), slotsOf(st, 1)],
        [st.goals[0], st.goals[1]],
        isSudden(st),
      );
    const human = f.striker === 0 ? 'shoot' : 'keep';
    stage.hud.setRole(f.phase === 'intro' ? null : human);
    stage.el.dataset.phase = f.phase;
    if (flow.canShoot()) stage.hud.setPhase('aim', t('phase.aim'));
    else if (f.striker === 1 && (f.phase === 'runup' || (f.phase === 'flight' && flow.canDive())))
      stage.hud.setPhase('go', t('phase.dive'));
    else if (f.phase === 'ready' && f.striker === 1)
      stage.hud.setPhase('go', t('phase.cpuReady', { name: t(persona.nameKey) }));
    else stage.hud.setPhase(null);
    stage.controls.setMode(
      flow.canShoot() ? 'shoot' : f.striker === 1 && flow.canDive() ? 'keep' : 'idle',
    );
  }

  function say(event: string, force = false): void {
    banter.say(persona, event, { force });
  }

  function onFlow(e: FlowEvent): void {
    switch (e.type) {
      case 'phase':
        armWatchdog();
        if (e.phase === 'ready') stage.controls.showShot(null);
        sync();
        break;
      case 'runup':
        sounds.runup();
        if (e.striker === 1) say('cpuTurn');
        break;
      case 'strike': {
        sounds.strike();
        const p = stage.renderer.pointAt(-1.0, 0, 0, { x: 0, y: 0, k: 0 });
        stage.hud.fx('dust', p.x, p.y);
        break;
      }
      case 'dive':
        sounds.dive();
        break;
      case 'impact':
        impact(e.record, e.striker);
        break;
      case 'sudden':
        sounds.sudden();
        stage.hud.banner('sudden', t('banner.sudden'));
        say('sudden', true);
        break;
      case 'idle':
        say('idle');
        break;
      case 'over':
        if (flow.state().status === 'over') o.onEnd(flow.state());
        break;
    }
  }

  function impact(r: KickRecord, striker: Side): void {
    const shot = flow.frame.shot;
    const human = striker === 0;
    stage.hud.banner(outcomeBanner(r.outcome), t(`banner.${r.outcome}`));
    stage.hud.announce(`${t(`banner.${r.outcome}`)}. ${scoreLine()}`);
    sounds.result(r.outcome, human);
    if (shot) {
      const g = stage.renderer.pointAt(shot.tx, shot.ty, 1, { x: 0, y: 0, k: 0 });
      if (r.outcome === 'goal') {
        stage.hud.fx('net', g.x, g.y);
        if (human) stage.hud.fx('ribbons', g.x, g.y);
      } else if (r.outcome === 'saved') stage.hud.fx('save', g.x, g.y);
      else if (r.outcome === 'post') stage.hud.fx('post', g.x, g.y);
    }
    if (human) {
      if (r.outcome === 'goal') say('humanGoal');
      else if (r.outcome === 'saved') say('cpuSave');
      else if (r.outcome === 'post') say('post');
      const mine = flow
        .state()
        .kicks.filter((k) => k.side === 0)
        .slice(-2);
      if (mine.length === 2 && mine[0]!.zone === mine[1]!.zone && !practice) say('repeat');
    } else if (r.outcome === 'goal') say('cpuGoal');
    else if (r.outcome === 'post') say('post');
    if (!practice) o.onKick(flow.state(), r);
  }

  function scoreLine(): string {
    const st = flow.state();
    return practice
      ? t('practice.stats', { goals: flow.practice().goals, kicks: flow.practice().kicks })
      : t('hud.scoreLine', { you: st.goals[0], cpu: st.goals[1] });
  }

  // the watchdog: wall clock, so a stalled loop or animation cannot hold the match
  function armWatchdog(fresh = true): void {
    if (fresh) blocked = 0;
    watchOff();
    watchOff = scope.timeout(() => {
      if (modal || document.hidden || destroyed) return armWatchdog(false);
      if (rescue()) sync();
      armWatchdog(false);
    }, WATCHDOG_MS);
  }
  /**
   * A kick in progress is never skipped on the first firing (the human's shot, or his dive and the window to make one). If the
   * same phase is still there after STALL_GUARD firings the loop is dead, so the kick is finished: a committed dive is kept,
   * an open window is closed and records no dive.
   */
  function rescue(force = false): boolean {
    let moved = flow.skip(force);
    if (!moved && !force) {
      if (++blocked >= STALL_GUARD) moved = flow.skip(true);
    }
    if (moved) rescues++;
    return moved;
  }

  /** one object for every frame: nothing is allocated while drawing */
  const drawInfo = { teams: o.teams };
  const loop = createLoop({
    update: (dt) => {
      const d = dt * speed;
      clock += d;
      flow.update(d);
      stage.controls.tick(d);
      if (__NAIJA_TEST__ && bot) driveBot(d);
    },
    render: () => stage.renderer.draw(flow.frame, drawInfo),
    perf: core.perf,
    onHidden: () => pause(),
  });

  function driveBot(d: number): void {
    if (!bot) return;
    botWait += d;
    if (flow.canShoot() && botWait > 0.35) {
      botWait = 0;
      flow.shoot(bot.shoot(0, botRng));
      stage.controls.setMode('idle');
      sync();
    } else if (flow.canDive() && flow.frame.t > -0.1) {
      flow.dive(bot.dive(0, botRng).zone as Zone);
      stage.controls.setMode('idle');
    }
  }

  function resume(): void {
    modal = null;
    loop.resume();
  }
  function pause(): void {
    if (modal || destroyed) return;
    loop.pause();
    modal = createPause(core, {
      mount: core.root,
      onResume: resume,
      onRestart: o.onRestart,
      onQuit: o.onQuit,
    });
  }
  const togglePause = (): void => {
    if (modal) {
      modal.close();
      resume();
    } else pause();
  };

  scope.on(window, 'keydown', (e: KeyboardEvent) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      e.preventDefault();
      togglePause();
      return;
    }
    if (modal) return;
    if (stage.controls.key(e.key)) e.preventDefault();
  });

  function begin(): void {
    if (began || destroyed) return;
    began = true;
    sounds.roundStart();
    stage.hud.banner('round', o.intro);
    say('start');
    sync();
    armWatchdog();
    loop.start();
  }

  const play: Play = {
    el: stage.el,
    start() {
      // the first frame waits for the art (up to 2.5 s); a sprite that fails to load becomes a plain shape
      void loadArt({
        wood: o.venue === 'community',
        cpuKeeper: KEEPER_OF[persona.id] ?? 'mid',
        youKeeper: youKeeper(KEEPER_OF[persona.id] ?? 'mid'),
        you: o.teams[0],
        cpu: o.teams[1],
      }).then((art) => {
        if (destroyed) return;
        stage.fit();
        stage.renderer.setArt(art);
        begin();
      });
      scope.timeout(begin, 2500);
    },
    rescue,
    snapshot: () => ({
      phase: flow.frame.phase,
      striker: flow.frame.striker,
      state: flow.state(),
      practice: flow.practice(),
      paused: modal !== null,
      watchdog: rescues,
      frames: {
        w: stage.renderer.layout.w,
        h: stage.renderer.layout.h,
        landscape: stage.renderer.layout.landscape,
      },
    }),
    destroy() {
      destroyed = true;
      modal?.close();
      watchOff();
      loop.destroy();
      stage.destroy();
      scope.destroy();
    },
    ...(__NAIJA_TEST__
      ? {
          setBot: (b: HumanBot | null) => {
            bot = b;
            botRng = createRng(o.seed ^ 0x600d);
          },
          fastForward: () => {
            for (let i = 0; i < 60 * 900 && flow.state().status === 'playing'; i++) {
              if (flow.canShoot())
                flow.shoot(
                  bot ? bot.shoot(i, botRng) : { aimX: 2.5, aimY: 1.8, power: 0.6, curve: 0 },
                );
              else if (flow.canDive()) flow.dive((bot ? bot.dive(i, botRng).zone : 'u') as Zone);
              flow.update(1 / 60);
            }
          },
        }
      : {}),
  };
  return play;
}
