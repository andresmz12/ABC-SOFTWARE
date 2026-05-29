import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useLang } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

type StatusFilter = 'all' | 'open' | 'resolved';

interface Dispute {
  id: string;
  job_request_id: string;
  opened_by: string;
  against_user_id?: string;
  opened_by_admin?: boolean;
  reason: string;
  description?: string;
  status: string;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
  opener_name?: string;
  against_name?: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDisputes() {
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [resolveTarget, setResolveTarget] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as Dispute[];

      const allIds = [...new Set([
        ...rows.map((d) => d.opened_by),
        ...rows.map((d) => d.against_user_id).filter(Boolean),
      ].filter(Boolean))];
      if (allIds.length > 0) {
        const [clientsRes, companiesRes, indepRes, adminsRes] = await Promise.all([
          supabase.from('clients').select('user_id, full_name').in('user_id', allIds),
          supabase.from('companies').select('user_id, company_name').in('user_id', allIds),
          supabase.from('independents').select('user_id, full_name').in('user_id', allIds),
          supabase.from('admins').select('id, email').in('id', allIds),
        ]);
        const nameMap: Record<string, string> = {};
        (clientsRes.data ?? []).forEach((r: any) => { nameMap[r.user_id] = r.full_name ?? ''; });
        (companiesRes.data ?? []).forEach((r: any) => { nameMap[r.user_id] = r.company_name ?? ''; });
        (indepRes.data ?? []).forEach((r: any) => { nameMap[r.user_id] = r.full_name ?? ''; });
        (adminsRes.data ?? []).forEach((r: any) => { nameMap[r.id] = r.email ?? 'Admin'; });
        rows.forEach((d) => {
          d.opener_name = d.opened_by_admin ? 'Admin' : (nameMap[d.opened_by] || `${d.opened_by.slice(0, 8)}…`);
          if (d.against_user_id) d.against_name = nameMap[d.against_user_id] || `${d.against_user_id.slice(0, 8)}…`;
        });
      }

      setDisputes(rows);
    } catch (e: any) {
      console.warn('[AdminDisputes]', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleResolve = async () => {
    if (!resolveTarget) return;
    if (!resolution.trim()) {
      Alert.alert(
        es ? 'Requerido' : 'Required',
        es ? 'Escribe una resolución antes de continuar.' : 'Please enter a resolution note.',
      );
      return;
    }
    setResolving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('disputes')
        .update({ status: 'resolved', resolution: resolution.trim(), resolved_at: now })
        .eq('id', resolveTarget.id);
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: resolveTarget.opened_by,
        title_en: 'Dispute Resolved',
        title_es: 'Disputa Resuelta',
        body_en: `Your dispute has been resolved: ${resolution.trim()}`,
        body_es: `Tu disputa ha sido resuelta: ${resolution.trim()}`,
        type: 'dispute_resolved',
        read: false,
      });

      setDisputes((prev) => prev.map((d) =>
        d.id === resolveTarget.id
          ? { ...d, status: 'resolved', resolution: resolution.trim(), resolved_at: now }
          : d,
      ));
      setResolveTarget(null);
      setResolution('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setResolving(false);
    }
  };

  const filtered = filter === 'all' ? disputes : disputes.filter((d) => d.status === filter);
  const openCount = disputes.filter((d) => d.status === 'open').length;

  const FILTERS: { key: StatusFilter; labelEn: string; labelEs: string }[] = [
    { key: 'all',      labelEn: 'All',      labelEs: 'Todas' },
    { key: 'open',     labelEn: 'Open',     labelEs: 'Abiertas' },
    { key: 'resolved', labelEn: 'Resolved', labelEs: 'Resueltas' },
  ];

  const renderItem = ({ item }: { item: Dispute }) => {
    const isOpen = item.status === 'open';
    return (
      <View style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: isOpen ? `${C.danger}40` : C.line,
        borderLeftWidth: 3,
        borderLeftColor: isOpen ? C.danger : C.success,
        padding: 14,
        marginBottom: 10,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Feather name={isOpen ? 'alert-triangle' : 'check-circle'} size={14} color={isOpen ? C.danger : C.success} />
            <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 }} numberOfLines={1}>
              {item.reason}
            </Text>
          </View>
          <View style={{ backgroundColor: isOpen ? `${C.danger}20` : `${C.success}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 }}>
            <Text style={{ color: isOpen ? C.danger : C.success, fontSize: 10, fontFamily: 'Inter_700Bold' }}>
              {isOpen ? (es ? 'ABIERTA' : 'OPEN') : (es ? 'RESUELTA' : 'RESOLVED')}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 8, lineHeight: 18 }} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={{ marginBottom: isOpen || item.resolution ? 10 : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: item.against_name ? 4 : 0 }}>
            <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
              {item.opened_by_admin ? '🛡️ Admin' : (es ? 'Por' : 'By')}{!item.opened_by_admin ? `: ${item.opener_name ?? '—'}` : ''} · {timeAgo(item.created_at)}
            </Text>
            {item.job_request_id && (
              <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                Job: {item.job_request_id.slice(0, 8)}…
              </Text>
            )}
          </View>
          {item.against_name && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="alert-octagon" size={11} color={C.danger} />
              <Text style={{ color: C.danger, fontSize: 11, fontFamily: 'Inter_500Medium' }}>
                {es ? 'Contra' : 'Against'}: {item.against_name}
              </Text>
            </View>
          )}
        </View>

        {item.resolution ? (
          <View style={{ backgroundColor: `${C.success}10`, borderRadius: 8, padding: 10, marginBottom: isOpen ? 10 : 0 }}>
            <Text style={{ color: C.success, fontSize: 11, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }}>
              {es ? 'Resolución' : 'Resolution'}
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{item.resolution}</Text>
          </View>
        ) : null}

        {isOpen && (
          <TouchableOpacity
            onPress={() => { setResolveTarget(item); setResolution(''); }}
            style={{ backgroundColor: `${C.accent2}15`, borderWidth: 1, borderColor: `${C.accent2}40`, borderRadius: 8, paddingVertical: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
            activeOpacity={0.8}
          >
            <Feather name="check-square" size={13} color={C.accent2} />
            <Text style={{ color: C.accent2, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'Resolver Disputa' : 'Resolve Dispute'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Feather name="arrow-left" size={20} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={{ flex: 1, color: C.textPrimary, fontSize: 22, fontFamily: 'Inter_700Bold' }}>
            {es ? 'Disputas' : 'Disputes'}
          </Text>
          {openCount > 0 && (
            <View style={{ backgroundColor: `${C.danger}20`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: C.danger, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                {openCount} {es ? 'abiertas' : 'open'}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginLeft: 32 }}>
          {disputes.length} {es ? 'disputas en total' : 'total disputes'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          const count = f.key === 'all' ? disputes.length : disputes.filter((d) => d.status === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: isActive ? C.accent2 : C.surface, borderWidth: 1, borderColor: isActive ? C.accent2 : C.line, flexDirection: 'row', alignItems: 'center', gap: 5 }}
              activeOpacity={0.8}
            >
              <Text style={{ color: isActive ? '#FFF' : C.textSecondary, fontSize: 12, fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                {es ? f.labelEs : f.labelEn}
              </Text>
              {count > 0 && (
                <View style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : C.surface2, borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: isActive ? '#FFF' : C.textMuted, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent2} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <Feather name="check-circle" size={36} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 16, textAlign: 'center' }}>
                {es ? 'Sin disputas' : 'No disputes'}
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={!!resolveTarget} transparent animationType="slide" onRequestClose={() => setResolveTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: C.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
                {es ? 'Resolver Disputa' : 'Resolve Dispute'}
              </Text>
              <TouchableOpacity onPress={() => setResolveTarget(null)} style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={18} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {resolveTarget && (
              <View style={{ backgroundColor: C.surface2, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: resolveTarget.description ? 4 : 0 }}>
                  {es ? 'Razón' : 'Reason'}: {resolveTarget.reason}
                </Text>
                {resolveTarget.description ? (
                  <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{resolveTarget.description}</Text>
                ) : null}
              </View>
            )}

            <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 8 }}>
              {es ? 'Notas de resolución *' : 'Resolution notes *'}
            </Text>
            <TextInput
              value={resolution}
              onChangeText={setResolution}
              placeholder={es ? 'Describe cómo se resolvió la disputa...' : 'Describe how the dispute was resolved...'}
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={4}
              style={{ backgroundColor: C.surface2, borderRadius: 12, padding: 14, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 20, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: C.line }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setResolveTarget(null)}
                style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_500Medium' }}>{es ? 'Cancelar' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleResolve}
                disabled={resolving}
                style={{ flex: 2, height: 52, borderRadius: 12, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center', opacity: resolving ? 0.7 : 1 }}
                activeOpacity={0.85}
              >
                {resolving ? <ActivityIndicator color="#FFF" /> : (
                  <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                    {es ? 'Marcar Resuelta' : 'Mark Resolved'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
