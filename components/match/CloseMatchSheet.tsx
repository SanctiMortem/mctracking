/**
 * CloseMatchSheet — SCR-009 bottom sheet content.
 *
 * Modes:
 *  - win:     player winner list + win condition picker
 *  - draw:    confirmation card
 *  - abandon: warning card
 *
 * Stateless — all state managed by useCloseMatch in the parent screen.
 *
 * MATCH-006 (EPIC-02)
 */
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import type { CloseMode } from '@/hooks/useCloseMatch';
import type { ParticipationDetail } from '@/services/matches';
import { colors, radius, spacing, typography } from '@/styles/tokens';

import { WinConditionPicker } from './WinConditionPicker';

interface CloseMatchSheetProps {
  participations: ParticipationDetail[];
  loading: boolean;
  mode: CloseMode;
  onModeChange: (mode: CloseMode) => void;
  selectedWinnerId: string | null;
  onSelectWinner: (id: string | null) => void;
  selectedWinCondition: string | null;
  onSelectWinCondition: (cond: string | null) => void;
  isValid: boolean;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  /** Hide the abandon option (e.g. in edit mode) */
  hideAbandon?: boolean;
}

export function CloseMatchSheet({
  participations,
  loading,
  mode,
  onModeChange,
  selectedWinnerId,
  onSelectWinner,
  selectedWinCondition,
  onSelectWinCondition,
  isValid,
  isSubmitting,
  error,
  onConfirm,
  onCancel,
  hideAbandon = false,
}: CloseMatchSheetProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.sheet}>
      {/* Drag handle */}
      <View style={styles.handleRow}>
        <View style={styles.handle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('match.result')}</Text>
        <Pressable onPress={onCancel} style={styles.cancelBtn} accessibilityRole="button">
          <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>

      {/* Scrollable body */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator color={colors.accent.primary} style={styles.loader} />
        ) : (
          <>
            {/* ── Win mode ── */}
            {mode === 'win' && (
              <>
                <Text style={styles.sectionLabel}>{t('match.whoWon')}</Text>
                {participations.map((p) => {
                  const isSelected = selectedWinnerId === p.id;
                  const initials = p.player.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => onSelectWinner(isSelected ? null : p.id)}
                      style={[styles.playerRow, isSelected && styles.playerRowSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                        <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
                          {initials}
                        </Text>
                      </View>
                      <Text style={[styles.playerName, isSelected && styles.playerNameSelected]}>
                        {p.player.name}
                      </Text>
                      {isSelected && <Text style={styles.check}>✓</Text>}
                    </Pressable>
                  );
                })}

                {/* Win condition — revealed after winner is chosen */}
                {selectedWinnerId !== null && (
                  <View style={styles.winConditionSection}>
                    <Text style={styles.sectionLabel}>{t('match.howWin')}</Text>
                    <WinConditionPicker
                      selected={selectedWinCondition}
                      onSelect={onSelectWinCondition}
                    />
                  </View>
                )}
              </>
            )}

            {/* ── Draw mode ── */}
            {mode === 'draw' && (
              <View style={styles.modeCard}>
                <Text style={styles.modeIcon}>🤝</Text>
                <Text style={styles.modeTitle}>{t('match.draw')}</Text>
                <Text style={styles.modeBody}>{t('match.drawDescription')}</Text>
              </View>
            )}

            {/* ── Abandon mode ── */}
            {mode === 'abandon' && (
              <View style={styles.modeCard}>
                <Text style={styles.modeIcon}>⚠️</Text>
                <Text style={styles.modeTitle}>{t('match.abandon')}</Text>
                <Text style={styles.modeBody}>{t('match.abandonDescription')}</Text>
              </View>
            )}

            {/* ── Secondary: Draw / Abandon toggles ── */}
            <View style={styles.secondaryRow}>
              <Pressable
                onPress={() => onModeChange(mode === 'draw' ? 'win' : 'draw')}
                style={[styles.secondaryBtn, mode === 'draw' && styles.secondaryBtnActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.secondaryBtnText, mode === 'draw' && styles.secondaryBtnTextActive]}>
                  {t('match.draw')}
                </Text>
              </Pressable>
              {!hideAbandon && (
                <Pressable
                  onPress={() => onModeChange(mode === 'abandon' ? 'win' : 'abandon')}
                  style={[styles.secondaryBtn, mode === 'abandon' && styles.secondaryBtnActive]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.secondaryBtnText, mode === 'abandon' && styles.secondaryBtnTextActive]}>
                    {t('match.abandon')}
                  </Text>
                </Pressable>
              )}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Bottom spacer so confirm button doesn't overlap last row */}
            <View style={styles.scrollSpacer} />
          </>
        )}
      </ScrollView>

      {/* ── Sticky confirm footer ── */}
      <View style={styles.footer}>
        <Pressable
          onPress={onConfirm}
          disabled={!isValid || isSubmitting}
          style={[styles.confirmBtn, (!isValid || isSubmitting) && styles.confirmBtnDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid || isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.confirmBtnText, (!isValid || isSubmitting) && styles.confirmBtnTextDisabled]}>
              {t('match.confirmResult')}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 24,
  },

  // Handle
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.round,
    backgroundColor: colors.border?.default ?? '#2A2A45',
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
  cancelBtn: {
    padding: spacing[2],
  },
  cancelBtnText: {
    color: colors.text.link,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },

  // Body
  body: { flexShrink: 1 },
  bodyContent: { padding: spacing[4], gap: spacing[2] },
  loader: { marginTop: spacing[8] },
  scrollSpacer: { height: spacing[4] },

  // Section label
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },

  // Player rows
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.background.surface,
    marginBottom: spacing[2],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  playerRowSelected: {
    backgroundColor: colors.accent.primary + '14',
    borderColor: colors.accent.primary,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.round,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: { backgroundColor: colors.accent.primary + '33' },
  avatarText: {
    color: colors.text.secondary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  avatarTextSelected: { color: colors.accent.primary },
  playerName: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  playerNameSelected: { fontWeight: typography.weight.semibold },
  check: {
    color: colors.accent.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.bold,
  },

  winConditionSection: { marginTop: spacing[4] },

  // Draw / Abandon mode cards
  modeCard: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[6],
  },
  modeIcon: { fontSize: 40 },
  modeTitle: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.semibold,
  },
  modeBody: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
    lineHeight: typography.size['body-sm'] * 1.6,
    paddingHorizontal: spacing[4],
  },

  // Draw / Abandon toggle row
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border?.default ?? '#2A2A45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnActive: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primary + '1A',
  },
  secondaryBtnText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  secondaryBtnTextActive: {
    color: colors.accent.primary,
    fontWeight: typography.weight.semibold,
  },

  errorText: {
    color: colors.status.error,
    fontSize: typography.size['body-sm'],
    marginTop: spacing[3],
  },

  // Footer
  footer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  confirmBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.xl,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { backgroundColor: colors.background.surface },
  confirmBtnText: {
    color: '#fff',
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.5,
  },
  confirmBtnTextDisabled: { color: colors.text.muted },
});
