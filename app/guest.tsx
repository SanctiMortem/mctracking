/**
 * SCR-019 — Guest Tracker
 *
 * Three-phase screen:
 *  1. Home: minimal entry — "New Match" + "Sign In" only.
 *  2. Setup: player count (1-4) + starting HP (25/30/40) + layout (when ≥ 2).
 *     No name inputs — players are auto-labeled P1..P4.
 *  3. Tracking: TrackerLayout with LifeCounter, PoisonCounter, CommanderDamagePanel.
 *     All in-memory, zero API calls (BR-AUTH-01).
 *
 * Exit with unsaved changes shows a confirmation dialog (BR-AUTH-01).
 *
 * PLAT-004 (EPIC-05)
 */
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CommanderDamagePanel } from '@/components/tracker/CommanderDamagePanel';
import { LifeCounter } from '@/components/tracker/LifeCounter';
import { PoisonCounter } from '@/components/tracker/PoisonCounter';
import { TrackerLayout } from '@/components/match/TrackerLayout';
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
          style={styles.newMatchBtn}
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
  onStart: (count: PlayerCount, startingLife: StartingLife, layoutVariant: string) => void;
  onBack: () => void;
}

function GuestSetup({ onStart, onBack }: SetupProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const [count, setCount] = useState<PlayerCount>(4);
  const [startingLife, setStartingLife] = useState<StartingLife>(40);

  const variants = LAYOUT_VARIANTS[count] ?? [];
  const [layoutVariant, setLayoutVariant] = useState<string>(variants[0] ?? '');

  // When count changes, reset layout variant to that count's first option.
  function handleCountChange(n: PlayerCount) {
    setCount(n);
    const next = LAYOUT_VARIANTS[n] ?? [];
    setLayoutVariant(next[0] ?? '');
  }

  function handleStart() {
    onStart(count, startingLife, layoutVariant);
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.setupHeader}>
        <Pressable onPress={onBack} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={styles.cancelText}>‹</Text>
        </Pressable>
        <Text style={styles.setupTitle}>{t('guest.newMatch')}</Text>
        <View style={styles.cancelBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.setupContent} keyboardShouldPersistTaps="handled">
        {/* Player count */}
        <Text style={styles.sectionLabel}>{t('guest.players')}</Text>
        <View style={styles.countRow}>
          {PLAYER_COUNT_OPTIONS.map((n) => (
            <Pressable
              key={n}
              onPress={() => handleCountChange(n)}
              style={[styles.countBtn, count === n && styles.countBtnActive]}
              accessibilityRole="button"
              accessibilityLabel={`${n} players`}
              accessibilityState={{ selected: count === n }}
            >
              <Text style={[styles.countBtnText, count === n && styles.countBtnTextActive]}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Starting HP */}
        <Text style={styles.sectionLabel}>{t('guest.startingHp')}</Text>
        <View style={styles.countRow}>
          {STARTING_LIFE_OPTIONS.map((hp) => (
            <Pressable
              key={hp}
              onPress={() => setStartingLife(hp)}
              style={[styles.lifeChip, startingLife === hp && styles.lifeChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`${hp} life`}
              accessibilityState={{ selected: startingLife === hp }}
            >
              <Text style={[styles.lifeChipText, startingLife === hp && styles.lifeChipTextActive]}>
                {hp}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Layout — only when count ≥ 2 */}
        {count >= 2 && variants.length > 1 && (
          <>
            <Text style={styles.sectionLabel}>{t('guest.layout')}</Text>
            <View style={styles.layoutRow}>
              {variants.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setLayoutVariant(v)}
                  style={[styles.layoutBtn, layoutVariant === v && styles.layoutBtnActive]}
                  accessibilityRole="button"
                  accessibilityLabel={v}
                  accessibilityState={{ selected: layoutVariant === v }}
                >
                  <Text style={[styles.layoutBtnText, layoutVariant === v && styles.layoutBtnTextActive]}>
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Start button */}
        <Pressable
          onPress={handleStart}
          style={styles.startBtn}
          accessibilityRole="button"
          accessibilityLabel={t('guest.startTrackerLabel')}
        >
          <Text style={styles.startBtnText}>{t('guest.startTracking')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Tracking Phase ───────────────────────────────────────────────────────────

interface TrackerProps {
  participations: ReturnType<typeof useGuestTracker>['participations'];
  layoutVariant: string;
  applyLifeChange: ReturnType<typeof useGuestTracker>['applyLifeChange'];
  applyPoisonChange: ReturnType<typeof useGuestTracker>['applyPoisonChange'];
  applyCommanderDamage: ReturnType<typeof useGuestTracker>['applyCommanderDamage'];
  undoLastEvent: ReturnType<typeof useGuestTracker>['undoLastEvent'];
  onExit: () => void;
}

function GuestTrackerView({
  participations,
  layoutVariant,
  applyLifeChange,
  applyPoisonChange,
  applyCommanderDamage,
  undoLastEvent,
  onExit,
}: TrackerProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const slotRotations = DEFAULT_SLOT_ROTATIONS[layoutVariant] ?? [];

  const sections = participations.map((p, idx) => {
    // Enemy commanders in guest mode = other participants (by id + name)
    const enemyCommanders = participations
      .filter((other) => other.id !== p.id)
      .map((other) => ({ id: other.id, name: other.name }));

    return {
      id: p.id,
      rotation: slotRotations[idx] ?? 0,
      content: (
        <View style={styles.sectionContent}>
          <LifeCounter
            lifeTotal={p.lifeTotal}
            participationId={p.id}
            onDelta={applyLifeChange}
          />
          <PoisonCounter
            poisonCounters={p.poisonCounters}
            participationId={p.id}
            onDelta={applyPoisonChange}
          />
          <CommanderDamagePanel
            commanderDamage={p.commanderDamage}
            enemyCommanders={enemyCommanders}
            participationId={p.id}
            onDelta={applyCommanderDamage}
          />
        </View>
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

      {/* Tracker layout */}
      <View style={styles.trackerBody}>
        <TrackerLayout sections={sections} layoutVariant={layoutVariant} />
      </View>
    </SafeAreaView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

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

  const navigateToAuth = useCallback(() => {
    exitGuestMode();
    router.replace('/auth');
  }, [exitGuestMode, router]);

  const handleStart = useCallback(
    (count: PlayerCount, startingLife: StartingLife, variant: string) => {
      init(count, startingLife);
      setLayoutVariant(variant);
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
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => setPhase('home'),
        },
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
      applyLifeChange={applyLifeChange}
      applyPoisonChange={applyPoisonChange}
      applyCommanderDamage={applyCommanderDamage}
      undoLastEvent={undoLastEvent}
      onExit={handleTrackerExit}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  newMatchBtn: {
    height: 96,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newMatchText: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['heading-lg'],
    fontWeight: t.typography.weight.bold,
    letterSpacing: t.typography.letterSpacing.wide,
    textTransform: 'uppercase',
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
  setupContent: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
    gap: spacing[3],
  },
  sectionLabel: {
    color: t.colors.text.muted,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: t.typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: spacing[1],
    marginTop: spacing[2],
  },
  countRow: {
    flexDirection: 'row',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  countBtn: {
    width: 64,
    height: 64,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  countBtnActive: {
    backgroundColor: t.colors.accent.primary + '22',
    borderColor: t.colors.accent.primary,
  },
  countBtnText: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.lifeTotalBold,
    fontSize: t.typography.size['heading-xl'],
    fontWeight: t.typography.weight.bold,
  },
  countBtnTextActive: {
    color: t.colors.accent.primary,
  },
  lifeChip: {
    minWidth: 64,
    height: 48,
    paddingHorizontal: spacing[3],
    borderRadius: t.radius.md,
    backgroundColor: t.colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  lifeChipActive: {
    backgroundColor: t.colors.accent.primary + '22',
    borderColor: t.colors.accent.primary,
  },
  lifeChipText: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.lifeTotalBold,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.bold,
  },
  lifeChipTextActive: {
    color: t.colors.accent.primary,
  },
  layoutRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  layoutBtn: {
    paddingHorizontal: spacing[3],
    height: 40,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  layoutBtnActive: {
    backgroundColor: t.colors.accent.primary + '22',
    borderColor: t.colors.accent.primary,
  },
  layoutBtnText: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  layoutBtnTextActive: {
    color: t.colors.accent.primary,
  },
  startBtn: {
    height: 52,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  startBtnText: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.bold,
    letterSpacing: t.typography.letterSpacing.wide,
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
  sectionContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
})
