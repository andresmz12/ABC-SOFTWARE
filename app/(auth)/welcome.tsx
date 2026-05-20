import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';
import LanguageToggle from '@/components/ui/LanguageToggle';

type Country = 'usa' | 'colombia';
type Role = 'company' | 'independent' | 'client';

const ROLES: { key: Role; icon: keyof typeof Feather.glyphMap; title: string; desc: string; route: string }[] = [
  { key: 'company',     icon: 'briefcase', title: 'Cleaning Company',     desc: 'Register your business, manage employees and grow your client base', route: '/(auth)/register/company/step1' },
  { key: 'independent', icon: 'user',      title: 'Independent Cleaner',  desc: 'Work on your own schedule, receive jobs and get paid directly',       route: '/(auth)/register/independent/step1' },
  { key: 'client',      icon: 'home',      title: 'Client',               desc: 'Post cleaning jobs and hire verified professionals near you',          route: '/(auth)/register/client' },
];

export default function Welcome() {
  const router = useRouter();
  const { t } = useTranslation();
  const [country, setCountry] = useState<Country>('usa');
  const [role, setRole] = useState<Role | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>

        {/* Language toggle */}
        <View style={{ alignItems: 'flex-end', paddingTop: 16, paddingBottom: 8 }}>
          <LanguageToggle />
        </View>

        {/* Logo */}
        <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 40 }}>
          <View style={{
            width: 64, height: 64,
            backgroundColor: C.accent,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Text style={{ color: '#000', fontSize: 28, fontFamily: 'Inter_700Bold' }}>P</Text>
          </View>
          <Text style={{ color: C.textPrimary, fontSize: 36, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 12 }}>
            ProVendor
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 16, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 24, maxWidth: 280 }}>
            Connect with verified cleaning professionals in the USA and Colombia
          </Text>
        </View>

        {/* Country selection */}
        <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          Select your country
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          {([
            { key: 'usa' as Country, flag: '🇺🇸', label: 'United States' },
            { key: 'colombia' as Country, flag: '🇨🇴', label: 'Colombia' },
          ]).map((c) => {
            const active = country === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setCountry(c.key)}
                style={{
                  flex: 1,
                  backgroundColor: active ? C.surface2 : C.surface,
                  borderWidth: 1.5,
                  borderColor: active ? C.accent : C.line,
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 28, marginBottom: 8 }}>{c.flag}</Text>
                <Text style={{
                  color: active ? C.textPrimary : C.textSecondary,
                  fontSize: 13,
                  fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                }}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Role selection */}
        <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          I am a...
        </Text>

        {ROLES.map((r) => {
          const active = role === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              onPress={() => setRole(r.key)}
              style={{
                backgroundColor: C.surface,
                borderWidth: 1.5,
                borderColor: active ? C.accent : C.line,
                borderRadius: 16,
                padding: 20,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderLeftWidth: active ? 3 : 1.5,
                borderLeftColor: active ? C.accent : C.line,
              }}
              activeOpacity={0.85}
            >
              <View style={{
                width: 44, height: 44,
                backgroundColor: active ? `${C.accent}20` : C.surface2,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}>
                <Feather name={r.icon} size={20} color={active ? C.accent : C.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>
                  {r.title}
                </Text>
                <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 }}>
                  {r.desc}
                </Text>
              </View>
              {active && <Feather name="check-circle" size={20} color={C.accent} style={{ marginLeft: 12 }} />}
            </TouchableOpacity>
          );
        })}

        {/* Continue button */}
        <TouchableOpacity
          onPress={() => {
            if (!role) return;
            const r = ROLES.find((x) => x.key === role)!;
            router.push({ pathname: r.route, params: { country } } as any);
          }}
          disabled={!role}
          style={{
            height: 56,
            backgroundColor: role ? C.accent : C.surface2,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
            marginBottom: 24,
          }}
          activeOpacity={0.85}
        >
          <Text style={{ color: role ? '#000' : C.textMuted, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
            Get Started
          </Text>
        </TouchableOpacity>

        {/* Sign in link */}
        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' }}>
            Already have an account?{' '}
            <Text style={{ color: C.accent, fontFamily: 'Inter_600SemiBold' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
