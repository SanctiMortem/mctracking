/**
 * SCR-002 — Home Screen
 *
 * Post-login dashboard. Shows:
 *   - Context switcher chip (header, only if user has ≥1 group) — ADR-005
 *   - Active match banner (scoped to active context) — ADR-004, CMP-015
 *   - Primary CTA "New Match"
 *   - Last 3 MatchCards + link to full history
 *   - Stat highlight badge (total matches + aggregate win rate)
 *   - Empty state when no matches exist
 *
 * US-044, US-045 · PLAT-010 (EPIC-05)
 */
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AccountStatsCard } from '@/components/home/AccountStatsCard';
import { ActiveMatchBanner } from '@/components/home/ActiveMatchBanner';
import { GlobalStatsCard } from '@/components/home/GlobalStatsCard';
import { MatchCard, MatchCardSkeleton } from '@/components/match/MatchCard';
import { useGroupContext } from '@/contexts/GroupContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useGroups } from '@/hooks/useGroups';
import { useHome } from '@/hooks/useHome';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { spacing } from '@/styles/tokens';
import { useEffect, useState } from 'react';

// ─── Context Switcher ─────────────────────────────────────────────────────────

interface ContextSwitcherProps {
  activeContext: 'personal' | string;
  onPress: () => void;
}

function ContextSwitcherChip({ activeContext, onPress }: ContextSwitcherProps) {
  const { t } = useTranslation();
  const { userGroups } = useGroupContext();
  const styles = useThemedStyles(createStyles);

  const label =
    activeContext === 'personal'
      ? t('home.contextPersonal')
      : (userGroups.find((g) => g.group.id === activeContext)?.group.name ?? t('home.contextPersonal'));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.contextChip, pressed && styles.contextChipPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('home.contextSwitcherA11y')}
    >
      <Text style={styles.contextChipText}>{label}</Text>
      <Text style={styles.contextChipCaret}>▾</Text>
    </Pressable>
  );
}

// ─── Context Switcher Modal ───────────────────────────────────────────────────

interface ContextSwitcherModalProps {
  visible: boolean;
  activeContext: 'personal' | string;
  onSelect: (ctx: 'personal' | string) => void;
  onClose: () => void;
}

function ContextSwitcherModal({
  visible,
  activeContext,
  onSelect,
  onClose,
}: ContextSwitcherModalProps) {
  const { t } = useTranslation();
  const { userGroups } = useGroupContext();
  const styles = useThemedStyles(createStyles);

  const options: { id: 'personal' | string; label: string }[] = [
    { id: 'personal', label: t('home.contextPersonal') },
    ...userGroups.map((g) => ({ id: g.group.id, label: g.group.name })),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{t('home.contextSwitcherTitle')}</Text>
          {options.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => { onSelect(opt.id); onClose(); }}
              style={({ pressed }) => [
                styles.modalOption,
                activeContext === opt.id && styles.modalOptionActive,
                pressed && styles.modalOptionPressed,
              ]}
            >
              <Text style={[
                styles.modalOptionText,
                activeContext === opt.id && styles.modalOptionTextActive,
              ]}>
                {opt.label}
              </Text>
              {activeContext === opt.id && (
                <Text style={styles.modalOptionCheck}>✓</Text>
              )}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyMatchState({ onNewMatch }: { onNewMatch: () => void }) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🃏</Text>
      <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
      <Pressable
        onPress={onNewMatch}
        style={({ pressed }) => [styles.emptyCtaButton, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.emptyCtaText}>{t('home.emptyCtaButton')}</Text>
      </Pressable>
    </View>
  );
}


// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { activeContext, setActiveContext, userGroups } = useGroupContext();
  const { groups, loading: loadingGroups } = useGroups();
  const {
    activeMatches,
    recentMatches,
    totalMatches,
    accountStats,
    globalAggregates,
    loading,
    error,
    refresh,
  } = useHome(activeContext);

  const { isTablet, contentMaxWidth, contentPadding, scale } = useResponsive();
  const [contextModalVisible, setContextModalVisible] = useState(false);
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Sync groups into context so switcher modal has fresh data
  const { setUserGroups } = useGroupContext();
  useEffect(() => {
    if (!loadingGroups) {
      setUserGroups(groups);
      // Reset to personal if the active group no longer exists
      if (activeContext !== 'personal' && !groups.find((g) => g.group.id === activeContext)) {
        setActiveContext('personal');
      }
    }
  }, [loadingGroups, groups]);

  const hasGroups = userGroups.length > 0 || groups.length > 0;

  return (
    <SafeAreaView style={styles.screen}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingHorizontal: contentPadding }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>{t('tabs.home')}</Text>
              {hasGroups && (
                <ContextSwitcherChip
                  activeContext={activeContext}
                  onPress={() => setContextModalVisible(true)}
                />
              )}
            </View>
            <Text style={styles.headerSubtitle}>
              The gate to your journey — where every legend begins.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.gearButton, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={t('tabs.settings')}
        >
          <Text style={styles.gearIcon}>⚙</Text>
        </Pressable>
      </View>

      {/* ── Context Switcher Modal ── */}
      <ContextSwitcherModal
        visible={contextModalVisible}
        activeContext={activeContext}
        onSelect={setActiveContext}
        onClose={() => setContextModalVisible(false)}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: contentPadding },
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={theme.colors.text.muted}
          />
        }
      >
        {/* ── Error banner ── */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Active Matches — one frame, one row per in-progress match in context ── */}
        {activeMatches.length > 0 && (
          <View style={styles.activeMatchFrame}>
            <Text style={styles.activeMatchFrameTitle}>
              {activeMatches.length === 1
                ? t('home.matchInProgressTitle')
                : t('home.matchesInProgressTitle')}
            </Text>
            {activeMatches.map((match, idx) => (
              <View key={match.id}>
                {idx > 0 && <View style={styles.activeMatchDivider} />}
                <ActiveMatchBanner
                  matchId={match.id}
                  startedAt={match.started_at}
                  hostName={match.host_name}
                  onPress={() => router.push(`/match/${match.id}/tracker`)}
                />
              </View>
            ))}
          </View>
        )}

        {/* ── Primary CTA ── */}
        <Pressable
          onPress={() => router.push('/match/setup')}
          style={({ pressed }) => [styles.newMatchButton, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Text style={styles.newMatchText}>{t('match.newMatch')}</Text>
        </Pressable>

        {/* ── Casual / untracked match (in-memory, not saved) ── */}
        <Pressable
          onPress={() => router.push('/match/casual')}
          style={({ pressed }) => [styles.casualMatchButton, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={t('match.casualMatch')}
        >
          <Text style={styles.casualMatchText}>{t('match.casualMatch')}</Text>
          <Text style={styles.casualMatchSubtext}>{t('match.casualMatchSubtitle')}</Text>
        </Pressable>

        {/* ── My Pods ── */}
        <Pressable
          onPress={() => router.push('/groups')}
          style={({ pressed }) => [styles.podsButton, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={t('groups.title')}
        >
          <Text style={styles.podsButtonText}>{t('settings.myGroups')}</Text>
          <Text style={styles.podsButtonCaret}>›</Text>
        </Pressable>

        {/* ── Account Stats ── */}
        {!loading && accountStats && (
          <AccountStatsCard stats={accountStats} />
        )}

        {/* ── Global Stats ── */}
        {!loading && globalAggregates && (
          <GlobalStatsCard stats={globalAggregates} />
        )}

        {/* ── Recent Matches ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.recentMatchesTitle')}</Text>
            {totalMatches > 3 && (
              <Pressable
                onPress={() => router.push('/(tabs)/history')}
                accessibilityRole="link"
              >
                <Text style={styles.sectionLink}>
                  {t('home.seeAll', { count: totalMatches })}
                </Text>
              </Pressable>
            )}
          </View>

          {loading ? (
            <>
              <MatchCardSkeleton />
              <MatchCardSkeleton />
              <MatchCardSkeleton />
            </>
          ) : recentMatches.length === 0 ? (
            <EmptyMatchState onNewMatch={() => router.push('/match/setup')} />
          ) : (
            <View style={[styles.matchList, isTablet && styles.matchListGrid]}>
              {recentMatches.map((summary) => (
                <MatchCard
                  key={summary.match.id}
                  summary={summary}
                  onPress={() => router.push(`/match/${summary.match.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  screen: {
    flex: 1 as const,
    backgroundColor: t.colors.background.primary,
  },

  // Header
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  headerLeft: {
    flex: 1 as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    flexShrink: 1 as const,
  },
  headerTitleBlock: {
    flex: 1 as const,
    gap: 2,
    flexShrink: 1 as const,
  },
  headerTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    flexShrink: 1 as const,
  },
  headerTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.bold,
    flexShrink: 0 as const,
  },
  headerSubtitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.body,
    fontStyle: 'italic' as const,
    letterSpacing: 0.2,
  },
  gearButton: {
    padding: spacing[2],
    flexShrink: 0 as const,
  },
  gearIcon: {
    fontSize: 20,
    color: t.colors.text.secondary,
  },

  // Context Switcher Chip
  contextChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.round,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    gap: 4,
    flexShrink: 1 as const,
  },
  contextChipPressed: { opacity: 0.7 },
  contextChipText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.medium,
    flexShrink: 1 as const,
  },
  contextChipCaret: {
    color: t.colors.text.muted,
    fontSize: 10,
    flexShrink: 0 as const,
  },

  // Context Switcher Modal
  modalBackdrop: {
    flex: 1 as const,
    backgroundColor: t.colors.background.overlay,
    justifyContent: 'flex-start' as const,
    paddingTop: 80,
    paddingHorizontal: spacing[4],
  },
  modalSheet: {
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    overflow: 'hidden' as const,
    paddingVertical: spacing[2],
  },
  modalTitle: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  modalOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  modalOptionActive: {
    backgroundColor: t.colors.background.surface,
  },
  modalOptionPressed: { opacity: 0.7 },
  modalOptionText: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
  },
  modalOptionTextActive: {
    color: t.colors.accent.primary,
    fontWeight: t.typography.weight.semibold,
  },
  modalOptionCheck: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.bold,
  },

  // Scroll
  scroll: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },

  // Error
  errorBanner: {
    backgroundColor: t.colors.status.error + '22',
    borderRadius: t.radius.md,
    padding: spacing[3],
  },
  errorText: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center' as const,
  },

  // Frame wrapping all in-progress matches. One outlined container labeled
  // "Matches in Progress" (or singular) with each banner as a row inside.
  // Height grows naturally with the number of matches.
  activeMatchFrame: {
    backgroundColor: t.colors.accent.primary + '14',
    borderWidth: 1,
    borderColor: t.colors.accent.primary + '44',
    borderRadius: t.radius.lg,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    gap: spacing[1],
  },
  activeMatchFrameTitle: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size.label,
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    paddingHorizontal: spacing[2],
  },
  activeMatchDivider: {
    height: 1,
    backgroundColor: t.colors.accent.primary + '22',
    marginHorizontal: spacing[2],
  },

  // New Match CTA
  newMatchButton: {
    backgroundColor: t.colors.accent.primary,
    borderRadius: t.radius.lg,
    padding: spacing[4],
    alignItems: 'center' as const,
  },
  newMatchText: {
    color: t.colors.accent.onPrimary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.bold,
    letterSpacing: 0.3,
  },

  // Casual Match — secondary outlined button under the primary CTA.
  casualMatchButton: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center' as const,
    gap: 2,
  },
  casualMatchText: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.3,
  },
  casualMatchSubtext: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontStyle: 'italic' as const,
  },

  // My Pods button
  podsButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  podsButtonText: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
  },
  podsButtonCaret: {
    color: t.colors.text.muted,
    fontSize: 20,
  },

  // Section
  section: {
    gap: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  sectionTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  sectionLink: {
    color: t.colors.text.link,
    fontSize: t.typography.size['body-sm'],
  },
  matchList: {
    gap: spacing[3],
  },
  matchListGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },

  // Empty state
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: spacing[8],
    gap: spacing[3],
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center' as const,
  },
  emptyCtaButton: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  emptyCtaText: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
});
