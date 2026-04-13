/**
 * SCR-018 — Settings
 * Tracker prefs, match setup, language, account (groups, premium CTA, sign out).
 * Access: gear icon in SCR-002 header.
 *
 * PLAT-008 (EPIC-05)
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';

import { useSettings } from '@/hooks/useSettings';
import { useIAP } from '@/hooks/useIAP';
import { colors, radius, spacing, typography } from '@/styles/tokens';
import i18n from '@/constants/i18n';

// ─────────────────────────────────────────────
// DebounceSlider (CMP-017) — PanResponder, no external deps
// ─────────────────────────────────────────────

const DEBOUNCE_MIN = 200;
const DEBOUNCE_MAX = 2000;
const DEBOUNCE_STEP = 50;

interface DebounceSliderProps {
  value: number;
  onChange: (v: number) => void;
}

function DebounceSlider({ value, onChange }: DebounceSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbStartXRef = useRef(0);

  const thumbRatio = trackWidth > 0 ? (value - DEBOUNCE_MIN) / (DEBOUNCE_MAX - DEBOUNCE_MIN) : 0;
  const thumbX = thumbRatio * trackWidth;

  const snapValue = useCallback(
    (rawX: number): number => {
      const x = Math.max(0, Math.min(rawX, trackWidth));
      const raw = (x / trackWidth) * (DEBOUNCE_MAX - DEBOUNCE_MIN) + DEBOUNCE_MIN;
      const snapped = Math.round(raw / DEBOUNCE_STEP) * DEBOUNCE_STEP;
      return Math.max(DEBOUNCE_MIN, Math.min(DEBOUNCE_MAX, snapped));
    },
    [trackWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          if (trackWidth <= 0) return;
          const x = evt.nativeEvent.locationX;
          thumbStartXRef.current = x;
          onChange(snapValue(x));
        },
        onPanResponderMove: (_, gestureState) => {
          if (trackWidth <= 0) return;
          onChange(snapValue(thumbStartXRef.current + gestureState.dx));
        },
      }),
    [trackWidth, snapValue, onChange],
  );

  return (
    <View style={styles.sliderWrapper}>
      <View
        style={styles.sliderTrack}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityValue={{ min: DEBOUNCE_MIN, max: DEBOUNCE_MAX, now: value }}
      >
        {trackWidth > 0 && (
          <>
            <View style={[styles.sliderFill, { width: thumbX }]} />
            <View style={[styles.sliderThumb, { left: thumbX - 11 }]} />
          </>
        )}
      </View>
      <View style={styles.sliderMeta}>
        <Text style={styles.sliderLabel}>{DEBOUNCE_MIN}ms</Text>
        <Text style={styles.sliderValue}>{value}ms</Text>
        <Text style={styles.sliderLabel}>{DEBOUNCE_MAX}ms</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// SegmentedPicker — language + life total
// ─────────────────────────────────────────────

interface SegmentedPickerProps<T extends string | number> {
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
}

function SegmentedPicker<T extends string | number>({
  options,
  selected,
  onSelect,
}: SegmentedPickerProps<T>) {
  return (
    <View style={styles.segmented}>
      {options.map((opt, i) => {
        const isActive = opt.value === selected;
        return (
          <Pressable
            key={String(opt.value)}
            style={[
              styles.segmentedBtn,
              isActive && styles.segmentedBtnActive,
              i === 0 && styles.segmentedFirst,
              i === options.length - 1 && styles.segmentedLast,
            ]}
            onPress={() => onSelect(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.segmentedText, isActive && styles.segmentedTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────
// Row primitives
// ─────────────────────────────────────────────

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SettingRowStack({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.rowStack}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function LinkRow({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
      {!danger && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────

const LANGUAGE_OPTIONS: { label: string; value: 'auto' | 'en' | 'es' }[] = [
  { label: 'Auto', value: 'auto' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
];

const LIFE_TOTAL_OPTIONS: { label: string; value: number }[] = [
  { label: '20', value: 20 },
  { label: '30', value: 30 },
  { label: '40', value: 40 },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const { settings, loading, error, saving, refresh, patchSetting } = useSettings();
  const { purchase, restore, isPurchasing, isRestoring } = useIAP(refresh);

  const [signingOut, setSigningOut] = useState(false);

  // ── Handlers ──────────────────────────────

  const handleLanguage = useCallback(
    (lang: 'auto' | 'en' | 'es') => {
      patchSetting({ language: lang });
      // Apply language change immediately without restart (US-041)
      const target = lang === 'auto' ? 'en' : lang;
      void i18n.changeLanguage(target);
    },
    [patchSetting],
  );

  const handleDebounce = useCallback(
    (v: number) => patchSetting({ debounce_threshold_ms: v }),
    [patchSetting],
  );

  const handleSwipeGestures = useCallback(
    (v: boolean) => patchSetting({ swipe_gestures_enabled: v }),
    [patchSetting],
  );

  const handleRequireCommander = useCallback(
    (v: boolean) => patchSetting({ require_commander: v }),
    [patchSetting],
  );

  const handleLifeTotal = useCallback(
    (v: number) => patchSetting({ default_life_total: v }),
    [patchSetting],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            router.replace('/auth');
          } catch {
            setSigningOut(false);
          }
        },
      },
    ]);
  }, [signOut, router]);

  // ── Section data ──────────────────────────

  type SectionItem =
    | { key: 'swipe' }
    | { key: 'debounce' }
    | { key: 'require_commander' }
    | { key: 'life_total' }
    | { key: 'language' }
    | { key: 'groups' }
    | { key: 'premium' }
    | { key: 'signout' };

  type Section = { title: string; data: SectionItem[] };

  const sections: Section[] = [
    {
      title: t('settings.tracker'),
      data: [{ key: 'swipe' }, { key: 'debounce' }],
    },
    {
      title: t('settings.matchSetup'),
      data: [{ key: 'require_commander' }, { key: 'life_total' }],
    },
    {
      title: t('settings.language'),
      data: [{ key: 'language' }],
    },
    {
      title: t('settings.account'),
      data: [{ key: 'groups' }, { key: 'premium' }, { key: 'signout' }],
    },
  ];

  const renderItem = useCallback(
    ({ item }: { item: SectionItem }) => {
      if (!settings) return null;

      switch (item.key) {
        case 'swipe':
          return (
            <SettingRow label={t('settings.swipeGestures')}>
              <Switch
                value={settings.swipeGesturesEnabled}
                onValueChange={handleSwipeGestures}
                trackColor={{ false: colors.border.strong, true: colors.accent.primary }}
                thumbColor={colors.text.primary}
                accessibilityLabel="Enable swipe gestures"
              />
            </SettingRow>
          );

        case 'debounce':
          return (
            <SettingRowStack label={t('settings.debounceThreshold')}>
              <DebounceSlider value={settings.debounceThresholdMs} onChange={handleDebounce} />
            </SettingRowStack>
          );

        case 'require_commander':
          return (
            <SettingRow label={t('settings.commanderRequired')}>
              <Switch
                value={settings.requireCommander}
                onValueChange={handleRequireCommander}
                trackColor={{ false: colors.border.strong, true: colors.accent.primary }}
                thumbColor={colors.text.primary}
                accessibilityLabel="Commander required when creating decks"
              />
            </SettingRow>
          );

        case 'life_total':
          return (
            <SettingRowStack label={t('settings.startingLifeTotal')}>
              <SegmentedPicker
                options={LIFE_TOTAL_OPTIONS}
                selected={settings.defaultLifeTotal}
                onSelect={handleLifeTotal}
              />
            </SettingRowStack>
          );

        case 'language':
          return (
            <SettingRowStack label={t('settings.appLanguage')}>
              <SegmentedPicker
                options={LANGUAGE_OPTIONS}
                selected={settings.language}
                onSelect={handleLanguage}
              />
            </SettingRowStack>
          );

        case 'groups':
          return (
            <LinkRow
              label={t('settings.myGroups')}
              onPress={() => router.push('/groups')}
            />
          );

        case 'premium':
          return settings.premium ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('settings.premium')}</Text>
              <Text style={styles.premiumActive}>{t('settings.premiumActive')}</Text>
            </View>
          ) : (
            <>
              <Pressable
                style={styles.row}
                onPress={isPurchasing || isRestoring ? undefined : purchase}
                accessibilityRole="button"
              >
                <Text style={styles.rowLabel}>
                  {isPurchasing ? `${t('common.loading')}` : t('settings.premiumCta')}
                </Text>
                {!isPurchasing && <Text style={styles.chevron}>›</Text>}
              </Pressable>
              <Pressable
                style={styles.row}
                onPress={isPurchasing || isRestoring ? undefined : restore}
                accessibilityRole="button"
              >
                <Text style={[styles.rowLabel, styles.restoreText]}>
                  {isRestoring ? `${t('common.loading')}` : t('settings.retry')}
                </Text>
              </Pressable>
            </>
          );

        case 'signout':
          return (
            <LinkRow
              label={signingOut ? t('settings.signingOut') : t('settings.signOut')}
              onPress={handleSignOut}
              danger
            />
          );

        default:
          return null;
      }
    },
    [
      settings,
      handleSwipeGestures,
      handleDebounce,
      handleRequireCommander,
      handleLifeTotal,
      handleLanguage,
      handleSignOut,
      signingOut,
      router,
      purchase,
      restore,
      isPurchasing,
      isRestoring,
    ],
  );

  // ── Render ────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.title')}</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !settings) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.title')}</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Could not load settings'}</Text>
          <Pressable style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        {saving && <ActivityIndicator color={colors.accent.primary} size="small" />}
      </View>

      <SectionList<SectionItem, Section>
        sections={sections}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.size['heading-lg'],
    fontFamily: typography.fontFamily.headline,
    fontWeight: typography.weight.bold,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[6],
  },
  errorText: {
    color: colors.status.error,
    fontSize: typography.size['body-lg'],
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  retryText: { color: colors.text.secondary, fontSize: typography.size['body-lg'] },

  // List layout
  listContent: { paddingBottom: spacing[8] },
  sectionHeader: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[2],
  },
  sectionSeparator: { height: spacing[1] },
  separator: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing[4],
  },

  // Row primitives
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    minHeight: 52,
  },
  rowStack: {
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  rowLabel: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.regular,
    flexShrink: 1,
  },
  chevron: {
    color: colors.text.muted,
    fontSize: 20,
    lineHeight: 24,
  },
  dangerText: { color: colors.status.error },
  restoreText: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
  premiumActive: {
    color: colors.status.success,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
  },

  // DebounceSlider (CMP-017)
  sliderWrapper: { gap: spacing[2] },
  sliderTrack: {
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: colors.border.default,
    borderRadius: radius.round,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 28,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.round,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text.primary,
    top: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  sliderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
  },
  sliderValue: {
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
  },

  // SegmentedPicker
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border.default,
  },
  segmentedBtnActive: {
    backgroundColor: colors.accent.primary,
  },
  segmentedFirst: { borderLeftWidth: 0 },
  segmentedLast: { borderRightWidth: 0 },
  segmentedText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  segmentedTextActive: {
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
  },
});
