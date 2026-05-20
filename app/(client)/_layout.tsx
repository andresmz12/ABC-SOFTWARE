import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

function Icon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

export default function ClientLayout() {
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
      <Tabs.Screen name="home" options={{ title: t('client.home'), tabBarIcon: () => <Icon emoji="🏠" /> }} />
      <Tabs.Screen name="post-job" options={{ title: t('client.postJob'), tabBarIcon: () => <Icon emoji="➕" /> }} />
      <Tabs.Screen name="my-requests" options={{ title: t('client.myRequests'), tabBarIcon: () => <Icon emoji="📋" /> }} />
      <Tabs.Screen name="browse-providers" options={{ title: t('client.browse'), tabBarIcon: () => <Icon emoji="🔍" /> }} />
      <Tabs.Screen name="profile" options={{ title: t('client.profile'), tabBarIcon: () => <Icon emoji="👤" /> }} />
    </Tabs>
  );
}
