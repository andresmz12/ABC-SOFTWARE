import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

type FeatherName = keyof typeof Feather.glyphMap;

function TabIcon({ name, focused }: { name: FeatherName; focused: boolean }) {
  return <Feather name={name} size={22} color={focused ? C.accent2 : C.textMuted} />;
}

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
      <Tabs.Screen name="dashboard"       options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => <TabIcon name="grid"       focused={focused} /> }} />
      <Tabs.Screen name="providers"       options={{ title: 'Providers', tabBarIcon: ({ focused }) => <TabIcon name="users"      focused={focused} /> }} />
      <Tabs.Screen name="jobs"            options={{ title: 'Jobs',      tabBarIcon: ({ focused }) => <TabIcon name="briefcase"  focused={focused} /> }} />
      <Tabs.Screen name="profile"         options={{ title: 'Profile',   tabBarIcon: ({ focused }) => <TabIcon name="user"       focused={focused} /> }} />
      <Tabs.Screen name="documents"       options={{ href: null }} />
      <Tabs.Screen name="provider-detail" options={{ href: null }} />
    </Tabs>
  );
}
