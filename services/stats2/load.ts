/**
 * Stats v2 loader — the only file in this folder that touches the database.
 *
 * Reads the completed matches of a scope, with everything the pure
 * calculations need, in a handful of SELECTs. Read-only by construction:
 * there is no insert, update or delete here.
 *
 * ⚠️ Server-only (imports the database client). Import from API routes and
 *    scripts, never from the app bundle.
 */
import { and, eq, inArray, isNull, or, type SQL } from 'drizzle-orm';

import { commanders, decks, matchEvents, matchResults, matches, participations, players } from '@/db/schema';
import { db } from '@/services/db';

import { COLOR_ORDER, type Color, type MatchInput, type ParticipationInput } from './types';

export type StatsScope =
  /** Every completed match in the database. */
  | { kind: 'all' }
  /** One pod. The caller checks membership. */
  | { kind: 'group'; groupId: string }
  /** "All my matches": hosted by the user, or played by their account player. */
  | { kind: 'personal'; userId: string }
  /** Every completed match this deck was played in, anywhere (the deck page). */
  | { kind: 'deck'; deckId: string }
  /** Every completed match this player played in, anywhere (the player page). */
  | { kind: 'player'; playerId: string };

export interface LoadOptions {
  /**
   * Load the match events too. Only placement needs them; rankings, colours
   * and head-to-head do not, and skipping them saves the largest query.
   * Default true.
   */
  events?: boolean;
}

export interface EntityInfo {
  name: string;
  deleted: boolean;
}

export interface LoadedStats {
  matches: MatchInput[];
  players: Map<string, EntityInfo & { accountUserId: string | null }>;
  decks: Map<string, EntityInfo & { archived: boolean; commanderIds: string[]; colors: Color[] }>;
  commanders: Map<string, EntityInfo & { colors: Color[] }>;
}

/** Same rule as `personalMatchScope` in services/stats.ts, so both agree with History. */
function scopeFilter(scope: StatsScope): SQL {
  const completed = eq(matches.status, 'completed');
  if (scope.kind === 'all') return completed;
  if (scope.kind === 'group') return and(completed, eq(matches.groupId, scope.groupId))!;
  if (scope.kind === 'deck' || scope.kind === 'player') {
    return and(
      completed,
      inArray(
        matches.id,
        db
          .select({ matchId: participations.matchId })
          .from(participations)
          .where(
            scope.kind === 'deck'
              ? eq(participations.deckId, scope.deckId)
              : eq(participations.playerId, scope.playerId),
          ),
      ),
    )!;
  }
  return and(
    completed,
    or(
      eq(matches.createdBy, scope.userId),
      inArray(
        matches.id,
        db
          .select({ matchId: participations.matchId })
          .from(participations)
          .innerJoin(players, eq(participations.playerId, players.id))
          .where(and(eq(players.accountUserId, scope.userId), isNull(players.deletedAt))),
      ),
    ),
  )!;
}

function toColors(raw: readonly string[]): Color[] {
  const set = new Set(raw);
  const colors = COLOR_ORDER.filter((c) => c !== 'C' && set.has(c));
  return colors.length ? colors : ['C'];
}

export async function loadStatsMatches(scope: StatsScope, options: LoadOptions = {}): Promise<LoadedStats> {
  const where = scopeFilter(scope);
  const withEvents = options.events !== false;

  const [matchRows, resultRows, partRows, eventRows] = await Promise.all([
    db
      .select({
        id: matches.id,
        groupId: matches.groupId,
        createdBy: matches.createdBy,
        createdAt: matches.createdAt,
        endedAt: matches.endedAt,
      })
      .from(matches)
      .where(where),
    db
      .select({
        matchId: matchResults.matchId,
        winnerParticipationId: matchResults.winnerParticipationId,
        isDraw: matchResults.isDraw,
      })
      .from(matchResults)
      .innerJoin(matches, eq(matchResults.matchId, matches.id))
      .where(where),
    db
      .select({
        id: participations.id,
        matchId: participations.matchId,
        playerId: participations.playerId,
        deckId: participations.deckId,
        result: participations.result,
        lifeTotal: participations.lifeTotal,
        poisonCounters: participations.poisonCounters,
        commanderDamage: participations.commanderDamage,
        createdAt: participations.createdAt,
      })
      .from(participations)
      .innerJoin(matches, eq(participations.matchId, matches.id))
      .where(where),
    withEvents
      ? db
          .select({
            matchId: matchEvents.matchId,
            participationId: matchEvents.participationId,
            eventType: matchEvents.eventType,
            delta: matchEvents.delta,
            createdAt: matchEvents.createdAt,
          })
          .from(matchEvents)
          .innerJoin(matches, eq(matchEvents.matchId, matches.id))
          .where(and(where, eq(matchEvents.isUndone, false)))
      : [],
  ]);

  const deckIds = [...new Set(partRows.map((p) => p.deckId))];
  const playerIds = [...new Set(partRows.map((p) => p.playerId))];
  const [deckRows, playerRows] = await Promise.all([
    deckIds.length ? db.select().from(decks).where(inArray(decks.id, deckIds)) : [],
    playerIds.length ? db.select().from(players).where(inArray(players.id, playerIds)) : [],
  ]);
  const commanderIds = [
    ...new Set(deckRows.flatMap((d) => [d.commanderId, d.commanderId2]).filter((id): id is string => !!id)),
  ];
  const commanderRows = commanderIds.length
    ? await db.select().from(commanders).where(inArray(commanders.id, commanderIds))
    : [];

  const commanderMap: LoadedStats['commanders'] = new Map(
    commanderRows.map((c) => [c.id, { name: c.name, deleted: c.deletedAt !== null, colors: toColors(c.colorIdentity) }]),
  );
  const deckMap: LoadedStats['decks'] = new Map(
    deckRows.map((d) => {
      const ids = [d.commanderId, d.commanderId2].filter((id): id is string => !!id);
      const colors = toColors(ids.flatMap((id) => commanderMap.get(id)?.colors ?? []).filter((c) => c !== 'C'));
      return [
        d.id,
        { name: d.name, deleted: d.deletedAt !== null, archived: d.archivedAt !== null, commanderIds: ids, colors },
      ];
    }),
  );
  const playerMap: LoadedStats['players'] = new Map(
    playerRows.map((p) => [p.id, { name: p.name, deleted: p.deletedAt !== null, accountUserId: p.accountUserId }]),
  );

  const resultByMatch = new Map(resultRows.map((r) => [r.matchId, r]));
  const partsByMatch = new Map<string, ParticipationInput[]>();
  // Participations in creation order, so "seat order" is stable between runs.
  for (const p of [...partRows].sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime() || x.id.localeCompare(y.id))) {
    const deck = deckMap.get(p.deckId);
    const damage =
      p.commanderDamage && typeof p.commanderDamage === 'object' ? (p.commanderDamage as Record<string, number>) : {};
    const list = partsByMatch.get(p.matchId) ?? [];
    list.push({
      id: p.id,
      playerId: p.playerId,
      deckId: p.deckId,
      commanderIds: deck?.commanderIds ?? [],
      colors: deck?.colors ?? ['C'],
      result: p.result,
      lifeTotal: p.lifeTotal,
      poisonCounters: p.poisonCounters,
      commanderDamage: damage,
    });
    partsByMatch.set(p.matchId, list);
  }
  const eventsByMatch = new Map<string, MatchInput['events']>();
  for (const e of eventRows) {
    const list = eventsByMatch.get(e.matchId) ?? [];
    list.push({ participationId: e.participationId, type: e.eventType, delta: e.delta, at: e.createdAt });
    eventsByMatch.set(e.matchId, list);
  }

  const loaded: MatchInput[] = matchRows
    .map((m) => {
      const result = resultByMatch.get(m.id);
      return {
        id: m.id,
        groupId: m.groupId,
        createdBy: m.createdBy,
        createdAt: m.createdAt,
        endedAt: m.endedAt,
        isDraw: result?.isDraw ?? false,
        winnerParticipationId: result?.winnerParticipationId ?? null,
        participations: partsByMatch.get(m.id) ?? [],
        events: eventsByMatch.get(m.id) ?? [],
      };
    })
    .sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime() || x.id.localeCompare(y.id));

  return { matches: loaded, players: playerMap, decks: deckMap, commanders: commanderMap };
}
