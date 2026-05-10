/**
 * SCR-017b — Pod Detail
 * View pod members, leave or delete a pod.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { usePodMembers, type PodMemberData } from '@/hooks/usePodMembers';
import { useGroups } from '@/hooks/useGroups';
import { useAccountPlayer } from '@/contexts/AccountPlayerContext';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────

export default function PodDetailScreen() {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { accountPlayer } = useAccountPlayer();
  const { members, loading, error, refresh } = usePodMembers(id ?? null);
  const { groups, leaveGroup, archiveGroup } = useGroups();

  const [actionLoading, setActionLoading] = useState(false);

  // Find the current group from the list to get name + role
  const groupEntry = groups.find((g) => g.group.id === id);
  const groupName = groupEntry?.group.name ?? '';
  const isOwner = groupEntry?.role === 'owner';

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────

  function handleLeave() {
    if (!id) return;
    Alert.alert(
      t('groups.leaveConfirmTitle'),
      t('groups.leaveConfirmMessage', { name: groupName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groups.leavePod'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await leaveGroup(id);
              router.back();
            } catch (e: unknown) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('groups.leaveError'));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert(
      t('groups.deleteConfirmTitle'),
      t('groups.deleteConfirmMessage', { name: groupName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groups.deletePod'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await archiveGroup(id);
              router.back();
            } catch (e: unknown) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('groups.deleteError'));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  // ─────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────

  function renderMember({ item }: { item: PodMemberData }) {
    const isYou = accountPlayer?.id === item.player.id;
    const isMemberOwner = item.member.role === 'owner';
    return (
      <View style={styles.memberRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.player.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName} numberOfLines={1}>
              {item.player.name}
            </Text>
            {isYou && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>{t('groups.you')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberRole}>
            {isMemberOwner ? t('groups.owner') : t('groups.member')}
          </Text>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────
  // Layout
  // ─────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Pod name header */}
      <View style={styles.header}>
        <Text style={styles.podName}>{groupName}</Text>
        <View style={[styles.roleBadge, isOwner ? styles.ownerBadge : styles.memberBadge]}>
          <Text style={styles.roleBadgeText}>
            {isOwner ? t('groups.owner') : t('groups.member')}
          </Text>
        </View>
      </View>

      {/* Section title */}
      <Text style={styles.sectionHeader}>{t('groups.members')}</Text>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : members.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('groups.noMembers')}</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.member.id}
          renderItem={renderMember}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onRefresh={refresh}
          refreshing={loading}
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {actionLoading ? (
          <ActivityIndicator color={theme.colors.accent.primary} size="small" />
        ) : isOwner ? (
          <Pressable style={styles.btnDanger} onPress={handleDelete}>
            <Text style={styles.btnDangerText}>{t('groups.deletePod')}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.btnDanger} onPress={handleLeave}>
            <Text style={styles.btnDangerText}>{t('groups.leavePod')}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  safe: { flex: 1, backgroundColor: t.colors.background.primary },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  podName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-lg'],
    fontWeight: t.typography.weight.bold,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: t.radius.sm,
  },
  ownerBadge: { backgroundColor: t.colors.accent.primary + '33' },
  memberBadge: { backgroundColor: t.colors.background.elevated },
  roleBadgeText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Section header
  sectionHeader: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[2],
  },

  // List
  listContent: { paddingBottom: spacing[4] },
  separator: { height: 1, backgroundColor: t.colors.border.subtle, marginHorizontal: spacing[4] },

  // Member row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.bold,
  },
  memberInfo: { flex: 1, gap: 2 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  memberName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
    flexShrink: 1,
  },
  memberRole: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },
  youBadge: {
    backgroundColor: t.colors.accent.primary + '33',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: t.radius.sm,
  },
  youBadgeText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
  },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4], paddingHorizontal: spacing[6] },
  errorText: { color: t.colors.status.error, fontSize: t.typography.size['body-lg'], textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  retryText: { color: t.colors.text.secondary, fontSize: t.typography.size['body-lg'] },
  emptyText: { color: t.colors.text.muted, fontSize: t.typography.size['body-lg'] },

  // Actions
  actions: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: t.colors.border.subtle,
    alignItems: 'center',
  },
  btnDanger: {
    width: '100%',
    paddingVertical: spacing[3],
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.status.error,
    alignItems: 'center',
  },
  btnDangerText: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
})
