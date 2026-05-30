import { useState, useEffect, useCallback } from 'react';
import { Tabs, Slot, useRootNavigationState, useRouter } from 'expo-router';
import { C } from '@/constants/theme';
import TabIcon from '@/components/ui/TabIcon';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';

export default function AdminLayout() {
  const rootNavState = useRootNavigationState();
  const router = useRouter();
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const isSuperAdmin = user?.is_super_admin === true;
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchTotalUnread = useCallback(async () => {
    if (!user?.id) return;
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', user.id)
      .eq('read', false);
    setTotalUnread(count ?? 0);
  }, [user?.id]);

  // Security guard: redirect any non-admin user out of the admin area
  useEffect(() => {
    if (!rootNavState?.key) return;
    if (user !== undefined && user?.role !== 'admin') {
      router.replace('/(auth)/welcome' as any);
    }
  }, [rootNavState?.key, user?.role, user?.id]);

  useEffect(() => {
    fetchTotalUnread();
    const ch = supabase
      .channel('admin-chats-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchTotalUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, fetchTotalUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchTotalUnread]);

  if (!rootNavState?.key) return <Slot />;
  if (!user || user.role !== 'admin') return <Slot />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent2,
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
      {/* 1. Dashboard */}
      <Tabs.Screen name="dashboard"    options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => <TabIcon name="grid"           focused={focused} activeColor={C.accent2} /> }} />
      {/* 2. Providers */}
      <Tabs.Screen name="providers"    options={{ title: 'Providers', tabBarIcon: ({ focused }) => <TabIcon name="users"          focused={focused} activeColor={C.accent2} /> }} />
      {/* 3. Jobs */}
      <Tabs.Screen name="jobs"         options={{ title: 'Jobs',      tabBarIcon: ({ focused }) => <TabIcon name="briefcase"      focused={focused} activeColor={C.accent2} /> }} />
      {/* 4. Work Orders */}
      <Tabs.Screen name="work-orders"  options={{ title: 'WOs',       tabBarIcon: ({ focused }) => <TabIcon name="file-text"      focused={focused} activeColor={C.accent2} /> }} />
      {/* 5. Messages */}
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => <TabIcon name="message-square" focused={focused} activeColor={C.accent2} />,
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: C.danger, fontSize: 10, minWidth: 18, height: 18, borderRadius: 9 },
        }}
      />
      {/* 6. Team — only visible to super admin */}
      <Tabs.Screen
        name="team"
        options={{
          href: isSuperAdmin ? undefined : null,
          title: es ? 'Equipo' : 'Team',
          tabBarIcon: ({ focused }) => <TabIcon name="shield" focused={focused} activeColor={C.accent2} />,
        }}
      />
      {/* 7. Profile */}
      <Tabs.Screen name="profile"      options={{ title: 'Profile',   tabBarIcon: ({ focused }) => <TabIcon name="user"           focused={focused} activeColor={C.accent2} /> }} />

      {/* Hidden screens */}
      <Tabs.Screen name="job-detail"      options={{ href: null }} />
      <Tabs.Screen name="new-job"         options={{ href: null }} />
      <Tabs.Screen name="documents"       options={{ href: null }} />
      <Tabs.Screen name="provider-detail" options={{ href: null }} />
      <Tabs.Screen name="client-detail"   options={{ href: null }} />
      <Tabs.Screen name="clients"         options={{ href: null }} />
      <Tabs.Screen name="chat-detail"     options={{ href: null }} />
      <Tabs.Screen name="new-chat"        options={{ href: null }} />
      <Tabs.Screen name="disputes"        options={{ href: null }} />
    </Tabs>
  );
}
