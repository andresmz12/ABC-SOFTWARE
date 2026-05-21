import { Tabs } from 'expo-router';
import { C } from '@/constants/theme';
import TabIcon from '@/components/ui/TabIcon';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent2,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: '#0F0F0F',
          borderTopColor: C.line,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2 },
      }}
    >
      <Tabs.Screen name="dashboard"       options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => <TabIcon name="grid"      focused={focused} activeColor={C.accent2} /> }} />
      <Tabs.Screen name="providers"       options={{ title: 'Providers', tabBarIcon: ({ focused }) => <TabIcon name="users"     focused={focused} activeColor={C.accent2} /> }} />
      <Tabs.Screen name="jobs"            options={{ title: 'Jobs',      tabBarIcon: ({ focused }) => <TabIcon name="briefcase" focused={focused} activeColor={C.accent2} /> }} />
      <Tabs.Screen name="profile"         options={{ title: 'Profile',   tabBarIcon: ({ focused }) => <TabIcon name="user"      focused={focused} activeColor={C.accent2} /> }} />
      <Tabs.Screen name="documents"       options={{ href: null }} />
      <Tabs.Screen name="provider-detail" options={{ href: null }} />
    </Tabs>
  );
}
