import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useLang } from '@/context/LanguageContext';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { uploadDocument } from '@/lib/uploadDocument';
import { getCompanyDocs, getIndependentDocs } from '@/lib/docRequirements';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';
import type { Document } from '@/types';

interface DocItem {
  key: string;
  label: string;
  doc?: Document;
}

type DocStatus = 'approved' | 'rejected' | 'pending';

const STATUS_COLORS: Record<DocStatus, { color: string; bg: string }> = {
  approved: { color: '#065F46',   bg: '#D1FAE5' },
  rejected: { color: '#9B1C1C',   bg: '#FFE4E6' },
  pending:  { color: '#856404',   bg: '#FFF3CD' },
};

export default function ProviderDocuments() {
  const { lang } = useLang();
  const { user } = useAuthStore();

  const [docItems, setDocItems] = useState<DocItem[]>([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!user?.id) return;
    const role = user.role ?? 'company';
    const country = user.country ?? 'usa';
    const required = role === 'independent'
      ? getIndependentDocs(country)
      : getCompanyDocs(country);

    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      const docMap = Object.fromEntries((data ?? []).map((d: Document) => [d.doc_type, d]));
      setDocItems(required.map((r) => ({ key: r.key, label: r.label, doc: docMap[r.key] })));
    } catch (e: any) {
      setFetchError(e.message ?? (lang === 'es' ? 'Error al cargar documentos.' : 'Failed to load documents.'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, user?.country]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const handleUpload = async (key: string, label: string) => {
    if (!user?.id) return;
    const isImage = ['gov_id_front', 'gov_id_back', 'selfie'].includes(key);
    setUploadingKey(key);

    const { document, error } = await uploadDocument({
      userId: user.id,
      docType: key,
      useImagePicker: isImage,
    });

    setUploadingKey(null);

    if (error) {
      Alert.alert(lang === 'es' ? 'Error de carga' : 'Upload Error', error);
      return;
    }

    if (document) {
      setDocItems((prev) =>
        prev.map((item) => item.key === key ? { ...item, doc: document } : item),
      );
    }
  };

  const approved = docItems.filter((d) => d.doc?.status === 'approved').length;
  const total = docItems.length;
  const pct = total > 0 ? (approved / total) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold' }}>
            {lang === 'es' ? 'Documentos' : 'Documents'}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
            {lang === 'es' ? 'Requeridos para aprobación' : 'Required for platform approval'}
          </Text>
        </View>

        {/* Progress card */}
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: C.line,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
              {lang === 'es' ? 'Progreso de verificación' : 'Verification progress'}
            </Text>
            <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
              {approved}/{total}
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: C.surface2, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{
              height: '100%',
              backgroundColor: C.success,
              borderRadius: 4,
              width: `${pct}%` as any,
            }} />
          </View>
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 8 }}>
            {approved === total && total > 0
              ? (lang === 'es' ? '✓ Todos los documentos aprobados' : '✓ All documents approved')
              : (lang === 'es'
                  ? `${total - approved} documento${total - approved > 1 ? 's' : ''} pendiente${total - approved > 1 ? 's' : ''}`
                  : `${total - approved} document${total - approved > 1 ? 's' : ''} pending`)}
          </Text>
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={C.accent} size="large" />
          </View>
        ) : fetchError ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Feather name="alert-circle" size={36} color={C.danger} />
            <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 12, textAlign: 'center', marginHorizontal: 24 }}>
              {fetchError}
            </Text>
            <TouchableOpacity
              onPress={loadDocuments}
              style={{ marginTop: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
              activeOpacity={0.8}
            >
              <Text style={{ color: C.accent, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                {lang === 'es' ? 'Reintentar' : 'Retry'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          docItems.map((item) => {
            const statusKey = (item.doc?.status ?? 'pending') as DocStatus;
            const sc = STATUS_COLORS[statusKey] ?? STATUS_COLORS.pending;
            const isUploading = uploadingKey === item.key;

            return (
              <View key={item.key} style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: C.line,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1, marginRight: 8 }}>
                    {item.label}
                  </Text>
                  {item.doc && (
                    <View style={{
                      backgroundColor: sc.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: sc.color,
                    }}>
                      <Text style={{ color: sc.color, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
                        {lang === 'es'
                          ? (item.doc.status === 'approved' ? 'Aprobado' : item.doc.status === 'rejected' ? 'Rechazado' : 'Pendiente')
                          : (item.doc.status === 'approved' ? 'Approved' : item.doc.status === 'rejected' ? 'Rejected' : 'Pending')}
                      </Text>
                    </View>
                  )}
                </View>

                {item.doc?.file_name && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Feather name="file" size={12} color={C.textMuted} style={{ marginRight: 6 }} />
                    <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                      {item.doc.file_name}
                    </Text>
                  </View>
                )}

                {item.doc?.admin_notes && item.doc.status === 'rejected' && (
                  <View style={{
                    backgroundColor: '#FFE4E6',
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: C.danger,
                  }}>
                    <Text style={{ color: C.danger, fontSize: 11, fontFamily: 'Inter_600SemiBold', marginBottom: 3 }}>
                      {lang === 'es' ? 'Nota del Admin' : 'Admin Note'}
                    </Text>
                    <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 }}>
                      {item.doc.admin_notes}
                    </Text>
                  </View>
                )}

                {isUploading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                    <ActivityIndicator size="small" color={C.accent} style={{ marginRight: 8 }} />
                    <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                      {lang === 'es' ? 'Subiendo...' : 'Uploading...'}
                    </Text>
                  </View>
                ) : item.doc?.status !== 'approved' ? (
                  <TouchableOpacity
                    onPress={() => handleUpload(item.key, item.label)}
                    style={{
                      borderWidth: 1,
                      borderColor: item.doc?.status === 'rejected' ? C.danger : C.line,
                      borderStyle: item.doc ? 'solid' : 'dashed',
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={item.doc?.status === 'rejected' ? 'upload' : 'upload-cloud'}
                      size={14}
                      color={item.doc?.status === 'rejected' ? C.danger : C.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{
                      fontSize: 13,
                      fontFamily: 'Inter_400Regular',
                      color: item.doc?.status === 'rejected' ? C.danger : C.textSecondary,
                    }}>
                      {item.doc?.status === 'rejected'
                        ? (lang === 'es' ? 'Volver a cargar' : 'Re-upload')
                        : (lang === 'es' ? 'Cargar documento' : 'Upload document')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
