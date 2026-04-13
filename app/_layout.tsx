import { useEffect } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

// i18n init (SETUP-006)
import '../constants/i18n';
import { GuestProvider, useGuest } from '@/contexts/GuestContext';
import { GroupProvider } from '@/contexts/GroupContext';
import { colors } from '@/styles/tokens';

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

// Auth gate — wrapped inside ClerkProvider + GuestProvider so hooks are available.
function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isGuest } = useGuest();
  const router = useRouter();
  const segments = useSegments();

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

  const { t } = useTranslation();

  return (
    <GroupProvider>
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { color: colors.text.primary },
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'slide_from_right',
        gestureResponseDistance: 30,
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
      <Stack.Screen name="match/[id]/results" options={{ title: t('match.results') }} />
      <Stack.Screen name="match/[id]/index" options={{ title: t('match.detail') }} />
      <Stack.Screen name="players/[id]" options={{ title: t('player.players') }} />
      <Stack.Screen name="decks/[id]" options={{ title: t('deck.decks') }} />
      <Stack.Screen name="commanders/index" options={{ title: t('commanders.title') }} />
      <Stack.Screen name="commanders/[id]" options={{ title: t('game.commander') }} />
      <Stack.Screen name="stats/matchup" options={{ title: t('stats.viewMatchup') }} />
      <Stack.Screen name="groups/index" options={{ title: t('groups.title') }} />
      <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
    </Stack>
    </GroupProvider>
  );
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <GuestProvider>
        <StatusBar style="light" />
        <AuthGate />
      </GuestProvider>
    </ClerkProvider>
  );
}
