import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { useAuthStore } from '@/store/authStore';
import { uploadDocument } from '@/lib/uploadDocument';
import { getCompanyDocs, getIndependentDocs } from '@/lib/docRequirements';
import { supabase } from '@/lib/supabase';
import { DEMO_DOCUMENTS } from '@/constants/demoData';
import type { Document } from '@/types';
import type { DemoDoc } from '@/constants/demoData';

const STATUS_META = {
  approved: { label: 'Approved', bg: 'bg-green-50',  text: 'text-green-700',  icon: '✅' },
  rejected: { label: 'Rejected', bg: 'bg-red-50',    text: 'text-red-700',    icon: '❌' },
  pending:  { label: 'Pending',  bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '⏳' },
};

interface DocItem {
  key: string;
  label: string;
  doc?: Document;
}

export default function ProviderDocuments() {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const isDemo = user?.id === 'demo';
  const isColombia = user?.country === 'colombia';
  const lang = i18n.language;

  const [docItems, setDocItems] = useState<DocItem[]>([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDocuments = useCallback(async () => {
    const role = user?.role ?? 'company';
    const country = user?.country ?? 'usa';
    const required = role === 'independent'
      ? getIndependentDocs(country)
      : getCompanyDocs(country);

    if (isDemo) {
      const items: DocItem[] = required.map((r) => {
        const demo = DEMO_DOCUMENTS.find((d: DemoDoc) => d.key === r.key);
        const doc: Document | undefined = demo
          ? {
              id: demo.key,
              user_id: 'demo',
              doc_type: demo.key,
              file_url: '',
              file_name: demo.fileName,
              status: demo.status,
              admin_notes: demo.adminNote,
              uploaded_at: new Date().toISOString(),
            }
          : undefined;
        return { key: r.key, label: r.label, doc };
      });
      setDocItems(items);
      return;
    }

    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id);

      const docMap = Object.fromEntries((data ?? []).map((d: Document) => [d.doc_type, d]));
      setDocItems(required.map((r) => ({ key: r.key, label: r.label, doc: docMap[r.key] })));
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, user?.country, isDemo]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const handleUpload = async (key: string, label: string) => {
    if (isDemo) {
      Alert.alert('Demo Mode', 'Document upload is not available in demo mode.');
      return;
    }
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
      Alert.alert(
        lang === 'es' ? 'Documento cargado' : 'Document Uploaded',
        lang === 'es'
          ? `${label} fue enviado para revisión.`
          : `${label} has been submitted for review.`,
      );
    }
  };

  const approved = docItems.filter((d) => d.doc?.status === 'approved').length;
  const total = docItems.length;

  return (
    <ScreenWrapper scroll className="px-5">
      <View className="pt-8 pb-2">
        <Text className="text-primary text-3xl font-heading">
          {lang === 'es' ? 'Documentos' : 'Documents'}
        </Text>
        <Text className="text-text-muted font-body text-sm mt-0.5">
          {lang === 'es' ? 'Requeridos para aprobación en la plataforma' : 'Required for platform approval'}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="bg-white border border-gray-100 rounded-2xl p-4 my-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-text-main font-body-bold text-sm">
            {lang === 'es' ? 'Progreso de verificación' : 'Verification progress'}
          </Text>
          <Text className="text-primary font-body-bold text-sm">{approved}/{total} {lang === 'es' ? 'aprobados' : 'approved'}</Text>
        </View>
        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <View className="h-full bg-green-500 rounded-full" style={{ width: total > 0 ? `${(approved / total) * 100}%` : '0%' }} />
        </View>
        <Text className="text-text-muted font-body text-xs mt-2">
          {approved === total && total > 0
            ? (lang === 'es' ? '🎉 ¡Todos los documentos aprobados! Perfil verificado.' : '🎉 All documents approved! Your profile is fully verified.')
            : (lang === 'es'
                ? `${total - approved} documento${total - approved > 1 ? 's' : ''} aún necesita${total - approved > 1 ? 'n' : ''} atención.`
                : `${total - approved} document${total - approved > 1 ? 's' : ''} still need attention.`)}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        docItems.map((item) => {
          const meta = item.doc ? STATUS_META[item.doc.status] : null;
          const isUploading = uploadingKey === item.key;

          return (
            <View
              key={item.key}
              className="bg-white rounded-2xl p-4 mb-3"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 }}
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-text-main font-body-bold text-sm flex-1 mr-2">{item.label}</Text>
                {meta && (
                  <View className={`${meta.bg} px-2.5 py-0.5 rounded-full flex-row items-center`}>
                    <Text className="text-xs mr-1">{meta.icon}</Text>
                    <Text className={`${meta.text} text-xs font-body-medium`}>{meta.label}</Text>
                  </View>
                )}
              </View>

              {item.doc?.file_name && (
                <Text className="text-text-muted font-body text-xs mb-2">📄 {item.doc.file_name}</Text>
              )}

              {item.doc?.admin_notes && item.doc.status === 'rejected' && (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-2">
                  <Text className="text-red-700 font-body-bold text-xs mb-0.5">
                    {lang === 'es' ? 'Nota del Admin' : 'Admin Note'}
                  </Text>
                  <Text className="text-red-600 font-body text-xs leading-4">{item.doc.admin_notes}</Text>
                </View>
              )}

              {isUploading && (
                <View className="flex-row items-center mb-2">
                  <ActivityIndicator size="small" className="mr-2" />
                  <Text className="text-text-muted font-body text-xs">
                    {lang === 'es' ? 'Subiendo...' : 'Uploading...'}
                  </Text>
                </View>
              )}

              {item.doc?.status !== 'approved' && (
                <TouchableOpacity
                  onPress={() => handleUpload(item.key, item.label)}
                  disabled={isUploading}
                  className={`border rounded-xl py-2.5 items-center mt-1 ${item.doc?.status === 'rejected' ? 'border-red-300' : 'border-dashed border-primary/40'}`}
                >
                  <Text className={`font-body-medium text-xs ${item.doc?.status === 'rejected' ? 'text-red-600' : 'text-primary'}`}>
                    {isUploading
                      ? (lang === 'es' ? 'Subiendo...' : 'Uploading...')
                      : item.doc?.status === 'rejected'
                      ? (lang === 'es' ? 'Volver a cargar' : 'Re-upload')
                      : (lang === 'es' ? 'Toca para cargar' : 'Tap to upload')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}

      <View className="h-6" />
    </ScreenWrapper>
  );
}
