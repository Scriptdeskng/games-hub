import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import { h } from '@naija/core/ui-kit';
import {
  AIM_START,
  analyseSwipe,
  createTrack,
  moveZone,
  powerAt,
  pushPoint,
  resetTrack,
  stepAim,
  swipeToZone,
  type AimCursor,
} from '../input';
import { ZONES, powerZone, type ShotInput, type Zone } from '../physics';
import type { AimFrame } from '../input';
import { ZONE_LABEL } from './hud';

/** What the player asked for. The match decides whether it is allowed right now. */
export interface Intents {
  shoot(input: ShotInput): void;
  dive(zone: Zone): void;
  pause(): void;
  /** the aim crossed into another target zone (a tick sound) */
  aimMoved?(): void;
  /** the swipe or key press locked the aim */
  aimLocked?(): void;
  /** the power meter ticked while charging from the keyboard */
  powerTick?(n: number): void;
  /** a swipe was cancelled (too short or the wrong way): a hint can be shown */
  cancelled?(): void;
}

export interface Controls {
  el: HTMLElement;
  /** show or hide the striker's aids and the dive grid for the current kick */
  setMode(mode: 'idle' | 'shoot' | 'keep'): void;
  /** the screen layout changed: recompute how swipes map to the goal, and drop a half-made swipe */
  setFrame(f: AimFrame, w: number, h: number): void;
  /** move the on-screen dive grid under the goal (CSS px) */
  placeDive(top: number): void;
  /** keyboard aiming needs the clock: call every frame with seconds */
  tick(dt: number): void;
  /** key from the window */
  key(k: string): boolean;
  /** show the shot just taken in the meters, or hide them */
  showShot(s: { power: number; curve: number } | null): void;
  destroy(): void;
}

const CURVE_WORD = ['curve.left', 'curve.none', 'curve.right'] as const;
const POWER_WORD = ['power.1', 'power.2', 'power.3', 'power.4', 'power.5'] as const;

export function createControls(core: Core, canvas: HTMLElement, it: Intents): Controls {
  const { t } = core;
  const scope = createScope();
  const track = createTrack();
  let frame: AimFrame | null = null;
  let mode: 'idle' | 'shoot' | 'keep' = 'idle';
  let down = -1;
  let lastZone = '';
  let cursor: AimCursor = AIM_START;
  let charging = -1; // keyboard power meter: seconds charged, or -1
  let nextTick = 0;
  let pick: Zone = 'u';

  const reticle = h('i', { class: 'pk-aim__reticle' });
  const arrow = h('i', { class: 'pk-aim__arrow' });
  const aim = h('div', { class: 'pk-aim', hidden: true, 'aria-hidden': 'true' }, [arrow, reticle]);
  const powerLabel = h('b', { class: 'pk-plate pk-power__label' });
  const power = h(
    'div',
    { class: 'pk-power', hidden: true, 'data-zone': '1', 'aria-hidden': 'true' },
    [h('i', { class: 'pk-power__fill' }), h('i', { class: 'pk-power__frame' }), powerLabel],
  );
  const curveLabel = h('b', { class: 'pk-plate' });
  const curve = h(
    'div',
    { class: 'pk-curve', hidden: true, 'data-curve': '0', 'aria-hidden': 'true' },
    [h('i', { class: 'pk-curve__icon' }), curveLabel],
  );
  const buttons = ZONES.map((z) =>
    h('button', {
      type: 'button',
      class: 'pk-dive__zone',
      'data-zone': z,
      'aria-label': t(ZONE_LABEL[z]),
    }),
  );
  const dive = h(
    'div',
    { class: 'pk-dive', hidden: true, role: 'group', 'aria-label': t('dive.group') },
    buttons,
  );
  const el = h('div', { class: 'pk-controls' }, [aim, power, curve, dive]);

  const setPower = (p: number): void => {
    const z = powerZone(p);
    power.style.setProperty('--p', p.toFixed(3));
    power.dataset.zone = String(z);
    powerLabel.textContent = t(POWER_WORD[z - 1] as string);
  };
  const setCurve = (c: number): void => {
    const k = c <= -0.25 ? -1 : c >= 0.25 ? 1 : 0;
    curve.dataset.curve = String(k);
    curveLabel.textContent = t(CURVE_WORD[k + 1] as string);
  };
  /** put the reticle at a screen point and the arrow from the ball to it */
  const aimAt = (x: number, y: number, locked: boolean): void => {
    if (!frame) return;
    const dx = x - frame.spotX;
    const dy = y - frame.spotY;
    aim.style.transform = `translate(${frame.spotX.toFixed(1)}px,${frame.spotY.toFixed(1)}px)`;
    reticle.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
    arrow.style.setProperty('--a', `${((Math.atan2(dx, -dy) * 180) / Math.PI).toFixed(1)}deg`);
    arrow.style.setProperty('--len', String(Math.min(2.5, Math.hypot(dx, dy) / 136).toFixed(2)));
    reticle.classList.toggle('is-locked', locked);
    aim.hidden = false;
  };
  const cursorPoint = (): { x: number; y: number } => ({
    x: (frame?.goalCx ?? 0) + cursor.x * (frame?.upm ?? 1),
    y: (frame?.goalGroundY ?? 0) - cursor.y * (frame?.upm ?? 1),
  });
  const zoneOfAim = (x: number, y: number): string =>
    `${Math.round(x * 1.5)}:${Math.round(y * 1.2)}`;

  const stopSwipe = (): void => {
    down = -1;
    resetTrack(track);
    aim.hidden = true;
    power.hidden = true;
    curve.hidden = true;
  };

  scope.on(canvas, 'pointerdown', (e: PointerEvent) => {
    if (mode !== 'shoot' || !frame || down >= 0) return;
    down = e.pointerId;
    resetTrack(track);
    pushPoint(track, e.clientX, e.clientY, e.timeStamp);
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* a synthetic pointer cannot be captured: the swipe still works while it stays over the canvas */
    }
  });
  scope.on(canvas, 'pointermove', (e: PointerEvent) => {
    if (e.pointerId !== down || !frame) return;
    pushPoint(track, e.clientX, e.clientY, e.timeStamp);
    const r = analyseSwipe(track, frame);
    if (r.verdict === 'empty') return;
    aimAt(e.clientX, e.clientY, r.verdict === 'ok');
    curve.hidden = false;
    power.hidden = false;
    setCurve(r.input.curve);
    setPower(r.input.power);
    const key = zoneOfAim(r.input.aimX, r.input.aimY);
    if (key !== lastZone) {
      lastZone = key;
      it.aimMoved?.();
    }
  });
  const finish = (e: PointerEvent): void => {
    if (e.pointerId !== down || !frame) return;
    pushPoint(track, e.clientX, e.clientY, e.timeStamp);
    const r = analyseSwipe(track, frame);
    stopSwipe();
    if (r.verdict === 'ok') {
      it.aimLocked?.();
      it.shoot(r.input);
    } else if (r.verdict !== 'empty') it.cancelled?.();
  };
  scope.on(canvas, 'pointerup', finish);
  scope.on(canvas, 'pointercancel', () => stopSwipe());
  scope.on(canvas, 'lostpointercapture', () => {
    if (down >= 0) stopSwipe();
  });

  // dive: a tap on a button, or a swipe across the grid
  let swipeFrom: { x: number; y: number } | null = null;
  let swallow = false;
  scope.on(dive, 'pointerdown', (e: PointerEvent) => {
    swipeFrom = { x: e.clientX, y: e.clientY };
    swallow = false;
  });
  scope.on(dive, 'pointerup', (e: PointerEvent) => {
    if (!swipeFrom) return;
    const z = swipeToZone(e.clientX - swipeFrom.x, e.clientY - swipeFrom.y);
    swipeFrom = null;
    if (z) {
      swallow = true;
      it.dive(z);
    }
  });
  scope.on(dive, 'click', (e: MouseEvent) => {
    if (swallow) {
      swallow = false;
      return;
    }
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-zone]');
    if (b) it.dive(b.dataset.zone as Zone);
  });

  const showPick = (): void =>
    buttons.forEach((b) => b.classList.toggle('is-pick', b.dataset.zone === pick));

  return {
    el,
    setMode(m) {
      // the same mode again (the HUD syncs on every phase event) must not reset the aim or hide the shot just taken
      if (m === mode) return;
      mode = m;
      stopSwipe();
      charging = -1;
      cursor = AIM_START;
      dive.hidden = m !== 'keep';
      if (m === 'keep') {
        pick = 'u';
        showPick();
      }
      if (m !== 'shoot') {
        aim.hidden = true;
        power.hidden = true;
        curve.hidden = true;
      }
    },
    setFrame(f) {
      frame = f;
      stopSwipe();
    },
    placeDive(top) {
      dive.style.top = `${Math.round(top)}px`;
    },
    tick(dt) {
      if (charging < 0) return;
      charging += dt;
      const p = powerAt(charging);
      setPower(p);
      if (charging >= nextTick) {
        nextTick += 0.12;
        it.powerTick?.(Math.round(nextTick / 0.12));
      }
    },
    key(k) {
      if (mode === 'keep') {
        if (k === 'Enter' || k === ' ') {
          it.dive(pick);
          return true;
        }
        if (k.startsWith('Arrow')) {
          pick = moveZone(pick, k);
          showPick();
          it.aimMoved?.();
          return true;
        }
        return false;
      }
      if (mode !== 'shoot' || !frame) return false;
      if (k === 'Enter' || k === ' ') {
        if (charging < 0) {
          charging = 0;
          nextTick = 0.12;
          it.aimLocked?.();
          const p = cursorPoint();
          aimAt(p.x, p.y, true);
          power.hidden = false;
          curve.hidden = false;
          setCurve(cursor.curve);
          setPower(0);
        } else {
          const p = powerAt(charging);
          charging = -1;
          it.shoot({ aimX: cursor.x, aimY: cursor.y, power: p, curve: cursor.curve });
        }
        return true;
      }
      const next = stepAim(cursor, k);
      if (next === cursor) return false;
      if (charging >= 0) return true; // the aim is locked while the meter runs
      cursor = next;
      const p = cursorPoint();
      aimAt(p.x, p.y, false);
      curve.hidden = false;
      setCurve(cursor.curve);
      it.aimMoved?.();
      return true;
    },
    showShot(s) {
      if (!s) {
        power.hidden = true;
        curve.hidden = true;
        aim.hidden = true;
        return;
      }
      power.hidden = false;
      curve.hidden = false;
      setPower(s.power);
      setCurve(s.curve);
    },
    destroy: () => scope.destroy(),
  };
}
