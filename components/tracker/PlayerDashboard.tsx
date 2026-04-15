/**
 * PlayerDashboard — Level 3: 2-column layout inside each 5:3 PlayerFrame.
 *
 * Layout:
 *   SIDEBAR (20%)    — Player name, turn timer, "Dead" button (fixed 44px)
 *   ACTION ZONE (80%) — HP display with invisible split hit zones
 *
 * STATE MACHINE for the Action Zone:
 *   'life'   → HP display + trigger labels (Poison N, CMD N)
 *   'poison' → Poison counter controls (−/count/+)
 *   'cmd'    → Commander damage rows
 *
 * Overlays SWAP into the 80% zone (no full-frame overlay). Auto-dismiss
 * after 3 seconds of no input, or tap the sidebar to return to 'life'.
 *
 * COMPACT MODE: When frame height < 120dp, hides "Push for Turn" text
 * to keep HP as the priority display.
 *
 * TRACK-003 (EPIC-03)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { GHPressable } from '@/components/ui/GHPressable';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/styles/tokens';

/** Auto-dismiss overlay after this many ms of no interaction */
const AUTO_DISMISS_MS = 3000;

/** Frame height threshold for compact mode */
const COMPACT_THRESHOLD = 120;

/** Fixed size for the Dead button (high-risk, always hittable) */
const DEAD_BTN_SIZE = 44;

type DisplayMode = 'life' | 'poison' | 'cmd';

interface PlayerDashboardProps {
  playerName: string;
  timerSeconds: number;
  timerActive: boolean;
  onToggleTimer: () => void;
  isDead?: boolean;
  onMarkDead?: () => void;
  /** The LifeCounter component — rendered in action zone. */
  lifeCounter: React.ReactNode;
  /** Poison counter overlay content (just controls, no chrome). */
  poisonOverlay: React.ReactNode;
  /** Commander damage overlay content (just rows, no chrome). */
  cmdDamageOverlay: React.ReactNode;
  /** Current poison count for the trigger label. */
  poisonCount: number;
  /** Total commander damage received for the trigger label. */
  cmdDamageTotal: number;
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
  isDead = false,
  onMarkDead,
  lifeCounter,
  poisonOverlay,
  cmdDamageOverlay,
  poisonCount,
  cmdDamageTotal,
}: PlayerDashboardProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<DisplayMode>('life');
  const [isCompact, setIsCompact] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-dismiss timer ──
  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const resetDismissTimer = useCallback(() => {
    clearDismissTimer();
    dismissTimerRef.current = setTimeout(() => {
      setMode('life');
    }, AUTO_DISMISS_MS);
  }, [clearDismissTimer]);

  const switchMode = useCallback((newMode: DisplayMode) => {
    if (newMode === 'life') {
      clearDismissTimer();
    } else {
      resetDismissTimer();
    }
    setMode(newMode);
  }, [clearDismissTimer, resetDismissTimer]);

  // Clean up timer on unmount
  useEffect(() => () => clearDismissTimer(), [clearDismissTimer]);

  // ── Sidebar tap: dismiss overlay OR toggle timer ──
  const handleSidebarPress = useCallback(() => {
    if (mode !== 'life') {
      switchMode('life');
    } else {
      onToggleTimer();
    }
  }, [mode, switchMode, onToggleTimer]);

  // ── Compact mode detection ──
  const onDashboardLayout = useCallback((e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    setIsCompact(height < COMPACT_THRESHOLD);
  }, []);

  // ── Reset dismiss timer on any overlay interaction ──
  const handleOverlayTouch = useCallback(() => {
    if (mode !== 'life') {
      resetDismissTimer();
    }
  }, [mode, resetDismissTimer]);

  return (
    <View
      style={[styles.dashboard, isDead && styles.dashboardDead]}
      onLayout={onDashboardLayout}
    >
      {/* ── SIDEBAR (20%) — Name, Timer, Dead ── */}
      <GHPressable onPress={handleSidebarPress} style={styles.sidebar}>
        <View style={styles.sidebarContent}>
          <Text
            style={styles.playerName}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {playerName}
          </Text>
          <Text
            style={[styles.timer, timerActive && styles.timerActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatTimer(timerSeconds)}
          </Text>
          {/* Compact mode hides the turn hint text */}
          {!isCompact && (
            timerActive ? (
              <Text style={styles.turnHintActive} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {t('tracker.activePlayer', { defaultValue: 'Active player' })}
              </Text>
            ) : (
              <Text style={styles.turnHint} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {t('tracker.pushForTurn', { defaultValue: 'Push for turn' })}
              </Text>
            )
          )}
        </View>

        {/* Dead button — fixed 44px, always hittable, bottom of sidebar */}
        {onMarkDead && !isDead && (
          <GHPressable onPress={onMarkDead} style={styles.deadBtn}>
            <Text style={styles.deadBtnText}>{t('tracker.dead', { defaultValue: 'Dead' })}</Text>
          </GHPressable>
        )}
        {isDead && (
          <View style={styles.deadBadge}>
            <Text style={styles.deadBadgeText}>☠</Text>
          </View>
        )}
      </GHPressable>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── ACTION ZONE (80%) — State-driven content ── */}
      <View style={styles.actionZone}>
        {mode === 'life' && (
          <>
            {/* Life counter fills the space */}
            <View style={styles.lifeArea}>
              {lifeCounter}
            </View>

            {/* Trigger strip — invisible hit boxes, visible text only */}
            <View style={styles.triggerRow}>
              <GHPressable onPress={() => switchMode('poison')} style={styles.triggerHitBox}>
                <Text style={[styles.triggerLabel, poisonCount >= 10 && styles.triggerLabelAlert]}>
                  Poison {poisonCount}
                </Text>
              </GHPressable>
              <GHPressable onPress={() => switchMode('cmd')} style={styles.triggerHitBox}>
                <Text style={styles.triggerLabel}>
                  CMD {cmdDamageTotal}
                </Text>
              </GHPressable>
            </View>
          </>
        )}

        {mode === 'poison' && (
          <View
            style={styles.overlayZone}
            onTouchStart={handleOverlayTouch}
          >
            {poisonOverlay}
          </View>
        )}

        {mode === 'cmd' && (
          <View
            style={styles.overlayZone}
            onTouchStart={handleOverlayTouch}
          >
            {cmdDamageOverlay}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboard: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  dashboardDead: {
    opacity: 0.45,
  },

  // ── Sidebar (20%) ───────────────────────────────
  sidebar: {
    width: '20%',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  sidebarContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  playerName: {
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.bold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  timer: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  timerActive: {
    color: colors.accent.primary,
    fontWeight: typography.weight.bold,
  },
  turnHint: {
    color: colors.text.muted + '99',
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
    textAlign: 'center',
    marginTop: 1,
  },
  turnHintActive: {
    color: colors.accent.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    marginTop: 1,
  },

  // Dead button — fixed size, bottom of sidebar
  deadBtn: {
    width: DEAD_BTN_SIZE,
    height: DEAD_BTN_SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.status.error + '22',
    borderWidth: 1,
    borderColor: colors.status.error + '44',
    borderRadius: 3,
    marginBottom: 8,
  },
  deadBtnText: {
    color: colors.status.error,
    fontSize: typography.size.caption - 2,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  deadBadge: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  deadBadgeText: {
    fontSize: typography.size['body-lg'],
  },

  // ── Divider ──────────────────────────────────────
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.strong + '44',
    marginVertical: 8,
  },

  // ── Action zone (80%) ────────────────────────────
  actionZone: {
    flex: 1,
  },
  lifeArea: {
    flex: 1,
  },

  // ── Trigger labels (bottom of action zone) ───────
  triggerRow: {
    flexDirection: 'row',
    height: DEAD_BTN_SIZE,
  },
  triggerHitBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerLabel: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  triggerLabelAlert: {
    color: colors.accent.green,
  },

  // ── Overlay zone (replaces HP when in poison/cmd mode) ──
  overlayZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
});
