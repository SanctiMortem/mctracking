import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// i18n init (SETUP-006)
import '../constants/i18n';
import { GuestProvider, useGuest } from '@/contexts/GuestContext';

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

  // While Clerk initializes, render nothing (avoids flash).
  if (!isLoaded) return null;

  // Unauthenticated and not in guest mode → go to auth screen.
  if (!isSignedIn && !isGuest) {
    return <Redirect href="/auth" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0D0D0F' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" options={{ animation: 'none' }} />
      <Stack.Screen name="guest" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="match/setup" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="match/[id]/tracker" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen
        name="match/[id]/close"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="match/[id]/results" />
      <Stack.Screen name="match/[id]/index" />
      <Stack.Screen name="players/[id]" />
      <Stack.Screen name="decks/[id]" />
      <Stack.Screen name="commanders/index" />
      <Stack.Screen name="commanders/[id]" />
      <Stack.Screen name="stats/matchup" />
      <Stack.Screen name="groups" />
      <Stack.Screen name="settings" />
    </Stack>
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
