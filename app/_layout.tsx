import { useEffect } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

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

  return (
    <GroupProvider>
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { color: colors.text.primary },
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="guest" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="match/setup" options={{ title: 'Match Setup', presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
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
      <Stack.Screen name="match/[id]/results" options={{ title: 'Results' }} />
      <Stack.Screen name="match/[id]/index" options={{ title: 'Match' }} />
      <Stack.Screen name="players/[id]" options={{ title: 'Player' }} />
      <Stack.Screen name="decks/[id]" options={{ title: 'Deck' }} />
      <Stack.Screen name="commanders/index" options={{ title: 'Commanders' }} />
      <Stack.Screen name="commanders/[id]" options={{ title: 'Commander' }} />
      <Stack.Screen name="stats/matchup" options={{ title: 'Matchup' }} />
      <Stack.Screen name="groups/index" options={{ title: 'Groups' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
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
