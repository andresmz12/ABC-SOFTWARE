import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';
import type { Notification } from '@/types';

type FeatherName = keyof typeof Feather.glyphMap;

const TYPE_ICON: Record<string, FeatherName> = {
  job_alert:       'briefcase',
  account_update:  'user-check',
  document_update: 'file-text',
  job_update:      'bell',
};

function timeAgo(iso: string, lang: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return lang === 'es' ? 'Ahora' : 'Just now';
  if (mins < 60) return lang === 'es' ? `Hace ${mins}m` : `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return lang === 'es' ? `Hace ${h}h` : `${h}h ago`;
  return lang === 'es' ? `Hace ${Math.floor(h / 24)}d` : `${Math.floor(h / 24)}d ago`;
}

export default function ProviderNotifications() {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const lang = i18n.language;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifications(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (user?.id) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    }
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        <View>
          <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold' }}>
            {lang === 'es' ? 'Notificaciones' : 'Notifications'}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
            {unread > 0
              ? (lang === 'es' ? `${unread} sin leer` : `${unread} unread`)
              : (lang === 'es' ? 'Todo al día' : 'All caught up')}
          </Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} style={{ paddingBottom: 4 }}>
            <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
              {lang === 'es' ? 'Marcar todo leído' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: n, index }) => (
            <TouchableOpacity
              onPress={() => markRead(n.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingVertical: 16,
                borderBottomWidth: index < notifications.length - 1 ? 1 : 0,
                borderBottomColor: C.line,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                backgroundColor: n.read ? C.surface2 : '#1a2a0d',
                borderWidth: 1,
                borderColor: n.read ? C.line : C.success,
              }}>
                <Feather
                  name={TYPE_ICON[n.type] ?? 'bell'}
                  size={16}
                  color={n.read ? C.textMuted : C.success}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 14,
                  fontFamily: n.read ? 'Inter_400Regular' : 'Inter_600SemiBold',
                  color: n.read ? C.textSecondary : C.textPrimary,
                  marginBottom: 3,
                }}>
                  {lang === 'es' ? n.title_es : n.title_en}
                </Text>
                <Text style={{
                  color: C.textSecondary,
                  fontSize: 13,
                  fontFamily: 'Inter_400Regular',
                  lineHeight: 18,
                }}>
                  {lang === 'es' ? n.body_es : n.body_en}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
                  {timeAgo(n.created_at, lang)}
                </Text>
              </View>
              {!n.read && (
                <View style={{
                  width: 7,
                  height: 7,
                  backgroundColor: C.accent,
                  borderRadius: 4,
                  marginTop: 4,
                  marginLeft: 8,
                }} />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <View style={{
                width: 72,
                height: 72,
                backgroundColor: C.surface2,
                borderRadius: 36,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: C.line,
              }}>
                <Feather name="bell" size={28} color={C.textMuted} />
              </View>
              <Text style={{ color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 6 }}>
                {lang === 'es' ? 'Sin notificaciones' : 'No notifications'}
              </Text>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                {lang === 'es' ? 'Las notificaciones aparecerán aquí' : "You're all caught up"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
