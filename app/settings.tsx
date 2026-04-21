/**
 * SCR-018 — Settings
 * Tracker prefs, match setup, language, account (groups, sign out).
 * Access: gear icon in SCR-002 header.
 */
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  SectionList,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';

import { useSettings } from '@/hooks/useSettings';
import { useResponsive } from '@/hooks/useResponsive';
import { useAccountPlayer } from '@/contexts/AccountPlayerContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { themeList } from '@/styles/themes';
import type { ThemeId } from '@/styles/themes/types';
import type { AppTheme } from '@/styles/themes/types';
import { apiFetch } from '@/services/api';
import { spacing } from '@/styles/tokens';
import i18n, { resolveLanguage } from '@/constants/i18n';

// ─────────────────────────────────────────────
// SegmentedPicker — language + life total + theme
// ─────────────────────────────────────────────

interface SegmentedPickerProps<T extends string | number> {
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
}

function SegmentedPicker<T extends string | number>({
  options,
  selected,
  onSelect,
}: SegmentedPickerProps<T>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.segmented}>
      {options.map((opt, i) => {
        const isActive = opt.value === selected;
        return (
          <Pressable
            key={String(opt.value)}
            style={[
              styles.segmentedBtn,
              isActive && styles.segmentedBtnActive,
              i === 0 && styles.segmentedFirst,
              i === options.length - 1 && styles.segmentedLast,
            ]}
            onPress={() => onSelect(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.segmentedText, isActive && styles.segmentedTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────
// Row primitives
// ─────────────────────────────────────────────

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SettingRowStack({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.rowStack}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function LinkRow({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
      {!danger && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────

const LANGUAGE_OPTIONS: { label: string; value: 'auto' | 'en' | 'es' }[] = [
  { label: 'Auto', value: 'auto' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
];

const LIFE_TOTAL_OPTIONS: { label: string; value: number }[] = [
  { label: '25', value: 25 },
  { label: '30', value: 30 },
  { label: '40', value: 40 },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, getToken } = useAuth();
  const { t } = useTranslation();
  const { contentMaxWidth, contentPadding } = useResponsive();
  const { settings, loading, error, saving, refresh, patchSetting } = useSettings();
  const { accountPlayer, setAccountPlayer } = useAccountPlayer();
  const { theme, themeId, setThemeId } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [signingOut, setSigningOut] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  // ── Handlers ──────────────────────────────

  const handleLanguage = useCallback(
    (lang: 'auto' | 'en' | 'es') => {
      patchSetting({ language: lang });
      void i18n.changeLanguage(resolveLanguage(lang));
    },
    [patchSetting],
  );

  const handleEditName = useCallback(() => {
    setNameInput(accountPlayer?.name ?? '');
    setEditingName(true);
  }, [accountPlayer]);

  const handleSaveName = useCallback(async () => {
    if (!nameInput.trim() || savingName) return;
    setSavingName(true);
    try {
      const token = await getToken();
      const res = await apiFetch<{ success: boolean; data: import('@/db/index').Player }>(
        '/api/players/account',
        'PATCH',
        { name: nameInput.trim() },
        token ?? undefined,
      );
      setAccountPlayer(res.data);
      setEditingName(false);
    } catch (e) {
      Alert.alert(t('common.error'), (e as Error).message);
    } finally {
      setSavingName(false);
    }
  }, [nameInput, savingName, getToken, setAccountPlayer, t]);

  const handleSwipeGestures = useCallback(
    (v: boolean) => patchSetting({ swipe_gestures_enabled: v }),
    [patchSetting],
  );

  const handleRequireCommander = useCallback(
    (v: boolean) => patchSetting({ require_commander: v }),
    [patchSetting],
  );

  const handleLifeTotal = useCallback(
    (v: number) => patchSetting({ default_life_total: v }),
    [patchSetting],
  );

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      t('settings.clearHistoryTitle'),
      t('settings.clearHistoryConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clearHistoryAction'),
          style: 'destructive',
          onPress: async () => {
            if (clearingHistory) return;
            setClearingHistory(true);
            try {
              const token = await getToken();
              await apiFetch<{ success: boolean }>(
                '/api/admin/clear-history',
                'POST',
                {},
                token ?? undefined,
              );
              Alert.alert(t('settings.clearHistoryDone'));
            } catch (e) {
              Alert.alert(t('settings.clearHistoryError'), (e as Error).message);
            } finally {
              setClearingHistory(false);
            }
          },
        },
      ],
    );
  }, [clearingHistory, getToken, t]);

  const handleSignOut = useCallback(() => {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            router.replace('/auth');
          } catch {
            setSigningOut(false);
          }
        },
      },
    ]);
  }, [signOut, router]);

  // ── Section data ──────────────────────────

  type SectionItem =
    | { key: 'swipe' }
    | { key: 'require_commander' }
    | { key: 'life_total' }
    | { key: 'language' }
    | { key: 'theme' }
    | { key: 'player_name' }
    | { key: 'groups' }
    | { key: 'clear_history' }
    | { key: 'signout' };

  type Section = { title: string; data: SectionItem[] };

  const sections: Section[] = [
    {
      title: t('settings.tracker'),
      data: [{ key: 'swipe' }],
    },
    {
      title: t('settings.matchSetup'),
      data: [{ key: 'require_commander' }, { key: 'life_total' }],
    },
    {
      title: t('settings.language'),
      data: [{ key: 'language' }],
    },
    {
      title: t('settings.appearance'),
      data: [{ key: 'theme' }],
    },
    {
      title: t('settings.account'),
      data: [{ key: 'player_name' }, { key: 'groups' }, { key: 'signout' }],
    },
    {
      title: t('settings.data'),
      data: [{ key: 'clear_history' }],
    },
  ];

  const renderItem = useCallback(
    ({ item }: { item: SectionItem }) => {
      if (!settings) return null;

      switch (item.key) {
        case 'swipe':
          return (
            <SettingRow label={t('settings.swipeGestures')}>
              <Switch
                value={settings.swipeGesturesEnabled}
                onValueChange={handleSwipeGestures}
                trackColor={{ false: theme.colors.border.strong, true: theme.colors.accent.primary }}
                thumbColor={theme.colors.text.primary}
                accessibilityLabel="Enable swipe gestures"
              />
            </SettingRow>
          );

        case 'require_commander':
          return (
            <SettingRow label={t('settings.commanderRequired')}>
              <Switch
                value={settings.requireCommander}
                onValueChange={handleRequireCommander}
                trackColor={{ false: theme.colors.border.strong, true: theme.colors.accent.primary }}
                thumbColor={theme.colors.text.primary}
                accessibilityLabel="Commander required when creating decks"
              />
            </SettingRow>
          );

        case 'life_total':
          return (
            <SettingRowStack label={t('settings.startingLifeTotal')}>
              <SegmentedPicker
                options={LIFE_TOTAL_OPTIONS}
                selected={settings.defaultLifeTotal}
                onSelect={handleLifeTotal}
              />
            </SettingRowStack>
          );

        case 'language':
          return (
            <SettingRowStack label={t('settings.appLanguage')}>
              <SegmentedPicker
                options={LANGUAGE_OPTIONS}
                selected={settings.language}
                onSelect={handleLanguage}
              />
            </SettingRowStack>
          );

        case 'theme':
          return (
            <SettingRowStack label={t('settings.theme')}>
              <SegmentedPicker<ThemeId>
                options={themeList.map((th) => ({ label: th.label, value: th.id }))}
                selected={themeId}
                onSelect={setThemeId}
              />
            </SettingRowStack>
          );

        case 'player_name':
          if (!accountPlayer) return null;
          return editingName ? (
            <View style={styles.rowStack}>
              <Text style={styles.rowLabel}>{t('settings.playerName')}</Text>
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder={t('account.namePlaceholder')}
                  placeholderTextColor={theme.colors.text.muted}
                  autoFocus
                  maxLength={50}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                <Pressable style={styles.nameCancel} onPress={() => setEditingName(false)}>
                  <Text style={styles.nameCancelText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.nameSave, (!nameInput.trim() || savingName) && styles.nameSaveDisabled]}
                  onPress={handleSaveName}
                  disabled={!nameInput.trim() || savingName}
                >
                  {savingName
                    ? <ActivityIndicator color={theme.colors.text.primary} size="small" />
                    : <Text style={styles.nameSaveText}>{t('common.save')}</Text>
                  }
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.row} onPress={handleEditName} accessibilityRole="button">
              <Text style={styles.rowLabel}>{t('settings.playerName')}</Text>
              <Text style={styles.nameValue}>{accountPlayer.name}</Text>
            </Pressable>
          );

        case 'groups':
          return (
            <LinkRow
              label={t('settings.myGroups')}
              onPress={() => router.push('/groups')}
            />
          );

        case 'clear_history':
          return (
            <LinkRow
              label={clearingHistory ? t('settings.clearing') : t('settings.clearHistory')}
              onPress={handleClearHistory}
              danger
            />
          );

        case 'signout':
          return (
            <LinkRow
              label={signingOut ? t('settings.signingOut') : t('settings.signOut')}
              onPress={handleSignOut}
              danger
            />
          );

        default:
          return null;
      }
    },
    [
      settings,
      theme,
      styles,
      accountPlayer,
      editingName,
      nameInput,
      savingName,
      handleEditName,
      handleSaveName,
      handleSwipeGestures,
      handleRequireCommander,
      handleLifeTotal,
      handleLanguage,
      handleSignOut,
      handleClearHistory,
      clearingHistory,
      signingOut,
      router,
      themeId,
      setThemeId,
    ],
  );

  // ── Render ────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.title')}</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !settings) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.title')}</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Could not load settings'}</Text>
          <Pressable style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        {saving && <ActivityIndicator color={theme.colors.accent.primary} size="small" />}
      </View>

      <SectionList<SectionItem, Section>
        sections={sections}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[styles.listContent, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined]}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Themed Styles Factory
// ─────────────────────────────────────────────

function createStyles(t: AppTheme) {
  return {
    safe: { flex: 1 as const, backgroundColor: t.colors.background.primary },

    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border.subtle,
    },
    title: {
      color: t.colors.text.primary,
      fontSize: t.typography.size['heading-lg'],
      fontFamily: t.typography.fontFamily.headline,
      fontWeight: t.typography.weight.bold,
    },

    center: {
      flex: 1 as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[4],
      paddingHorizontal: spacing[6],
    },
    errorText: {
      color: t.colors.status.error,
      fontSize: t.typography.size['body-lg'],
      textAlign: 'center' as const,
    },
    retryBtn: {
      paddingHorizontal: spacing[6],
      paddingVertical: spacing[3],
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.colors.border.default,
    },
    retryText: { color: t.colors.text.secondary, fontSize: t.typography.size['body-lg'] },

    listContent: { paddingBottom: spacing[8] },
    sectionHeader: {
      color: t.colors.text.muted,
      fontSize: t.typography.size['body-sm'],
      fontWeight: t.typography.weight.semibold,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[6],
      paddingBottom: spacing[2],
    },
    sectionSeparator: { height: spacing[1] },
    separator: {
      height: 1,
      backgroundColor: t.colors.border.subtle,
      marginHorizontal: spacing[4],
    },

    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: t.colors.background.elevated,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
      minHeight: 52,
    },
    rowStack: {
      backgroundColor: t.colors.background.elevated,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      paddingBottom: spacing[4],
      gap: spacing[3],
    },
    rowLabel: {
      color: t.colors.text.primary,
      fontSize: t.typography.size['body-lg'],
      fontWeight: t.typography.weight.regular,
      flexShrink: 1 as const,
    },
    chevron: {
      color: t.colors.text.muted,
      fontSize: 20,
      lineHeight: 24,
    },
    dangerText: { color: t.colors.status.error },

    nameEditRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
    },
    nameInput: {
      flex: 1 as const,
      backgroundColor: t.colors.background.surface,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      color: t.colors.text.primary,
      fontSize: t.typography.size['body-md'],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
    },
    nameCancel: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
    },
    nameCancelText: {
      color: t.colors.text.secondary,
      fontSize: t.typography.size['body-sm'],
    },
    nameSave: {
      backgroundColor: t.colors.accent.primary,
      borderRadius: t.radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
    },
    nameSaveDisabled: { opacity: 0.5 },
    nameSaveText: {
      color: t.colors.accent.onPrimary,
      fontSize: t.typography.size['body-sm'],
      fontWeight: t.typography.weight.semibold,
    },
    nameValue: {
      color: t.colors.text.secondary,
      fontSize: t.typography.size['body-sm'],
    },

    segmented: {
      flexDirection: 'row' as const,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.colors.border.default,
      overflow: 'hidden' as const,
    },
    segmentedBtn: {
      flex: 1 as const,
      paddingVertical: spacing[2],
      alignItems: 'center' as const,
      backgroundColor: t.colors.background.surface,
      borderRightWidth: 1,
      borderRightColor: t.colors.border.default,
    },
    segmentedBtnActive: {
      backgroundColor: t.colors.accent.primary,
    },
    segmentedFirst: { borderLeftWidth: 0 },
    segmentedLast: { borderRightWidth: 0 },
    segmentedText: {
      color: t.colors.text.secondary,
      fontSize: t.typography.size['body-sm'],
      fontWeight: t.typography.weight.medium,
    },
    segmentedTextActive: {
      color: t.colors.accent.onPrimary,
      fontWeight: t.typography.weight.semibold,
    },
  };
}
