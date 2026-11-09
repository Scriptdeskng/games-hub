import type { Scope } from '@naija/core/lifecycle';
import type { TFn } from '@naija/core/i18n';
import { h } from '@naija/core/ui-kit';
import { colOf, hitCell, lineCells, rowOf, type Puzzle } from '../rules';
import { applyGeo, centreOf, laneGeo } from './geometry';

export interface BoardOptions {
  puzzle: Puzzle;
  /** cell width in px */
  cell: number;
  scope: Scope;
  t: TFn;
  /** the player chose a start and an end (swipe, two taps or keyboard) */
  onSubmit(from: number, to: number): void;
  /** the first letter of a swipe or tap, and each new letter added to it (letters selected so far) */
  onSelect?(length: number): void;
  /** screen-reader sentences (polite live region owned by the play screen) */
  announce(text: string): void;
}

export interface Board {
  el: HTMLElement;
  setCell(px: number): void;
  /** accepted word: lane N 1..6 over these cells */
  markFound(cells: number[], lane: number): void;
  /** rejected swipe: shake, dashed outline */
  markWrong(from: number, to: number): void;
  hint(cell: number): void;
  clearSelection(): void;
  /** while true (paused, finished) every input is ignored */
  lock(on: boolean): void;
}

interface LaneRec {
  el: HTMLElement;
  from: number;
  to: number;
}

/**
 * The letter grid: pointer swipe (0.4 x cell hit circle), tap start then tap end, and the keyboard
 * (arrows move, Enter or Space sets the start and then the end, Escape cancels). Presentation only:
 * whether a pair of cells is a word is the rules engine's call, made by the play screen.
 */
export function createBoard(o: BoardOptions): Board {
  const { puzzle, scope, t } = o;
  const n = puzzle.size;
  let cell = o.cell;
  let locked = false;
  let anchor: number | null = null;
  let end: number | null = null;
  let dragging = false;
  let moved = false;
  let cursor = 0;
  let rect: DOMRect | null = null;
  let sel: number[] = [];
  const lanes: LaneRec[] = [];

  const tiles = Array.from({ length: n * n }, (_, i) => {
    const b = h('button', {
      type: 'button',
      class: 'sw-tile',
      tabindex: i === 0 ? 0 : -1,
      'data-i': i,
      'aria-label': t('play.tile', {
        letter: puzzle.letters[i] ?? '',
        row: rowOf(n, i) + 1,
        col: colOf(n, i) + 1,
      }),
    });
    b.append(h('span', { class: 'sw-tile__l', text: puzzle.letters[i] ?? '' }));
    return b;
  });
  const grid = h('div', { class: 'sw-grid', role: 'group', 'aria-label': t('play.grid') }, tiles);
  const trail = h('i', { class: 'sw-trail', 'aria-hidden': 'true' });
  trail.hidden = true;
  const layer = h('div', { class: 'sw-lanes', 'aria-hidden': 'true' }, [trail]);
  const bead = h('i', { class: 'sw-bead', 'aria-hidden': 'true' });
  bead.hidden = true;
  const el = h('div', { class: 'sw-board' }, [grid, layer, bead]);
  el.style.setProperty('--sw-n', String(n));
  el.style.setProperty('--sw-cell', `${cell}px`);

  const letterOf = (i: number): string => puzzle.letters[i] ?? '';

  function paintSel(next: number[]): void {
    for (const i of sel) tiles[i]?.classList.remove('is-sel');
    sel = next;
    for (const i of sel) tiles[i]?.classList.add('is-sel');
    if (sel.length < 2 || anchor === null || end === null) {
      trail.hidden = sel.length < 2;
      return;
    }
    const g = laneGeo(n, cell, anchor, end);
    if (g) {
      applyGeo(trail, g);
      trail.classList.remove('is-wrong');
      trail.hidden = false;
    }
  }
  function clearSelection(): void {
    anchor = null;
    end = null;
    dragging = false;
    moved = false;
    bead.hidden = true;
    for (const i of sel) tiles[i]?.classList.remove('is-sel');
    sel = [];
    if (!trail.classList.contains('is-wrong')) trail.hidden = true;
  }
  function setEnd(to: number): void {
    if (anchor === null) return;
    const line = to === anchor ? [anchor] : lineCells(n, anchor, to);
    if (!line) return;
    end = to;
    const before = sel.length;
    paintSel(line);
    if (line.length !== before) o.onSelect?.(line.length);
  }
  function submit(): void {
    const from = anchor;
    const to = end;
    if (from === null || to === null || from === to) return clearSelection();
    o.onSubmit(from, to);
  }
  const setCursor = (i: number): void => {
    tiles[cursor]?.setAttribute('tabindex', '-1');
    cursor = i;
    tiles[i]?.setAttribute('tabindex', '0');
  };
  const local = (e: PointerEvent): { x: number; y: number } => {
    const r = rect as DOMRect;
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const tileAt = (x: number, y: number): number | null => {
    const c = Math.floor(x / cell);
    const r = Math.floor(y / cell);
    return r < 0 || c < 0 || r >= n || c >= n ? null : r * n + c;
  };
  const moveBead = (e: PointerEvent): void => {
    const b = el.getBoundingClientRect();
    bead.style.setProperty('--px', String(Math.round(e.clientX - b.left)));
    bead.style.setProperty('--py', String(Math.round(e.clientY - b.top)));
  };

  // ---- pointer: swipe, or tap-tap
  scope.on(grid, 'pointerdown', (e: PointerEvent) => {
    if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    rect = grid.getBoundingClientRect();
    const p = local(e);
    const at = tileAt(p.x, p.y);
    if (at === null) return;
    setCursor(at);
    if (anchor !== null) {
      // second tap of a tap-tap selection
      const start = anchor;
      if (at === start) return clearSelection();
      if (lineCells(n, start, at)) {
        end = at;
        return submit();
      }
      clearSelection();
    }
    anchor = at;
    end = at;
    dragging = true;
    moved = false;
    try {
      grid.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers cannot be captured */
    }
    paintSel([at]);
    bead.hidden = false;
    moveBead(e);
    o.onSelect?.(1);
  });
  scope.on(grid, 'pointermove', (e: PointerEvent) => {
    if (!dragging || locked || !rect) return;
    moveBead(e);
    const p = local(e);
    const at = hitCell(p.x, p.y, cell, n);
    if (at !== null && at !== end) {
      moved = true;
      setEnd(at);
    }
  });
  const release = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    bead.hidden = true;
    try {
      grid.releasePointerCapture(e.pointerId);
    } catch {
      /* not captured */
    }
    if (moved && end !== anchor) submit();
    else if (anchor !== null) o.announce(t('play.sr.start', { letter: letterOf(anchor) }));
  };
  scope.on(grid, 'pointerup', release);
  scope.on(grid, 'pointercancel', (e: PointerEvent) => {
    release(e);
    clearSelection();
  });
  scope.on(grid, 'contextmenu', (e: Event) => e.preventDefault());

  // ---- keyboard
  scope.on(grid, 'focusin', (e: FocusEvent) => {
    const i = Number((e.target as HTMLElement).dataset.i);
    if (Number.isInteger(i)) setCursor(i);
  });
  scope.on(grid, 'keydown', (e: KeyboardEvent) => {
    if (locked || e.ctrlKey || e.metaKey || e.altKey) return;
    const step: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const d = step[e.key];
    if (d) {
      e.preventDefault();
      const r = Math.min(n - 1, Math.max(0, rowOf(n, cursor) + d[0]));
      const c = Math.min(n - 1, Math.max(0, colOf(n, cursor) + d[1]));
      setCursor(r * n + c);
      tiles[cursor]?.focus({ preventScroll: true });
      if (anchor !== null) setEnd(cursor);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (anchor === null) {
        anchor = cursor;
        end = cursor;
        paintSel([cursor]);
        o.onSelect?.(1);
        o.announce(t('play.sr.start', { letter: letterOf(cursor) }));
      } else if (cursor === anchor) {
        clearSelection();
      } else if (lineCells(n, anchor, cursor)) {
        end = cursor;
        submit();
      } else {
        o.announce(t('play.sr.noLine'));
      }
    } else if (e.key === 'Escape' && anchor !== null) {
      e.preventDefault();
      clearSelection();
    }
  });
  // a space key-up would click the focused button: the grid ignores clicks entirely
  scope.on(grid, 'keyup', (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
  });
  scope.on(grid, 'click', (e: Event) => e.preventDefault());

  // one-shot animations clean themselves up
  scope.on(el, 'animationend', (e: AnimationEvent) => {
    const t0 = e.target as HTMLElement;
    if (t0.classList.contains('sw-fx')) t0.remove();
    else if (t0 === trail && trail.classList.contains('is-wrong')) {
      trail.classList.remove('is-wrong');
      trail.hidden = true;
    } else if (t0.classList.contains('is-wrong')) t0.classList.remove('is-wrong');
  });

  function fx(kind: 'found' | 'hint', at: number): void {
    const c = centreOf(n, cell, at);
    const node = h('i', { class: `sw-fx sw-fx--${kind}`, 'aria-hidden': 'true' });
    node.style.left = `${14 + c.x}px`;
    node.style.top = `${14 + c.y}px`;
    el.append(node);
  }
  function layLane(l: LaneRec): void {
    const g = laneGeo(n, cell, l.from, l.to);
    if (g) applyGeo(l.el, g);
  }

  return {
    el,
    setCell(px) {
      if (px === cell) return;
      cell = px;
      el.style.setProperty('--sw-cell', `${px}px`);
      lanes.forEach(layLane);
      rect = null;
    },
    markFound(cells, lane) {
      const from = cells[0] as number;
      const to = cells[cells.length - 1] as number;
      clearSelection();
      for (const i of cells) {
        const tile = tiles[i];
        tile?.classList.add('is-found');
        tile?.classList.remove('is-hint');
        tile?.setAttribute('data-lane', String(lane));
      }
      const lane$ = h('i', { class: `sw-lane sw-lane--${lane}` });
      const rec = { el: lane$, from, to };
      lanes.push(rec);
      layLane(rec);
      layer.insertBefore(lane$, trail);
      fx('found', to);
    },
    markWrong(from, to) {
      const cells = lineCells(n, from, to) ?? [];
      const g = laneGeo(n, cell, from, to);
      clearSelection();
      for (const i of cells) {
        const tile = tiles[i];
        if (!tile) continue;
        tile.classList.remove('is-wrong');
        void tile.offsetWidth;
        tile.classList.add('is-wrong');
      }
      if (g) {
        applyGeo(trail, g);
        trail.hidden = false;
        trail.classList.remove('is-wrong');
        void trail.offsetWidth;
        trail.classList.add('is-wrong');
      }
    },
    hint(at) {
      tiles[at]?.classList.add('is-hint');
      fx('hint', at);
    },
    clearSelection,
    lock(on) {
      locked = on;
      if (on) clearSelection();
    },
  };
}
