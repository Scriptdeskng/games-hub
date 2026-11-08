import type { Core } from '@naija/core/boot';
import type { Flow } from '@naija/core/board-kit';
import { cardOf, isSpecial, type ShapeName } from '../rules/cards';
import type { GameEvent, GameState } from '../rules/engine';
import type { PlayUi } from './table';

export interface PresenterOptions {
  core: Core;
  ui: PlayUi;
  flow: Flow;
  tempo: number;
  state: GameState;
  /** display name of a seat */
  seatName(seat: number): string;
  /** a CPU reacts (banter) */
  say(seat: number, event: string, force?: boolean): void;
  reduced(): boolean;
}

/** What is on the table right now. It trails the engine state while events are being played. */
export interface Shown {
  hands: number[][];
  market: number;
  top: number;
  called: ShapeName | null;
  discardN: number;
}

export interface Presenter {
  shown: Shown;
  /** Play the events of one action in order: motion, sound, effects, speech. */
  present(events: readonly GameEvent[]): Promise<void>;
  /** Draw the shown model. `playable` null: not the player's turn (no card marks). */
  render(playable: ReadonlySet<number> | null): void;
  /** Jump straight to the engine state (after a fast-forward). */
  snapTo(s: GameState): void;
}

const seatOf = (ui: PlayUi, seat: number): HTMLElement =>
  (seat === 0 ? ui.hand.el : ui.seats.seats[seat - 1]?.el) as HTMLElement;

export function createPresenter(o: PresenterOptions): Presenter {
  const { core, ui, flow } = o;
  const { t } = core;
  const sfx = (name: string, opts?: { pitch?: number; key?: string }): void =>
    core.audio.playSfx(name, opts);
  const ms = (n: number): number => Math.max(1, Math.round(n * o.tempo));
  const shown: Shown = {
    hands: o.state.hands.map((h) => h.slice()),
    market: o.state.draw.length,
    top: o.state.discard[o.state.discard.length - 1] as number,
    called: o.state.called,
    discardN: o.state.discard.length,
  };
  let lastCard = shown.top;

  const render = (playable: ReadonlySet<number> | null): void => {
    ui.hand.sync(shown.hands[0] as number[], playable);
    ui.seats.seats.forEach((s, i) => s.setCount((shown.hands[i + 1] as number[]).length));
    ui.setTop(shown.top, shown.called);
    ui.setMarket(shown.market);
    ui.setYourCards((shown.hands[0] as number[]).length);
  };

  /** A card element flies from `from` to its resting place (the class sets the keyframes). */
  function fly(el: Element | null | undefined, from: DOMRect, cls: string, dur: number): void {
    if (!el || o.reduced()) return;
    const to = el.getBoundingClientRect();
    const node = el as HTMLElement;
    node.style.setProperty('--fx', `${from.left + from.width / 2 - to.left - to.width / 2}px`);
    node.style.setProperty('--fy', `${from.top + from.height / 2 - to.top - to.height / 2}px`);
    node.style.setProperty('--rot', `${(lastCard % 5) * 6 - 12}deg`);
    node.style.animationDuration = `${ms(dur)}ms`;
    node.classList.add(cls);
    ui.scope.timeout(() => node.classList.remove(cls), ms(dur) + 30);
  }

  async function onPlay(e: Extract<GameEvent, { type: 'play' }>): Promise<void> {
    const card = cardOf(e.card);
    const from =
      e.seat === 0
        ? (ui.hand.cardEl(e.card)?.getBoundingClientRect() ?? ui.rect('hand'))
        : (ui.seats.seats[e.seat - 1] as { hand: HTMLElement }).hand.getBoundingClientRect();
    const hand = shown.hands[e.seat] as number[];
    const at = hand.indexOf(e.card);
    if (at >= 0) hand.splice(at, 1);
    else hand.pop(); // a CPU's hand is only a count: the card id may differ from the placeholder
    shown.top = e.card;
    shown.called = e.call;
    shown.discardN++;
    lastCard = e.card;
    ui.hand.select(null);
    render(null);
    const special = isSpecial(e.card);
    fly(
      ui.discard.querySelector('.whot-card'),
      from,
      special ? 'is-slam' : 'is-flick',
      special ? 280 : 240,
    );
    sfx('cardPlay');
    ui.setStatus(
      e.seat === 0
        ? t('whot.played.you', { n: card.n, shape: t(`whot.shape.${card.shape}`) })
        : t('whot.played', {
            name: o.seatName(e.seat),
            n: card.n,
            shape: t(`whot.shape.${card.shape}`),
          }),
    );
    if (e.seat !== 0 && !special) o.say(e.seat, 'play');
    await flow.sleep(special ? 300 : 260);
  }

  async function onEffect(e: Extract<GameEvent, { type: 'effect' }>): Promise<void> {
    const n = cardOf(lastCard).n;
    const cpu = e.seat !== 0;
    const victim = e.victim === null ? null : seatOf(ui, e.victim);
    switch (e.kind) {
      case 'hold':
        sfx('holdOn');
        ui.setStatus(t(cpu ? 'whot.hold' : 'whot.hold.you', { name: o.seatName(e.seat) }));
        if (cpu) o.say(e.seat, 'holdOn');
        break;
      case 'pickTwo':
      case 'pickThree':
      case 'defend': {
        const three = n === 5;
        sfx('slam');
        sfx(three ? 'pickThree' : 'pickTwo');
        ui.fx('penalty', victim, ms(700));
        const who = e.victim === null ? '' : o.seatName(e.victim);
        ui.setStatus(
          t(e.kind === 'defend' ? 'whot.defend' : three ? 'whot.pick3' : 'whot.pick2', {
            name: o.seatName(e.seat),
            victim: who,
          }),
        );
        if (cpu) o.say(e.seat, 'pickTwo');
        break;
      }
      case 'suspend':
        sfx('slam');
        sfx('suspension');
        ui.fx('skip', victim, ms(700));
        ui.setStatus(t('whot.suspend', { victim: o.seatName(e.victim as number) }));
        if (cpu) o.say(e.seat, 'suspension');
        break;
      case 'market':
        sfx('slam');
        sfx('market');
        ui.fx('market', ui.discard, ms(900));
        ui.thump(ms(220));
        ui.setStatus(t('whot.market.open'));
        if (cpu) o.say(e.seat, 'market');
        break;
      case 'whot': {
        sfx('whotPlay');
        ui.fx('whot', ui.discard, ms(800));
        const shape = shown.called as ShapeName;
        sfx('whotCall');
        ui.setStatus(
          t(cpu ? 'whot.called.by' : 'whot.called.you', {
            name: o.seatName(e.seat),
            shape: t(`whot.shape.${shape}`),
          }),
        );
        if (cpu) o.say(e.seat, 'whotCall');
        break;
      }
    }
    await flow.sleep(e.kind === 'hold' ? 250 : 420);
  }

  async function onDraw(e: Extract<GameEvent, { type: 'draw' }>): Promise<void> {
    const per = Math.max(110, Math.min(240, Math.round(1100 / e.cards.length)));
    const penalty = e.reason === 'pick' || e.reason === 'caught';
    for (const id of e.cards) {
      sfx(penalty ? 'pickPenalty' : 'cardDraw');
      (shown.hands[e.seat] as number[]).push(id);
      shown.market = Math.max(0, shown.market - 1);
      render(null);
      const from = ui.rect('draw');
      if (e.seat === 0) fly(ui.hand.cardEl(id), from, 'is-draw', per + 60);
      else ui.ghost(from, seatOf(ui, e.seat), ms(per + 60));
      await flow.sleep(per);
    }
    const name = o.seatName(e.seat);
    if (e.reason === 'pick') {
      ui.setStatus(t(e.seat === 0 ? 'whot.took.you' : 'whot.took', { name, n: e.cards.length }));
      if (e.seat !== 0) o.say(e.seat, 'gotPickTwo');
    } else if (e.reason === 'market') {
      ui.setStatus(t(e.seat === 0 ? 'whot.drew.you' : 'whot.drew', { name }));
    }
  }

  async function onAnnounce(e: Extract<GameEvent, { type: 'announce' }>): Promise<void> {
    const semi = e.level === 'semi';
    sfx(semi ? 'semiLast' : 'lastCard');
    ui.banner(t(semi ? 'whot.semiLast' : 'whot.lastCard'), ms(1400));
    if (e.seat !== 0) o.say(e.seat, 'lastCard', true);
    ui.setStatus(
      t(e.seat === 0 ? 'whot.said.you' : 'whot.said', {
        name: o.seatName(e.seat),
        call: t(semi ? 'whot.semiLast' : 'whot.lastCard'),
      }),
    );
    await flow.sleep(450);
  }

  return {
    shown,
    render,
    snapTo(s) {
      shown.hands = s.hands.map((h) => h.slice());
      shown.market = s.draw.length;
      shown.top = s.discard[s.discard.length - 1] as number;
      shown.called = s.called;
      shown.discardN = s.discard.length;
      render(null);
    },
    async present(events) {
      for (const e of events) {
        await flow.gate();
        switch (e.type) {
          case 'play':
            await onPlay(e);
            break;
          case 'effect':
            await onEffect(e);
            break;
          case 'draw':
            await onDraw(e);
            break;
          case 'reshuffle':
            sfx('shuffle');
            shown.market += shown.discardN - 1;
            shown.discardN = 1;
            ui.setStatus(t('whot.reshuffle'));
            render(null);
            await flow.sleep(380);
            break;
          case 'announce':
            await onAnnounce(e);
            break;
          case 'calm':
            ui.banner(t('whot.calm'), ms(2200));
            ui.setStatus(t('whot.calm'));
            await flow.sleep(500);
            break;
          case 'catch':
            sfx('lastCardCaught');
            ui.banner(t('whot.caught'), ms(1100));
            ui.setStatus(
              t('whot.catch.status', { by: o.seatName(e.by), name: o.seatName(e.target) }),
            );
            if (e.target !== 0) o.say(e.target, 'gotPickTwo', true);
            await flow.sleep(320);
            break;
          case 'end':
            break;
        }
      }
    },
  };
}
