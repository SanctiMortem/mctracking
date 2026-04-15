/**
 * CommanderDamagePanel — overlay content for commander damage.
 *
 * Shows all enemy commander damage rows directly (no toggle/expand).
 * The overlay chrome (backdrop, close button) is handled by PlayerDashboard.
 *
 * Partners get two separate rows (BR-TRACK-03).
 *
 * TRACK-005 (EPIC-03)
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CommanderDamageRow } from './CommanderDamageRow';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography } from '@/styles/tokens';
import type { EventType } from '@/services/matchEvents';

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
  onEvent: (input: {
    participationId: string;
    eventType: EventType;
    delta: number;
    commanderIdSource?: string;
  }) => Promise<void>;
}

export function CommanderDamagePanel({
  commanderDamage,
  enemyCommanders,
  participationId,
  onEvent,
}: CommanderDamagePanelProps) {
  const { scale, isTablet } = useResponsive();

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
            currentDamage={commanderDamage[cmd.id] ?? 0}
            participationId={participationId}
            onEvent={onEvent}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[2],
    width: '100%',
  },
  title: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    maxHeight: 200,
    width: '100%',
  },
  listContent: {
    paddingHorizontal: spacing[2],
    gap: spacing[1],
  },
});
