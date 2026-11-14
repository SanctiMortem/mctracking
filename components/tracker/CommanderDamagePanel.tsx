/**
 * CommanderDamagePanel — overlay content for commander damage.
 *
 * Shows all enemy commander damage rows directly (no toggle/expand).
 * The overlay chrome (backdrop, close button) is handled by PlayerDashboard.
 *
 * Per-hit entry (CMDR-001): every counter starts at 0 each time the panel
 * opens and + / − set only the damage from THIS hit. The running total sits
 * next to the commander's name. Nothing is applied while the panel is open;
 * when it closes (unmounts) each non-zero hit is handed to `onDelta` once,
 * so it reaches the log as a single commander_damage event of that size.
 *
 * Partners get two separate rows (BR-TRACK-03).
 *
 * TRACK-005 (EPIC-03)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { CommanderDamageRow } from './CommanderDamageRow';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface EnemyCommander {
  id: string;
  name: string;
}

interface CommanderDamagePanelProps {
  /** Current commander_damage JSONB from participation: { [commander_id]: number } */
  commanderDamage: Record<string, number>;
  /** List of all enemy commanders visible to this player (partners as separate entries). */
  enemyCommanders: EnemyCommander[];
  participationId: string;
  /** Called once per commander when the panel closes, with that hit's full amount. */
  onDelta: (participationId: string, commanderIdSource: string, delta: number) => void;
}

export function CommanderDamagePanel({
  commanderDamage,
  enemyCommanders,
  participationId,
  onDelta,
}: CommanderDamagePanelProps) {
  const { scale, isTablet } = useResponsive();
  const styles = useThemedStyles(createStyles);

  // Damage entered for the hit in progress, per source commander.
  const [hits, setHits] = useState<Record<string, number>>({});

  // Refs so the unmount commit sees the latest values without re-subscribing.
  const hitsRef = useRef(hits);
  hitsRef.current = hits;
  const onDeltaRef = useRef(onDelta);
  onDeltaRef.current = onDelta;
  const participationIdRef = useRef(participationId);
  participationIdRef.current = participationId;

  const adjustHit = useCallback((commanderId: string, delta: number) => {
    setHits((prev) => {
      const next = Math.max(0, (prev[commanderId] ?? 0) + delta);
      return { ...prev, [commanderId]: next };
    });
  }, []);

  // Commit on close: the panel only stays mounted while the overlay is open.
  useEffect(
    () => () => {
      for (const [commanderId, amount] of Object.entries(hitsRef.current)) {
        if (amount > 0) onDeltaRef.current(participationIdRef.current, commanderId, amount);
      }
    },
    [],
  );

  if (enemyCommanders.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Commander Damage</Text>

      <ScrollView
        style={[styles.list, isTablet && { maxHeight: scale(200) }]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {enemyCommanders.map((cmd) => (
          <CommanderDamageRow
            key={cmd.id}
            commanderName={cmd.name}
            commanderId={cmd.id}
            totalDamage={commanderDamage[cmd.id] ?? 0}
            hit={hits[cmd.id] ?? 0}
            onAdjust={adjustHit}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  container: {
    alignItems: 'center' as const,
    gap: spacing[2],
    width: '100%' as const,
  },
  title: {
    color: t.colors.accent.primaryAlt,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  list: {
    maxHeight: 200,
    width: '100%' as const,
  },
  listContent: {
    paddingHorizontal: spacing[2],
    gap: spacing[1],
  },
});
