import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.background.secondary,
      borderTopColor: theme.colors.border.subtle,
      borderTopWidth: 1,
    }),
    [theme],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: theme.colors.accent.primary,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' as const },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="players" options={{ title: t('tabs.players') }} />
      <Tabs.Screen name="decks" options={{ title: t('tabs.decks') }} />
      <Tabs.Screen name="history" options={{ title: t('tabs.history') }} />
      <Tabs.Screen name="stats" options={{ title: t('tabs.stats') }} />
    </Tabs>
  );
}
