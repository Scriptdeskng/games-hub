import { createBanter, createBubbleView, type Banter, type Persona } from '@naija/core/ai-kit';
import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import { createLoop } from '@naija/core/loop';
import { createRng } from '@naija/core/rng';
import { createModal, createPause, h, type Component, type Modal } from '@naija/core/ui-kit';
import { createContestant, HOST, type Buzz, type Contestant } from '../ai';
import { tenseMusic, playMusic } from '../audio/music';
import {
  REVEAL_MS,
  answer,
  answerCpu,
  canUse,
  createRound,
  current,
  multiplierFor,
  next,
  tick,
  useFifty,
  usePadi,
  useSkip,
  total,
  type Difficulty,
  type GameState,
  type LifelineId,
  type Mode,
  type QuizQuestion,
} from '../rules';
import { letterOf } from './dom';
import { fastForwardRound } from './fastforward';
import { handleKey } from './keys';
import {
  createCard,
  BANTER_CHANCE,
  createDuelBar,
  duelStatus,
  createLifelines,
  createPlates,
  createPollBody,
  createTopBar,
} from './playui';

export interface PlayOptions {
  pool: readonly QuizQuestion[];
  mode: Mode;
  difficulty: Difficulty;
  categories?: readonly string[];
  seed: number;
  /** a replay of the Daily after the scored attempt: shown as "Practice" */
  practice?: boolean;
  onScore(s: GameState): void;
  onEnd(s: GameState): void;
  onRestart(): void;
  onQuit(): void;
  /** test builds only */
  test?: { tempo?: number; bot?: { win: boolean; delayMs: number } };
}

export interface Play extends Component {
  snapshot(): GameState;
  start(): void;
  /** test builds only: play the rest of the round instantly (no timers) and finish */
  fastForward?: (win: boolean) => GameState;
}

/** The play screen: one round of Classic, Daily or Duel. Everything it waits on is a game-clock step. */
export function createPlay(core: Core, o: PlayOptions): Play {
  const scope = createScope();
  const { t } = core;
  // test-build options only: in production `test` is undefined and nothing below reads it
  const test = __NAIJA_TEST__ ? o.test : undefined;
  const tempo = test?.tempo && test.tempo > 0 ? test.tempo : 1;
  const duel = o.mode === 'duel';
  let s = createRound({
    pool: o.pool,
    mode: o.mode,
    difficulty: o.difficulty,
    seed: o.seed,
    categories: o.categories,
  });
  const cpu: Contestant | null = duel
    ? createContestant({ seed: o.seed, difficulty: o.difficulty })
    : null;
  const persona: Persona = cpu ? cpu.persona : HOST;
  let plan: Buzz | null = null;
  let revealLeft = 0;
  let lastSec = -1;
  let over = false;
  let modal: Modal | null = null;
  let modalKind: 'pause' | 'poll' | null = null;
  let botAt = test?.bot?.delayMs ?? 0;

  // ---- view parts
  const bubble = createBubbleView(scope, { name: (p) => t(p.nameKey), ms: 3200 });
  const banter: Banter = createBanter({
    t,
    rng: createRng((o.seed ^ 0x5eed) >>> 0),
    show: (line) => {
      bubble.show(line);
      core.audio.playSfx('hostIn');
    },
    chance: BANTER_CHANCE,
  });
  const bar = createTopBar(core, scope, {
    practice: o.practice === true,
    showStreak: !duel,
    onPause: () => pause(),
  });
  const card = createCard(core);
  const plates = createPlates(core, scope, (i) => pick(i));
  const lifelines = duel ? null : createLifelines(core, scope, (id) => useLifeline(id));
  const duelBar = cpu ? createDuelBar(core, cpu.persona) : null;
  const live = h('p', { class: 'ng-sr', role: 'status', 'aria-live': 'polite' });
  const el = h('section', { class: 'ng-screen ng-play sq-play', 'aria-label': t('game.title') }, [
    h('div', { class: 'sq-stage' }),
    bar.el,
    card.el,
    h('div', { class: 'sq-banter' }, [bar.streakEl, bubble.el]),
    plates.el,
    lifelines?.el ?? duelBar?.el ?? null,
    live,
  ]);
  el.dataset.mode = o.mode;

  const say = (event: string, force = false, p: Persona = persona): void =>
    void banter.say(p, event, { force });
  const fx = (kind: string): void => {
    const node = h('div', { class: `sq-fx sq-fx--${kind}`, 'aria-hidden': 'true' });
    const off = scope.on(node, 'animationend', () => {
      off();
      node.remove();
    });
    el.append(node);
  };
  const elapsed = (): number => s.limitMs - s.timeLeftMs;

  // ---- one place where the state changes
  function commit(nextState: GameState): void {
    const prev = s;
    s = nextState;
    if (prev.phase === 'asking' && s.phase === 'reveal') closed(prev);
  }

  function paintStatus(): void {
    if (!duelBar || !cpu || !s.cpu) return;
    const status = duelStatus(core, cpu.persona, s);
    duelBar.set({ me: s.score, cpu: s.cpu.score, status });
  }

  function showQuestion(): void {
    const q = current(s);
    card.show(q, s.index + 1);
    plates.show(q);
    s.eliminated.forEach((i) => plates.state(i, 'eliminated'));
    plates.lock(false);
    bar.setQuestion(s.index + 1, total(s));
    bar.setScore(s.score);
    bar.setStreak(s.streak);
    bar.ring.reset(s.limitMs);
    lifelines?.sync(s);
    lastSec = -1;
    plan = cpu ? cpu.decide({ q, limitMs: s.limitMs }) : null;
    if (plan && test?.bot?.win === false) plan = { ...plan, choice: q.answer };
    botAt = test?.bot?.delayMs ?? 0;
    live.textContent = t('play.question', { n: s.index + 1, total: total(s), q: q.q });
    core.audio.playSfx('questionIn');
    paintStatus();
  }

  function closed(prev: GameState): void {
    const q = current(s);
    const mine = s.history[s.history.length - 1];
    plates.lock(true);
    plates.state(q.answer, 'correct');
    if (s.picked !== null && s.picked !== q.answer) plates.state(s.picked, 'wrong');
    plates.tagCpu(s.cpu?.picked ?? null, cpu ? t(cpu.persona.nameKey) : '');
    bar.ring.stop(s.timeLeftMs > 0 ? Math.ceil(s.timeLeftMs / 1000) : 0);
    bar.setScore(s.score);
    bar.setStreak(s.streak);
    lifelines?.sync(s);
    const where = { letter: letterOf(q.answer), text: q.options[q.answer] ?? '' };
    if (s.lastResult === 'correct') {
      core.audio.playSfx('correct');
      fx('correct');
      live.textContent = t('play.sr.correct', { points: s.lastPoints });
      const m = multiplierFor(s.streak);
      if (!duel && m > multiplierFor(prev.streak)) {
        core.audio.playSfx(m >= 5 ? 'streakBig' : m === 3 ? 'streak3' : 'streak2');
        fx('streak');
        say('streak', true);
      } else say(duel ? 'humanGood' : 'correct');
    } else {
      core.audio.playSfx(s.lastResult === 'timeout' ? 'timeUp' : 'wrong');
      fx(s.lastResult === 'timeout' ? 'timeup' : 'wrong');
      live.textContent = t(s.lastResult === 'timeout' ? 'play.sr.timeout' : 'play.sr.wrong', where);
      if (prev.streak >= 3) core.audio.playSfx('streakBreak', { gain: 0.8 });
      say(duel ? 'humanBad' : 'wrong');
    }
    if (duel && s.cpu) {
      if (s.cpu.lastPoints > 0) say('good');
      else if (s.cpu.picked !== null) say('bad');
      if (s.score > s.cpu.score && prev.score <= (prev.cpu?.score ?? 0))
        core.audio.playSfx('duelLead');
    }
    if (mine && mine.result === 'correct') core.audio.playSfx('scoreTick', { gain: 0.6 });
    paintStatus();
    revealLeft = REVEAL_MS;
    core.audio.playMusic(playMusic);
    o.onScore(s);
  }

  function advance(): void {
    commit(next(s));
    if (s.phase === 'done') return finish();
    showQuestion();
  }

  function finish(): void {
    if (over) return;
    over = true;
    loop.stop();
    o.onEnd(s);
  }

  // ---- player actions
  function pick(i: number): void {
    if (modal || over || s.phase !== 'asking' || s.picked !== null || s.eliminated.includes(i))
      return;
    core.audio.playSfx('select');
    const before = s;
    commit(answer(s, i));
    if (s === before) return;
    core.audio.playSfx(duel ? 'duelBuzz' : 'lock');
    if (s.phase === 'asking') {
      plates.state(i, 'picked');
      plates.lock(true);
      paintStatus();
    }
  }

  function useLifeline(id: LifelineId): void {
    if (modal || over) return;
    if (!canUse(s, id)) {
      if (s.used[id]) core.audio.playSfx('lifelineUsed');
      return;
    }
    s = id === 'fifty' ? useFifty(s) : id === 'skip' ? useSkip(s) : usePadi(s);
    fx('lifeline');
    if (id === 'fifty') {
      core.audio.playSfx('lifeline5050');
      s.eliminated.forEach((i) => plates.state(i, 'eliminated'));
      plates.lock(false);
      live.textContent = t('play.sr.fifty');
    } else if (id === 'skip') {
      core.audio.playSfx('lifelineSkip');
      showQuestion();
      live.textContent = `${t('play.sr.skipped')} ${live.textContent}`;
    } else {
      core.audio.playSfx('lifelinePadi');
      say('padi', true);
      openPoll();
    }
    lifelines?.sync(s);
  }

  function openPoll(): void {
    const poll = s.poll;
    if (!poll) return;
    freeze('poll');
    const body = createPollBody(core, scope, poll, (i) =>
      core.audio.playSfx('padiBar', { pitch: 1 + 0.06 * i }),
    );
    modal = createModal(core, {
      title: t('poll.title'),
      body,
      mount: core.root,
      className: 'sq-pollmodal',
      actions: [{ label: t('poll.close'), onClick: () => thaw() }],
      onDismiss: () => thaw(),
    });
  }

  // ---- pause (the game clock only runs while the loop does)
  function freeze(kind: 'pause' | 'poll'): void {
    modalKind = kind;
    loop.pause();
    bar.ring.freeze(s.timeLeftMs / s.limitMs);
  }
  function thaw(): void {
    modal = null;
    modalKind = null;
    bar.ring.thaw();
    if (!over) loop.resume();
  }
  function pause(): void {
    if (over || modal) return;
    freeze('pause');
    modal = createPause(core, {
      mount: core.root,
      onResume: thaw,
      onRestart: o.onRestart,
      onQuit: o.onQuit,
    });
  }

  scope.on(window, 'keydown', (e: KeyboardEvent) => {
    if (over) return;
    handleKey(e, {
      togglePause() {
        if (modalKind === 'pause') {
          modal?.close();
          thaw();
        } else if (!modal) pause();
      },
      blocked: () => modal !== null,
      pick,
      lifeline: useLifeline,
      nextLifeline() {
        const first = (['fifty', 'padi', 'skip'] as const).find((id) => canUse(s, id));
        if (first) useLifeline(first);
        else core.audio.playSfx('lifelineUsed');
      },
    });
  });

  // ---- the clock
  const loop = createLoop({
    update: (dt) => step((dt * 1000) / tempo),
    perf: core.perf,
    onHidden: () => pause(),
  });

  function step(dtMs: number): void {
    if (over) return;
    if (s.phase === 'reveal') {
      revealLeft -= dtMs;
      if (revealLeft <= 0) advance();
      return;
    }
    if (s.phase !== 'asking') return;
    commit(tick(s, dtMs));
    if (s.phase !== 'asking') return;
    const sec = Math.ceil(s.timeLeftMs / 1000);
    if (sec !== lastSec) {
      lastSec = sec;
      bar.ring.second(sec, Math.round(s.limitMs / 1000));
      if (sec <= 5) {
        core.audio.playSfx(sec === 1 ? 'timerLast' : 'timerLow');
        if (sec === 5) {
          core.audio.playMusic(tenseMusic);
          say('low');
        }
      } else if (sec < Math.round(s.limitMs / 1000)) core.audio.playSfx('secondTick');
    }
    if (plan && s.cpu && s.cpu.picked === null && elapsed() >= plan.atMs) {
      core.audio.playSfx('duelCpuBuzz');
      commit(answerCpu(s, plan.choice));
      say('buzz');
      if (s.phase === 'asking') paintStatus();
    }
    if (__NAIJA_TEST__ && test?.bot && s.phase === 'asking' && elapsed() >= botAt) {
      const q = current(s);
      botAt = Infinity;
      pick(test.bot.win ? q.answer : (q.answer + 1) % 4);
    }
  }

  /** Test builds only: finish the round without timers, the way a bot would, then end it. */
  const fastForward = (win: boolean): GameState => {
    s = fastForwardRound(s, win, cpu, o.onScore);
    finish();
    return s;
  };

  showQuestion();
  // the host's second greeting names a 15 s clock, so it is only used when the clock is 15 s
  const second = !duel && s.limitMs === 15000 && createRng(o.seed ^ 0xabc).chance(0.5);
  say(second ? 'ready' : 'start', true);

  return {
    el,
    snapshot: () => s,
    ...(__NAIJA_TEST__ ? { fastForward } : {}),
    start() {
      core.audio.playSfx('roundStart');
      core.audio.playMusic(playMusic);
      loop.start();
    },
    destroy() {
      modal?.close();
      loop.destroy();
      scope.destroy();
    },
  };
}
