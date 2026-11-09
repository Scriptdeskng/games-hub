import type { TFn } from '@naija/core/i18n';
import { h } from '@naija/core/ui-kit';
import type { PlacedWord } from '../rules';

export interface WordList {
  el: HTMLElement;
  /** word `index` of the puzzle was found in lane `lane` */
  markFound(index: number, lane: number): void;
}

/** The pinned word slip: each word with its lane swatch; found words are struck through and ticked. */
export function createWordList(words: readonly PlacedWord[], t: TFn): WordList {
  const items = words.map((w) =>
    h('li', { class: 'sw-word', 'data-word': w.word }, [
      h('i', { class: 'sw-word__sw', 'aria-hidden': 'true' }),
      h('span', { text: w.display }),
    ]),
  );
  const el = h('ul', { class: 'sw-words', 'aria-label': t('play.words') }, items);
  return {
    el,
    markFound(index, lane) {
      const li = items[index];
      if (!li || li.classList.contains('is-found')) return;
      li.classList.add('is-found');
      li.setAttribute('data-lane', String(lane));
      li.append(h('span', { class: 'ng-sr', text: ` ${t('play.sr.found')}` }));
    },
  };
}
