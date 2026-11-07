import { createScope } from '@naija/core/lifecycle';
import { h } from '@naija/core/ui-kit';
import { HUMAN_PITS } from './geometry';
import {
  LAYOUTS,
  fitBoard,
  pickLayout,
  seedSpot,
  seedVariant,
  traySeedSize,
  type LayoutName,
  type Who,
} from './geometry';
import { PITS } from '../rules/config';
import { ART, MARKS, MARK_URL, SEED_URL, type Mark } from './board-assets';
import { createFx } from './board-fx';

export type { Mark } from './board-assets';

export interface BoardOptions {
  /** accessible name of the board */
  label: string;
  /** accessible name of a human pit button */
  pitLabel(n: number, seeds: number): string;
  reducedMotion(): boolean;
  /** animation speed factor (1 = normal) */
  tempo: number;
}

export interface BoardView {
  el: HTMLElement;
  /** fit into a box of w x h CSS pixels; picks portrait or landscape */
  fit(w: number, h: number): void;
  readonly layout: LayoutName;
  /** the number of seeds shown in a pit / tray */
  count(pit: number): number;
  tray(who: Who): number;
  setCount(pit: number, n: number, drop?: boolean): void;
  setTray(who: Who, n: number, glow?: boolean): void;
  /** show or clear a marker on a pit */
  mark(pit: number, kind: Mark, on: boolean): void;
  clearMarks(kind?: Mark): void;
  /** the pits the human may tap now (buttons enabled), or none */
  setPlayable(pits: readonly number[]): void;
  /** keyboard selection ring on one pit (or none) */
  select(pit: number | null): void;
  onPit(cb: (pit: number) => void): void;
  /** the seed in the hand: lift from a pit, hop to the next, then drop */
  handTo(pit: number, ms: number): void;
  handHide(): void;
  ripple(pit: number): void;
  burst(pit: number): void;
  /** a brass counter flies from a pit to a tray */
  flyCounter(pit: number, who: Who, seeds: number, ms: number): void;
  /** the chain-link mark between two consecutively captured pits */
  chainLink(a: number, b: number): void;
  focusPit(pit: number): void;
  destroy(): void;
}

const num = (v: number): string => `${Math.round(v * 1000) / 1000}`;

/**
 * The board: carved-wood art, 12 pits, two trays and a pool of 48 seed pictures that move between
 * pits and trays. Nothing is created while a game is running (the pool is built up front) and
 * everything that moves uses transform and opacity (Web Animations); seeds only change position when a
 * pit's count changes.
 */
export function createBoard(o: BoardOptions): BoardView {
  const scope = createScope();
  let layout: LayoutName = 'portrait';
  let boxW = 0;
  let boxH = 0;
  let cb: (pit: number) => void = () => undefined;
  const counts = new Array<number>(PITS).fill(0);
  const trays: Record<Who, number> = { human: 0, cpu: 0 };

  const art = h('img', {
    class: 'ayo-board__art',
    alt: '',
    src: ART.portrait,
    draggable: 'false',
  });
  const el = h('div', { class: 'ayo-board', role: 'group', 'aria-label': o.label });
  el.append(art);

  // ---- pool of seeds ----
  const pool: HTMLImageElement[] = Array.from({ length: 48 }, () => {
    const i = h('img', { class: 'ayo-seed', alt: '', draggable: 'false' });
    i.dataset.v = '';
    return i;
  });
  const free = pool.slice();
  const take = (): HTMLImageElement => free.pop() as HTMLImageElement;
  const give = (i: HTMLImageElement): void => {
    i.remove();
    free.push(i);
  };

  // ---- trays ----
  const trayEl: Record<Who, HTMLElement> = {
    human: h('div', { class: 'ayo-tray', 'aria-hidden': 'true' }),
    cpu: h('div', { class: 'ayo-tray', 'aria-hidden': 'true' }),
  };
  const traySeeds: Record<Who, HTMLImageElement[]> = { human: [], cpu: [] };
  el.append(trayEl.cpu, trayEl.human);

  // ---- pits ----
  const cells: HTMLElement[] = [];
  const chips: HTMLElement[] = [];
  const overlays: HTMLImageElement[] = [];
  const buttons: (HTMLButtonElement | null)[] = [];
  const marks: Set<Mark>[] = [];
  const pitSeeds: HTMLImageElement[][] = [];
  for (let pit = 0; pit < PITS; pit++) {
    const cell = h('div', { class: 'ayo-cell', 'aria-hidden': 'true' });
    cells.push(cell);
    pitSeeds.push([]);
    marks.push(new Set());
    const chip = h('span', { class: 'ayo-chip', 'aria-hidden': 'true', text: '0' });
    chips.push(chip);
    const ov = h('img', {
      class: 'ayo-state',
      alt: '',
      draggable: 'false',
      hidden: '',
      src: MARK_URL.select,
    });
    overlays.push(ov);
    el.append(cell, ov, chip);
  }
  for (const pit of HUMAN_PITS) {
    const b = h('button', { type: 'button', class: 'ayo-pit', 'data-pit': pit });
    b.setAttribute('aria-disabled', 'true');
    scope.on(b, 'click', () => cb(pit));
    buttons[pit] = b;
    el.append(b);
  }

  // ---- fx pools (WAAPI, transform and opacity only) ----
  const fxp = createFx();
  const { hand, glows } = fxp;
  el.append(...fxp.nodes);

  // ---- placement ----
  const pct = (v: number): string => `${num(v)}%`;
  const pitSpot = (pit: number): { x: number; y: number } =>
    LAYOUTS[layout].pits[pit] as { x: number; y: number };

  function placeSeed(i: HTMLImageElement, pit: number, k: number, n: number): void {
    const s = seedSpot(pit, k, n);
    i.style.left = pct(s.x);
    i.style.top = pct(s.y);
    i.style.width = pct(s.size);
    const v = seedVariant(pit, k);
    if (i.dataset.v !== v) {
      i.dataset.v = v;
      i.src = SEED_URL[v];
    }
  }
  function layoutPit(pit: number): void {
    const list = pitSeeds[pit] as HTMLImageElement[];
    list.forEach((s, k) => placeSeed(s, pit, k, list.length));
  }
  function layoutTray(who: Who): void {
    const t = LAYOUTS[layout].trays[who];
    const size = traySeedSize(layout, who);
    (traySeeds[who] as HTMLImageElement[]).forEach((s, k) => {
      const slot = t.slots[k] as { x: number; y: number };
      s.style.left = pct(slot.x);
      s.style.top = pct(slot.y);
      s.style.width = pct(size);
      const v = seedVariant(who === 'human' ? 3 : 8, k);
      if (s.dataset.v !== v) {
        s.dataset.v = v;
        s.src = SEED_URL[v];
      }
    });
  }

  function place(): void {
    const l = LAYOUTS[layout];
    el.dataset.layout = layout;
    el.style.setProperty('--ayo-ar', `${l.w} / ${l.h}`);
    const a = ART[layout];
    if (art.getAttribute('src') !== a) art.setAttribute('src', a);
    for (let pit = 0; pit < PITS; pit++) {
      const p = l.pits[pit]!;
      for (const e of [cells[pit]!, overlays[pit]!, buttons[pit] ?? null]) {
        if (!e) continue;
        e.style.setProperty('--x', num(p.x));
        e.style.setProperty('--y', num(p.y));
        e.style.setProperty('--d', num(l.pitD));
        e.style.setProperty('--o', num(l.overlay));
      }
      overlays[pit]!.style.setProperty('--o', num(l.overlay));
      chips[pit]!.style.setProperty('--x', num(p.chipX));
      chips[pit]!.style.setProperty('--y', num(p.chipY));
    }
    for (const who of ['human', 'cpu'] as const) {
      const t = l.trays[who];
      const e = trayEl[who];
      e.style.left = pct(t.x);
      e.style.top = pct(t.y);
      e.style.width = pct(t.w);
      e.style.height = pct(t.h);
      layoutTray(who);
      const g = glows[who];
      g.style.left = pct(t.x + t.w / 2);
      g.style.top = pct(t.y + t.h / 2);
      g.style.width = pct(Math.max(t.w, (t.h * l.h) / l.w) * 1.5);
    }
    for (let pit = 0; pit < PITS; pit++) layoutPit(pit);
    fxp.size(l.w);
  }

  /** Pixel centre of a pit inside the board box. */
  const centre = (pit: number): { x: number; y: number } => {
    const p = pitSpot(pit);
    return { x: (p.x / 100) * boxW, y: (p.y / 100) * boxH };
  };
  const trayCentre = (who: Who): { x: number; y: number } => {
    const t = LAYOUTS[layout].trays[who];
    return { x: ((t.x + t.w / 2) / 100) * boxW, y: ((t.y + t.h / 2) / 100) * boxH };
  };
  const at = (p: { x: number; y: number }, scale = 1): string =>
    `translate(${num(p.x)}px, ${num(p.y)}px) translate(-50%, -50%) scale(${scale})`;
  const animates = (): boolean => !o.reducedMotion() && typeof hand.animate === 'function';
  const ms = (n: number): number => Math.max(1, Math.round(n * o.tempo));

  function drawMark(pit: number): void {
    const ov = overlays[pit] as HTMLImageElement;
    const shown = MARKS.find((m) => (marks[pit] as Set<Mark>).has(m));
    if (!shown) {
      ov.hidden = true;
      return;
    }
    if (ov.dataset.m !== shown) {
      ov.dataset.m = shown;
      ov.src = MARK_URL[shown];
      ov.className = `ayo-state ayo-state--${shown}`;
    }
    ov.hidden = false;
  }

  function setCount(pit: number, n: number, drop = false): void {
    const list = pitSeeds[pit] as HTMLImageElement[];
    const cell = cells[pit] as HTMLElement;
    while (list.length > n) give(list.pop() as HTMLImageElement);
    let added: HTMLImageElement | null = null;
    while (list.length < n && free.length) {
      const s = take();
      list.push(s);
      cell.append(s);
      added = s;
    }
    counts[pit] = n;
    layoutPit(pit);
    const chip = chips[pit] as HTMLElement;
    const txt = String(n);
    if (chip.textContent !== txt) chip.textContent = txt;
    const b = buttons[pit];
    if (b) b.setAttribute('aria-label', o.pitLabel(pit + 1, n));
    if (drop && added && animates()) {
      added.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 0 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        ],
        { duration: ms(130), easing: 'cubic-bezier(.3, 1.5, .5, 1)' },
      );
    }
  }

  function setTray(who: Who, n: number, glow = false): void {
    const list = traySeeds[who];
    while (list.length > n) give(list.pop() as HTMLImageElement);
    while (list.length < n && free.length) {
      const s = take();
      list.push(s);
      trayEl[who].append(s);
    }
    trays[who] = n;
    layoutTray(who);
    if (glow && animates()) {
      glows[who].animate(
        [
          { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.9, offset: 0.4 },
          { transform: 'translate(-50%, -50%) scale(1.15)', opacity: 0 },
        ],
        { duration: ms(520), easing: 'ease-out' },
      );
      trayEl[who].animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
        { duration: ms(260), easing: 'ease-out' },
      );
    }
  }

  const fx = fxp.bind({ animates, ms, centre, trayCentre, at });

  const view: BoardView = {
    el,
    get layout() {
      return layout;
    },
    fit(w, hh) {
      if (w <= 0 || hh <= 0) return;
      const next = pickLayout(w, hh);
      const size = fitBoard(next, w, hh);
      if (next !== layout || size.w !== boxW || size.h !== boxH) {
        const changed = next !== layout || boxW === 0;
        layout = next;
        boxW = size.w;
        boxH = size.h;
        el.style.width = `${size.w}px`;
        el.style.height = `${size.h}px`;
        if (changed) place();
      }
    },
    count: (pit) => counts[pit] as number,
    tray: (who) => trays[who],
    setCount,
    setTray,
    mark(pit, kind, on) {
      const set = marks[pit] as Set<Mark>;
      if (on === set.has(kind)) return;
      if (on) set.add(kind);
      else set.delete(kind);
      drawMark(pit);
    },
    clearMarks(kind) {
      for (let pit = 0; pit < PITS; pit++) {
        const set = marks[pit] as Set<Mark>;
        if (kind) set.delete(kind);
        else set.clear();
        drawMark(pit);
      }
    },
    setPlayable(pits) {
      for (const pit of HUMAN_PITS) {
        const on = pits.includes(pit);
        (buttons[pit] as HTMLButtonElement).setAttribute('aria-disabled', String(!on));
        (buttons[pit] as HTMLButtonElement).classList.toggle('is-playable', on);
        view.mark(pit, 'select', on);
      }
    },
    select(pit) {
      for (const p of HUMAN_PITS) {
        (buttons[p] as HTMLButtonElement).classList.toggle('is-selected', p === pit);
      }
      if (pit !== null) buttons[pit]?.focus({ preventScroll: true });
    },
    onPit(fn) {
      cb = fn;
    },
    handTo(pit, dur) {
      const p = centre(pit);
      const was = hand.hidden;
      hand.hidden = false;
      if (was || !animates()) {
        hand.style.transform = at(p);
        return;
      }
      const from = hand.style.transform;
      hand.style.transform = at(p);
      hand.animate([{ transform: from }, { transform: at(p) }], {
        duration: Math.max(1, ms(dur) * 0.9),
        easing: 'ease-in-out',
      });
    },
    handHide() {
      hand.hidden = true;
    },
    ripple: (pit) => fx.ripple(pit),
    burst: (pit) => fx.burst(pit),
    flyCounter: (pit, who, seeds, dur) => fx.flyCounter(pit, who, seeds, dur),
    chainLink: (a, b) => fx.chainLink(a, b),
    focusPit(pit) {
      buttons[pit]?.focus({ preventScroll: true });
    },
    destroy() {
      el.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
      scope.destroy();
    },
  };
  place();
  return view;
}
