/**
 * CommanderDamagePanel — CMP-005.
 *
 * Collapsible panel showing one CommanderDamageRow per enemy commander.
 * Partners get two separate rows (BR-TRACK-03).
 *
 * TRACK-005 (EPIC-03)
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CommanderDamageRow } from './CommanderDamageRow';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, radius, spacing, typography } from '@/styles/tokens';
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
  const [expanded, setExpanded] = useState(false);

  if (enemyCommanders.length === 0) return null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse commander damage panel' : 'Expand commander damage panel'}
      >
        <Text style={styles.toggleIcon}>⚔️</Text>
        <Text style={styles.toggleLabel}>CMD Damage</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && (
        <ScrollView
          style={[styles.list, isTablet && { maxHeight: scale(160) }]}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    flexShrink: 1,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  toggleIcon: {
    fontSize: typography.size['body-sm'],
  },
  toggleLabel: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  chevron: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
  },
  list: {
    maxHeight: 160,
  },
  listContent: {
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[2],
  },
});
