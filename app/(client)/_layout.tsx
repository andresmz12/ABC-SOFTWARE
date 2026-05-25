import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { C } from '@/constants/theme';
import TabIcon from '@/components/ui/TabIcon';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function ClientLayout() {
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);

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
      .channel(`client-support-badge:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

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
      <Tabs.Screen name="home"             options={{ title: 'Home',     tabBarIcon: ({ focused }) => <TabIcon name="home"         focused={focused} /> }} />
      <Tabs.Screen name="post-job"         options={{ title: 'Post Job', tabBarIcon: ({ focused }) => <TabIcon name="plus-circle"  focused={focused} /> }} />
      <Tabs.Screen name="my-requests"      options={{ title: 'Requests', tabBarIcon: ({ focused }) => <TabIcon name="list"         focused={focused} /> }} />
      <Tabs.Screen name="browse-providers" options={{ title: 'Browse',   tabBarIcon: ({ focused }) => <TabIcon name="search"       focused={focused} /> }} />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Support',
          tabBarIcon: ({ focused }) => <TabIcon name="message-circle" focused={focused} />,
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: C.danger, fontSize: 10, minWidth: 18, height: 18, borderRadius: 9 },
        }}
      />
      <Tabs.Screen name="profile"          options={{ title: 'Profile',  tabBarIcon: ({ focused }) => <TabIcon name="user"         focused={focused} /> }} />
      <Tabs.Screen name="job-offers"       options={{ href: null }} />
      <Tabs.Screen name="provider-detail"  options={{ href: null }} />
    </Tabs>
  );
}
