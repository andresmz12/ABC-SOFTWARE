import { Tabs } from 'expo-router';
import { C } from '@/constants/theme';
import TabIcon from '@/components/ui/TabIcon';

export default function ProviderLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: C.line,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2 },
      }}
    >
      <Tabs.Screen name="home"          options={{ title: 'Home',      tabBarIcon: ({ focused }) => <TabIcon name="home"        focused={focused} /> }} />
      <Tabs.Screen name="jobs"          options={{ title: 'Jobs',      tabBarIcon: ({ focused }) => <TabIcon name="briefcase"  focused={focused} /> }} />
      <Tabs.Screen name="my-jobs"       options={{ title: 'My Jobs',   tabBarIcon: ({ focused }) => <TabIcon name="list"       focused={focused} /> }} />
      <Tabs.Screen name="documents"     options={{ title: 'Docs',      tabBarIcon: ({ focused }) => <TabIcon name="file-text"  focused={focused} /> }} />
      <Tabs.Screen name="analytics"     options={{ title: 'Analytics', tabBarIcon: ({ focused }) => <TabIcon name="bar-chart-2" focused={focused} /> }} />
      <Tabs.Screen name="profile"       options={{ title: 'Profile',   tabBarIcon: ({ focused }) => <TabIcon name="user"       focused={focused} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts',    tabBarIcon: ({ focused }) => <TabIcon name="bell"       focused={focused} /> }} />
      <Tabs.Screen name="job-detail"    options={{ href: null }} />
    </Tabs>
  );
}
