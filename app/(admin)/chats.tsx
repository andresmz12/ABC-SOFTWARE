/**
 * Admin — All active chats list
 * Shows all chats with users, last message preview, and unread badge.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';

interface ChatItem {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

function timeAgo(iso: string, es: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return es ? 'Ahora' : 'Now';
  if (mins < 60) return es ? `${mins}m` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return es ? `${hrs}h` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return es ? `${days}d` : `${days}d`;
}

export default function AdminChats() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      // Get all chats with user info
      const { data: rawChats } = await supabase
        .from('chats')
        .select('id, user_id, created_at')
        .order('created_at', { ascending: false });

      if (!rawChats?.length) { setChats([]); setLoading(false); return; }

      const chatIds = rawChats.map((c) => c.id);
      const userIds = rawChats.map((c) => c.user_id);

      const [usersRes, messagesRes] = await Promise.all([
        supabase.from('users').select('id, email, role').in('id', userIds),
        supabase
          .from('messages')
          .select('chat_id, content, created_at, read, sender_id')
          .in('chat_id', chatIds)
          .order('created_at', { ascending: false }),
      ]);

      const usersMap: Record<string, { email: string; role: string }> = {};
      (usersRes.data ?? []).forEach((u: any) => { usersMap[u.id] = { email: u.email, role: u.role }; });

      // For each chat, find last message and unread count
      const allMsgs = (messagesRes.data ?? []) as any[];
      const items: ChatItem[] = rawChats.map((c) => {
        const chatMsgs = allMsgs.filter((m) => m.chat_id === c.id);
        const last = chatMsgs[0];
        const unread = chatMsgs.filter((m) => !m.read && m.sender_id !== user?.id).length;
        return {
          id: c.id,
          user_id: c.user_id,
          user_email: usersMap[c.user_id]?.email ?? c.user_id,
          user_role: usersMap[c.user_id]?.role ?? 'user',
          last_message: last?.content ?? (es ? 'Sin mensajes aún' : 'No messages yet'),
          last_message_at: last?.created_at ?? c.created_at,
          unread_count: unread,
        };
      });

      // Sort by last message date desc
      items.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      setChats(items);
    } catch (e: any) {
      console.warn('[AdminChats] load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, es]);

  useFocusEffect(useCallback(() => { loadChats(); }, [loadChats]));

  // Realtime: refresh when any new message comes in
  useEffect(() => {
    const channel = supabase
      .channel('admin-chats-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        loadChats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadChats]);

  const roleLabel = (role: string) => {
    const map: Record<string, [string, string]> = {
      client: ['Client', 'Cliente'],
      company: ['Company', 'Empresa'],
      independent: ['Independent', 'Independiente'],
    };
    return map[role]?.[es ? 1 : 0] ?? role;
  };

  const renderItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/(admin)/chat-detail', params: { chatId: item.id, userEmail: item.user_email } } as any)}
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        marginBottom: 10,
        padding: 16,
        borderWidth: 1,
        borderColor: item.unread_count > 0 ? C.accent : C.line,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      activeOpacity={0.85}
    >
      {/* Avatar */}
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${C.accent}18`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
      }}>
        <Feather
          name={item.user_role === 'client' ? 'user' : item.user_role === 'company' ? 'briefcase' : 'tool'}
          size={20}
          color={C.accent}
        />
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1, marginRight: 8 }} numberOfLines={1}>
            {item.user_email}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
            {timeAgo(item.last_message_at, es)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1, marginRight: 8 }} numberOfLines={1}>
            {item.last_message}
          </Text>
          {item.unread_count > 0 && (
            <View style={{
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: C.accent,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 5,
            }}>
              <Text style={{ color: '#FFF', fontSize: 11, fontFamily: 'Inter_700Bold' }}>{item.unread_count}</Text>
            </View>
          )}
        </View>
        <Text style={{ color: C.accent, fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 4 }}>
          {roleLabel(item.user_role)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const totalUnread = chats.reduce((s, c) => s + c.unread_count, 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 }}>
              {es ? 'Admin' : 'Admin'}
            </Text>
            <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 2 }}>
              {es ? 'Mensajes' : 'Messages'}
            </Text>
          </View>
          {totalUnread > 0 && (
            <View style={{
              backgroundColor: C.danger,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}>
              <Text style={{ color: '#FFF', fontSize: 13, fontFamily: 'Inter_700Bold' }}>
                {totalUnread} {es ? 'nuevos' : 'new'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : chats.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${C.accent}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Feather name="message-square" size={30} color={C.accent} />
          </View>
          <Text style={{ color: C.textSecondary, fontSize: 16, fontFamily: 'Inter_600SemiBold', textAlign: 'center', marginBottom: 8 }}>
            {es ? 'Sin conversaciones aún' : 'No conversations yet'}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 }}>
            {es
              ? 'Los usuarios iniciarán conversaciones desde la app.'
              : 'Users will start conversations from the app.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
