/**
 * PlayerDashboard — Level 3: Sidebar + Main Zone, Box-logic hierarchy.
 *
 * STRUCTURE (from the player's perspective)
 *
 *   ┌─────────┬──────────────────────────────────┐
 *   │         │            ZONE A (flex 1)       │
 *   │ SIDEBAR │            HP (absolute-centred) │
 *   │  (20%)  │                                  │
 *   │         ├──────────────────────────────────┤
 *   │  DEAD   │  ZONE B (h = DEAD_BTN_SIZE)      │
 *   │  (44)   │  [ ☣ Poison ]  [ ⚔ Commander ]   │
 *   └─────────┴──────────────────────────────────┘
 *
 *   SIDEBAR   20 % width, minWidth 75, flexShrink 0. Top tap-zone is the
 *             timer / turn indicator. Bottom fixed-height slot holds the
 *             DEAD button (always hittable).
 *   MAIN ZONE 80 %, elastic. Vertical column:
 *               • ZONE A  — flex 1. LifeCounter absolutely-filled inside,
 *                 HP centred. The 50/50 vertical split hit-zones used by
 *                 LifeCounter live here.
 *               • ZONE B  — height = DEAD_BTN_SIZE. Horizontal row with
 *                 Poison + Commander Damage counters as plain text with
 *                 invisible hit zones. Anchored in the footer — never
 *                 floating on the right edge.
 *
 * ROTATION & HIT-ZONE SYNC
 *   PlayerSection rotates this whole dashboard as a unit. All Pressables
 *   live inside that rotated container so "Increase" is always on the
 *   player's physical right hand regardless of their facing / flip.
 *
 * TRACK-003 (EPIC-03)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { GHPressable } from '@/components/ui/GHPressable';
import { useTranslation } from 'react-i18next';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlayerFlip } from '@/components/match/PlayerSection';
import type { AppTheme } from '@/styles/themes/types';

// ─── Death messages — 30+ flavour variants ─────────────────────────────────────
const DEATH_MESSAGES = [
  'Has fallen',
  'No more',
  'Was no more',
  'Conceded to the void',
  'Returned to the command zone',
  'Lost the will to fight',
  'Faded into legend',
  'Was consumed by shadow',
  'Shuffled into oblivion',
  'Took a permanent mulligan',
  'Left the battlefield',
  'Ascended beyond this plane',
  'Met their end here',
  'Perished gloriously',
  'Was outpaced',
  'Fell to the last sword',
  'Answered the final call',
  'Passed into history',
  'Couldn\'t withstand the storm',
  'Exited stage left, permanently',
  'Became part of the lore',
  'Was outplayed',
  'Rested… forever',
  'Ran out of resources',
  'Got bolted to zero',
  'Could not weather the tide',
  'Left for Phyrexia',
  'Was compleated',
  'Suffered lethal damage',
  'Walked into the blind eternities',
  'Conceded like a champ',
  'Couldn\'t stop the combo',
  'Was answered by the game state',
  'Is now merely a memory',
];

function pickDeathMessage(): string {
  return DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
}


/** Auto-dismiss overlay after this many ms of no interaction */
const AUTO_DISMISS_MS = 3000;

/** Fixed size for the Dead button (high-risk, always hittable). Zone B
 *  (counter footer) matches this exact height. */
const DEAD_BTN_SIZE = 44;

/** Sidebar hard minimum so it stays usable even on narrow frames. */
const SIDEBAR_MIN_WIDTH = 75;

/** Frame-height buckets for responsive sidebar typography. */
const COMPACT_THRESHOLD = 120;
const ULTRA_COMPACT_THRESHOLD = 80;

type DisplayMode = 'life' | 'poison' | 'cmd';

interface PlayerDashboardProps {
  playerName: string;
  timerSeconds: number;
  timerActive: boolean;
  /** How many turns this player has taken (rotations to them as active). */
  turnCount?: number;
  onToggleTimer: () => void;
  isDead?: boolean;
  onMarkDead?: () => void;
  /** The LifeCounter component — rendered in Zone A. */
  lifeCounter: React.ReactNode;
  /** Poison counter overlay content (just controls, no chrome). */
  poisonOverlay: React.ReactNode;
  /** Commander damage overlay content (just rows, no chrome). */
  cmdDamageOverlay: React.ReactNode;
  /** Current poison count for the footer label. */
  poisonCount: number;
  /** Total commander damage received for the footer label. */
  cmdDamageTotal: number;
  /** Optional Scryfall art_crop URL — renders as faded background. */
  artCrop?: string | null;
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
  turnCount = 0,
  onToggleTimer,
  isDead = false,
  onMarkDead,
  lifeCounter,
  poisonOverlay,
  cmdDamageOverlay,
  poisonCount,
  cmdDamageTotal,
  artCrop = null,
}: PlayerDashboardProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const flip = usePlayerFlip();
  const [mode, setMode] = useState<DisplayMode>('life');
  const [dashSize, setDashSize] = useState({ w: 0, h: 0 });
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable random message — picked once when player dies
  const deathMessage = useMemo(pickDeathMessage, []);

  const isCompact = dashSize.h > 0 && dashSize.h < COMPACT_THRESHOLD;
  const isUltraCompact = dashSize.h > 0 && dashSize.h < ULTRA_COMPACT_THRESHOLD;

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

  useEffect(() => () => clearDismissTimer(), [clearDismissTimer]);

  // Sidebar tap toggles timer (or dismisses an overlay if one is open).
  const handleSidebarTap = useCallback(() => {
    if (mode !== 'life') {
      switchMode('life');
    } else {
      onToggleTimer();
    }
  }, [mode, switchMode, onToggleTimer]);

  const onDashboardLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDashSize((prev) => {
      if (Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1) return prev;
      return { w: width, h: height };
    });
  }, []);

  const handleOverlayTouch = useCallback(() => {
    if (mode !== 'life') resetDismissTimer();
  }, [mode, resetDismissTimer]);

  // Responsive sidebar typography.
  const sidebarFontScale = isUltraCompact ? 0.72 : isCompact ? 0.86 : 1;
  const baseNameSize = theme.typography.size['body-sm'];
  const baseTimerSize = theme.typography.size.caption;

  return (
    <View
      style={[styles.dashboard, isDead && styles.dashboardDead]}
      onLayout={onDashboardLayout}
    >
      {/* ── Commander art backdrop (faded, cover) ── */}
      {artCrop && (
        <View style={styles.artBackdropWrap} pointerEvents="none">
          <Image
            source={{ uri: artCrop }}
            style={styles.artBackdrop}
            resizeMode="cover"
          />
          <View style={styles.artScrim} />
        </View>
      )}

      {/* ── SIDEBAR (20 %, minWidth 75) ── */}
      <View style={styles.sidebar}>
        {/* Top tap zone — timer + long-press flip */}
        <GHPressable
          onPress={handleSidebarTap}
          onLongPress={flip.toggle}
          delayLongPress={600}
          style={styles.sidebarTapZone}
        >
          <Text
            style={[styles.playerName, { fontSize: baseNameSize * sidebarFontScale }]}
            numberOfLines={2}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {playerName}
          </Text>
          <Text
            style={[
              styles.timer,
              timerActive && styles.timerActive,
              { fontSize: baseTimerSize * sidebarFontScale },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatTimer(timerSeconds)}
          </Text>
          {turnCount > 0 && (
            <Text
              style={[styles.turnBadge, { fontSize: baseTimerSize * sidebarFontScale * 0.9 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {t('tracker.turnAbbrev', { defaultValue: 'T' })}{turnCount}
            </Text>
          )}
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
          {flip.flipped && (
            <Text style={styles.flipIndicator} numberOfLines={1}>⇅</Text>
          )}
        </GHPressable>

        {/* Bottom fixed-height slot — DEAD button (always hittable) */}
        <View style={styles.sidebarDeadSlot}>
          {onMarkDead && !isDead && (
            <GHPressable onPress={onMarkDead} style={styles.deadBtn}>
              <Text style={styles.deadBtnText}>{t('tracker.dead', { defaultValue: 'Dead' })}</Text>
            </GHPressable>
          )}
          {isDead && (
            <View style={styles.deadBadge}>
              <Text style={styles.deadBadgeText}>☠</Text>
              {!isUltraCompact && (
                <Text style={styles.deadMessageText} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.5}>
                  {deathMessage}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── MAIN ZONE (80 %) — Zone A over Zone B ── */}
      <View style={styles.mainZone}>
        {mode === 'life' && (
          <>
            {/* ZONE A — HP absolute-centred */}
            <View style={styles.zoneA}>
              <View style={styles.lifeAbsoluteFill} pointerEvents="box-none">
                {lifeCounter}
              </View>
            </View>

            {/* ZONE B — Counter footer (height = DEAD button) */}
            <View style={styles.zoneB}>
              <GHPressable
                onPress={() => switchMode('poison')}
                style={styles.footerCounter}
              >
                <Text
                  style={[styles.footerCounterText, poisonCount >= 10 && styles.footerCounterTextAlert]}
                  numberOfLines={1}
                >
                  ☣ {t('tracker.poison', { defaultValue: 'Poison' })} {poisonCount}
                </Text>
              </GHPressable>
              <GHPressable
                onPress={() => switchMode('cmd')}
                style={styles.footerCounter}
              >
                <Text style={styles.footerCounterText} numberOfLines={1}>
                  ⚔ {t('tracker.cmd', { defaultValue: 'CMD' })} {cmdDamageTotal}
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

const createStyles = (t: AppTheme) => ({
  dashboard: {
    flex: 1,
    flexDirection: 'row' as const,
    width: '100%' as const,
    height: '100%' as const,
    overflow: 'hidden' as const,
  },
  dashboardDead: {
    opacity: 0.45,
  },

  // ── Commander art backdrop ──
  artBackdropWrap: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  artBackdrop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%' as const,
    height: '100%' as const,
    opacity: 0.20,
  },
  artScrim: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Mid-tone grey-blue scrim (rather than dark background) so the wash
    // softens the art instead of darkening it. ~40% alpha.
    backgroundColor: t.colors.onSurfaceVariant + '66',
  },

  // ── Sidebar (20 %, minWidth 75, flexShrink 0) ──
  sidebar: {
    width: '20%' as const,
    minWidth: SIDEBAR_MIN_WIDTH,
    flexShrink: 0,
    flexDirection: 'column' as const,
  },
  sidebarTapZone: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 2,
    paddingHorizontal: 4,
  },
  sidebarDeadSlot: {
    height: DEAD_BTN_SIZE + 8, // matches ZONE B height (4 px pad top & bottom)
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 4,
  },
  playerName: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.bold,
    letterSpacing: t.typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
  },
  timer: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size.caption,
    fontVariant: ['tabular-nums'] as const,
    fontWeight: t.typography.weight.medium,
    textAlign: 'center' as const,
  },
  timerActive: {
    color: t.colors.accent.primary,
    fontWeight: t.typography.weight.bold,
  },
  turnBadge: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.bold,
    fontVariant: ['tabular-nums'] as const,
    letterSpacing: 0.5,
    textAlign: 'center' as const,
    opacity: 0.85,
  },
  turnHint: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
    textAlign: 'center' as const,
    marginTop: 1,
  },
  turnHintActive: {
    color: t.colors.accent.primary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.bold,
    textAlign: 'center' as const,
    marginTop: 1,
  },
  flipIndicator: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size.label,
    marginTop: 2,
    opacity: 0.75,
  },

  // DEAD button — fixed 44 × 44, centred in the sidebar footer slot.
  deadBtn: {
    width: DEAD_BTN_SIZE,
    height: DEAD_BTN_SIZE,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: t.colors.status.error + '22',
    borderWidth: 1,
    borderColor: t.colors.status.error + '44',
    borderRadius: 3,
  },
  deadBtnText: {
    color: t.colors.status.error,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size.caption - 2,
    fontWeight: t.typography.weight.bold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  deadBadge: {
    alignItems: 'center' as const,
    paddingHorizontal: 2,
    gap: 2,
  },
  deadBadgeText: {
    fontSize: t.typography.size['body-lg'],
  },
  deadMessageText: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.medium,
    textAlign: 'center' as const,
    letterSpacing: 0.2,
  },

  // ── Divider ──
  divider: {
    width: 0.5,
    backgroundColor: t.colors.border.strong + '44',
    marginVertical: 8,
  },

  // ── Main zone (80 %) ──
  mainZone: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    flexDirection: 'column' as const,
  },
  // Zone A — flex:1, relative so LifeCounter can absolute-fill.
  zoneA: {
    flex: 1,
    position: 'relative' as const,
  },
  lifeAbsoluteFill: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Zone B — counter footer, height matches DEAD button.
  zoneB: {
    height: DEAD_BTN_SIZE + 8, // DEAD btn + 4 px padding top/bottom (aligns with sidebarDeadSlot)
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    paddingHorizontal: 2,
    paddingVertical: 4,
    gap: 4,
  },
  footerCounter: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border.subtle,
  },
  footerCounterText: {
    color: t.colors.accent.primaryAlt,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size.caption,
    fontVariant: ['tabular-nums'] as const,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  footerCounterTextAlert: {
    color: t.colors.accent.green,
  },

  // ── Overlay zone (replaces HP when in poison/cmd mode) ──
  overlayZone: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 8,
  },
});
