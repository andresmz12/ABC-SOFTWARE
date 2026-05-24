import { Tabs } from 'expo-router';
import { C } from '@/constants/theme';
import TabIcon from '@/components/ui/TabIcon';

export default function ClientLayout() {
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
      <Tabs.Screen name="home"             options={{ title: 'Home',     tabBarIcon: ({ focused }) => <TabIcon name="home"          focused={focused} /> }} />
      <Tabs.Screen name="post-job"         options={{ title: 'Post Job', tabBarIcon: ({ focused }) => <TabIcon name="plus-circle"  focused={focused} /> }} />
      <Tabs.Screen name="my-requests"      options={{ title: 'Requests', tabBarIcon: ({ focused }) => <TabIcon name="list"         focused={focused} /> }} />
      <Tabs.Screen name="browse-providers" options={{ title: 'Browse',   tabBarIcon: ({ focused }) => <TabIcon name="search"       focused={focused} /> }} />
      <Tabs.Screen name="profile"          options={{ title: 'Profile',  tabBarIcon: ({ focused }) => <TabIcon name="user"         focused={focused} /> }} />
      <Tabs.Screen name="job-offers"       options={{ href: null }} />
      <Tabs.Screen name="provider-detail"  options={{ href: null }} />
    </Tabs>
  );
}
