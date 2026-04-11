import { Redirect } from 'expo-router';

// Root route: redirect to tabs home.
// Auth gate is handled in _layout.tsx (Clerk, SETUP-007).
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
