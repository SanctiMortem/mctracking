/**
 * PlayerDashboard — Level 3: The scalable content "object" inside each PlayerFrame.
 *
 * Contains all tracker items (player name + turn timer, LifeCounter,
 * PoisonCounter, CommanderDamagePanel) as a single unit that scales
 * together using percentage-based sizing. The dashboard never affects
 * its parent frame's position — it lives entirely within it.
 *
 * Tap the player name to start/stop a per-player turn timer.
 *
 * TRACK-003 (EPIC-03)
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography } from '@/styles/tokens';

interface PlayerDashboardProps {
  playerName: string;
  /** Turn timer elapsed seconds (persists across start/stop). */
  timerSeconds: number;
  /** Whether this player's timer is currently running. */
  timerActive: boolean;
  /** Called when the player name is tapped to toggle their timer. */
  onToggleTimer: () => void;
  children: React.ReactNode;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PlayerDashboard({
  playerName,
  timerSeconds,
  timerActive,
  onToggleTimer,
  children,
}: PlayerDashboardProps) {
  const { scale, isTablet } = useResponsive();
  const nameSize = isTablet ? scale(typography.size['body-md']) : typography.size['body-md'];
  const timerSize = isTablet ? scale(typography.size.caption) : typography.size.caption;

  return (
    <View style={styles.dashboard}>
      {/* Player name + turn timer — tappable (large hit area) */}
      <Pressable onPress={onToggleTimer} style={[styles.nameRow, isTablet && { gap: scale(spacing[2]), paddingVertical: scale(spacing[2]) }]}>
        <Text
          style={[styles.playerName, isTablet && { fontSize: nameSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {playerName}
        </Text>
        <Text style={[styles.timer, timerActive && styles.timerActive, isTablet && { fontSize: timerSize }]}>
          {formatTimer(timerSeconds)}
        </Text>
      </Pressable>

      {/* Scrollable content — all tracker widgets */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboard: {
    width: '90%',
    flex: 1,
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    flexShrink: 0,
    width: '100%',
    minHeight: 44,
  },
  playerName: {
    color: colors.text.primary,
    fontSize: typography.size['body-md'],
    fontWeight: typography.weight.bold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  timer: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weight.medium,
    flexShrink: 0,
  },
  timerActive: {
    color: colors.accent.primary,
    fontWeight: typography.weight.bold,
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    gap: spacing[1],
    paddingBottom: spacing[8],
  },
});
