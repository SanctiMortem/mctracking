/**
 * CasualMatch — shared in-memory setup + tracker flow.
 *
 * Two phases (setup → tracking). Owns its own state and never touches the API,
 * so it works identically for the unauthenticated guest screen (SCR-019) and
 * the authenticated "casual / untracked match" route (/match/casual).
 *
 * The host decides what "exit" means via the `onExit` callback (e.g. go back
 * to the guest home phase, or to the tabs Home for an account user). A
 * confirmation dialog is shown if the tracker has any unsaved life/poison/
 * commander damage changes (BR-AUTH-01).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useTranslation } from 'react-i18next';

import { CommanderDamagePanel } from '@/components/tracker/CommanderDamagePanel';
import { LifeCounter } from '@/components/tracker/LifeCounter';
import { PlayerDashboard } from '@/components/tracker/PlayerDashboard';
import { PoisonCounter } from '@/components/tracker/PoisonCounter';
import { TrackerLayout } from '@/components/match/TrackerLayout';
import { LayoutPreview } from '@/components/match/LayoutPreview';
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

function defaultRotationsFor(variant: string): number[] {
  return [...(DEFAULT_SLOT_ROTATIONS[variant] ?? [])];
}

function CasualSetup({ onStart, onBack }: SetupProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [count, setCount] = useState<PlayerCount>(4);
  const [startingLife, setStartingLife] = useState<StartingLife>(40);

  const initialVariant = LAYOUT_VARIANTS[4]?.[0] ?? '';
  const [layoutVariant, setLayoutVariant] = useState<string>(initialVariant);
  const [slotRotations, setSlotRotations] = useState<number[]>(() =>
    defaultRotationsFor(initialVariant),
  );

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
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <View style={[styles.setupHeader, { paddingTop: insets.top + spacing[2] }]}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.5 }]}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Text style={styles.cancelText}>✕</Text>
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

// ─── Per-player turn timer (memory-only, mirrors useTurnTimers) ──────────────

function useCasualTurnTimers(participationIds: string[]) {
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

function CasualTrackerView({
  participations,
  layoutVariant,
  slotRotations,
  applyLifeChange,
  applyPoisonChange,
  applyCommanderDamage,
  undoLastEvent,
  onExit,
}: TrackerProps) {
  // Keep the device awake while the casual / guest tracker is live. Mounted
  // only in the 'tracking' phase, so this releases automatically when the
  // user exits back to setup / home.
  useKeepAwake();

  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const participationIds = useMemo(() => participations.map((p) => p.id), [participations]);
  const turnTimers = useCasualTurnTimers(participationIds);
  const [deadIds, setDeadIds] = useState<Set<string>>(new Set());

  const sections = participations.map((p, idx) => {
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
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <View style={[styles.trackerHeader, { paddingTop: insets.top + spacing[1] }]}>
        <Pressable
          onPress={onExit}
          style={({ pressed }) => [styles.exitBtn, pressed && { opacity: 0.5 }]}
          hitSlop={16}
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

// ─── Public component ────────────────────────────────────────────────────────

export interface CasualMatchProps {
  /** Called when the user closes the screen (from setup back button or
   *  tracker ✕ after confirming discard). The host route picks the
   *  destination — guest home phase, signed-in tabs Home, etc. */
  onExit: () => void;
}

export function CasualMatch({ onExit }: CasualMatchProps) {
  const {
    participations,
    isDirty,
    init,
    applyLifeChange,
    applyPoisonChange,
    applyCommanderDamage,
    undoLastEvent,
  } = useGuestTracker();

  const [phase, setPhase] = useState<'setup' | 'tracking'>('setup');
  const [layoutVariant, setLayoutVariant] = useState<string>('');
  const [slotRotations, setSlotRotations] = useState<number[]>([]);

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
      onExit();
      return;
    }
    Alert.alert(
      'Exit match?',
      'All tracking data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onExit },
      ],
    );
  }, [isDirty, onExit]);

  // Android hardware back. In setup we exit straight to the host's onExit;
  // in tracking we re-use handleTrackerExit so the user gets the discard
  // confirmation if there's unsaved state.
  useEffect(() => {
    const handler = () => {
      if (phase === 'tracking') {
        handleTrackerExit();
      } else {
        onExit();
      }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [phase, onExit, handleTrackerExit]);

  if (phase === 'setup') {
    return <CasualSetup onStart={handleStart} onBack={onExit} />;
  }

  return (
    <CasualTrackerView
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
  setupHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
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
    textTransform: 'uppercase' as const,
  },
  cancelBtn: {
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cancelText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
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
  sectionLabel: {
    color: t.colors.text.tertiary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border.subtle,
    marginVertical: spacing[6],
  },
  pickerRow: {
    flexDirection: 'row' as const,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
  footer: {
    position: 'absolute' as const,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  submitBtnText: {
    color: t.colors.accent.onPrimary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
  },
  trackerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
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
    textTransform: 'uppercase' as const,
  },
  exitBtn: {
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  exitText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['heading-md'],
  },
  undoBtn: {
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  undoText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['heading-md'],
  },
  trackerBody: {
    flex: 1,
  },
});
