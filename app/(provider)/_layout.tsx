import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View className="items-center pt-1">
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      {focused && (
        <View style={{ width: 18, height: 2.5, backgroundColor: '#C9A84C', borderRadius: 2, marginTop: 3 }} />
      )}
    </View>
  );
}

export default function ProviderLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B3A6B',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'DMSans_500Medium' },
      }}
    >
      <Tabs.Screen name="home"          options={{ title: t('provider.home'),          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="jobs"          options={{ title: t('provider.jobs'),          tabBarIcon: ({ focused }) => <TabIcon emoji="💼" focused={focused} /> }} />
      <Tabs.Screen name="documents"     options={{ title: t('provider.documents'),     tabBarIcon: ({ focused }) => <TabIcon emoji="📄" focused={focused} /> }} />
      <Tabs.Screen name="profile"       options={{ title: t('provider.profile'),       tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
      <Tabs.Screen name="notifications" options={{ title: t('provider.notifications'), tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} /> }} />
    </Tabs>
  );
}
