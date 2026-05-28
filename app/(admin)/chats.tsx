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

type RoleFilter = 'all' | 'company' | 'independent' | 'client';
type CountryFilter = 'all' | 'usa' | 'colombia';

interface ChatItem {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  user_country: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

function timeAgo(iso: string, es: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return es ? 'Ahora' : 'Now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function AdminChats() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all');

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch chats — include user_type so we can look up the right table
      const { data: rawChats } = await supabase
        .from('chats')
        .select('id, user_id, user_type, created_at')
        .neq('resolved', true)
        .order('created_at', { ascending: false });

      if (!rawChats?.length) { setChats([]); return; }

      // 2. Deduplicate: one entry per user_id (keep the most-recent chat)
      const seenUsers = new Set<string>();
      const uniqueChats: typeof rawChats = [];
      for (const chat of rawChats) {
        if (!seenUsers.has(chat.user_id)) {
          seenUsers.add(chat.user_id);
          uniqueChats.push(chat);
        }
      }

      const chatIds   = uniqueChats.map((c) => c.id);
      const clientIds = uniqueChats.filter((c) => (c.user_type ?? 'client') === 'client').map((c) => c.user_id);
      const companyIds = uniqueChats.filter((c) => c.user_type === 'company').map((c) => c.user_id);
      const indepIds  = uniqueChats.filter((c) => c.user_type === 'independent').map((c) => c.user_id);

      // 3. Batch-fetch names + country from each profile table (only the IDs we need)
      const [clientsRes, companiesRes, indepRes, messagesRes] = await Promise.all([
        clientIds.length
          ? supabase.from('clients').select('user_id, full_name, country').in('user_id', clientIds)
          : Promise.resolve({ data: [] as any[] }),
        companyIds.length
          ? supabase.from('companies').select('user_id, company_name, country').in('user_id', companyIds)
          : Promise.resolve({ data: [] as any[] }),
        indepIds.length
          ? supabase.from('independents').select('user_id, full_name, country').in('user_id', indepIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('messages')
          .select('chat_id, content, created_at, read, sender_id')
          .in('chat_id', chatIds)
          .order('created_at', { ascending: false }),
      ]);

      // 4. Build name + country map — keyed by user_id
      const nameMap: Record<string, string> = {};
      const countryMap: Record<string, string> = {};
      (clientsRes.data  ?? []).forEach((r: any) => { nameMap[r.user_id] = r.full_name   ?? ''; countryMap[r.user_id] = r.country ?? 'usa'; });
      (companiesRes.data ?? []).forEach((r: any) => { nameMap[r.user_id] = r.company_name ?? ''; countryMap[r.user_id] = r.country ?? 'usa'; });
      (indepRes.data    ?? []).forEach((r: any) => { nameMap[r.user_id] = r.full_name   ?? ''; countryMap[r.user_id] = r.country ?? 'usa'; });

      // 5. Build ChatItem list
      const allMsgs = (messagesRes.data ?? []) as any[];
      const items: ChatItem[] = uniqueChats.map((c) => {
        const chatMsgs = allMsgs.filter((m) => m.chat_id === c.id);
        const last     = chatMsgs[0];
        const unread   = chatMsgs.filter((m) => !m.read && m.sender_id !== user?.id).length;
        const name     = nameMap[c.user_id];

        return {
          id:              c.id,
          user_id:         c.user_id,
          user_name:       name?.trim() || `ID: ${c.user_id.slice(0, 8)}…`,
          user_role:       c.user_type ?? 'client',
          user_country:    countryMap[c.user_id] ?? 'usa',
          last_message:    last?.content ?? (es ? 'Sin mensajes aún' : 'No messages yet'),
          last_message_at: last?.created_at ?? c.created_at,
          unread_count:    unread,
        };
      });

      // Sort by last activity desc
      items.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      setChats(items);
    } catch (e: any) {
      console.warn('[AdminChats] load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, es]);

  useFocusEffect(useCallback(() => { loadChats(); }, [loadChats]));

  useEffect(() => {
    const channel = supabase
      .channel('admin-chats-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadChats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadChats]);

  const roleLabel = (role: string) => {
    const map: Record<string, [string, string]> = {
      client:      ['Client',      'Cliente'],
      company:     ['Company',     'Empresa'],
      independent: ['Independent', 'Independiente'],
    };
    return map[role]?.[es ? 1 : 0] ?? role;
  };

  const roleIcon = (role: string): keyof typeof import('@expo/vector-icons').Feather.glyphMap => {
    if (role === 'company') return 'briefcase';
    if (role === 'independent') return 'tool';
    return 'user';
  };

  const renderItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      onPress={() => router.push({
        pathname: '/(admin)/chat-detail',
        params: { chatId: item.id, userId: item.user_id, userName: item.user_name },
      } as any)}
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
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: `${C.accent}18`,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
      }}>
        <Feather name={roleIcon(item.user_role)} size={20} color={C.accent} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1, marginRight: 8 }} numberOfLines={1}>
            {item.user_name}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
            {timeAgo(item.last_message_at, es)}
          </Text>
        </View>

        {/* Role badge */}
        <Text style={{ color: C.accent, fontSize: 11, fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>
          {roleLabel(item.user_role)}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1, marginRight: 8 }} numberOfLines={1}>
            {item.last_message}
          </Text>
          {item.unread_count > 0 && (
            <View style={{
              minWidth: 20, height: 20, borderRadius: 10,
              backgroundColor: C.accent,
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 5,
            }}>
              <Text style={{ color: '#FFF', fontSize: 11, fontFamily: 'Inter_700Bold' }}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const totalUnread = chats.reduce((s, c) => s + c.unread_count, 0);

  const filteredChats = chats.filter((c) => {
    if (roleFilter !== 'all' && c.user_role !== roleFilter) return false;
    if (countryFilter !== 'all' && c.user_country !== countryFilter) return false;
    return true;
  });

  const ROLE_FILTERS: { key: RoleFilter; labelEn: string; labelEs: string }[] = [
    { key: 'all',         labelEn: 'All',            labelEs: 'Todos' },
    { key: 'client',      labelEn: 'Clients',        labelEs: 'Clientes' },
    { key: 'company',     labelEn: 'Companies',      labelEs: 'Empresas' },
    { key: 'independent', labelEn: 'Independents',   labelEs: 'Independientes' },
  ];
  const COUNTRY_FILTERS: { key: CountryFilter; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'usa',      label: '🇺🇸 USA' },
    { key: 'colombia', label: '🇨🇴 Colombia' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 }}>
              Admin
            </Text>
            <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 2 }}>
              {es ? 'Mensajes' : 'Messages'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {totalUnread > 0 && (
              <View style={{ backgroundColor: C.danger, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#FFF', fontSize: 13, fontFamily: 'Inter_700Bold' }}>
                  {totalUnread} {es ? 'nuevos' : 'new'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => router.push('/(admin)/new-chat' as any)}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: C.accent2,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: C.accent2, shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
              }}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Role filter chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 8 }}>
        {ROLE_FILTERS.map((f) => {
          const active = roleFilter === f.key;
          const count = f.key === 'all' ? chats.length : chats.filter((c) => c.user_role === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setRoleFilter(f.key)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, backgroundColor: active ? C.accent2 : C.surface, borderWidth: 1, borderColor: active ? C.accent2 : C.line }}
              activeOpacity={0.8}
            >
              <Text style={{ color: active ? '#FFF' : C.textSecondary, fontSize: 12, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                {es ? f.labelEs : f.labelEn}{count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Country sub-filter */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
        {COUNTRY_FILTERS.map((f) => {
          const active = countryFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setCountryFilter(f.key)}
              style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9999, backgroundColor: active ? C.surface2 : 'transparent', borderWidth: 1, borderColor: active ? C.accent : C.line }}
              activeOpacity={0.8}
            >
              <Text style={{ color: active ? C.accent : C.textMuted, fontSize: 12, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${C.accent}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Feather name="message-square" size={30} color={C.accent} />
          </View>
          <Text style={{ color: C.textSecondary, fontSize: 16, fontFamily: 'Inter_600SemiBold', textAlign: 'center', marginBottom: 8 }}>
            {chats.length === 0
              ? (es ? 'Sin conversaciones aún' : 'No conversations yet')
              : (es ? 'Sin resultados para este filtro' : 'No results for this filter')}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 }}>
            {chats.length === 0
              ? (es ? 'Los usuarios iniciarán conversaciones desde la app.' : 'Users will start conversations from the app.')
              : (es ? 'Prueba con otro filtro.' : 'Try a different filter.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
