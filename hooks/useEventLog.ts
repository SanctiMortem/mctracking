/**
 * useEventLog — formats local session events for display in EventLogPanel.
 *
 * The event log in EPIC-03 covers the current tracker session only.
 * Historical events (loaded from DB) are connected in EPIC-04 (HIST-003).
 *
 * TRACK-007 (EPIC-03)
 */
import { useMemo } from 'react';

import type { LocalEvent } from '@/hooks/useTracker';
import type { TrackerParticipation } from '@/hooks/useTracker';

export type FormattedEvent = {
  id: string;
  description: string;
  isUndone: boolean;
  createdAt: Date;
};

/**
 * Compute life totals *after* each event by replaying events chronologically.
 * Returns a Map: eventId → lifeAfterThisEvent.
 */
function computeLifeAfterMap(
  events: LocalEvent[],
  participations: TrackerParticipation[],
): Map<string, { before: number; after: number }> {
  // Start from current life totals and walk backward through non-undone events
  // to find the starting life, then walk forward to tag each event.
  // Simpler: walk backward from current totals.
  const currentLife = new Map<string, number>();
  for (const p of participations) {
    currentLife.set(p.id, p.lifeTotal);
  }

  // Collect all non-undone life_change events in chronological order
  const lifeEvents = events.filter(
    (e) => e.eventType === 'life_change' && !e.isUndone,
  );

  // Walk backward to find starting life for each participation
  const startingLife = new Map(currentLife);
  for (let i = lifeEvents.length - 1; i >= 0; i--) {
    const e = lifeEvents[i];
    const cur = startingLife.get(e.participationId) ?? 40;
    startingLife.set(e.participationId, cur - e.delta);
  }

  // Walk forward, computing before/after for every life_change event (including undone)
  const running = new Map(startingLife);
  const result = new Map<string, { before: number; after: number }>();

  for (const e of events) {
    if (e.eventType !== 'life_change') continue;
    const before = running.get(e.participationId) ?? 40;
    if (!e.isUndone) {
      const after = before + e.delta;
      result.set(e.id, { before, after });
      running.set(e.participationId, after);
    } else {
      // Undone events don't affect running total, but we still tag them
      result.set(e.id, { before, after: before + e.delta });
    }
  }

  return result;
}

// ── Random death messages — only triggered by the Dead button ──
const DEATH_MESSAGES = [
  (name: string) => `☠ ${name} has died`,
  (name: string) => `☠ ${name} has perished`,
  (name: string) => `☠ ${name} will be missed`,
  (name: string) => `☠ ${name} won't really be missed`,
  (name: string) => `☠ ${name} tripped and is no longer with us`,
  (name: string) => `☠ ${name} has been vanquished`,
  (name: string) => `☠ ${name} met their untimely end`,
  (name: string) => `☠ ${name} has shuffled off this mortal coil`,
  (name: string) => `☠ ${name} forgot to pay their life insurance`,
  (name: string) => `☠ ${name} has left the battlefield... permanently`,
  (name: string) => `☠ ${name} was sent to the shadow realm`,
  (name: string) => `☠ Rest in pieces, ${name}`,
  (name: string) => `☠ ${name} has been exiled from existence`,
  (name: string) => `☠ ${name} took a dirt nap`,
  (name: string) => `☠ ${name} just got wrecked`,
];

// Use event ID as a stable seed so the message doesn't change on re-render
function pickDeathMessage(name: string, eventId: string): string {
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = ((hash << 5) - hash + eventId.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % DEATH_MESSAGES.length;
  return DEATH_MESSAGES[idx](name);
}

/** Generates a human-readable description of a tracker event. */
function formatEvent(
  event: LocalEvent,
  participations: TrackerParticipation[],
  lifeAfterMap: Map<string, { before: number; after: number }>,
): string {
  const part = participations.find((p) => p.id === event.participationId);
  const playerName = part?.player.name ?? 'Unknown';

  // Death — only from the Dead button, never automatic
  if ((event.eventType as string) === 'player_died') {
    return pickDeathMessage(playerName, event.id);
  }

  if (event.eventType === 'life_change') {
    const sign = event.delta > 0 ? '+' : '';
    return `${playerName}: ${sign}${event.delta} life`;
  }

  if (event.eventType === 'poison_change') {
    const sign = event.delta > 0 ? '+' : '';
    return `${playerName}: ${sign}${event.delta} poison`;
  }

  if (event.eventType === 'commander_damage' && event.commanderIdSource) {
    // Find the commander name from any participation
    const source = participations
      .flatMap((p) => {
        const cmds = [p.commander];
        if (p.commander2) cmds.push(p.commander2);
        return cmds;
      })
      .find((c) => c.id === event.commanderIdSource);
    const commanderName = source?.name ?? 'Commander';
    return `${playerName}: +${event.delta} cmd dmg from ${commanderName}`;
  }

  return `${playerName}: event`;
}

export function useEventLog(events: LocalEvent[], participations: TrackerParticipation[]) {
  const formatted = useMemo<FormattedEvent[]>(
    () => {
      const lifeAfterMap = computeLifeAfterMap(events, participations);
      // Show newest first
      return [...events]
        .reverse()
        .map((e) => ({
          id: e.id,
          description: formatEvent(e, participations, lifeAfterMap),
          isUndone: e.isUndone,
          createdAt: new Date(e.createdAt),
        }));
    },
    [events, participations],
  );

  const hasUndoable = events.some((e) => !e.isUndone);

  return { formatted, hasUndoable };
}
