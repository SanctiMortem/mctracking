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
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ActiveMatchBanner } from '@/components/home/ActiveMatchBanner';
import { MatchCard, MatchCardSkeleton } from '@/components/match/MatchCard';
import { useGroupContext } from '@/contexts/GroupContext';
import { useGroups } from '@/hooks/useGroups';
import { useHome } from '@/hooks/useHome';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, radius, spacing, typography } from '@/styles/tokens';
import { useEffect, useState } from 'react';

// ─── Context Switcher ─────────────────────────────────────────────────────────

interface ContextSwitcherProps {
  activeContext: 'personal' | string;
  onPress: () => void;
}

function ContextSwitcherChip({ activeContext, onPress }: ContextSwitcherProps) {
  const { t } = useTranslation();
  const { userGroups } = useGroupContext();

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

// ─── Stat Highlight Badge ─────────────────────────────────────────────────────

interface StatBadgeProps {
  totalMatches: number;
  winRatePct: number | null;
}

function StatBadge({ totalMatches, winRatePct }: StatBadgeProps) {
  const { t } = useTranslation();

  if (totalMatches === 0) {
    return (
      <View style={styles.statBadge}>
        <Text style={styles.statBadgePrimary}>{t('home.statNoMatches')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.statBadge}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{totalMatches}</Text>
        <Text style={styles.statLabel}>{t('home.statMatchesPlayed')}</Text>
      </View>
      {winRatePct !== null && (
        <>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.statWinRate]}>{winRatePct}%</Text>
            <Text style={styles.statLabel}>{t('home.statWinRate')}</Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyMatchState({ onNewMatch }: { onNewMatch: () => void }) {
  const { t } = useTranslation();
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
    activeMatch,
    recentMatches,
    totalMatches,
    winRatePct,
    loading,
    error,
    refresh,
  } = useHome(activeContext);

  const { isTablet, contentMaxWidth, contentPadding, scale } = useResponsive();
  const [contextModalVisible, setContextModalVisible] = useState(false);

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
          <Text style={styles.headerTitle}>{t('tabs.home')}</Text>
          {hasGroups && (
            <ContextSwitcherChip
              activeContext={activeContext}
              onPress={() => setContextModalVisible(true)}
            />
          )}
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
            tintColor={colors.text.muted}
          />
        }
      >
        {/* ── Error banner ── */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Active Match Banner ── */}
        {activeMatch && (
          <ActiveMatchBanner
            matchId={activeMatch.id}
            onPress={() => router.push(`/match/${activeMatch.id}/tracker`)}
          />
        )}

        {/* ── Primary CTA ── */}
        <Pressable
          onPress={() => router.push('/match/setup')}
          style={({ pressed }) => [styles.newMatchButton, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Text style={styles.newMatchText}>{t('match.newMatch')}</Text>
        </Pressable>

        {/* ── Stat Highlight ── */}
        {!loading && (
          <StatBadge totalMatches={totalMatches} winRatePct={winRatePct} />
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexShrink: 1,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontFamily: typography.fontFamily.headline,
    fontWeight: typography.weight.bold,
    flexShrink: 0,
  },
  gearButton: {
    padding: spacing[2],
    flexShrink: 0,
  },
  gearIcon: {
    fontSize: 20,
    color: colors.text.secondary,
  },

  // Context Switcher Chip
  contextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    gap: 4,
    flexShrink: 1,
  },
  contextChipPressed: { opacity: 0.7 },
  contextChipText: {
    color: colors.text.secondary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    flexShrink: 1,
  },
  contextChipCaret: {
    color: colors.text.muted,
    fontSize: 10,
    flexShrink: 0,
  },

  // Context Switcher Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: spacing[4],
  },
  modalSheet: {
    backgroundColor: colors.background.elevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    paddingVertical: spacing[2],
  },
  modalTitle: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  modalOptionActive: {
    backgroundColor: colors.background.surface,
  },
  modalOptionPressed: { opacity: 0.7 },
  modalOptionText: {
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
  },
  modalOptionTextActive: {
    color: colors.accent.primary,
    fontWeight: typography.weight.semibold,
  },
  modalOptionCheck: {
    color: colors.accent.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.bold,
  },

  // Scroll
  scroll: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },

  // Error
  errorBanner: {
    backgroundColor: colors.status.error + '22',
    borderRadius: radius.md,
    padding: spacing[3],
  },
  errorText: {
    color: colors.status.error,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
  },

  // New Match CTA
  newMatchButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    padding: spacing[4],
    alignItems: 'center',
  },
  newMatchText: {
    color: colors.accent.onPrimary,
    fontSize: typography.size['body-lg'],
    fontFamily: typography.fontFamily.headline,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.3,
  },

  // Stat Badge
  statBadge: {
    flexDirection: 'row',
    backgroundColor: colors.background.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: colors.text.primary,
    fontSize: typography.size['heading-lg'],
    fontFamily: typography.fontFamily.display,
    fontWeight: typography.weight.bold,
  },
  statWinRate: {
    color: colors.status.success,
  },
  statLabel: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
  statBadgePrimary: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border.subtle,
  },

  // Section
  section: {
    gap: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },
  sectionLink: {
    color: colors.text.link,
    fontSize: typography.size['body-sm'],
  },
  matchList: {
    gap: spacing[3],
  },
  matchListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[3],
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
  },
  emptyCtaButton: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  emptyCtaText: {
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
});
