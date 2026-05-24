import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';

type DocStatus = 'pending' | 'approved' | 'rejected';
type FilterStatus = 'pending' | 'approved' | 'rejected' | 'all';

interface AdminDocument {
  id: string;
  user_id: string;
  doc_type: string;
  file_url: string;
  file_name: string;
  status: DocStatus;
  uploaded_at: string;
  provider_name: string;
  provider_email: string;
  provider_role: 'company' | 'independent';
}

const FILTERS: { key: FilterStatus; labelEn: string; labelEs: string }[] = [
  { key: 'pending',  labelEn: 'Pending',  labelEs: 'Pendientes' },
  { key: 'approved', labelEn: 'Approved', labelEs: 'Aprobados' },
  { key: 'rejected', labelEn: 'Rejected', labelEs: 'Rechazados' },
  { key: 'all',      labelEn: 'All',      labelEs: 'Todos' },
];

const STATUS_META: Record<DocStatus, { bg: string; color: string; labelEn: string; labelEs: string }> = {
  pending:  { bg: `${C.warning}20`, color: C.warning, labelEn: 'PENDING',  labelEs: 'PENDIENTE' },
  approved: { bg: `${C.success}20`, color: C.success, labelEn: 'APPROVED', labelEs: 'APROBADO' },
  rejected: { bg: `${C.danger}20`,  color: C.danger,  labelEn: 'REJECTED', labelEs: 'RECHAZADO' },
};

function DocumentRow({ doc, es, onUpdate }: { doc: AdminDocument; es: boolean; onUpdate: (id: string, status: DocStatus) => void }) {
  const statusMeta = STATUS_META[doc.status];

  const updateStatus = (newStatus: DocStatus) => {
    const action = newStatus === 'approved' ? (es ? 'aprobar' : 'approve') : (es ? 'rechazar' : 'reject');
    Alert.alert(
      es ? `¿${newStatus === 'approved' ? 'Aprobar' : 'Rechazar'} documento?` : `${newStatus === 'approved' ? 'Approve' : 'Reject'} document?`,
      es ? `¿Confirmas ${action} este documento?` : `Confirm ${action} this document?`,
      [
        { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: newStatus === 'approved' ? (es ? 'Aprobar' : 'Approve') : (es ? 'Rechazar' : 'Reject'),
          style: newStatus === 'rejected' ? 'destructive' : 'default',
          onPress: () => onUpdate(doc.id, newStatus),
        },
      ],
    );
  };

  return (
    <View style={{
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{
          width: 40, height: 40,
          backgroundColor: `${C.accent}15`,
          borderRadius: 10,
          alignItems: 'center', justifyContent: 'center',
          marginRight: 12,
        }}>
          <Feather name="file-text" size={18} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }} numberOfLines={1}>
            {doc.doc_type}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
            {doc.file_name}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
            {doc.provider_name} · {doc.provider_role === 'company' ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}
          </Text>
        </View>
        <View style={{ backgroundColor: statusMeta.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: statusMeta.color, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
            {es ? statusMeta.labelEs : statusMeta.labelEn}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => Linking.openURL(doc.file_url).catch(() => {})}
          style={{
            flex: 1,
            height: 38,
            backgroundColor: C.surface2,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
          }}
          activeOpacity={0.85}
        >
          <Feather name="eye" size={14} color={C.textSecondary} style={{ marginRight: 6 }} />
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
            {es ? 'Ver' : 'View'}
          </Text>
        </TouchableOpacity>

        {doc.status === 'pending' && (
          <>
            <TouchableOpacity
              onPress={() => updateStatus('approved')}
              style={{
                flex: 1,
                height: 38,
                backgroundColor: `${C.success}15`,
                borderWidth: 1,
                borderColor: `${C.success}40`,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
              activeOpacity={0.85}
            >
              <Feather name="check" size={14} color={C.success} style={{ marginRight: 6 }} />
              <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Aprobar' : 'Approve'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => updateStatus('rejected')}
              style={{
                flex: 1,
                height: 38,
                backgroundColor: `${C.danger}15`,
                borderWidth: 1,
                borderColor: `${C.danger}40`,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
              activeOpacity={0.85}
            >
              <Feather name="x" size={14} color={C.danger} style={{ marginRight: 6 }} />
              <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Rechazar' : 'Reject'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

export default function AdminDocuments() {
  const { lang } = useLang();
  const es = lang === 'es';
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [docs, setDocs] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocs = useCallback(async () => {
    try {
      const { data: rawDocs } = await supabase
        .from('documents')
        .select('id, user_id, doc_type, file_url, file_name, status, uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(200);

      if (!rawDocs || rawDocs.length === 0) {
        setDocs([]);
        return;
      }

      const userIds = Array.from(new Set(rawDocs.map((d: any) => d.user_id)));
      const { data: users } = await supabase
        .from('users')
        .select('id, email, role')
        .in('id', userIds);

      const { data: companies } = await supabase
        .from('companies')
        .select('user_id, company_name')
        .in('user_id', userIds);

      const { data: independents } = await supabase
        .from('independents')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      const companyMap = new Map((companies ?? []).map((c: any) => [c.user_id, c.company_name]));
      const independentMap = new Map((independents ?? []).map((i: any) => [i.user_id, i.full_name]));

      const enriched: AdminDocument[] = rawDocs.map((d: any) => {
        const u = userMap.get(d.user_id) as any;
        const role = u?.role ?? 'independent';
        const name = role === 'company'
          ? companyMap.get(d.user_id) ?? u?.email?.split('@')[0] ?? '?'
          : independentMap.get(d.user_id) ?? u?.email?.split('@')[0] ?? '?';
        return {
          ...d,
          provider_name: name,
          provider_email: u?.email ?? '',
          provider_role: role,
        };
      });

      setDocs(enriched);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const onRefresh = () => { setRefreshing(true); loadDocs(); };

  const handleStatusUpdate = async (id: string, status: DocStatus) => {
    const { error } = await supabase.from('documents').update({ status }).eq('id', id);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    const updated = docs.map((d) => d.id === id ? { ...d, status } : d);
    setDocs(updated);

    // When approving a doc, check if ALL docs for this user are now approved.
    // If so, promote the provider to 'approved' and send a notification.
    if (status === 'approved') {
      const targetDoc = docs.find((d) => d.id === id);
      if (!targetDoc) return;
      const userId = targetDoc.user_id;
      const userDocs = updated.filter((d) => d.user_id === userId);
      const allApproved = userDocs.length > 0 && userDocs.every((d) => d.status === 'approved');
      if (allApproved) {
        const { error: userErr } = await supabase
          .from('users')
          .update({ status: 'approved' })
          .eq('id', userId)
          .eq('status', 'pending'); // only promote if still pending
        if (!userErr) {
          await supabase.from('notifications').insert({
            user_id: userId,
            title_en: 'Account Approved',
            title_es: 'Cuenta Aprobada',
            body_en: 'All your documents have been approved. Your account is now active and you can start accepting jobs.',
            body_es: 'Todos tus documentos han sido aprobados. Tu cuenta está activa y ya puedes comenzar a aceptar trabajos.',
            type: 'account_update',
            read: false,
          });
        }
      }
    }
  };

  const filtered = filter === 'all' ? docs : docs.filter((d) => d.status === filter);
  const pendingCount = docs.filter((d) => d.status === 'pending').length;

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
          {es ? 'Revisión de Documentos' : 'Document Review'}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {docs.length} {es ? 'totales' : 'total'} · {pendingCount} {es ? 'pendientes' : 'pending'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === 'all' ? docs.length : docs.filter((d) => d.status === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 9999,
                backgroundColor: active ? C.accent : C.surface,
                borderWidth: 1,
                borderColor: active ? C.accent : C.line,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: active ? '#000' : C.textMuted, fontSize: 13, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                {es ? f.labelEs : f.labelEn}{count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={C.accent} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={es ? `Sin documentos ${filter === 'all' ? '' : (filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobados' : 'rechazados')}`.trim() : `No ${filter === 'all' ? '' : filter} documents`.trim()}
          subtitle={es ? 'Los documentos enviados por proveedores aparecerán aquí.' : 'Provider document submissions will appear here.'}
          iconName="file-text"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DocumentRow doc={item} es={es} onUpdate={handleStatusUpdate} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        />
      )}
    </ScreenWrapper>
  );
}
