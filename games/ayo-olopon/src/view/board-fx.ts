import { h } from '@naija/core/ui-kit';
import { COUNTER_URL } from './board-assets';
import type { Who } from './geometry';

type Pt = { x: number; y: number };

/** What the fx pools need from the board that owns them. */
export interface FxContext {
  animates(): boolean;
  ms(n: number): number;
  centre(pit: number): Pt;
  trayCentre(who: Who): Pt;
  /** transform that centres an element on a point */
  at(p: Pt, scale?: number): string;
}

const num = (v: number): string => `${Math.round(v * 1000) / 1000}`;
const img = (cls: string, src: string): HTMLImageElement =>
  h('img', { class: cls, alt: '', draggable: 'false', src });

/**
 * The decorative pools of the board: the seed in the hand, sow ripples, capture bursts, tray glows,
 * counters that fly to a tray and chain links. All of them are built up front (nothing is created
 * during play) and move with transform and opacity only.
 */
export function createFx() {
  const hand = h('img', {
    class: 'ayo-hand',
    alt: '',
    draggable: 'false',
    hidden: '',
    src: './assets/seeds/seed-lift.svg',
  });
  const ripples = Array.from({ length: 4 }, () =>
    img('ayo-fx ayo-fx--ripple', './assets/fx/sow-ripple.svg'),
  );
  const bursts = Array.from({ length: 2 }, () =>
    img('ayo-fx ayo-fx--burst', './assets/fx/capture-burst.svg'),
  );
  const glows: Record<Who, HTMLImageElement> = {
    human: img('ayo-glow', './assets/fx/tray-glow.svg'),
    cpu: img('ayo-glow', './assets/fx/tray-glow.svg'),
  };
  const flyers = Array.from({ length: 3 }, () => img('ayo-flyer', COUNTER_URL[1]));
  const links = Array.from({ length: 5 }, () => img('ayo-flyer', './assets/fx/chain-link.svg'));
  let nextLink = 0;
  let nextRipple = 0;
  let nextBurst = 0;
  let nextFlyer = 0;

  /** Attach order matters for stacking. */
  const nodes: HTMLElement[] = [
    ...ripples,
    ...bursts,
    glows.cpu,
    glows.human,
    ...flyers,
    ...links,
    hand,
  ];

  /** Size the pools for a layout of `w` board units wide. */
  function size(w: number): void {
    const pct = (px: number): string => `${num((px / w) * 100)}%`;
    hand.style.width = pct(44);
    for (const r of ripples) r.style.width = pct(120);
    for (const b of bursts) b.style.width = pct(240);
    for (const f of flyers) f.style.width = pct(64);
    for (const k of links) k.style.width = pct(96);
  }

  function bind(c: FxContext) {
    function pulse(target: HTMLImageElement, pit: number, from: number, to: number, dur: number) {
      if (!c.animates()) return;
      const p = c.centre(pit);
      const base = `translate(${num(p.x)}px, ${num(p.y)}px) translate(-50%, -50%)`;
      target.animate(
        [
          { transform: `${base} scale(${from})`, opacity: 0.9 },
          { transform: `${base} scale(${to})`, opacity: 0 },
        ],
        { duration: c.ms(dur), easing: 'ease-out' },
      );
    }
    return {
      ripple(pit: number): void {
        pulse(ripples[nextRipple++ % ripples.length] as HTMLImageElement, pit, 0.5, 1.15, 380);
      },
      burst(pit: number): void {
        pulse(bursts[nextBurst++ % bursts.length] as HTMLImageElement, pit, 0.3, 1.1, 520);
      },
      flyCounter(pit: number, who: Who, seeds: number, dur: number): void {
        const f = flyers[nextFlyer++ % flyers.length] as HTMLImageElement;
        f.src = COUNTER_URL[seeds >= 10 ? 10 : seeds >= 5 ? 5 : 1];
        if (!c.animates()) return;
        f.animate(
          [
            { transform: c.at(c.centre(pit), 0.6), opacity: 0 },
            { transform: c.at(c.centre(pit), 1.1), opacity: 1, offset: 0.25 },
            { transform: c.at(c.trayCentre(who), 0.8), opacity: 0 },
          ],
          { duration: c.ms(dur), easing: 'ease-in-out' },
        );
      },
      chainLink(a: number, b: number): void {
        if (!c.animates()) return;
        const pa = c.centre(a);
        const pb = c.centre(b);
        const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        const deg = (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI;
        const base = `translate(${num(mid.x)}px, ${num(mid.y)}px) translate(-50%, -50%) rotate(${num(deg)}deg)`;
        (links[nextLink++ % links.length] as HTMLImageElement).animate(
          [
            { transform: `${base} scale(.5)`, opacity: 0 },
            { transform: `${base} scale(1)`, opacity: 1, offset: 0.3 },
            { transform: `${base} scale(1)`, opacity: 0 },
          ],
          { duration: c.ms(560), easing: 'ease-out' },
        );
      },
    };
  }

  return { hand, glows, nodes, size, bind };
}
