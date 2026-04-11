/**
 * EventLogPanel — CMP-011.
 *
 * Collapsible panel in SCR-008 showing the current session's event log.
 * Undo button reverts the last non-undone event (BR-TRACK-11, ilimitado).
 *
 * Shows newest events first. Undone events are shown with strikethrough.
 *
 * TRACK-007 (EPIC-03)
 */
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EventLogItem } from './EventLogItem';
import { useEventLog } from '@/hooks/useEventLog';
import type { LocalEvent, TrackerParticipation } from '@/hooks/useTracker';
import { colors, radius, spacing, typography } from '@/styles/tokens';

interface EventLogPanelProps {
  events: LocalEvent[];
  participations: TrackerParticipation[];
  onUndo: () => Promise<void>;
  onClose: () => void;
}

export function EventLogPanel({ events, participations, onUndo, onClose }: EventLogPanelProps) {
  const { formatted, hasUndoable } = useEventLog(events, participations);

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Event Log</Text>
        <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      {/* Event list */}
      {formatted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No events yet — start tracking!</Text>
        </View>
      ) : (
        <FlatList
          data={formatted}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EventLogItem event={item} />}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Undo button */}
      <View style={styles.footer}>
        <Pressable
          onPress={onUndo}
          disabled={!hasUndoable}
          style={[styles.undoBtn, !hasUndoable && styles.undoBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Undo last action"
          accessibilityState={{ disabled: !hasUndoable }}
        >
          <Text style={[styles.undoBtnText, !hasUndoable && styles.undoBtnTextDisabled]}>
            ↩  Undo
          </Text>
        </Pressable>
        {!hasUndoable && (
          <Text style={styles.noUndoHint}>No actions to undo</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '55%',
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.semibold,
  },
  closeBtn: {
    padding: spacing[2],
  },
  closeBtnText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },

  // Footer
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    alignItems: 'center',
    gap: spacing[1],
  },
  undoBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBtnDisabled: {
    backgroundColor: colors.background.surface,
  },
  undoBtnText: {
    color: '#fff',
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },
  undoBtnTextDisabled: {
    color: colors.text.muted,
  },
  noUndoHint: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
  },
});
