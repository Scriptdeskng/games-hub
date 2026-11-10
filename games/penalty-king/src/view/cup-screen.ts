import type { Core } from '@naija/core/boot';
import { createScope } from '@naija/core/lifecycle';
import { button, h, type Component } from '@naija/core/ui-kit';
import { bracketSlots, nextOpponent, STAGE_NAMES, type Cup } from '../rules/bracket';
import { teamById, YOU } from '../rules/teams';
import { BRACKET, slotPos } from './bracket-layout';

export interface CupScreenOptions {
  cup: Cup;
  /** summary of the match just played, already translated (shown above the bracket) */
  summary?: string;
  onKickoff(): void;
  onMenu(): void;
}

const STATE_WORD = {
  '': 'cup.slot.empty',
  you: 'cup.slot.you',
  won: 'cup.slot.won',
  out: 'cup.slot.out',
  next: 'cup.slot.next',
} as const;

/** The cup bracket: 8 + 4 + 2 slots on the art, each with a crest, a code plate and a badge shape (you, through, out, next). */
export function createCupScreen(core: Core, o: CupScreenOptions): Component {
  const { t } = core;
  const scope = createScope();
  const { cup } = o;
  const round = cup.stage < 3 ? STAGE_NAMES[cup.stage as 0 | 1 | 2] : STAGE_NAMES[2];
  const opp = nextOpponent(cup);

  const slotEls = bracketSlots(cup).flatMap((s) => {
    if (s.round === 3) return [];
    const { x, y } = slotPos(s.round, s.index);
    const team = s.team ? teamById(s.team) : null;
    const word = t(STATE_WORD[s.state]);
    return [
      h(
        'div',
        {
          class: `pk-bslot${s.state ? ` is-${s.state}` : ''}`,
          style: `--x:${x};--y:${y}`,
          role: 'img',
          'aria-label': team ? `${team.name}: ${word}` : word,
        },
        team
          ? [
              h('i', { class: 'pk-crest', 'data-team': team.id }),
              h('b', { class: 'pk-plate', text: team.short }),
            ]
          : [h('b', { class: 'pk-plate', text: '-' })],
      ),
    ];
  });
  const won = cup.champion === YOU;
  const trophy = h('i', {
    class: 'pk-trophy',
    role: 'img',
    'aria-label': t('cup.trophy'),
    style: `left:${((BRACKET.well.x + 3) / BRACKET.w) * 100}%;top:${((BRACKET.well.y + 6) / BRACKET.h) * 100}%`,
    ...(won ? { 'data-won': '' } : {}),
  });
  const bracket = h('div', { class: 'pk-bracket', role: 'group', 'aria-label': t('cup.title') }, [
    ...slotEls,
    trophy,
  ]);

  const headline = cup.over
    ? won
      ? t('cup.champion')
      : t('cup.out', { round: t(`round.${STAGE_NAMES[Math.min(2, cup.won) as 0 | 1 | 2]}`) })
    : t('cup.match', {
        round: t(`round.${round}`),
        you: teamById(YOU).name,
        opp: teamById(opp ?? 'sparks').name,
      });

  const go = button(core, scope, {
    label: cup.over
      ? t('cup.again')
      : cup.stage === 0 && !o.summary
        ? t('cup.kickoff')
        : t('cup.next'),
    block: true,
    onClick: o.onKickoff,
  });
  go.setAttribute('data-autofocus', '');
  const menu = button(core, scope, {
    label: t('ui.menu'),
    variant: 'secondary',
    block: true,
    onClick: o.onMenu,
    sfx: 'back',
  });
  const el = h('section', { class: 'ng-screen pk-cupscreen', 'aria-labelledby': 'pk-cup-title' }, [
    h('h2', { class: 'ng-h ng-h--sm', id: 'pk-cup-title', text: t('cup.title') }),
    o.summary ? h('p', { class: 'pk-cupline pk-plate', role: 'status', text: o.summary }) : null,
    h('p', { class: 'pk-cupline pk-plate', text: headline }),
    bracket,
    h('div', { class: 'pk-actions' }, [go, menu]),
  ]);
  return { el, destroy: () => scope.destroy() };
}
