import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { C } from '@/constants/theme';

const DOCS = [
  'W-9 Tax Form',
  'Certificate of Insurance',
  'Business License',
  'EIN Confirmation Letter',
  'Signed Service Agreement',
];

export default function CompanyStep4() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 8 }}>
          <Feather name="chevron-left" size={20} color={C.textPrimary} />
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>Back</Text>
        </TouchableOpacity>

        <View style={{ paddingTop: 8, paddingBottom: 24 }}>
          <StepProgressBar current={4} total={4} />
          <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>Review & Submit</Text>
          <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6 }}>Confirm your information before submitting</Text>
        </View>

        {/* Info card */}
        <View style={{ backgroundColor: `${C.accent}10`, borderWidth: 1, borderColor: `${C.accent}30`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Feather name="info" size={16} color={C.accent} style={{ marginRight: 8 }} />
            <Text style={{ color: C.accent, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Application Summary</Text>
          </View>
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 }}>
            Your application will be reviewed by our team within 2–3 business days. You'll receive an email notification once approved.
          </Text>
        </View>

        {/* Doc checklist */}
        <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Required Documents
        </Text>
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, marginBottom: 20, overflow: 'hidden' }}>
          {DOCS.map((doc, i) => (
            <View
              key={doc}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: i < DOCS.length - 1 ? 1 : 0, borderBottomColor: C.line }}
            >
              <View style={{ width: 28, height: 28, backgroundColor: `${C.success}15`, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Feather name="check" size={14} color={C.success} />
              </View>
              <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 }}>{doc}</Text>
            </View>
          ))}
        </View>

        {/* Legal */}
        <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, textAlign: 'center', marginBottom: 24 }}>
          By submitting you agree to ProVendor's Terms of Service and Privacy Policy. Your information will be verified before account activation.
        </Text>

        <Button label="Submit Application" onPress={() => router.replace('/(auth)/welcome')} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
