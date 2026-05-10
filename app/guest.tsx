/**
 * SCR-019 — Guest Tracker
 *
 * Three-phase screen:
 *  1. Home: minimal entry — "New Match" + "Sign In".
 *  2. Setup: player count (1-4) + starting HP (25/30/40) + LayoutPreview.
 *     No name inputs — players are auto-labeled P1..P4. Visual design mirrors
 *     the canonical MatchSetupForm (section labels, lifeChip picker, LayoutPreview).
 *  3. Tracking: PlayerDashboard-based frames inside TrackerLayout, no commander art.
 *     All in-memory, zero API calls (BR-AUTH-01).
 *
 * Exit with unsaved changes shows a confirmation dialog (BR-AUTH-01).
 *
 * PLAT-004 (EPIC-05)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CommanderDamagePanel } from '@/components/tracker/CommanderDamagePanel';
import { LifeCounter } from '@/components/tracker/LifeCounter';
import { PlayerDashboard } from '@/components/tracker/PlayerDashboard';
import { PoisonCounter } from '@/components/tracker/PoisonCounter';
import { TrackerLayout } from '@/components/match/TrackerLayout';
import { LayoutPreview } from '@/components/match/LayoutPreview';
import { useGuest } from '@/contexts/GuestContext';
import { useGuestTracker } from '@/hooks/useGuestTracker';
import { DEFAULT_SLOT_ROTATIONS, LAYOUT_VARIANTS } from '@/hooks/useMatchSetup';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAYER_COUNT_OPTIONS = [1, 2, 3, 4] as const;
type PlayerCount = (typeof PLAYER_COUNT_OPTIONS)[number];

const STARTING_LIFE_OPTIONS = [25, 30, 40] as const;
type StartingLife = (typeof STARTING_LIFE_OPTIONS)[number];

// ─── Home Phase ──────────────────────────────────────────────────────────────

interface HomeProps {
  onNewMatch: () => void;
  onSignIn: () => void;
}

function GuestHome({ onNewMatch, onSignIn }: HomeProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.homeContainer}>
        <Pressable
          onPress={onNewMatch}
          style={({ pressed }) => [styles.newMatchBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={t('guest.newMatch')}
        >
          <Text style={styles.newMatchText}>{t('guest.newMatch')}</Text>
        </Pressable>

        <Pressable
          onPress={onSignIn}
          style={styles.signInBtn}
          accessibilityRole="button"
          accessibilityLabel={t('guest.signIn')}
        >
          <Text style={styles.signInText}>{t('guest.signIn')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Setup Phase ─────────────────────────────────────────────────────────────

interface SetupProps {
  onStart: (
    count: PlayerCount,
    startingLife: StartingLife,
    layoutVariant: string,
    slotRotations: number[],
  ) => void;
  onBack: () => void;
}

/**
 * Build default rotations array for a given layout variant.
 * Returns a copy so downstream mutations don't leak into the shared constant.
 */
function defaultRotationsFor(variant: string): number[] {
  return [...(DEFAULT_SLOT_ROTATIONS[variant] ?? [])];
}

function GuestSetup({ onStart, onBack }: SetupProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const [count, setCount] = useState<PlayerCount>(4);
  const [startingLife, setStartingLife] = useState<StartingLife>(40);

  const initialVariant = LAYOUT_VARIANTS[4]?.[0] ?? '';
  const [layoutVariant, setLayoutVariant] = useState<string>(initialVariant);
  const [slotRotations, setSlotRotations] = useState<number[]>(() =>
    defaultRotationsFor(initialVariant),
  );

  // Synthetic "players" for LayoutPreview — positional slots labeled P1..PN.
  const previewPlayers = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `slot-${i}`,
        name: `P${i + 1}`,
      })),
    [count],
  );

  const rotationsById = useMemo(() => {
    const map: Record<string, number> = {};
    previewPlayers.forEach((p, i) => {
      map[p.id] = slotRotations[i] ?? 0;
    });
    return map;
  }, [previewPlayers, slotRotations]);

  function handleCountChange(n: PlayerCount) {
    setCount(n);
    const nextVariant = LAYOUT_VARIANTS[n]?.[0] ?? '';
    setLayoutVariant(nextVariant);
    setSlotRotations(defaultRotationsFor(nextVariant));
  }

  const handleLayoutChange = useCallback((variant: string) => {
    setLayoutVariant(variant);
    setSlotRotations(defaultRotationsFor(variant));
  }, []);

  const handleRotate = useCallback((playerId: string, degrees: number) => {
    const idx = Number.parseInt(playerId.replace('slot-', ''), 10);
    if (Number.isNaN(idx)) return;
    setSlotRotations((prev) => {
      const next = [...prev];
      next[idx] = degrees;
      return next;
    });
  }, []);

  const handleReorder = useCallback(
    (reordered: { id: string; name: string }[]) => {
      // Move the rotation attached to each slot so the seat's orientation stays put.
      setSlotRotations((prev) => {
        const next = [...prev];
        reordered.forEach((p, newIdx) => {
          const oldIdx = Number.parseInt(p.id.replace('slot-', ''), 10);
          if (!Number.isNaN(oldIdx)) next[newIdx] = prev[oldIdx] ?? 0;
        });
        return next;
      });
    },
    [],
  );

  function handleStart() {
    onStart(count, startingLife, layoutVariant, slotRotations);
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.setupHeader}>
        <Pressable
          onPress={onBack}
          style={styles.cancelBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.cancelText}>‹</Text>
        </Pressable>
        <Text style={styles.setupTitle}>{t('guest.newMatch')}</Text>
        <View style={styles.cancelBtn} />
      </View>

      <ScrollView
        style={styles.setupScroll}
        contentContainerStyle={styles.setupContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section 1: Player count ── */}
        <Text style={styles.sectionLabel}>{t('guest.players')}</Text>
        <View style={styles.pickerRow}>
          {PLAYER_COUNT_OPTIONS.map((n) => {
            const selected = count === n;
            return (
              <Pressable
                key={n}
                onPress={() => handleCountChange(n)}
                style={[styles.pickerChip, selected && styles.pickerChipSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${n} players`}
              >
                <Text style={[styles.pickerChipText, selected && styles.pickerChipTextSelected]}>
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Section 2: Starting life ── */}
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>{t('guest.startingHp')}</Text>
        <View style={styles.pickerRow}>
          {STARTING_LIFE_OPTIONS.map((value) => {
            const selected = startingLife === value;
            return (
              <Pressable
                key={value}
                onPress={() => setStartingLife(value)}
                style={[styles.pickerChip, selected && styles.pickerChipSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${value} life`}
              >
                <Text style={[styles.pickerChipText, selected && styles.pickerChipTextSelected]}>
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Section 3: Layout arrangement ── */}
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>{t('guest.layout')}</Text>
        <LayoutPreview
          players={previewPlayers}
          rotations={rotationsById}
          layoutVariant={layoutVariant}
          onReorder={handleReorder}
          onRotate={handleRotate}
          onLayoutChange={handleLayoutChange}
        />

        <View style={styles.scrollSpacer} />
      </ScrollView>

      {/* ── Footer: Start ── */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleStart}
          style={styles.submitBtn}
          accessibilityRole="button"
          accessibilityLabel={t('guest.startTrackerLabel')}
        >
          <Text style={styles.submitBtnText}>{t('guest.startTracking')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Guest Turn Timers ───────────────────────────────────────────────────────

/**
 * Lightweight per-player turn timer for guest mode.
 * Mirrors useTurnTimers from the regular tracker but skips event recording.
 */
function useGuestTurnTimers(participationIds: string[]) {
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  const [turnCounts, setTurnCounts] = useState<Record<string, number>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastNonNullActiveIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!activeId) return;
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => ({ ...prev, [activeId]: (prev[activeId] ?? 0) + 1 }));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeId]);

  // Reset when the participant roster changes (new match).
  useEffect(() => {
    setElapsed({});
    setTurnCounts({});
    setActiveId(null);
    lastNonNullActiveIdRef.current = null;
  }, [participationIds.join('|')]);

  const toggle = useCallback((id: string) => {
    setActiveId((prev) => {
      if (prev === id) return null;
      if (lastNonNullActiveIdRef.current !== id) {
        setTurnCounts((counts) => ({ ...counts, [id]: (counts[id] ?? 0) + 1 }));
        lastNonNullActiveIdRef.current = id;
      }
      return id;
    });
  }, []);

  return { elapsed, activeId, toggle, turnCounts };
}

// ─── Tracking Phase ──────────────────────────────────────────────────────────

interface TrackerProps {
  participations: ReturnType<typeof useGuestTracker>['participations'];
  layoutVariant: string;
  slotRotations: number[];
  applyLifeChange: ReturnType<typeof useGuestTracker>['applyLifeChange'];
  applyPoisonChange: ReturnType<typeof useGuestTracker>['applyPoisonChange'];
  applyCommanderDamage: ReturnType<typeof useGuestTracker>['applyCommanderDamage'];
  undoLastEvent: ReturnType<typeof useGuestTracker>['undoLastEvent'];
  onExit: () => void;
}

function GuestTrackerView({
  participations,
  layoutVariant,
  slotRotations,
  applyLifeChange,
  applyPoisonChange,
  applyCommanderDamage,
  undoLastEvent,
  onExit,
}: TrackerProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const participationIds = useMemo(() => participations.map((p) => p.id), [participations]);
  const turnTimers = useGuestTurnTimers(participationIds);
  const [deadIds, setDeadIds] = useState<Set<string>>(new Set());

  const sections = participations.map((p, idx) => {
    // Enemy "commanders" in guest mode = other participants (id + name).
    const enemyCommanders = participations
      .filter((other) => other.id !== p.id)
      .map((other) => ({ id: other.id, name: other.name }));

    const cmdDamageTotal = Object.values(p.commanderDamage ?? {}).reduce(
      (sum, v) => sum + (typeof v === 'number' ? v : 0),
      0,
    );

    return {
      id: p.id,
      rotation: slotRotations[idx] ?? 0,
      isActive: turnTimers.activeId === p.id,
      content: (
        <PlayerDashboard
          playerName={p.name}
          artCrop={null}
          timerSeconds={turnTimers.elapsed[p.id] ?? 0}
          timerActive={turnTimers.activeId === p.id}
          turnCount={turnTimers.turnCounts[p.id] ?? 0}
          onToggleTimer={() => turnTimers.toggle(p.id)}
          isDead={deadIds.has(p.id)}
          onMarkDead={() => setDeadIds((prev) => new Set(prev).add(p.id))}
          lifeCounter={
            <LifeCounter
              lifeTotal={p.lifeTotal}
              participationId={p.id}
              onDelta={applyLifeChange}
            />
          }
          poisonOverlay={
            <PoisonCounter
              poisonCounters={p.poisonCounters}
              participationId={p.id}
              onDelta={applyPoisonChange}
            />
          }
          cmdDamageOverlay={
            <CommanderDamagePanel
              commanderDamage={p.commanderDamage}
              enemyCommanders={enemyCommanders}
              participationId={p.id}
              onDelta={applyCommanderDamage}
            />
          }
          poisonCount={p.poisonCounters}
          cmdDamageTotal={cmdDamageTotal}
        />
      ),
    };
  });

  return (
    <SafeAreaView style={styles.root}>
      {/* Minimal header */}
      <View style={styles.trackerHeader}>
        <Pressable
          onPress={onExit}
          style={styles.exitBtn}
          accessibilityRole="button"
          accessibilityLabel={t('guest.exitLabel')}
        >
          <Text style={styles.exitText}>✕</Text>
        </Pressable>
        <Text style={styles.trackerTitle}>{t('guest.title')}</Text>
        <Pressable
          onPress={undoLastEvent}
          style={styles.undoBtn}
          accessibilityRole="button"
          accessibilityLabel="Undo last action"
        >
          <Text style={styles.undoText}>↩</Text>
        </Pressable>
      </View>

      <View style={styles.trackerBody}>
        <TrackerLayout sections={sections} layoutVariant={layoutVariant} />
      </View>
    </SafeAreaView>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

type Phase = 'home' | 'setup' | 'tracking';

export default function GuestScreen() {
  const router = useRouter();
  const { exitGuestMode } = useGuest();
  const {
    participations,
    isDirty,
    init,
    applyLifeChange,
    applyPoisonChange,
    applyCommanderDamage,
    undoLastEvent,
  } = useGuestTracker();

  const [phase, setPhase] = useState<Phase>('home');
  const [layoutVariant, setLayoutVariant] = useState<string>('');
  const [slotRotations, setSlotRotations] = useState<number[]>([]);

  const navigateToAuth = useCallback(() => {
    exitGuestMode();
    router.replace('/auth');
  }, [exitGuestMode, router]);

  const handleStart = useCallback(
    (count: PlayerCount, startingLife: StartingLife, variant: string, rotations: number[]) => {
      init(count, startingLife);
      setLayoutVariant(variant);
      setSlotRotations(rotations);
      setPhase('tracking');
    },
    [init],
  );

  const handleTrackerExit = useCallback(() => {
    if (!isDirty) {
      setPhase('home');
      return;
    }
    Alert.alert(
      'Exit match?',
      'All tracking data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => setPhase('home') },
      ],
    );
  }, [isDirty]);

  if (phase === 'home') {
    return <GuestHome onNewMatch={() => setPhase('setup')} onSignIn={navigateToAuth} />;
  }

  if (phase === 'setup') {
    return <GuestSetup onStart={handleStart} onBack={() => setPhase('home')} />;
  }

  return (
    <GuestTrackerView
      participations={participations}
      layoutVariant={layoutVariant}
      slotRotations={slotRotations}
      applyLifeChange={applyLifeChange}
      applyPoisonChange={applyPoisonChange}
      applyCommanderDamage={applyCommanderDamage}
      undoLastEvent={undoLastEvent}
      onExit={handleTrackerExit}
    />
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const FOOTER_HEIGHT = 88;

const createStyles = (t: AppTheme) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },

  // ── Home ───────────────────────────────────────────────────────────────────
  homeContainer: {
    flex: 1,
    paddingHorizontal: spacing[6],
    justifyContent: 'space-between',
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  // Mirrors `newMatchButton` on the authed home screen: padding-based, radius lg, body-lg text.
  newMatchBtn: {
    backgroundColor: t.colors.accent.primary,
    borderRadius: t.radius.lg,
    padding: spacing[4],
    alignItems: 'center',
  },
  newMatchText: {
    color: t.colors.accent.onPrimary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.bold,
    letterSpacing: 0.3,
  },
  signInBtn: {
    height: 52,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.colors.border.default,
    backgroundColor: t.colors.background.surface,
  },
  signInText: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: t.typography.letterSpacing.wide,
  },

  // ── Setup ──────────────────────────────────────────────────────────────────
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  setupTitle: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: t.typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  cancelBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['heading-lg'],
  },
  setupScroll: {
    flex: 1,
  },
  setupContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  scrollSpacer: {
    height: FOOTER_HEIGHT + spacing[4],
  },

  // Section label — matches MatchSetupForm.
  sectionLabel: {
    color: t.colors.text.tertiary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border.subtle,
    marginVertical: spacing[6],
  },

  // Picker row — shared by player-count and life-total chips.
  pickerRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  pickerChip: {
    flex: 1,
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border?.default ?? '#2A2A45',
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  pickerChipSelected: {
    backgroundColor: t.colors.accent.primary,
    borderColor: t.colors.accent.primary,
  },
  pickerChipText: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
  },
  pickerChipTextSelected: {
    color: t.colors.accent.onPrimary,
  },

  // Footer submit.
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    paddingTop: spacing[3],
    backgroundColor: t.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: t.colors.border.subtle,
  },
  submitBtn: {
    backgroundColor: t.colors.accent.primary,
    borderRadius: t.radius.xl,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: t.colors.accent.onPrimary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
  },

  // ── Tracker ────────────────────────────────────────────────────────────────
  trackerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  trackerTitle: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: t.typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  exitBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['heading-md'],
  },
  undoBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['heading-md'],
  },
  trackerBody: {
    flex: 1,
  },
});
