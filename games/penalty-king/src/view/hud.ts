import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import { h } from '@naija/core/ui-kit';
import { ZONES, type KickOutcome, type Zone } from '../physics';
import { KICKS } from '../rules/config';
import type { Slot } from '../rules/shootout';
import { teamById, type TeamId } from '../rules/teams';

export type BannerKind = 'goal' | 'saved' | 'miss' | 'post' | 'sudden' | 'round';
export type PhaseChip = 'aim' | 'power' | 'curve' | 'go';
export type FxKind = 'ribbons' | 'save' | 'post' | 'net' | 'dust' | 'glow';

const SLOT_WORD: Record<Slot, string> = {
  goal: 'kick.goal',
  saved: 'kick.saved',
  miss: 'kick.miss',
  post: 'kick.post',
  pending: 'kick.pending',
  next: 'kick.next',
};
const FX_POOL = 6;

/** The DOM parts of the scoreboard, chips, banner and effects (art hooks: assets/penalty-art.css, `.pk-*`). */
export interface HudParts {
  el: HTMLElement;
  /** the row of role chip, phase chip and pause button */
  bar: HTMLElement;
  setTeams(you: TeamId, cpu: TeamId): void;
  /** `rows[side]` is that side's first five kicks; totals are the full scores */
  setScore(
    rows: readonly [readonly Slot[], readonly Slot[]],
    totals: readonly [number, number],
    sudden: boolean,
  ): void;
  setRole(role: 'shoot' | 'keep' | null): void;
  setPhase(chip: PhaseChip | null, label?: string): void;
  banner(kind: BannerKind | null, word?: string): void;
  fx(kind: FxKind, x: number, y: number): void;
  /** polite live text for screen readers (the result of each kick) */
  announce(text: string): void;
  destroy(): void;
}

export function createHudParts(core: Core): HudParts {
  const { t } = core;
  const scope = createScope();
  const crest = (cls: string): HTMLElement => h('i', { class: `pk-crest ${cls}`, role: 'img' });
  const youCrest = crest('');
  const cpuCrest = crest('');
  const youCode = h('b', { class: 'pk-plate' });
  const cpuCode = h('b', { class: 'pk-plate' });
  const slots: HTMLElement[][] = [0, 1].map((row) =>
    Array.from({ length: KICKS }, (_, i) =>
      h('i', {
        class: 'pk-slot is-pending',
        style: `--i:${i};--row:${row}`,
        role: 'img',
        'aria-label': t(SLOT_WORD.pending),
      }),
    ),
  );
  const totals = [0, 1].map((row) =>
    h('b', { class: 'pk-total', style: `--row:${row}`, text: '0' }),
  );
  const sudden = h('i', {
    class: 'pk-badge-sudden',
    hidden: true,
    role: 'img',
    'aria-label': t('banner.sudden'),
  });
  const board = h('section', { class: 'pk-scoreboard', 'aria-label': t('hud.scoreboard') }, [
    h('span', { class: 'pk-team pk-team--you' }, [youCrest, youCode]),
    ...slots[0]!,
    totals[0]!,
    h('span', { class: 'pk-team pk-team--cpu' }, [cpuCrest, cpuCode]),
    ...slots[1]!,
    totals[1]!,
    sudden,
  ]);

  const roleEl = h('span', { class: 'pk-role', hidden: true }, [h('b', { class: 'pk-plate' })]);
  const phaseEl = h('span', { class: 'pk-phase', 'data-phase': 'aim' }, [
    h('i'),
    h('b', { class: 'pk-plate' }),
  ]);
  const bar = h('div', { class: 'pk-bar' }, [roleEl, phaseEl]);
  const status = h('p', { class: 'ng-sr', role: 'status', 'aria-live': 'polite' });
  const bannerWord = h('b', { class: 'pk-banner__word' });
  const bannerEl = h('div', { class: 'pk-banner pk-banner--goal', hidden: true, role: 'status' }, [
    bannerWord,
  ]);
  const fxLayer = h('div', { class: 'pk-fxlayer', 'aria-hidden': 'true' });
  const fxPool = Array.from({ length: FX_POOL }, () => h('i', { class: 'pk-fx', hidden: true }));
  fxLayer.append(...fxPool);
  scope.on(fxLayer, 'animationend', (e: Event) => {
    const n = e.target as HTMLElement;
    if (n.classList.contains('pk-fx')) n.hidden = true;
  });
  let fxNext = 0;
  let bannerOff: () => void = () => undefined;

  const el = h('header', { class: 'pk-hud' }, [board, bar]);
  const wrap = h('div', { class: 'pk-hudwrap' }, [el, status, bannerEl, fxLayer]);

  const restart = (n: HTMLElement): void => {
    n.hidden = true;
    void n.offsetWidth; // one forced reflow per event, to restart the CSS animation
    n.hidden = false;
  };

  return {
    el: wrap,
    bar,
    setTeams(you, cpu) {
      for (const [c, code, id] of [
        [youCrest, youCode, you],
        [cpuCrest, cpuCode, cpu],
      ] as const) {
        c.dataset.team = id;
        c.setAttribute('aria-label', t('team.crest', { team: teamById(id).name }));
        code.textContent = teamById(id).short;
      }
    },
    setScore(rows, tot, isSudden) {
      rows.forEach((row, r) =>
        row.forEach((state, i) => {
          const n = slots[r]![i]!;
          const cls = `pk-slot is-${state}`;
          if (n.className !== cls) {
            n.className = cls;
            n.setAttribute('aria-label', t(SLOT_WORD[state]));
          }
        }),
      );
      tot.forEach((v, r) => {
        const s = String(v);
        if (totals[r]!.textContent !== s) totals[r]!.textContent = s;
      });
      sudden.hidden = !isSudden;
    },
    setRole(role) {
      roleEl.hidden = role === null;
      if (role) {
        roleEl.className = `pk-role pk-role--${role}`;
        (roleEl.lastElementChild as HTMLElement).textContent = t(
          role === 'shoot' ? 'role.shoot' : 'role.keep',
        );
      }
    },
    setPhase(chip, label) {
      phaseEl.classList.toggle('is-on', chip !== null);
      if (chip) {
        phaseEl.dataset.phase = chip;
        (phaseEl.lastElementChild as HTMLElement).textContent = label ?? '';
      }
    },
    banner(kind, word) {
      bannerOff();
      if (!kind) {
        bannerEl.hidden = true;
        return;
      }
      bannerEl.className = `pk-banner pk-banner--${kind}`;
      bannerWord.textContent = word ?? '';
      restart(bannerEl);
      bannerOff = scope.timeout(() => (bannerEl.hidden = true), 1600);
    },
    fx(kind, x, y) {
      const n = fxPool[fxNext++ % FX_POOL]!;
      n.className = `pk-fx pk-fx--${kind}`;
      n.style.setProperty('--x', `${Math.round(x)}px`);
      n.style.setProperty('--y', `${Math.round(y)}px`);
      restart(n);
    },
    announce(text) {
      status.textContent = text;
    },
    destroy: () => scope.destroy(),
  };
}

export const outcomeBanner = (o: KickOutcome): BannerKind =>
  o === 'goal' ? 'goal' : o === 'saved' ? 'saved' : o === 'post' ? 'post' : 'miss';
export const ZONE_LABEL: Readonly<Record<Zone, string>> = Object.fromEntries(
  ZONES.map((z) => [z, `dive.${z}`]),
) as Record<Zone, string>;
