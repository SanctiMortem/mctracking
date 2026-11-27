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
import { useCallback, useMemo, useState } from 'react';

import { useFrameExperiment } from '@/components/match/frameExperiment';
import { Image, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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


/** Fixed size for the Dead button (high-risk, always hittable). Zone B
 *  (counter footer) matches this exact height. */
const DEAD_BTN_SIZE = 44;

/** Width of the rule between sidebar and main zone (styles.divider). */
const DIVIDER_WIDTH = 1.5;

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
  /** Highest commander damage received from any single commander (footer label). */
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
  const experiment = useFrameExperiment();
  const [mode, setMode] = useState<DisplayMode>('life');
  const [dashSize, setDashSize] = useState({ w: 0, h: 0 });
  // Stable random message — picked once when player dies
  const deathMessage = useMemo(pickDeathMessage, []);

  // Frame experiment: brighter look. The art is shown stronger and without
  // the grey wash; the small text keeps its contrast because the art is
  // shaded only behind the sidebar and the counter footer (ChromeShade), and
  // the overlays get a dark backing.
  const bright = experiment.enabled;
  const brightArt = bright && !!artCrop;
  const shadeSidebarWidth = experiment.sidebarWidth ?? Math.max(SIDEBAR_MIN_WIDTH, dashSize.w * 0.2);

  const isCompact = dashSize.h > 0 && dashSize.h < COMPACT_THRESHOLD;
  const isUltraCompact = dashSize.h > 0 && dashSize.h < ULTRA_COMPACT_THRESHOLD;

  // Overlays (poison, commander damage) never close on a timer: they stay
  // open until the player taps the sidebar, which is an exit control while
  // one is open.
  const switchMode = useCallback((newMode: DisplayMode) => {
    setMode(newMode);
  }, []);

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

  const exitLabel = mode === 'cmd'
    ? t('tracker.saveAndClose', { defaultValue: 'Save & close' })
    : t('common.close', { defaultValue: 'Close' });

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
            style={[styles.artBackdrop, bright && styles.artBackdropBright]}
            resizeMode="cover"
          />
          {bright ? (
            dashSize.w > 0 && dashSize.h > 0 && (
              <ChromeShade width={dashSize.w} height={dashSize.h} sidebarWidth={shadeSidebarWidth} />
            )
          ) : (
            <View style={styles.artScrim} />
          )}
        </View>
      )}

      {/* ── SIDEBAR (20 %, minWidth 75) ── */}
      {/* Frame experiment: one sidebar width for the whole table. */}
      <View style={[styles.sidebar, experiment.sidebarWidth ? { width: experiment.sidebarWidth } : null]}>
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
          {mode !== 'life' ? (
            // While an overlay is open the turn area is an exit control:
            // tapping it closes the overlay (saving the commander damage
            // hit), so the turn can never be passed from this screen.
            <>
              <Text
                style={[styles.exitGlyph, { fontSize: baseNameSize * sidebarFontScale * 1.8 }]}
                numberOfLines={1}
                accessibilityRole="button"
                accessibilityLabel={exitLabel}
              >
                ✕
              </Text>
              {!isCompact && (
                <Text style={styles.turnHintActive} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {exitLabel}
                </Text>
              )}
            </>
          ) : (
          <>
          <Text
            style={[
              styles.timer,
              bright && styles.sidebarTextBright,
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
              style={[styles.turnBadge, bright && styles.sidebarTextBright, { fontSize: baseTimerSize * sidebarFontScale * 0.9 }]}
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
              <Text style={[styles.turnHint, bright && styles.sidebarTextBright]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {t('tracker.pushForTurn', { defaultValue: 'Push for turn' })}
              </Text>
            )
          )}
          </>
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
                  style={[
                    styles.footerCounterText,
                    bright && styles.footerCounterTextBright,
                    poisonCount >= 10 && styles.footerCounterTextAlert,
                  ]}
                  numberOfLines={1}
                >
                  ☣ {t('tracker.poison', { defaultValue: 'Poison' })} {poisonCount}
                </Text>
              </GHPressable>
              <GHPressable
                onPress={() => switchMode('cmd')}
                style={styles.footerCounter}
              >
                <Text style={[styles.footerCounterText, bright && styles.footerCounterTextBright]} numberOfLines={1}>
                  ⚔ {t('tracker.cmd', { defaultValue: 'CMD' })} {cmdDamageTotal}
                </Text>
              </GHPressable>
            </View>
          </>
        )}

        {mode === 'poison' && (
          <View style={[styles.overlayZone, brightArt && styles.overlayShade]}>
            {poisonOverlay}
          </View>
        )}

        {mode === 'cmd' && (
          <View style={[styles.overlayZone, brightArt && styles.overlayShade]}>
            {cmdDamageOverlay}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Chrome shade (frame experiment) ─────────────────────────────────────────
// Two soft gradients over the art, under the UI: one behind the sidebar and
// one behind the counter footer. They darken the art only where the small
// text sits and fade out toward the life total, so the art stays bright
// without washing out the name, timer and counters. The stop positions are
// the same in every frame, so the gradient ids can be shared.

const SHADE_PEAK = 0.46;
/** Share of the side gradient that sits under the sidebar itself. */
const SHADE_SIDE_SOLID = 0.7;

function ChromeShade({ width, height, sidebarWidth }: { width: number; height: number; sidebarWidth: number }) {
  const sideW = Math.min(width, sidebarWidth / SHADE_SIDE_SOLID);
  const footH = Math.min(height, (DEAD_BTN_SIZE + 8) * 1.9);
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Defs>
        <LinearGradient id="chromeSide" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000" stopOpacity={SHADE_PEAK} />
          <Stop offset={SHADE_SIDE_SOLID} stopColor="#000" stopOpacity={SHADE_PEAK * 0.8} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="chromeFoot" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#000" stopOpacity={SHADE_PEAK * 0.7} />
          <Stop offset="1" stopColor="#000" stopOpacity={SHADE_PEAK} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={sideW} height={height} fill="url(#chromeSide)" />
      <Rect x={0} y={height - footH} width={width} height={footH} fill="url(#chromeFoot)" />
    </Svg>
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
  exitGlyph: {
    color: t.colors.accent.primary,
    fontWeight: t.typography.weight.bold,
    textAlign: 'center' as const,
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
    // Mid-tone grey-blue (vs dark background) so the wash softens the art
    // instead of darkening it. Sits above the image, below the UI chrome.
    backgroundColor: t.colors.onSurfaceVariant + '26',
  },

  // ── Frame experiment: brighter look ──
  // Art at roughly double strength, with no grey wash over it.
  artBackdropBright: {
    opacity: 0.42,
  },
  // Poison / commander damage overlays sit on the art itself: darker backing.
  overlayShade: {
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  // Timer, turn count and "Push for turn": near-white instead of the dim tone.
  sidebarTextBright: {
    color: t.colors.text.primary,
    opacity: 0.86,
  },
  footerCounterTextBright: {
    color: t.colors.accent.primary,
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
    width: DIVIDER_WIDTH,
    backgroundColor: '#A8B2C1',
    marginVertical: 6,
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
