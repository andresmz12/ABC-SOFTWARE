import { View, Text } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

function StatCard({ label, value, icon }: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 16,
      padding: 16,
    }}>
      <Feather name={icon} size={16} color={C.textMuted} />
      <Text style={{ color: C.textPrimary, fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 8 }}>{value}</Text>
      <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function ProviderHome() {
  const { user } = useAuthStore();
  const isPending = user?.status === 'pending';
  const name = user?.email?.split('@')[0] ?? 'Provider';

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' }}>
          Good morning
        </Text>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 4, letterSpacing: -0.5 }}>
          {name}
        </Text>
        {/* Location pill */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: `${C.accent}15`,
          borderWidth: 1, borderColor: `${C.accent}40`,
          borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4,
          alignSelf: 'flex-start', marginTop: 12,
        }}>
          <Feather name="map-pin" size={12} color={C.accent} />
          <Text style={{ color: C.accent, fontSize: 12, fontFamily: 'Inter_500Medium', marginLeft: 4 }}>
            Miami Metro Area
          </Text>
        </View>
      </View>

      {isPending ? (
        /* Pending approval state */
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32 }}>
          <View style={{
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: `${C.warning}40`,
            borderRadius: 20,
            padding: 28,
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <View style={{
              width: 72, height: 72,
              backgroundColor: `${C.warning}15`,
              borderRadius: 36,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Feather name="clock" size={32} color={C.warning} />
            </View>
            <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 12 }}>
              Account Under Review
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 }}>
              We're reviewing your documents. You'll receive a notification once your account is approved. This typically takes 2–3 business days.
            </Text>
          </View>

          <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 20 }}>
            <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 16 }}>
              Document Status
            </Text>
            {[
              { label: 'Identity verification', status: 'pending' as const },
              { label: 'Business license', status: 'pending' as const },
              { label: 'Insurance certificate', status: 'pending' as const },
            ].map((d) => (
              <View key={d.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: `${C.warning}20`,
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Feather name="clock" size={11} color={C.warning} />
                </View>
                <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{d.label}</Text>
                <View style={{ flex: 1 }} />
                <Text style={{ color: C.warning, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>PENDING</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        /* Approved — job feed (empty until real data arrives) */
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
            <Text style={{ color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>Job Alerts</Text>
            <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>New jobs matching your service areas</Text>
          </View>
          <EmptyState
            title="No job alerts right now"
            subtitle="New jobs in your area will appear here. Make sure your profile and service areas are up to date."
            iconName="search"
          />
        </View>
      )}
    </ScreenWrapper>
  );
}
