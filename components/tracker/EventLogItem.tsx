/**
 * EventLogItem — single row in the EventLogPanel.
 *
 * Undone events appear with strikethrough (BR-TRACK-11).
 *
 * TRACK-007 (EPIC-03)
 */
import { StyleSheet, Text, View } from 'react-native';

import type { FormattedEvent } from '@/hooks/useEventLog';
import { colors, spacing, typography } from '@/styles/tokens';

interface EventLogItemProps {
  event: FormattedEvent;
}

export function EventLogItem({ event }: EventLogItemProps) {
  const time = event.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <View style={[styles.row, event.isUndone && styles.rowUndone]}>
      <Text style={styles.time}>{time}</Text>
      <Text
        style={[styles.description, event.isUndone && styles.descriptionUndone]}
        numberOfLines={2}
      >
        {event.description}
      </Text>
      {event.isUndone && <Text style={styles.undoneTag}>↩</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  rowUndone: {
    opacity: 0.45,
  },
  time: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontVariant: ['tabular-nums'],
    minWidth: 56,
  },
  description: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
  },
  descriptionUndone: {
    textDecorationLine: 'line-through',
    color: colors.text.muted,
  },
  undoneTag: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
  },
});
