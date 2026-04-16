import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet as RNStyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Fonts — "The Mystic Archive" design system
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Manrope_400Regular, Manrope_500Medium } from '@expo-google-fonts/manrope';
import { BigShouldersDisplay_600SemiBold, BigShouldersDisplay_700Bold } from '@expo-google-fonts/big-shoulders-display';
// Fonts — "Justice of the Light" skin
import { NotoSerif_600SemiBold, NotoSerif_700Bold } from '@expo-google-fonts/noto-serif';
import { WorkSans_400Regular, WorkSans_500Medium } from '@expo-google-fonts/work-sans';

// i18n init (SETUP-006)
import '../constants/i18n';
import { GuestProvider, useGuest } from '@/contexts/GuestContext';
import { GroupProvider } from '@/contexts/GroupContext';
import { AccountPlayerProvider, useAccountPlayer } from '@/contexts/AccountPlayerContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { apiFetch } from '@/services/api';
import { colors, radius, spacing, typography } from '@/styles/tokens';

// Keep splash visible while fonts load
SplashScreen.preventAutoHideAsync();

// SecureStore token cache for Clerk — persists session across app restarts.
const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  async clearToken(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};

// ─── Account Player Setup Modal ──────────────────────────────────────────────
// Rendered inside AuthGate (root level) so it shows reliably on all devices.

function AccountPlayerSetupModal() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const { needsSetup, setNeedsSetup, setAccountPlayer } = useAccountPlayer();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!needsSetup) return null;

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await apiFetch<{ success: boolean; data: import('@/db/index').Player }>(
        '/api/players/account',
        'POST',
        { name: name.trim() },
        token ?? undefined,
      );
      setAccountPlayer(res.data);
      setNeedsSetup(false);
    } catch (e) {
      setError((e as Error).message ?? t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={setupStyles.backdrop}
      >
        <View style={setupStyles.card}>
          <Text style={setupStyles.title}>{t('account.setupTitle')}</Text>
          <Text style={setupStyles.subtitle}>{t('account.setupSubtitle')}</Text>
          <TextInput
            style={setupStyles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('account.namePlaceholder')}
            placeholderTextColor={colors.text.muted}
            autoFocus
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {error && <Text style={setupStyles.error}>{error}</Text>}
          <Pressable
            onPress={handleSubmit}
            disabled={!name.trim() || submitting}
            style={[setupStyles.btn, (!name.trim() || submitting) && setupStyles.btnDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.text.inverse} size="small" />
            ) : (
              <Text style={[setupStyles.btnText, (!name.trim() || submitting) && setupStyles.btnTextDisabled]}>
                {t('common.save')}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const setupStyles = RNStyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[6],
    gap: spacing[4],
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontFamily: typography.fontFamily.headline,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    color: colors.text.primary,
    fontSize: typography.size['body-md'],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  error: {
    color: colors.status.error,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
  },
  btn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: colors.background.surface,
  },
  btnText: {
    color: colors.accent.onPrimary,
    fontSize: typography.size['body-md'],
    fontWeight: typography.weight.semibold,
  },
  btnTextDisabled: {
    color: colors.text.muted,
  },
});

// Auth gate — wrapped inside ClerkProvider + GuestProvider so hooks are available.
function AuthGate() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { isGuest } = useGuest();
  const { accountPlayer, setAccountPlayer, setNeedsSetup } = useAccountPlayer();
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { t } = useTranslation();

  // Load account player after sign-in (with retry on failure).
  // On some devices (especially iPhone) the Clerk token may not be ready
  // immediately after isSignedIn flips, causing a 401 that was previously
  // silently swallowed — leaving needsSetup stuck at false forever.
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (accountPlayer) return;

    let cancelled = false;
    retryCount.current = 0;

    async function check() {
      try {
        const token = await getToken();
        if (cancelled) return;
        if (!token) throw new Error('Token not ready');
        const res = await apiFetch<{ success: boolean; data: import('@/db/index').Player | null }>(
          '/api/players/account',
          'GET',
          undefined,
          token,
        );
        if (cancelled) return;
        if (res.data) {
          setAccountPlayer(res.data);
          setNeedsSetup(false);
        } else {
          setNeedsSetup(true);
        }
      } catch {
        if (cancelled) return;
        // Retry up to 3 times with increasing delay (1s, 2s, 4s)
        if (retryCount.current < 3) {
          const delay = 1000 * Math.pow(2, retryCount.current);
          retryCount.current += 1;
          retryTimer.current = setTimeout(check, delay);
        }
      }
    }

    check();
    return () => {
      cancelled = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [isLoaded, isSignedIn, accountPlayer]);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthScreen = segments[0] === 'auth';

    if (!isSignedIn && !isGuest && !inAuthScreen) {
      // Unauthenticated and not in guest mode → go to auth screen.
      router.replace('/auth');
    } else if ((isSignedIn || isGuest) && inAuthScreen) {
      // Authenticated or guest but still on auth screen → go to home.
      router.replace('/(tabs)/');
    }
  }, [isLoaded, isSignedIn, isGuest, segments]);

  // While Clerk initializes, render nothing (avoids flash).
  if (!isLoaded) return null;

  return (
    <GroupProvider>
    {/* Account Player Setup — rendered at root so it works on every screen/device */}
    {isSignedIn && <AccountPlayerSetupModal />}
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.background.primary },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: { color: theme.colors.text.primary, fontFamily: theme.typography.fontFamily.headline },
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: theme.colors.background.primary },
        animation: 'slide_from_right',
        gestureResponseDistance: { start: 30 } as any,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="guest" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="match/setup" options={{ title: t('match.setup'), presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="match/[id]/tracker" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen
        name="match/[id]/close"
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="match/[id]/results" options={{ title: t('match.results'), gestureEnabled: false }} />
      <Stack.Screen name="match/[id]/index" options={{ title: t('match.detail') }} />
      <Stack.Screen name="players/[id]" options={{ title: t('player.players') }} />
      <Stack.Screen name="decks/[id]" options={{ title: t('deck.decks') }} />
      <Stack.Screen name="commanders/index" options={{ title: t('commanders.title') }} />
      <Stack.Screen name="commanders/[id]" options={{ title: t('game.commander') }} />
      <Stack.Screen name="stats/matchup" options={{ title: t('stats.viewMatchup') }} />
      <Stack.Screen name="groups/index" options={{ title: t('groups.title') }} />
      <Stack.Screen name="groups/[id]" options={{ title: t('groups.podDetail') }} />
      <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
    </Stack>
    </GroupProvider>
  );
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

  const [fontsLoaded, fontError] = useFonts({
    // Mystic Archive
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    BigShouldersDisplay_600SemiBold,
    BigShouldersDisplay_700Bold,
    // Justice of the Light
    NotoSerif_600SemiBold,
    NotoSerif_700Bold,
    WorkSans_400Regular,
    WorkSans_500Medium,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ThemeProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <GuestProvider>
            <AccountPlayerProvider>
              <StatusBar style="light" />
              <AuthGate />
            </AccountPlayerProvider>
          </GuestProvider>
        </ClerkProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
