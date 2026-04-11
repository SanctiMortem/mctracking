/**
 * PlayerList — FlatList of players with tap-to-profile, edit and delete.
 * DATA-006 (EPIC-01)
 */
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Player } from '@/db/index';
import { colors, radius, spacing, typography } from '@/styles/tokens';

// Fixed row height enables getItemLayout optimisation for large lists
const ROW_HEIGHT = 64;

interface PlayerListProps {
  players: Player[];
  onTap: (player: Player) => void;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
}

function PlayerRow({
  player,
  onTap,
  onEdit,
  onDelete,
}: {
  player: Player;
  onTap: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  function confirmDelete() {
    Alert.alert(
      'Remove Player',
      `Remove "${player.name}" from your roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onDelete },
      ],
    );
  }

  // Initials avatar
  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Pressable style={styles.row} onPress={onTap} android_ripple={{ color: colors.border.subtle }}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>{player.name}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={styles.actionBtn} accessibilityLabel={`Edit ${player.name}`}>
          <Text style={styles.actionEdit}>Edit</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} style={styles.actionBtn} accessibilityLabel={`Remove ${player.name}`}>
          <Text style={styles.actionDelete}>Remove</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No players yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the button above to add your first player.
      </Text>
    </View>
  );
}

export function PlayerList({ players, onTap, onEdit, onDelete }: PlayerListProps) {
  return (
    <FlatList
      data={players}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PlayerRow
          player={item}
          onTap={() => onTap(item)}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item)}
        />
      )}
      getItemLayout={(_, index) => ({
        length: ROW_HEIGHT,
        offset: ROW_HEIGHT * index,
        index,
      })}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<EmptyState />}
      contentContainerStyle={players.length === 0 ? styles.emptyContainer : undefined}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    backgroundColor: colors.background.secondary,
    gap: spacing[3],
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.round,
    backgroundColor: colors.accent.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.bold,
  },
  name: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  actions: { flexDirection: 'row', gap: spacing[3] },
  actionBtn: { padding: spacing[2] },
  actionEdit: {
    color: colors.text.link,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  actionDelete: {
    color: colors.status.error,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginLeft: spacing[4] + 40 + spacing[3], // align with name text
  },
  empty: { alignItems: 'center', gap: spacing[2] },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyTitle: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  emptySubtitle: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
    paddingHorizontal: spacing[8],
  },
});
