import { View, Text } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

export default function ProviderDocuments() {
  const { user } = useAuthStore();

  return (
    <ScreenWrapper scroll className="px-6">
      <View style={{ paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
          Documents
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          Required for platform verification
        </Text>
      </View>

      {/* Status card */}
      <View style={{
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: `${C.warning}40`,
        borderRadius: 16,
        padding: 20,
        marginTop: 16,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <View style={{
          width: 44, height: 44,
          backgroundColor: `${C.warning}15`,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
        }}>
          <Feather name="shield" size={20} color={C.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>Verification Pending</Text>
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
            Upload required documents to get approved
          </Text>
        </View>
      </View>

      {/* Document slots */}
      {[
        { key: 'w9',               label: 'W-9 Tax Form',                desc: 'Required for US tax reporting' },
        { key: 'insurance',        label: 'Certificate of Insurance',    desc: 'Liability coverage documentation' },
        { key: 'business_license', label: 'Business License',            desc: 'State or local business registration' },
        { key: 'ein_letter',       label: 'EIN Confirmation Letter',     desc: 'IRS employer identification number' },
        { key: 'service_agreement',label: 'Signed Service Agreement',   desc: 'Platform terms and conditions' },
      ].map((doc, idx) => (
        <View
          key={doc.key}
          style={{
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 16,
            padding: 20,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View style={{
            width: 44, height: 44,
            backgroundColor: C.surface2,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}>
            <Feather name="file-text" size={18} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{doc.label}</Text>
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>{doc.desc}</Text>
          </View>
          <StatusBadge status="pending" />
        </View>
      ))}

      <View style={{ height: 32 }} />
    </ScreenWrapper>
  );
}
