import { useState, useEffect } from 'react';
import { homeRouteForRole } from '@/lib/userUtils';
import { useTabsResponsive, tabsScreenLayout } from '@/hooks/useResponsive';
import { Tabs, Slot, useRootNavigationState, useRouter } from 'expo-router';
import { C } from '@/constants/theme';
import TabIcon from '@/components/ui/TabIcon';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function ProviderLayout() {
  const responsive = useTabsResponsive({
      backgroundColor: '#FFFFFF',
      borderTopColor: C.line,
      borderTopWidth: 1,
      height: 80,
      paddingBottom: 16,
      paddingTop: 10,
    });
  // ── ALL hooks must be called unconditionally before any early return ──────
  const rootNavState = useRootNavigationState();
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const [unread, setUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let chatId: string | null = null;

    const fetchUnread = async () => {
      if (!chatId) {
        const { data } = await supabase
          .from('chats').select('id').eq('user_id', user.id).maybeSingle();
        if (!data) { setUnread(0); return; }
        chatId = data.id;
      }
      const { count } = await supabase
        .from('messages').select('id', { count: 'exact', head: true })
        .eq('chat_id', chatId).neq('sender_id', user.id).eq('read', false);
      setUnread(count ?? 0);
    };

    fetchUnread();

    const ch = supabase
      .channel(`provider-support-badge:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setNotifUnread(count ?? 0);
    };

    fetchNotifUnread();

    const ch = supabase
      .channel(`provider-notif-badge:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchNotifUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchNotifUnread)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // Security guard: redirect non-providers out of provider area
  useEffect(() => {
    if (!rootNavState?.key || loading) return;
    if (user !== undefined && user?.role !== 'company' && user?.role !== 'independent') {
      router.replace(homeRouteForRole(user?.role) as any);
    }
  }, [rootNavState?.key, user?.role, user?.id, loading]);

  // ── Guard: AFTER all hooks — wait for Root Layout to mount ────────────────
  if (!rootNavState?.key) return <Slot />;
  // Deep link / F5 reload: wait for the session to be restored instead of flashing or redirecting.
  if (loading) return null;
  if (!user || (user.role !== 'company' && user.role !== 'independent')) return <Slot />;

  return (
    <Tabs
      screenLayout={tabsScreenLayout}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        ...responsive,
      }}
    >
      <Tabs.Screen name="home"          options={{ title: 'Home',      tabBarIcon: ({ focused }) => <TabIcon name="home"          focused={focused} /> }} />
      <Tabs.Screen name="jobs"          options={{ title: 'Jobs',      tabBarIcon: ({ focused }) => <TabIcon name="briefcase"     focused={focused} /> }} />
      <Tabs.Screen name="my-jobs"       options={{ title: 'My Jobs',   tabBarIcon: ({ focused }) => <TabIcon name="list"          focused={focused} /> }} />
      <Tabs.Screen name="documents"     options={{ title: 'Docs',      tabBarIcon: ({ focused }) => <TabIcon name="file-text"     focused={focused} /> }} />
      <Tabs.Screen name="analytics"     options={{ title: 'Analytics', tabBarIcon: ({ focused }) => <TabIcon name="bar-chart-2"   focused={focused} /> }} />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Support',
          tabBarIcon: ({ focused }) => <TabIcon name="message-circle" focused={focused} />,
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: C.danger, fontSize: 10, minWidth: 18, height: 18, borderRadius: 9 },
        }}
      />
      <Tabs.Screen name="profile"       options={{ title: 'Profile',   tabBarIcon: ({ focused }) => <TabIcon name="user"          focused={focused} /> }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon name="bell" focused={focused} />,
          tabBarBadge: notifUnread > 0 ? notifUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: C.danger, fontSize: 10, minWidth: 18, height: 18, borderRadius: 9 },
        }}
      />
      <Tabs.Screen name="job-detail"    options={{ href: null }} />
      <Tabs.Screen name="payments"      options={{ href: null }} />
    </Tabs>
  );
}
