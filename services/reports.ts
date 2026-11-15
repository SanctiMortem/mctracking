/**
 * Stats report — builds the data package for "Analyze my stats" and
 * "Analyze deck" (server side).
 *
 * The package is compact: records already computed by the stats service,
 * the deck's shape (curve, types, lands), and the current card list. It is
 * returned to the phone, which sends it to Claude with the user's own key
 * (ADR-009). Nothing is stored and nothing is sent to Claude from here.
 *
 * Reports are private: only a deck's owner can analyse it, and only the
 * account's own player profile can be analysed.
 *
 * RPT-001
 */
import { asc, eq, inArray } from 'drizzle-orm';

import { cards, deckCards, deckVersions } from '@/db/schema';
import type { Card, Commander } from '@/db/index';
import { db } from '@/services/db';
import { ensureManaValues, getDeckVersionHistory } from '@/services/decklists';
import {
  CURVE_BUCKETS,
  sampleLevel,
  type DeckShape,
  type ReportCard,
  type ReportData,
  type ReportDeck,
  type ReportStat,
} from '@/services/reportShared';
import { getDeckStats, getPlayerStats, type CareerBreakdown } from '@/services/stats';

export type ReportResult = { data: ReportData } | { notFound: true } | { forbidden: true };

/** Player report: how many decks' lists are sent along. */
const MAX_PLAYER_DECKS = 4;

const COLOR_NAMES: Record<string, string> = {
  W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green', C: 'colorless',
};
const LENGTH_LABELS: Record<string, string> = {
  lt30: 'Games under 30 minutes',
  '30to60': 'Games of 30 to 60 minutes',
  '60to90': 'Games of 60 to 90 minutes',
  gt90: 'Games over 90 minutes',
};
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

function stat(id: string, label: string, matches: number, wins: number, name?: string): ReportStat {
  return { id, label, matches, wins, sample: sampleLevel(matches), ...(name ? { name } : {}) };
}

function careerStats(career: CareerBreakdown) {
  return {
    by_seat: career.by_turn_order.map((b) =>
      stat(`seat:${b.key}`, `Going ${ORDINALS[Number(b.key) - 1] ?? `in seat ${b.key}`}`, b.matches, b.wins),
    ),
    by_pod_size: career.by_pod_size.map((b) =>
      stat(`pod:${b.key}`, `${b.key}-player games`, b.matches, b.wins),
    ),
    by_game_length: career.by_game_length.map((b) =>
      stat(`length:${b.key}`, LENGTH_LABELS[b.key] ?? b.key, b.matches, b.wins),
    ),
  };
}

// ─── Deck lists ───────────────────────────────────────────────────────────────

const CARD_TYPES = [
  'Creature', 'Land', 'Planeswalker', 'Battle', 'Instant', 'Sorcery', 'Artifact', 'Enchantment',
];

/** Creature wins over Artifact/Enchantment; Land wins for "Artifact Land". */
function cardType(typeLine: string | null): string {
  const types = (typeLine ?? '').split('—')[0];
  return CARD_TYPES.find((t) => types.includes(t)) ?? 'Other';
}

function buildShape(list: ReportCard[]): DeckShape {
  const curve = new Map<string, number>(CURVE_BUCKETS.map((b) => [b, 0]));
  const types = new Map<string, number>();
  let lands = 0;
  let manaSum = 0;
  let manaCount = 0;

  for (const c of list) {
    const type = cardType(c.type_line);
    types.set(type, (types.get(type) ?? 0) + c.quantity);
    if (type === 'Land') {
      lands += c.quantity;
      continue;
    }
    if (c.mana_value === null) continue;
    const bucket = c.mana_value >= 7 ? '7+' : String(Math.floor(c.mana_value));
    curve.set(bucket, (curve.get(bucket) ?? 0) + c.quantity);
    manaSum += c.mana_value * c.quantity;
    manaCount += c.quantity;
  }

  return {
    total_cards: list.reduce((n, c) => n + c.quantity, 0),
    lands,
    average_mana_value: manaCount > 0 ? Math.round((manaSum / manaCount) * 100) / 100 : null,
    curve: CURVE_BUCKETS.map((bucket) => ({ bucket, count: curve.get(bucket) ?? 0 })),
    types: [...types.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Current list (newest version) of each deck. Decks with no cards are omitted. */
async function loadCurrentLists(
  deckIds: string[],
): Promise<Map<string, { version: number; cards: ReportCard[] }>> {
  const out = new Map<string, { version: number; cards: ReportCard[] }>();
  if (deckIds.length === 0) return out;

  // Oldest → newest, so the last row per deck is its current version.
  const versionRows = await db
    .select()
    .from(deckVersions)
    .where(inArray(deckVersions.deckId, deckIds))
    .orderBy(asc(deckVersions.versionNumber));
  const current = new Map(versionRows.map((v) => [v.deckId, v]));
  const versionIds = [...current.values()].map((v) => v.id);
  if (versionIds.length === 0) return out;

  const rows = await db
    .select({ line: deckCards, card: cards })
    .from(deckCards)
    .leftJoin(cards, eq(deckCards.cardId, cards.id))
    .where(inArray(deckCards.deckVersionId, versionIds));

  const known = rows.map((r) => r.card).filter((c): c is Card => c !== null);
  const unique = [...new Map(known.map((c) => [c.id, c])).values()];
  const withMana = new Map((await ensureManaValues(unique)).map((c) => [c.id, c]));

  for (const [deckId, version] of current) {
    const list = rows
      .filter((r) => r.line.deckVersionId === version.id)
      .map(({ line, card }): ReportCard => {
        const c = card ? withMana.get(card.id) ?? card : null;
        return {
          name: c?.name ?? line.rawName,
          quantity: line.quantity,
          type_line: c?.typeLine ?? null,
          mana_value: c?.cmc ?? null,
          oracle_text: c?.oracleText ?? null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    if (list.length > 0) out.set(deckId, { version: version.versionNumber, cards: list });
  }
  return out;
}

function reportDeck(
  deck: { id: string; name: string },
  commanders: Commander[],
  list: { version: number; cards: ReportCard[] } | undefined,
): ReportDeck {
  return {
    id: deck.id,
    name: deck.name,
    commanders: commanders.map((c) => c.name),
    color_identity: [...new Set(commanders.flatMap((c) => c.colorIdentity))],
    version: list?.version ?? null,
    shape: list ? buildShape(list.cards) : null,
    cards: list?.cards ?? [],
  };
}

// ─── Deck report ──────────────────────────────────────────────────────────────

export async function getDeckReportData(userId: string, deckId: string): Promise<ReportResult> {
  const statsResult = await getDeckStats(userId, deckId);
  if ('notFound' in statsResult) return { notFound: true };
  if ('forbidden' in statsResult) return { forbidden: true };
  const stats = statsResult.data;
  if (stats.deck.createdBy !== userId) return { forbidden: true };

  const [history, lists] = await Promise.all([
    getDeckVersionHistory(userId, deckId),
    loadCurrentLists([deckId]),
  ]);
  const versions = 'data' in history ? history.data : null;

  const matchups = new Map(
    [...stats.best_matchups, ...stats.worst_matchups].map((m) => [m.deck.id, m]),
  );
  const commanders = [stats.deck.commander, stats.deck.commander2].filter(
    (c): c is Commander => !!c,
  );

  const byVersion: ReportStat[] = versions
    ? versions.versions
        .filter((v) => v.matches > 0)
        .map((v) => stat(`version:${v.number}`, `List version ${v.number}`, v.matches, v.wins))
    : [];
  if (versions && versions.unknown_version.matches > 0) {
    byVersion.push(
      stat(
        'version:unknown',
        'Matches from before list versions were recorded',
        versions.unknown_version.matches,
        versions.unknown_version.wins,
      ),
    );
  }

  return {
    data: {
      kind: 'deck',
      subject: stats.deck.name,
      overall: stat('overall', 'All matches with this deck', stats.total_matches, stats.wins),
      by_color: stats.color_record.map((c) =>
        stat(
          `color:${c.color}`,
          `Matches decided with ${COLOR_NAMES[c.color] ?? c.color} involved (won with ${COLOR_NAMES[c.color] ?? c.color} at the table, or lost to a ${COLOR_NAMES[c.color] ?? c.color} deck)`,
          c.wins + c.losses,
          c.wins,
        ),
      ),
      ...careerStats(stats.career),
      by_version: byVersion,
      matchups: [...matchups.values()].map((m) =>
        stat(`matchup:${m.deck.id}`, `Against the deck "${m.deck.name}"`, m.matches, m.wins, m.deck.name),
      ),
      by_deck: [],
      wins_by_condition: stats.wins_by_condition,
      version_changes: versions
        ? versions.versions
            .filter((v) => v.diff !== null)
            .map((v) => ({
              number: v.number,
              date: v.created_at.slice(0, 10),
              added: v.diff!.added.map((c) => c.name),
              removed: v.diff!.removed.map((c) => c.name),
            }))
        : [],
      decks: [reportDeck(stats.deck, commanders, lists.get(deckId))],
    },
  };
}

// ─── Player report ────────────────────────────────────────────────────────────

export async function getPlayerReportData(userId: string, playerId: string): Promise<ReportResult> {
  const statsResult = await getPlayerStats(userId, playerId);
  if ('notFound' in statsResult) return { notFound: true };
  if ('forbidden' in statsResult) return { forbidden: true };
  const stats = statsResult.data;
  // "Analyze my stats" is for your own profile only.
  if (stats.player.accountUserId !== userId) return { forbidden: true };

  // Decks the player has actually played, most-played first; only their own
  // decks' lists are sent.
  const played = [...stats.favorite_decks].sort((a, b) => b.matches - a.matches);
  const own = played.filter((d) => d.deck.createdBy === userId);
  const lists = await loadCurrentLists(own.map((d) => d.deck.id));
  const withLists = own.filter((d) => lists.has(d.deck.id)).slice(0, MAX_PLAYER_DECKS);

  return {
    data: {
      kind: 'player',
      subject: stats.player.name,
      overall: stat('overall', 'All matches', stats.total_matches, stats.wins),
      by_color: [],
      ...careerStats(stats.career),
      by_version: [],
      matchups: [],
      by_deck: played.map((d) =>
        stat(
          `deck:${d.deck.id}`,
          `Playing the deck "${d.deck.name}" (${d.commanders.map((c) => c.name).join(' + ')})`,
          d.matches,
          Math.round((d.matches * (d.win_rate_pct ?? 0)) / 100),
          d.deck.name,
        ),
      ),
      wins_by_condition: stats.wins_by_condition,
      version_changes: [],
      decks: withLists.map((d) => reportDeck(d.deck, d.commanders, lists.get(d.deck.id))),
    },
  };
}
