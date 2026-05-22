import { View, Text, TouchableOpacity } from 'react-native';
import StatusBadge from '@/components/ui/StatusBadge';
import { useLang } from '@/context/LanguageContext';
import type { Document } from '@/types';

interface Props {
  docType: string;
  label: string;
  info?: string;
  document?: Document;
  onUpload: () => void;
  uploading?: boolean;
  progress?: number;
}

export default function DocumentUploadCard({ docType, label, info, document, onUpload, uploading, progress }: Props) {
  const { lang } = useLang();
  const es = lang === 'es';
  const buttonLabel = uploading
    ? (es ? 'Subiendo...' : 'Uploading...')
    : document
    ? (document.status === 'rejected' ? (es ? 'Volver a subir' : 'Re-upload') : (es ? 'Reemplazar' : 'Replace'))
    : (es ? 'Subir' : 'Upload');
  return (
    <View className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
      <View className="flex-row justify-between items-start mb-1">
        <Text className="text-text-main font-body-medium text-sm flex-1 mr-2 leading-5">{label}</Text>
        {document && <StatusBadge status={document.status} />}
      </View>
      {info ? (
        <Text className="text-text-muted text-xs mb-2 leading-4">ℹ️ {info}</Text>
      ) : null}
      {document?.file_name && (
        <Text className="text-text-muted text-xs mb-2">📄 {document.file_name}</Text>
      )}
      {document?.admin_notes && document.status === 'rejected' && (
        <View className="bg-red-50 rounded-lg p-2 mb-2">
          <Text className="text-danger text-xs">{document.admin_notes}</Text>
        </View>
      )}
      {uploading && (
        <View className="h-1.5 bg-gray-100 rounded-full mb-2">
          <View className="h-full bg-primary rounded-full" style={{ width: `${progress ?? 0}%` }} />
        </View>
      )}
      <TouchableOpacity
        onPress={onUpload}
        disabled={uploading}
        className={`border rounded-lg py-2 items-center mt-1 ${document?.status === 'approved' ? 'border-green-300' : 'border-primary'}`}
      >
        <Text className={`text-sm font-body-medium ${document?.status === 'approved' ? 'text-green-600' : 'text-primary'}`}>
          {buttonLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
