/**
 * SCR-019 — Guest Tracker
 *
 * Two-phase screen:
 *  1. Setup: select player count (2/3/4) + optional name inputs.
 *  2. Tracking: full TrackerLayout with LifeCounter, PoisonCounter,
 *     CommanderDamagePanel — all in-memory, zero API calls (BR-AUTH-01).
 *
 * Exit with unsaved changes shows a confirmation dialog (BR-AUTH-01).
 * Guest banner at the bottom links back to SCR-001 (ADR-006: no mid-match upgrade).
 *
 * PLAT-004 (EPIC-05)
 */
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
import { colors, radius, spacing, typography } from '@/styles/tokens';

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAYER_COUNT_OPTIONS = [2, 3, 4] as const;
type PlayerCount = (typeof PLAYER_COUNT_OPTIONS)[number];

// ─── Setup Phase ─────────────────────────────────────────────────────────────

interface SetupProps {
  onStart: (names: string[]) => void;
  onCancel: () => void;
}

function GuestSetup({ onStart, onCancel }: SetupProps) {
  const { t } = useTranslation();
  const [count, setCount] = useState<PlayerCount>(4);
  const [names, setNames] = useState(['', '', '', '']);

  function handleNameChange(index: number, value: string) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleStart() {
    onStart(names.slice(0, count));
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.setupHeader}>
        <Pressable onPress={onCancel} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel={t('guest.cancelSetupLabel')}>
          <Text style={styles.cancelText}>✕</Text>
        </Pressable>
        <Text style={styles.setupTitle}>{t('guest.title')}</Text>
        <View style={styles.cancelBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.setupContent} keyboardShouldPersistTaps="handled">
        {/* Player count */}
        <Text style={styles.sectionLabel}>{t('guest.players')}</Text>
        <View style={styles.countRow}>
          {PLAYER_COUNT_OPTIONS.map((n) => (
            <Pressable
              key={n}
              onPress={() => setCount(n)}
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

        {/* Optional name inputs */}
        <Text style={styles.sectionLabel}>{t('guest.namesOptional')}</Text>
        {Array.from({ length: count }, (_, i) => (
          <TextInput
            key={i}
            style={styles.nameInput}
            placeholder={t('guest.playerN', { n: i + 1 })}
            placeholderTextColor={colors.text.muted}
            value={names[i]}
            onChangeText={(v) => handleNameChange(i, v)}
            maxLength={20}
            returnKeyType="next"
            autoCapitalize="words"
          />
        ))}

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
  isDirty: boolean;
  recordEvent: ReturnType<typeof useGuestTracker>['recordEvent'];
  undoLastEvent: ReturnType<typeof useGuestTracker>['undoLastEvent'];
  onExit: () => void;
  onCreateAccount: () => void;
}

function GuestTrackerView({
  participations,
  isDirty,
  recordEvent,
  undoLastEvent,
  onExit,
  onCreateAccount,
}: TrackerProps) {
  const { t } = useTranslation();
  const sections = participations.map((p) => {
    // Enemy commanders in guest mode = other participants (by id + name)
    const enemyCommanders = participations
      .filter((other) => other.id !== p.id)
      .map((other) => ({ id: other.id, name: other.name }));

    return {
      id: p.id,
      playerName: p.name,
      content: (
        <View style={styles.sectionContent}>
          <LifeCounter
            lifeTotal={p.lifeTotal}
            participationId={p.id}
            onEvent={recordEvent}
          />
          <PoisonCounter
            poisonCounters={p.poisonCounters}
            participationId={p.id}
            onEvent={recordEvent}
          />
          <CommanderDamagePanel
            commanderDamage={p.commanderDamage}
            enemyCommanders={enemyCommanders}
            participationId={p.id}
            onEvent={recordEvent}
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
        <TrackerLayout sections={sections} />
      </View>

      {/* Guest banner — informational only (ADR-006: no mid-match upgrade) */}
      <TouchableOpacity
        onPress={onCreateAccount}
        activeOpacity={0.8}
        style={styles.guestBanner}
        accessibilityRole="button"
        accessibilityLabel="Create account to save match history"
      >
        <Text style={styles.guestBannerIcon}>💾</Text>
        <Text style={styles.guestBannerText}>{t('guest.createAccountBanner')}</Text>
        <Text style={styles.guestBannerChevron}>›</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GuestScreen() {
  const router = useRouter();
  const { exitGuestMode } = useGuest();
  const { participations, isDirty, init, recordEvent, undoLastEvent } = useGuestTracker();

  const [phase, setPhase] = useState<'setup' | 'tracking'>('setup');

  const navigateToAuth = useCallback(() => {
    exitGuestMode();
    router.replace('/auth');
  }, [exitGuestMode, router]);

  const handleSetupCancel = useCallback(() => {
    navigateToAuth();
  }, [navigateToAuth]);

  const handleStart = useCallback((names: string[]) => {
    init(names);
    setPhase('tracking');
  }, [init]);

  const handleExit = useCallback(() => {
    if (!isDirty) {
      navigateToAuth();
      return;
    }
    Alert.alert(
      'Exit Guest Tracker?',
      'All tracking data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: navigateToAuth,
        },
      ],
    );
  }, [isDirty, navigateToAuth]);

  const handleCreateAccount = useCallback(() => {
    if (!isDirty) {
      navigateToAuth();
      return;
    }
    Alert.alert(
      'Create an account?',
      'Your current tracking data will be lost.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Create account',
          style: 'default',
          onPress: navigateToAuth,
        },
      ],
    );
  }, [isDirty, navigateToAuth]);

  if (phase === 'setup') {
    return <GuestSetup onStart={handleStart} onCancel={handleSetupCancel} />;
  }

  return (
    <GuestTrackerView
      participations={participations}
      isDirty={isDirty}
      recordEvent={recordEvent}
      undoLastEvent={undoLastEvent}
      onExit={handleExit}
      onCreateAccount={handleCreateAccount}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // ── Setup ──────────────────────────────────────────────────────────────────
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  setupTitle: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  cancelBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.text.secondary,
    fontSize: typography.size['heading-md'],
  },
  setupContent: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
    gap: spacing[3],
  },
  sectionLabel: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: spacing[1],
    marginTop: spacing[2],
  },
  countRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  countBtn: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  countBtnActive: {
    backgroundColor: colors.accent.primary + '22',
    borderColor: colors.accent.primary,
  },
  countBtnText: {
    color: colors.text.secondary,
    fontSize: typography.size['heading-xl'],
    fontWeight: typography.weight.bold,
  },
  countBtnTextActive: {
    color: colors.accent.primary,
  },
  nameInput: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing[4],
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
  },
  startBtn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  startBtnText: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.bold,
    letterSpacing: typography.letterSpacing.wide,
  },

  // ── Tracker ────────────────────────────────────────────────────────────────
  trackerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  trackerTitle: {
    color: colors.text.secondary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  exitBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: {
    color: colors.text.secondary,
    fontSize: typography.size['heading-md'],
  },
  undoBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoText: {
    color: colors.text.secondary,
    fontSize: typography.size['heading-md'],
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

  // ── Guest banner ───────────────────────────────────────────────────────────
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.background.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  guestBannerIcon: {
    fontSize: typography.size['body-sm'],
  },
  guestBannerText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  guestBannerChevron: {
    color: colors.text.muted,
    fontSize: typography.size['heading-md'],
  },
});
