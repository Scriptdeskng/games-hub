import arcSvg from '../../assets/timer/arc.svg?raw';
import arcLowSvg from '../../assets/timer/arc-low.svg?raw';
import type { Core } from '@naija/core/boot';
import type { Persona } from '@naija/core/ai-kit';
import type { Scope } from '@naija/core/lifecycle';
import { button, h, type Component } from '@naija/core/ui-kit';
import {
  LIFELINES,
  canUse,
  multiplierFor,
  type GameState,
  type LifelineId,
  type QuizQuestion,
} from '../rules';
import { catIcon, letterOf, restart, svgFrom } from './dom';

export type PlateState = 'picked' | 'correct' | 'wrong' | 'eliminated';

/** The timer ring: a draining arc (stroke-dashoffset, once a second) and the seconds in the middle. */
export interface Ring {
  el: HTMLElement;
  reset(limitMs: number): void;
  /** a new whole second began: `sec` seconds are left */
  second(sec: number, limitSec: number): void;
  freeze(fracLeft: number): void;
  thaw(): void;
  stop(sec: number): void;
}

export function createRing(core: Core): Ring {
  const num = h('b', { class: 'sq-ring__n', text: '0' });
  const el = h('div', { class: 'sq-ring', role: 'img' }, [svgFrom(arcSvg), num]);
  const swap = (markup: string): void => el.querySelector('svg')?.replaceWith(svgFrom(markup));
  let low = false;
  const label = (sec: number): void =>
    el.setAttribute('aria-label', core.t('play.timeLeft', { s: sec }));
  return {
    el,
    reset(limitMs) {
      if (low) swap(arcSvg);
      low = false;
      el.classList.remove('is-low', 'is-paused');
      el.style.setProperty('--sq-p', '1');
      num.textContent = String(Math.ceil(limitMs / 1000));
      label(Math.ceil(limitMs / 1000));
    },
    second(sec, limitSec) {
      num.textContent = String(sec);
      label(sec);
      if (sec <= 5 && !low) {
        low = true;
        swap(arcLowSvg);
        el.classList.add('is-low');
      }
      // the arc glides to where this second ends (CSS transition 1 s linear)
      el.style.setProperty('--sq-p', String(Math.max(0, (sec - 1) / limitSec)));
    },
    freeze(frac) {
      el.classList.add('is-paused');
      el.style.setProperty('--sq-p', String(Math.max(0, frac)));
    },
    thaw: () => el.classList.remove('is-paused'),
    stop(sec) {
      el.classList.remove('is-low');
      el.classList.add('is-paused');
      num.textContent = String(sec);
    },
  };
}

export interface TopBar extends Component {
  ring: Ring;
  /** the streak flame and multiplier badge (null in a duel); the play screen places it */
  streakEl: HTMLElement | null;
  setQuestion(n: number, total: number): void;
  setScore(score: number): void;
  setStreak(streak: number): void;
  pauseBtn: HTMLButtonElement;
}

export function createTopBar(
  core: Core,
  scope: Scope,
  o: { practice: boolean; showStreak: boolean; onPause(): void },
): TopBar {
  const { t } = core;
  const ring = createRing(core);
  const q = h('span', { class: 'ng-hud__value', text: '1/10' });
  const score = h('span', { class: 'ng-hud__value', text: '0' });
  const pauseBtn = button(core, scope, {
    label: t('ui.pause'),
    icon: 'pause',
    ariaLabel: t('ui.pause'),
    variant: 'icon',
    onClick: o.onPause,
  });
  const badge = h('span', { class: 'sq-streak__badge', 'aria-hidden': 'true' });
  const count = h('b', { class: 'sq-streak__n', text: '0' });
  const streak = h('div', { class: 'sq-streak', 'aria-label': `${t('hud.streak')}: 0` }, [
    h('span', { class: 'sq-streak__flame', 'aria-hidden': 'true' }),
    count,
    badge,
  ]);
  const el = h('header', { class: 'sq-hud' }, [
    pauseBtn,
    h('div', { class: 'ng-hud__item sq-hud__q' }, [
      h('span', { class: 'ng-hud__label', text: t('hud.q') }),
      q,
    ]),
    ring.el,
    h('div', { class: 'ng-hud__item sq-hud__score' }, [
      h('span', { class: 'ng-hud__label', text: t('hud.score') }),
      score,
    ]),
    o.practice ? h('span', { class: 'sq-practice', text: t('hud.practice') }) : null,
  ]);
  let lastMult = 1;
  return {
    el,
    ring,
    streakEl: o.showStreak ? streak : null,
    pauseBtn,
    setQuestion: (n, total) => void (q.textContent = t('play.qOf', { n, total })),
    setScore: (n) => void (score.textContent = String(n)),
    setStreak(n) {
      const mult = multiplierFor(n);
      count.textContent = String(n);
      streak.setAttribute('aria-label', `${t('hud.streak')}: ${n}`);
      streak.classList.toggle('is-hot', n >= 3);
      badge.className = `sq-streak__badge${mult > 1 ? ` sq-streak__badge--${mult}` : ''}`;
      if (mult > lastMult) restart(streak, 'is-up');
      lastMult = mult;
    },
    destroy: () => undefined,
  };
}

/** The question card: number medallion, topic chip, text (font steps down for long questions). */
export interface Card {
  el: HTMLElement;
  show(q: QuizQuestion, n: number): void;
}
export function createCard(core: Core): Card {
  const n = h('span', { class: 'sq-card__n', 'aria-hidden': 'true' });
  const cat = h('span', { class: 'sq-card__cat' });
  const text = h('p', { class: 'sq-card__q' });
  const el = h('section', { class: 'sq-card is-enter' }, [n, cat, text]);
  return {
    el,
    show(q, num) {
      n.textContent = String(num);
      cat.replaceChildren(catIcon(q.category), core.t(`cat.${q.category}`));
      text.textContent = q.q;
      el.dataset.len = q.q.length > 100 ? 'xl' : q.q.length > 60 ? 'l' : 's';
      restart(el, 'is-enter');
    },
  };
}

export interface Plates {
  el: HTMLElement;
  show(q: QuizQuestion): void;
  state(i: number, st: PlateState | null): void;
  /** mark the option the CPU picked, with its name */
  tagCpu(i: number | null, name: string): void;
  lock(on: boolean): void;
  buttons: HTMLButtonElement[];
}

export function createPlates(core: Core, scope: Scope, onPick: (i: number) => void): Plates {
  const states: (PlateState | null)[] = [null, null, null, null];
  let texts = ['', '', '', ''];
  const buttons = [0, 1, 2, 3].map((i) => {
    const b = h('button', {
      type: 'button',
      class: `sq-plate sq-plate--${'abcd'[i]}`,
      'aria-keyshortcuts': `${'ABCD'[i]} ${i + 1}`,
    });
    b.append(h('span', { class: 'sq-plate__t' }));
    scope.on(b, 'click', () => onPick(i));
    return b;
  });
  const label = (i: number): void => {
    const st = states[i];
    const base = core.t('play.plate', { letter: letterOf(i), text: texts[i] ?? '' });
    buttons[i]?.setAttribute('aria-label', st ? `${base} (${core.t(`play.state.${st}`)})` : base);
  };
  return {
    el: h('div', { class: 'sq-plates' }, buttons),
    buttons,
    show(q) {
      texts = q.options.slice();
      buttons.forEach((b, i) => {
        const t = b.firstElementChild as HTMLElement;
        t.textContent = q.options[i] ?? '';
        b.dataset.long = (q.options[i] ?? '').length > 30 ? '1' : '0';
        b.removeAttribute('data-state');
        b.removeAttribute('data-cpu');
        b.disabled = false;
        states[i] = null;
        label(i);
      });
    },
    state(i, st) {
      const b = buttons[i];
      if (!b) return;
      states[i] = st;
      if (st) b.setAttribute('data-state', st);
      else b.removeAttribute('data-state');
      label(i);
    },
    tagCpu(i, name) {
      buttons.forEach((b, k) =>
        k === i ? b.setAttribute('data-cpu', name) : b.removeAttribute('data-cpu'),
      );
    },
    lock(on) {
      buttons.forEach((b) => (b.disabled = on || b.dataset.state === 'eliminated'));
    },
  };
}

export interface Lifelines {
  el: HTMLElement;
  sync(s: GameState): void;
}

export function createLifelines(
  core: Core,
  scope: Scope,
  use: (id: LifelineId) => void,
): Lifelines {
  const NAMES: Record<LifelineId, [string, string, string]> = {
    fifty: ['ll.fifty', 'sq-ll--5050', 'll.fifty'],
    skip: ['ll.skip', 'sq-ll--skip', 'll.skip'],
    padi: ['ll.padi', 'sq-ll--padi', 'll.padiShort'],
  };
  const btns = new Map<LifelineId, HTMLButtonElement>();
  const el = h('div', { class: 'sq-llbar', role: 'group', 'aria-label': core.t('ll.padi') });
  for (const id of LIFELINES) {
    const [nameKey, cls, capKey] = NAMES[id];
    const b = h('button', {
      type: 'button',
      class: `sq-ll ${cls}`,
      'aria-label': core.t(nameKey),
      'data-ll': id,
    });
    scope.on(b, 'click', () => use(id));
    btns.set(id, b);
    el.append(
      h('div', { class: 'sq-llwrap' }, [b, h('span', { class: 'sq-llcap', text: core.t(capKey) })]),
    );
  }
  return {
    el,
    sync(s) {
      for (const id of LIFELINES) {
        const b = btns.get(id) as HTMLButtonElement;
        const used = s.used[id];
        b.classList.toggle('is-used', used);
        b.disabled = !canUse(s, id);
        b.setAttribute(
          'aria-label',
          used ? core.t('ll.used', { name: core.t(NAMES[id][0]) }) : core.t(NAMES[id][0]),
        );
      }
    },
  };
}

/** Quiz Duel scoreboard: you, the contestant, who leads, and what the contestant is doing. */
export interface DuelBar {
  el: HTMLElement;
  set(o: { me: number; cpu: number; status: string }): void;
}
export function createDuelBar(core: Core, persona: Persona): DuelBar {
  const name = core.t(persona.nameKey);
  const mk = (
    who: string,
    avatar: string | null,
  ): { chip: HTMLElement; score: HTMLElement; lead: HTMLElement } => {
    const score = h('b', { class: 'sq-duelchip__n', text: '0' });
    const lead = h('span', { class: 'sq-lead', role: 'img', 'aria-label': '', hidden: true });
    const chip = h('div', { class: 'sq-duelchip' }, [
      avatar ? h('img', { class: 'ng-avatar', src: avatar, alt: '', width: 36, height: 36 }) : null,
      h('span', { class: 'sq-duelchip__who', text: who }),
      score,
      lead,
    ]);
    return { chip, score, lead };
  };
  const me = mk(core.t('duel.you'), null);
  const cpu = mk(name, persona.avatar);
  const status = h('p', { class: 'sq-duelstatus', role: 'status', 'aria-live': 'polite' });
  const el = h('div', { class: 'sq-duelbar' }, [
    h('div', { class: 'sq-duelrow' }, [
      me.chip,
      h('span', { class: 'sq-vs', 'aria-hidden': 'true' }),
      cpu.chip,
    ]),
    status,
  ]);
  const mark = (x: { lead: HTMLElement }, on: boolean, label: string): void => {
    x.lead.hidden = !on;
    x.lead.setAttribute('aria-label', on ? label : '');
  };
  return {
    el,
    set(o) {
      me.score.textContent = String(o.me);
      cpu.score.textContent = String(o.cpu);
      mark(me, o.me > o.cpu, core.t('duel.leadYou'));
      mark(cpu, o.cpu > o.me, core.t('duel.lead', { name }));
      if (status.textContent !== o.status) status.textContent = o.status;
    },
  };
}

/** The "ask your padi" panel: four bars that rise one by one. Returns the node and an animator. */
export function createPollBody(
  core: Core,
  scope: Scope,
  poll: readonly number[],
  onBar: (i: number) => void,
): HTMLElement {
  const bars = [0, 1, 2, 3].map(() => h('span', { class: 'sq-bar' }));
  const pcts = poll.map((p, i) =>
    h('span', { class: 'sq-poll__pct', 'aria-hidden': 'true', text: `${p}%`, style: `--i:${i}` }),
  );
  pcts.forEach((p) => (p.style.opacity = '0'));
  const list = poll.map((p, i) => `${letterOf(i)} ${p}%`).join(', ');
  const el = h('div', { class: 'sq-pollwrap' }, [
    h('div', { class: 'sq-poll', role: 'img', 'aria-label': core.t('play.sr.poll', { list }) }, [
      ...bars,
      ...pcts,
    ]),
  ]);
  // bars rise one after another; the percent shows with its bar
  bars.forEach((b, i) => {
    scope.timeout(
      () => {
        b.style.setProperty('--sq-v', String((poll[i] ?? 0) / 100));
        (pcts[i] as HTMLElement).style.opacity = '1';
        onBar(i);
      },
      120 + i * 320,
    );
  });
  return el;
}

/** What the duel strip says under the scores: thinking, buzzed, waiting, or what the contestant picked. */
export function duelStatus(core: Core, persona: Persona, s: GameState): string {
  const name = core.t(persona.nameKey);
  if (!s.cpu) return '';
  if (s.phase === 'reveal')
    return s.cpu.picked === null
      ? ''
      : core.t('duel.cpuPicked', { name, letter: letterOf(s.cpu.picked) });
  if (s.picked !== null) return core.t('duel.waiting', { name });
  if (s.cpu.picked !== null) return core.t('duel.buzzed', { name });
  return core.t('duel.thinking', { name });
}

/** How often each persona event actually produces a bubble (the rest stay quiet, never spammy). */
export const BANTER_CHANCE = {
  correct: 0.5,
  wrong: 0.6,
  low: 0.5,
  buzz: 0.6,
  good: 0.5,
  bad: 0.6,
  humanGood: 0.5,
  humanBad: 0.5,
  idle: 0.2,
};
