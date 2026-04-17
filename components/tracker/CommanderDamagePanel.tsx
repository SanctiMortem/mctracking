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
  /** Called on every tap with +1 or −1. Parent updates damage + life synchronously. */
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
            onDelta={onDelta}
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
