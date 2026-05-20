import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

function Icon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

export default function ProviderLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B3A6B',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: { borderTopColor: '#E5E7EB', paddingBottom: 4 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('provider.home'), tabBarIcon: ({ focused }) => <Icon emoji={focused ? '🏠' : '🏠'} /> }} />
      <Tabs.Screen name="jobs" options={{ title: t('provider.jobs'), tabBarIcon: () => <Icon emoji="📋" /> }} />
      <Tabs.Screen name="documents" options={{ title: t('provider.documents'), tabBarIcon: () => <Icon emoji="📄" /> }} />
      <Tabs.Screen name="profile" options={{ title: t('provider.profile'), tabBarIcon: () => <Icon emoji="👤" /> }} />
      <Tabs.Screen name="notifications" options={{ title: t('provider.notifications'), tabBarIcon: () => <Icon emoji="🔔" /> }} />
    </Tabs>
  );
}
