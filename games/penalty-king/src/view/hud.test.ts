import { describe, expect, it } from 'vitest';
import { makeCore } from '../test-utils';
import { createHudParts, outcomeBanner } from './hud';

describe('HUD parts', () => {
  const setup = () => {
    const { core } = makeCore();
    const hud = createHudParts(core);
    document.body.append(hud.el);
    return { core, hud };
  };

  it('builds the scoreboard: two rows of five slots, two totals, two crests', () => {
    const { hud } = setup();
    expect(hud.el.querySelectorAll('.pk-slot')).toHaveLength(10);
    expect(hud.el.querySelectorAll('.pk-total')).toHaveLength(2);
    expect(hud.el.querySelectorAll('.pk-crest')).toHaveLength(2);
    expect((hud.el.querySelector('.pk-slot') as HTMLElement).style.getPropertyValue('--i')).toBe(
      '0',
    );
  });

  it('shows teams with a crest label and a short code on a plate', () => {
    const { hud } = setup();
    hud.setTeams('lanterns', 'bells');
    const crests = [...hud.el.querySelectorAll<HTMLElement>('.pk-crest')];
    expect(crests.map((c) => c.dataset.team)).toEqual(['lanterns', 'bells']);
    expect(crests[1]!.getAttribute('aria-label')).toBe('Brass City Bells crest');
    expect([...hud.el.querySelectorAll('.pk-team .pk-plate')].map((p) => p.textContent)).toEqual([
      'LAG',
      'BRA',
    ]);
  });

  it('marks every kick with its own class and accessible name (never colour only), and the totals', () => {
    const { hud } = setup();
    hud.setScore(
      [
        ['goal', 'saved', 'miss', 'post', 'next'],
        ['pending', 'pending', 'pending', 'pending', 'pending'],
      ],
      [1, 0],
      true,
    );
    const slots = [...hud.el.querySelectorAll<HTMLElement>('.pk-slot')];
    expect(slots.slice(0, 5).map((s) => s.className)).toEqual([
      'pk-slot is-goal',
      'pk-slot is-saved',
      'pk-slot is-miss',
      'pk-slot is-post',
      'pk-slot is-next',
    ]);
    expect(slots.slice(0, 5).map((s) => s.getAttribute('aria-label'))).toEqual([
      'Goal',
      'Saved',
      'Missed',
      'Hit the post',
      'Next kick',
    ]);
    expect(new Set(slots.map((s) => s.getAttribute('aria-label'))).size).toBeGreaterThan(5);
    expect([...hud.el.querySelectorAll('.pk-total')].map((n) => n.textContent)).toEqual(['1', '0']);
    expect((hud.el.querySelector('.pk-badge-sudden') as HTMLElement).hidden).toBe(false);
    hud.setScore(
      [
        ['pending', 'pending', 'pending', 'pending', 'pending'],
        ['pending', 'pending', 'pending', 'pending', 'pending'],
      ],
      [0, 0],
      false,
    );
    expect((hud.el.querySelector('.pk-badge-sudden') as HTMLElement).hidden).toBe(true);
  });

  it('role and phase chips carry a word as well as an icon', () => {
    const { hud } = setup();
    hud.setRole('shoot');
    expect(hud.el.querySelector('.pk-role--shoot')?.textContent).toBe('Shoot');
    hud.setRole('keep');
    expect(hud.el.querySelector('.pk-role--keep')?.textContent).toBe('Keep');
    hud.setRole(null);
    expect((hud.el.querySelector('.pk-role') as HTMLElement).hidden).toBe(true);
    hud.setPhase('aim', 'Swipe up to shoot');
    const chip = hud.el.querySelector('.pk-phase') as HTMLElement;
    expect(chip.classList.contains('is-on')).toBe(true);
    expect(chip.dataset.phase).toBe('aim');
    expect(chip.textContent).toBe('Swipe up to shoot');
    hud.setPhase(null);
    expect(chip.classList.contains('is-on')).toBe(false);
  });

  it('result banners always print the word', () => {
    const { hud } = setup();
    for (const [o, kind] of [
      ['goal', 'goal'],
      ['saved', 'saved'],
      ['miss', 'miss'],
      ['post', 'post'],
    ] as const) {
      expect(outcomeBanner(o)).toBe(kind);
      hud.banner(kind, kind.toUpperCase());
      const b = hud.el.querySelector('.pk-banner') as HTMLElement;
      expect(b.className).toBe(`pk-banner pk-banner--${kind}`);
      expect(b.hidden).toBe(false);
      expect(b.textContent).toBe(kind.toUpperCase());
    }
    hud.banner(null);
    expect((hud.el.querySelector('.pk-banner') as HTMLElement).hidden).toBe(true);
  });

  it('effects come from a small pool: never more than six elements, reused in turn, and hidden when they finish', () => {
    const { hud } = setup();
    for (let i = 0; i < 20; i++) hud.fx(i % 2 ? 'net' : 'ribbons', i, i);
    const pool = [...hud.el.querySelectorAll<HTMLElement>('.pk-fx')];
    expect(pool).toHaveLength(6);
    expect(pool.every((n) => !n.hidden)).toBe(true);
    pool[0]!.dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(pool[0]!.hidden).toBe(true);
    expect(pool[1]!.hidden).toBe(false);
  });

  it('announces results to a polite live region and cleans up', () => {
    const { hud } = setup();
    hud.announce('Goal! You 1, rival 0');
    expect(hud.el.querySelector('[aria-live="polite"]')?.textContent).toBe('Goal! You 1, rival 0');
    hud.destroy();
  });
});
