import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

export default function ClientHome() {
  const { user } = useAuthStore();
  const router = useRouter();
  const name = user?.email?.split('@')[0] ?? 'there';

  return (
    <ScreenWrapper scroll className="px-6">
      <View style={{ paddingTop: 40, paddingBottom: 32 }}>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' }}>Hello, {name}</Text>
        <Text style={{ color: C.textPrimary, fontSize: 30, fontFamily: 'Inter_700Bold', marginTop: 4, letterSpacing: -0.5 }}>
          Find a Professional
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular', marginTop: 8, lineHeight: 22 }}>
          Connect with verified cleaning experts in your area
        </Text>
      </View>

      {/* Post job CTA */}
      <TouchableOpacity
        onPress={() => router.push('/(client)/post-job' as any)}
        style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: `${C.accent}50`,
          borderRadius: 20,
          padding: 24,
          marginBottom: 16,
        }}
        activeOpacity={0.9}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 40, height: 40, backgroundColor: `${C.accent}20`, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Feather name="plus" size={20} color={C.accent} />
          </View>
          <Text style={{ color: C.accent, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Need a clean space?
          </Text>
        </View>
        <Text style={{ color: C.textPrimary, fontSize: 22, fontFamily: 'Inter_700Bold', marginBottom: 8, letterSpacing: -0.3 }}>
          Post a Cleaning Job
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20, marginBottom: 20 }}>
          Get quotes from verified, insured professionals in your area within minutes.
        </Text>
        <View style={{
          backgroundColor: C.accent,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 24,
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Text style={{ color: '#000', fontSize: 14, fontFamily: 'Inter_600SemiBold', marginRight: 8 }}>Get Started</Text>
          <Feather name="arrow-right" size={14} color="#000" />
        </View>
      </TouchableOpacity>

      {/* Browse card */}
      <TouchableOpacity
        onPress={() => router.push('/(client)/browse-providers' as any)}
        style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 20,
          padding: 20,
          marginBottom: 24,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 17, fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>Browse Providers</Text>
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>View profiles, ratings & availability</Text>
        </View>
        <View style={{ width: 48, height: 48, backgroundColor: C.surface2, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 16 }}>
          <Feather name="search" size={20} color={C.accent} />
        </View>
      </TouchableOpacity>

      {/* Trust section */}
      <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 20, marginBottom: 40 }}>
        <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
          Why ProVendor
        </Text>
        {[
          { icon: 'shield' as const, text: 'All providers verified & background checked' },
          { icon: 'award' as const,  text: 'Insured professionals — your home is protected' },
          { icon: 'star' as const,   text: 'Genuine reviews from verified clients' },
        ].map((item) => (
          <View key={item.text} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, backgroundColor: `${C.accent}15`, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Feather name={item.icon} size={14} color={C.accent} />
            </View>
            <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>{item.text}</Text>
          </View>
        ))}
      </View>
    </ScreenWrapper>
  );
}
