import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';

function Row({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Feather name={icon} size={16} color={C.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

export default function ClientProfile() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';
  const initials = (user?.email ?? 'U').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 8, paddingBottom: 24 }}>
          <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
            {es ? 'Perfil' : 'Profile'}
          </Text>
        </View>

        {/* Avatar card */}
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 24, marginBottom: 16, alignItems: 'center' }}>
          <View style={{ width: 72, height: 72, backgroundColor: C.accent, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ color: '#000', fontSize: 26, fontFamily: 'Inter_700Bold' }}>{initials}</Text>
          </View>
          <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold' }}>{user?.email ?? '—'}</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
            {es ? 'Cliente' : 'Client'}
          </Text>
        </View>

        {/* Info rows */}
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingHorizontal: 20, marginBottom: 16 }}>
          <Row icon="mail"     label={es ? 'Correo' : 'Email'}        value={user?.email ?? '—'} />
          <Row icon="globe"    label={es ? 'País' : 'Country'}        value={user?.country === 'usa' ? 'United States' : 'Colombia'} />
          <Row icon="calendar" label={es ? 'Miembro desde' : 'Member since'} value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'} />
        </View>

        {/* Language */}
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
            {es ? 'Idioma de la App' : 'App Language'}
          </Text>
          <LanguageToggle />
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={async () => { await signOut(); router.replace('/(auth)/welcome' as any); }}
          style={{
            backgroundColor: `${C.danger}15`,
            borderWidth: 1,
            borderColor: `${C.danger}40`,
            borderRadius: 16,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
            flexDirection: 'row',
          }}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={16} color={C.danger} style={{ marginRight: 8 }} />
          <Text style={{ color: C.danger, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
            {es ? 'Cerrar Sesión' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
