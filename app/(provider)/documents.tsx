import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { DEMO_DOCUMENTS } from '@/constants/demoData';
import type { DemoDoc } from '@/constants/demoData';

const STATUS_META: Record<DemoDoc['status'], { label: string; bg: string; text: string; icon: string }> = {
  approved: { label: 'Approved', bg: 'bg-green-50',  text: 'text-green-700',  icon: '✅' },
  rejected: { label: 'Rejected', bg: 'bg-red-50',    text: 'text-red-700',    icon: '❌' },
  pending:  { label: 'Pending',  bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '⏳' },
};

const approved = DEMO_DOCUMENTS.filter((d) => d.status === 'approved').length;
const total    = DEMO_DOCUMENTS.length;

function DocRow({ doc }: { doc: DemoDoc }) {
  const meta = STATUS_META[doc.status];
  return (
    <View
      className="bg-white rounded-2xl p-4 mb-3"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 }}
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-text-main font-body-bold text-sm flex-1 mr-2">{doc.label}</Text>
        <View className={`${meta.bg} px-2.5 py-0.5 rounded-full flex-row items-center`}>
          <Text className="text-xs mr-1">{meta.icon}</Text>
          <Text className={`${meta.text} text-xs font-body-medium`}>{meta.label}</Text>
        </View>
      </View>

      {doc.fileName && (
        <Text className="text-text-muted font-body text-xs mb-2">📄 {doc.fileName}</Text>
      )}

      {doc.adminNote && doc.status === 'rejected' && (
        <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-2">
          <Text className="text-red-700 font-body-bold text-xs mb-0.5">Admin Note</Text>
          <Text className="text-red-600 font-body text-xs leading-4">{doc.adminNote}</Text>
        </View>
      )}

      {!doc.fileName && doc.status === 'pending' && (
        <TouchableOpacity className="border border-dashed border-primary/40 rounded-xl py-2.5 items-center mt-1">
          <Text className="text-primary font-body-medium text-xs">Tap to upload</Text>
        </TouchableOpacity>
      )}

      {doc.status === 'rejected' && (
        <TouchableOpacity className="border border-red-300 rounded-xl py-2 items-center mt-1">
          <Text className="text-red-600 font-body-bold text-xs">Re-upload</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ProviderDocuments() {
  return (
    <ScreenWrapper scroll className="px-5">
      <View className="pt-8 pb-2">
        <Text className="text-primary text-3xl font-heading">Documents</Text>
        <Text className="text-text-muted font-body text-sm mt-0.5">Required for platform approval</Text>
      </View>

      {/* Progress bar */}
      <View className="bg-white border border-gray-100 rounded-2xl p-4 my-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-text-main font-body-bold text-sm">Verification progress</Text>
          <Text className="text-primary font-body-bold text-sm">{approved}/{total} approved</Text>
        </View>
        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <View
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${(approved / total) * 100}%` }}
          />
        </View>
        <Text className="text-text-muted font-body text-xs mt-2">
          {approved === total
            ? '🎉 All documents approved! Your profile is fully verified.'
            : `${total - approved} document${total - approved > 1 ? 's' : ''} still need attention.`}
        </Text>
      </View>

      {DEMO_DOCUMENTS.map((doc) => (
        <DocRow key={doc.key} doc={doc} />
      ))}

      <View className="h-6" />
    </ScreenWrapper>
  );
}
