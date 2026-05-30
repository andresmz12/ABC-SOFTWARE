import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';

interface AuditEntry {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  admins: { email: string; display_name: string | null } | null;
}

const ACTION_META: Record<string, { en: string; es: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  assign_job:        { en: 'Assigned Job',       es: 'Asignó Trabajo',   icon: 'user-check',   color: C.accent2 },
  reassign_job:      { en: 'Reassigned Job',      es: 'Reasignó Trabajo', icon: 'refresh-cw',   color: C.warning },
  create_work_order: { en: 'Created Work Order',  es: 'Creó Orden',       icon: 'file-plus',    color: C.success },
  create_job:        { en: 'Created Job',         es: 'Creó Trabajo',     icon: 'plus-circle',  color: '#8B5CF6' },
  cancel_job:        { en: 'Cancelled Job',       es: 'Canceló Trabajo',  icon: 'x-circle',     color: C.danger },
  open_case:         { en: 'Opened Case',         es: 'Abrió Caso',       icon: 'alert-circle', color: C.warning },
};

function formatTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function adminLabel(entry: AuditEntry): string {
  if (!entry.admins) return entry.admin_id ? `…${entry.admin_id.slice(-6)}` : '—';
  return entry.admins.display_name ?? entry.admins.email;
}

function targetLabel(entry: AuditEntry, es: boolean): string {
  if (!entry.target_id) return '';
  const prefix =
    entry.target_type === 'work_order' ? 'WO' :
    entry.target_type === 'job'        ? (es ? 'Trabajo' : 'Job') :
    entry.target_type ?? '';
  return `${prefix} #${entry.target_id.slice(0, 8).toUpperCase()}`;
}

export default function AdminAuditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const es = lang === 'es';

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('id, admin_id, action, target_type, target_id, metadata, created_at, admins(email, display_name)')
        .order('created_at', { ascending: false })
        .limit(150);
      if (error) throw error;
      setEntries((data ?? []) as AuditEntry[]);
    } catch (e: any) {
      console.warn('[AuditLog] load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 18,
        paddingBottom: 16,
        backgroundColor: C.surface,
        borderBottomWidth: 1,
        borderBottomColor: C.line,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
            {es ? 'Registro de Auditoría' : 'Audit Log'}
          </Text>
          {!loading && (
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 }}>
              {entries.length} {es ? 'acciones' : 'actions'}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent2} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.accent2} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const meta = ACTION_META[item.action] ?? {
              en: item.action,
              es: item.action,
              icon: 'activity' as keyof typeof Feather.glyphMap,
              color: C.textMuted,
            };
            const label = es ? meta.es : meta.en;
            const target = targetLabel(item, es);
            const admin = adminLabel(item);
            return (
              <View style={{
                backgroundColor: C.surface,
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: C.line,
              }}>
                {/* Icon */}
                <View style={{
                  width: 42, height: 42, borderRadius: 21,
                  backgroundColor: `${meta.color}15`,
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Feather name={meta.icon} size={18} color={meta.color} />
                </View>

                {/* Body */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: `${meta.color}15`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ color: meta.color, fontSize: 11, fontFamily: 'Inter_700Bold' }}>{label.toUpperCase()}</Text>
                    </View>
                    {target ? (
                      <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{target}</Text>
                    ) : null}
                  </View>
                  <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 4 }} numberOfLines={1}>
                    {admin}
                  </Text>
                  {item.metadata && Object.keys(item.metadata).length > 0 && (
                    <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }} numberOfLines={1}>
                      {Object.entries(item.metadata)
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k}: ${String(v).slice(0, 12)}`)
                        .join(' · ')}
                    </Text>
                  )}
                </View>

                {/* Timestamp */}
                <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right', maxWidth: 72 }}>
                  {formatTs(item.created_at)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Feather name="activity" size={36} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 16 }}>
                {es ? 'Sin acciones registradas todavía.' : 'No actions logged yet.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
