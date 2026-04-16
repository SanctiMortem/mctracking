/**
 * SCR-017 — Groups
 * Manage groups: view owned groups + memberships, create, invite, join.
 * Access: Settings screen or Home header context switcher.
 *
 * PLAT-006 (EPIC-05)
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  SectionList,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import type { GroupWithRole, InviteData } from '@/hooks/useGroups';
import { useGroups } from '@/hooks/useGroups';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type GroupSection = {
  title: string;
  data: GroupWithRole[];
};

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────

export default function GroupsScreen() {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  const router = useRouter();
  const { ownedGroups, memberGroups, loading, error, refresh, createGroup, getInvite, joinGroup } =
    useGroups();

  // ── Create modal ──────────────────────────────────────────
  const [createVisible, setCreateVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Join modal ────────────────────────────────────────────
  const [joinVisible, setJoinVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // ── Invite modal ──────────────────────────────────────────
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteGroupName, setInviteGroupName] = useState('');

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────

  async function handleCreate() {
    if (!groupName.trim()) {
      Alert.alert(t('common.error'), t('groups.groupNameRequired'));
      return;
    }
    setCreating(true);
    try {
      const entry = await createGroup(groupName.trim());
      setCreateVisible(false);
      setGroupName('');
      // Show invite link for the newly created group
      openInvite(entry.group.id, entry.group.name);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('groups.createError'));
    } finally {
      setCreating(false);
    }
  }

  async function openInvite(groupId: string, groupName: string) {
    setInviteGroupName(groupName);
    setInviteData(null);
    setInviteVisible(true);
    setInviteLoading(true);
    try {
      const data = await getInvite(groupId);
      setInviteData(data);
    } catch (e: unknown) {
      setInviteVisible(false);
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('groups.inviteGetError'));
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleShare() {
    if (!inviteData) return;
    try {
      await Share.share({
        message: t('groups.shareMessage', { code: inviteData.invite_code }),
        title: t('groups.shareTitle', { name: inviteGroupName }),
      });
    } catch {
      // User cancelled share — no-op
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) {
      setJoinError(t('groups.enterInviteCode'));
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      await joinGroup(joinCode.trim());
      setJoinVisible(false);
      setJoinCode('');
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === 'GROUP_INVITE_EXPIRED') {
        setJoinError(t('groups.inviteExpired'));
      } else if (code === 'ALREADY_A_MEMBER') {
        setJoinError(t('groups.alreadyMember'));
      } else if (code === 'NOT_FOUND') {
        setJoinError(t('groups.inviteNotFound'));
      } else {
        setJoinError(e instanceof Error ? e.message : t('groups.joinError'));
      }
    } finally {
      setJoining(false);
    }
  }

  function closeJoin() {
    setJoinVisible(false);
    setJoinCode('');
    setJoinError(null);
  }

  // ─────────────────────────────────────────────
  // Section data
  // ─────────────────────────────────────────────

  const sections: GroupSection[] = [
    { title: t('groups.myGroups'), data: ownedGroups },
    { title: t('groups.memberOf'), data: memberGroups },
  ];

  const isEmpty = ownedGroups.length === 0 && memberGroups.length === 0;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('groups.title')}</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.btnSecondary} onPress={() => setJoinVisible(true)} accessibilityLabel={t('groups.joinGroupLabel')}>
            <Text style={styles.btnSecondaryText}>{t('groups.join')}</Text>
          </Pressable>
          <Pressable style={styles.btnPrimary} onPress={() => setCreateVisible(true)} accessibilityLabel={t('groups.createGroupLabel')}>
            <Text style={styles.btnPrimaryText}>+ {t('groups.create')}</Text>
          </Pressable>
        </View>
      </View>

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
      ) : isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{t('groups.noGroupsYet')}</Text>
          <Text style={styles.emptyBody}>{t('groups.noGroupsBody')}</Text>
          <View style={styles.emptyActions}>
            <Pressable style={styles.btnPrimary} onPress={() => setCreateVisible(true)}>
              <Text style={styles.btnPrimaryText}>{t('groups.createGroup')}</Text>
            </Pressable>
            <Pressable style={styles.btnSecondary} onPress={() => setJoinVisible(true)}>
              <Text style={styles.btnSecondaryText}>{t('groups.joinWithCode')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <SectionList<GroupWithRole, GroupSection>
          sections={sections}
          keyExtractor={(item) => item.group.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) =>
            section.data.length > 0 ? (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <GroupRow
              item={item}
              onInvite={(id, name) => openInvite(id, name)}
              onPress={(id) => router.push(`/groups/${id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
          onRefresh={refresh}
          refreshing={loading}
        />
      )}

      {/* Create group modal */}
      <Modal visible={createVisible} transparent animationType="slide" onRequestClose={() => setCreateVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCreateVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{t('groups.newGroup')}</Text>
          <Text style={styles.inputLabel}>{t('groups.groupName')}</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g. MTG Martes"
            placeholderTextColor={theme.colors.text.muted}
            autoFocus
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <View style={styles.sheetActions}>
            <Pressable style={styles.btnCancel} onPress={() => { setCreateVisible(false); setGroupName(''); }}>
              <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, styles.btnFlex, creating && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color={theme.colors.text.primary} size="small" />
                : <Text style={styles.btnPrimaryText}>{t('common.create')}</Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Join group modal */}
      <Modal visible={joinVisible} transparent animationType="slide" onRequestClose={closeJoin}>
        <Pressable style={styles.backdrop} onPress={closeJoin} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{t('groups.joinGroup')}</Text>
          <Text style={styles.inputLabel}>{t('groups.inviteCode')}</Text>
          <TextInput
            style={[styles.input, joinError ? styles.inputError : undefined]}
            value={joinCode}
            onChangeText={(v) => { setJoinCode(v); setJoinError(null); }}
            placeholder="e.g. aB3xYz12"
            placeholderTextColor={theme.colors.text.muted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleJoin}
          />
          {joinError ? (
            <Text style={styles.joinErrorText}>{joinError}</Text>
          ) : null}
          <View style={styles.sheetActions}>
            <Pressable style={styles.btnCancel} onPress={closeJoin}>
              <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, styles.btnFlex, joining && styles.btnDisabled]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining
                ? <ActivityIndicator color={theme.colors.text.primary} size="small" />
                : <Text style={styles.btnPrimaryText}>{t('groups.join')}</Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invite link modal */}
      <Modal visible={inviteVisible} transparent animationType="slide" onRequestClose={() => setInviteVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setInviteVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{t('groups.inviteTo', { name: inviteGroupName })}</Text>
          {inviteLoading ? (
            <View style={styles.inviteLoading}>
              <ActivityIndicator color={theme.colors.accent.primary} size="large" />
            </View>
          ) : inviteData ? (
            <>
              <Text style={styles.inputLabel}>{t('groups.inviteCode')}</Text>
              <View style={styles.inviteCodeBox}>
                <Text style={styles.inviteCode} selectable>{inviteData.invite_code}</Text>
              </View>
              <Text style={styles.inviteExpiry}>
                {t('groups.inviteExpires', { date: new Date(inviteData.invite_expires_at).toLocaleDateString() })}
              </Text>
              <Pressable style={[styles.btnPrimary, styles.btnFullWidth]} onPress={handleShare}>
                <Text style={styles.btnPrimaryText}>{t('groups.shareInvite')}</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable style={[styles.btnCancel, styles.btnFullWidth, { marginTop: spacing[2] }]} onPress={() => setInviteVisible(false)}>
            <Text style={styles.btnCancelText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Group row component
// ─────────────────────────────────────────────

interface GroupRowProps {
  item: GroupWithRole;
  onInvite: (groupId: string, groupName: string) => void;
  onPress: (groupId: string) => void;
}

function GroupRow({ item, onInvite, onPress }: GroupRowProps) {
  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  const isOwner = item.role === 'owner';
  return (
    <Pressable style={styles.row} onPress={() => onPress(item.group.id)} accessibilityRole="button">
      <View style={styles.rowInfo}>
        <Text style={styles.groupName} numberOfLines={1}>{item.group.name}</Text>
        <View style={[styles.roleBadge, isOwner ? styles.ownerBadge : styles.memberBadge]}>
          <Text style={styles.roleBadgeText}>{isOwner ? t('groups.owner') : t('groups.member')}</Text>
        </View>
      </View>
      <View style={styles.rowActions}>
        {isOwner && (
          <Pressable
            style={styles.inviteBtn}
            onPress={(e) => { e.stopPropagation(); onInvite(item.group.id, item.group.name); }}
            accessibilityLabel={t('groups.getInviteLinkFor', { name: item.group.name })}
          >
            <Text style={styles.inviteBtnText}>{t('groups.invite')}</Text>
          </Pressable>
        )}
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  title: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-lg'],
    fontWeight: t.typography.weight.bold,
  },
  headerActions: { flexDirection: 'row', gap: spacing[2] },

  // Buttons
  btnPrimary: {
    backgroundColor: t.colors.accent.primary,
    borderRadius: t.radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  btnSecondary: {
    borderRadius: t.radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: t.colors.border.default,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    alignItems: 'center',
  },
  btnCancelText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
  },
  btnFlex: { flex: 2 },
  btnFullWidth: { width: '100%' },
  btnDisabled: { opacity: 0.6 },

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

  // Empty state
  emptyTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
    textAlign: 'center',
  },
  emptyBody: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-lg'],
    textAlign: 'center',
    lineHeight: t.typography.size['body-lg'] * t.typography.lineHeight.normal,
  },
  emptyActions: { gap: spacing[3], width: '100%' },

  // List
  listContent: { paddingBottom: spacing[8] },
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
  separator: { height: 1, backgroundColor: t.colors.border.subtle, marginHorizontal: spacing[4] },
  sectionSeparator: { height: spacing[2] },

  // Group row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: t.colors.background.primary,
  },
  rowInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3], minWidth: 0 },
  groupName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: t.radius.sm,
  },
  ownerBadge: { backgroundColor: t.colors.accent.primary + '33' }, // 20% opacity
  memberBadge: { backgroundColor: t.colors.background.elevated },
  roleBadgeText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  chevron: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['heading-lg'],
    fontWeight: '300' as any,
    marginLeft: spacing[1],
  },
  inviteBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.accent.primary,
  },
  inviteBtnText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },

  // Sheet (bottom modal)
  backdrop: { flex: 1, backgroundColor: t.colors.background.overlay },
  sheet: {
    backgroundColor: t.colors.background.elevated,
    borderTopLeftRadius: t.radius.xxl,
    borderTopRightRadius: t.radius.xxl,
    padding: spacing[6],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: t.radius.round,
    backgroundColor: t.colors.border.strong,
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  sheetTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
  },
  sheetActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  inputLabel: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
    marginBottom: -spacing[2],
  },
  input: {
    backgroundColor: t.colors.background.surface,
    color: t.colors.text.primary,
    borderRadius: t.radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: t.typography.size['body-lg'],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  inputError: { borderColor: t.colors.status.error },
  joinErrorText: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-sm'],
    marginTop: -spacing[2],
  },

  // Invite modal content
  inviteLoading: { paddingVertical: spacing[8], alignItems: 'center' },
  inviteCodeBox: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: t.colors.border.default,
    alignItems: 'center',
  },
  inviteCode: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.bold,
    letterSpacing: 2,
  },
  inviteExpiry: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center',
    marginTop: -spacing[2],
  },
})
