/**
 * Admin — Start a new chat with any registered user
 * Searches all clients, companies, and independents.
 * If a chat already exists for that user, opens the existing one.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { getAllUsers, type UnifiedUser } from '@/lib/userUtils';
import { C } from '@/constants/theme';

type UserItem = UnifiedUser;

const ROLE_META: Record<string, { icon: keyof typeof Feather.glyphMap; labelEn: string; labelEs: string; color: string }> = {
  client:      { icon: 'user',      labelEn: 'Client',      labelEs: 'Cliente',       color: C.accent },
  company:     { icon: 'briefcase', labelEn: 'Company',     labelEs: 'Empresa',       color: C.accent2 },
  independent: { icon: 'tool',      labelEn: 'Independent', labelEs: 'Independiente', color: '#8B5CF6' },
};

export default function NewChat() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filtered, setFiltered] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Query across clients, companies, independents — no users table needed
      const items = await getAllUsers();
      setUsers(items);
      setFiltered(items);
    } catch (e: any) {
      console.warn('[NewChat] fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Filter by search
  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) { setFiltered(users); return; }
    setFiltered(users.filter((u) =>
      u.email.toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    ));
  }, [search, users]);

  const startChat = async (targetUser: UserItem) => {
    if (!user?.id) return;
    setStarting(targetUser.id);
    try {
      // Check if chat already exists
      const { data: existing } = await supabase
        .from('chats').select('id').eq('user_id', targetUser.id).maybeSingle();

      let chatId: string;
      if (existing?.id) {
        chatId = existing.id;
      } else {
        // Admin creates a chat for the user
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({ user_id: targetUser.id, admin_id: user.id })
          .select('id').single();
        if (error) throw error;
        chatId = newChat.id;
      }

      router.replace({
        pathname: '/(admin)/chat-detail',
        params: { chatId, userEmail: targetUser.email, userId: targetUser.id },
      } as any);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setStarting(null);
    }
  };

  const roleMeta = (role: string) => ROLE_META[role] ?? { icon: 'user' as const, labelEn: role, labelEs: role, color: C.textMuted };

  const renderUser = ({ item }: { item: UserItem }) => {
    const meta = roleMeta(item.role);
    const isStarting = starting === item.id;
    return (
      <TouchableOpacity
        onPress={() => startChat(item)}
        disabled={!!starting}
        style={{
          backgroundColor: C.surface,
          borderRadius: 14,
          marginBottom: 10,
          padding: 14,
          borderWidth: 1,
          borderColor: C.line,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: starting && !isStarting ? 0.5 : 1,
        }}
        activeOpacity={0.85}
      >
        {/* Avatar */}
        <View style={{
          width: 46, height: 46, borderRadius: 23,
          backgroundColor: `${meta.color}18`,
          alignItems: 'center', justifyContent: 'center', marginRight: 14,
        }}>
          <Feather name={meta.icon} size={20} color={meta.color} />
        </View>

        <View style={{ flex: 1 }}>
          {item.name && (
            <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }} numberOfLines={1}>
              {item.name}
            </Text>
          )}
          <Text style={{ color: item.name ? C.textMuted : C.textPrimary, fontSize: item.name ? 12 : 14, fontFamily: item.name ? 'Inter_400Regular' : 'Inter_600SemiBold' }} numberOfLines={1}>
            {item.email || item.id.slice(0, 8)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View style={{ backgroundColor: `${meta.color}18`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: meta.color, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
                {es ? meta.labelEs : meta.labelEn}
              </Text>
            </View>
          </View>
        </View>

        {isStarting
          ? <ActivityIndicator size="small" color={C.accent2} />
          : <Feather name="chevron-right" size={18} color={C.textMuted} />
        }
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: C.surface,
        borderBottomWidth: 1,
        borderBottomColor: C.line,
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Feather name="arrow-left" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold', flex: 1 }}>
          {es ? 'Nuevo Chat' : 'New Chat'}
        </Text>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line,
          paddingHorizontal: 12, paddingVertical: 10, gap: 8,
        }}>
          <Feather name="search" size={16} color={C.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={es ? 'Buscar por nombre o email...' : 'Search by name or email...'}
            placeholderTextColor={C.textMuted}
            style={{ flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: C.textPrimary }}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent2} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', paddingTop: 48 }}>
              <Feather name="users" size={32} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 12, textAlign: 'center' }}>
                {search ? (es ? 'Sin resultados para esa búsqueda' : 'No results for that search') : (es ? 'No hay usuarios registrados' : 'No registered users')}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
