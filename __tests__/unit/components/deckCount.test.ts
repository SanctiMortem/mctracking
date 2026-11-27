/**
 * How a deck's size is written — "99 cards + commander" whether or not the
 * pasted list included the commander.
 */
import type { TFunction } from 'i18next';

import { formatDeckCount, mainDeckCount } from '@/components/decks/deckCount';

// Stand-in for i18next with the English strings.
const t = ((key: string, opts?: { count?: number }) => {
  if (key === 'decklist.cardsCount') return opts?.count === 1 ? '1 card' : `${opts?.count} cards`;
  if (key === 'decklist.plusCommander') return '+ commander';
  if (key === 'decklist.plusCommanders') return `+ ${opts?.count} commanders`;
  return key;
}) as unknown as TFunction;

describe('formatDeckCount', () => {
  it('reads the same whether the list included the commander or not', () => {
    // Landing Party: 100 lines, one of them the commander.
    expect(formatDeckCount(t, 100, 1, 1)).toBe('99 cards + commander');
    // A list pasted without the commander.
    expect(formatDeckCount(t, 99, 0, 1)).toBe('99 cards + commander');
  });

  it('shows a deck with a card too many as it is', () => {
    expect(formatDeckCount(t, 101, 1, 1)).toBe('100 cards + commander');
  });

  it('names both commanders of a partner deck', () => {
    expect(formatDeckCount(t, 100, 2, 2)).toBe('98 cards + 2 commanders');
    expect(formatDeckCount(t, 98, 0, 2)).toBe('98 cards + 2 commanders');
  });

  it('falls back to the plain total when the API predates the fields', () => {
    expect(formatDeckCount(t, 100, undefined, undefined)).toBe('100 cards');
  });
});

describe('mainDeckCount', () => {
  it('never goes below zero', () => {
    expect(mainDeckCount(100, 1)).toBe(99);
    expect(mainDeckCount(99, undefined)).toBe(99);
    expect(mainDeckCount(0, 1)).toBe(0);
  });
});
