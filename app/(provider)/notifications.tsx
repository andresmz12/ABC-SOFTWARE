import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    user_id: 'demo',
    title_en: 'New Job Alert — Office Deep Clean',
    title_es: 'Nueva Alerta — Limpieza de Oficina',
    body_en: 'Commercial · Miami, FL · $150–$200',
    body_es: 'Comercial · El Poblado, Medellín · $450.000–$600.000',
    type: 'job_alert',
    read: false,
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: '2',
    user_id: 'demo',
    title_en: 'New Job Alert — House Cleaning',
    title_es: 'Nueva Alerta — Aseo Residencial',
    body_en: 'Residential · Miami Beach, FL · $80–$120',
    body_es: 'Residencial · Chapinero, Bogotá · $320.000–$380.000',
    type: 'job_alert',
    read: false,
    created_at: new Date(Date.now() - 20 * 60000).toISOString(),
  },
  {
    id: '3',
    user_id: 'demo',
    title_en: 'Your profile was approved',
    title_es: 'Tu perfil fue aprobado',
    body_en: 'You can now bid on jobs',
    body_es: 'Ya puedes aplicar a trabajos',
    type: 'account_update',
    read: true,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: '4',
    user_id: 'demo',
    title_en: 'Document review complete',
    title_es: 'Revisión de documentos completa',
    body_en: 'W-9 and Insurance approved',
    body_es: 'RUT y seguro aprobados',
    type: 'document_update',
    read: true,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

function timeAgo(iso: string, lang: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return lang === 'es' ? 'Ahora' : 'Just now';
  if (mins < 60) return lang === 'es' ? `Hace ${mins}m` : `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return lang === 'es' ? `Hace ${h}h` : `${h}h ago`;
  return lang === 'es' ? `Hace ${Math.floor(h / 24)}d` : `${Math.floor(h / 24)}d ago`;
}

const TYPE_ICON: Record<string, string> = {
  job_alert: '💼',
  account_update: '✅',
  document_update: '📄',
  job_update: '🔔',
};

export default function ProviderNotifications() {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const isDemo = user?.id === 'demo';
  const lang = i18n.language;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (isDemo) {
      setNotifications(DEMO_NOTIFICATIONS);
      return;
    }
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
  }, [user?.id, isDemo]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    if (!isDemo) {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!isDemo && user?.id) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    }
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <ScreenWrapper>
      <View className="px-5 pt-8 pb-4 flex-row items-end justify-between">
        <View>
          <Text className="text-primary text-3xl font-heading">
            {lang === 'es' ? 'Notificaciones' : 'Notifications'}
          </Text>
          <Text className="text-text-muted font-body text-sm mt-0.5">
            {unread > 0
              ? (lang === 'es' ? `${unread} sin leer` : `${unread} unread`)
              : (lang === 'es' ? 'Todo al día' : 'All caught up')}
          </Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} className="pb-1">
            <Text className="text-primary font-body-medium text-sm">
              {lang === 'es' ? 'Marcar todo leído' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          renderItem={({ item: n, index }) => (
            <TouchableOpacity
              onPress={() => markRead(n.id)}
              className={`flex-row items-start py-4 ${index < notifications.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${n.read ? 'bg-gray-100' : 'bg-primary/10'}`}>
                <Text className="text-lg">{TYPE_ICON[n.type] ?? '🔔'}</Text>
              </View>
              <View className="flex-1">
                <Text className={`text-sm mb-0.5 ${n.read ? 'text-text-muted font-body' : 'text-text-main font-body-bold'}`}>
                  {lang === 'es' ? n.title_es : n.title_en}
                </Text>
                <Text className="text-text-muted font-body text-xs leading-4">
                  {lang === 'es' ? n.body_es : n.body_en}
                </Text>
                <Text className="text-text-muted font-body text-xs mt-1">
                  {timeAgo(n.created_at, lang)}
                </Text>
              </View>
              {!n.read && (
                <View className="w-2 h-2 bg-secondary rounded-full mt-1.5 ml-2" />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-4xl mb-3">🔔</Text>
              <Text className="text-text-muted font-body text-sm">
                {lang === 'es' ? 'No hay notificaciones aún' : 'No notifications yet'}
              </Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}
