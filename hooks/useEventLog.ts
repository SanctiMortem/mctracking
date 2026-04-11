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

/** Generates a human-readable description of a tracker event. */
function formatEvent(event: LocalEvent, participations: TrackerParticipation[]): string {
  const part = participations.find((p) => p.id === event.participationId);
  const playerName = part?.player.name ?? 'Unknown';

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
    () =>
      // Show newest first
      [...events]
        .reverse()
        .map((e) => ({
          id: e.id,
          description: formatEvent(e, participations),
          isUndone: e.isUndone,
          createdAt: new Date(e.createdAt),
        })),
    [events, participations],
  );

  const hasUndoable = events.some((e) => !e.isUndone);

  return { formatted, hasUndoable };
}
