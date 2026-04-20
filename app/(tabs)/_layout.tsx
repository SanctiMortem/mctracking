import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/contexts/ThemeContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcon = (focusedName: IoniconName, unfocusedName: IoniconName) =>
  ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? focusedName : unfocusedName} color={color} size={size} />
  );

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
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="players"
        options={{ title: t('tabs.players'), tabBarIcon: tabIcon('people', 'people-outline') }}
      />
      <Tabs.Screen
        name="decks"
        options={{ title: t('tabs.decks'), tabBarIcon: tabIcon('library', 'library-outline') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: t('tabs.history'), tabBarIcon: tabIcon('time', 'time-outline') }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: t('tabs.stats'), tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline') }}
      />
    </Tabs>
  );
}
