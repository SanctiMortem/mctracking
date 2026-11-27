/**
 * How a deck's size is written: "99 cards + commander".
 *
 * A pasted list sometimes includes the commander and sometimes does not, so
 * the raw total reads 100 for one deck and 99 for another that are the same
 * size. The commander is counted apart: the number is the list without the
 * deck's own commander(s), and the suffix names them. A deck that really has
 * a card too many then reads "100 cards + commander".
 *
 * `commanderCount` is missing when the API predates the field; the plain
 * total is shown in that case.
 */
import type { TFunction } from 'i18next';

/** Cards in the list that are not the deck's own commander(s). */
export function mainDeckCount(totalCards: number, commanderCards: number | undefined): number {
  return Math.max(0, totalCards - (commanderCards ?? 0));
}

export function formatDeckCount(
  t: TFunction,
  totalCards: number,
  commanderCards: number | undefined,
  commanderCount: number | undefined,
): string {
  if (!commanderCount) return t('decklist.cardsCount', { count: totalCards });
  const main = t('decklist.cardsCount', { count: mainDeckCount(totalCards, commanderCards) });
  const suffix =
    commanderCount === 1 ? t('decklist.plusCommander') : t('decklist.plusCommanders', { count: commanderCount });
  return `${main} ${suffix}`;
}
