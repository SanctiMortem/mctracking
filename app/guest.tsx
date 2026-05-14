/**
 * SCR-019 — Guest Tracker
 *
 * Two-screen flow for the unauthenticated user:
 *  1. Home: minimal entry — "New Match" + "Sign In".
 *  2. New Match: setup + tracker (delegated to <CasualMatch />, the same
 *     component used by the signed-in /match/casual route).
 *
 * Exit with unsaved changes shows a confirmation dialog (BR-AUTH-01).
 *
 * PLAT-004 (EPIC-05)
 */
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CasualMatch } from '@/components/match/CasualMatch';
import { useGuest } from '@/contexts/GuestContext';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

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

export default function GuestScreen() {
  const router = useRouter();
  const { exitGuestMode } = useGuest();
  const [phase, setPhase] = useState<'home' | 'match'>('home');

  const navigateToAuth = useCallback(() => {
    exitGuestMode();
    router.replace('/auth');
  }, [exitGuestMode, router]);

  if (phase === 'home') {
    return <GuestHome onNewMatch={() => setPhase('match')} onSignIn={navigateToAuth} />;
  }

  return <CasualMatch onExit={() => setPhase('home')} />;
}

const createStyles = (t: AppTheme) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },
  homeContainer: {
    flex: 1,
    paddingHorizontal: spacing[6],
    justifyContent: 'space-between' as const,
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  newMatchBtn: {
    backgroundColor: t.colors.accent.primary,
    borderRadius: t.radius.lg,
    padding: spacing[4],
    alignItems: 'center' as const,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
});
