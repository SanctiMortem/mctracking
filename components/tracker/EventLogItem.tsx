/**
 * EventLogItem — single row in the EventLogPanel.
 *
 * Undone events appear with strikethrough (BR-TRACK-11).
 *
 * TRACK-007 (EPIC-03)
 */
import { StyleSheet, Text, View } from 'react-native';

import type { FormattedEvent } from '@/hooks/useEventLog';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

interface EventLogItemProps {
  event: FormattedEvent;
}

export function EventLogItem({ event }: EventLogItemProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.row, event.isUndone && styles.rowUndone]}>
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

const createStyles = (t: AppTheme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.border.subtle,
  },
  rowUndone: {
    opacity: 0.45,
  },
  description: {
    flex: 1,
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size['body-sm'],
  },
  descriptionUndone: {
    textDecorationLine: 'line-through',
    color: t.colors.text.muted,
  },
  undoneTag: {
    color: t.colors.text.muted,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size.caption,
  },
})
