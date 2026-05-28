import { View, Text, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { C } from '@/constants/theme';

export default function AdminProfile() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';

  const initials = (user?.email ?? 'A').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 64 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 24, marginTop: 12 }}>
          {es ? 'Perfil Admin' : 'Admin Profile'}
        </Text>

        {/* Admin identity card */}
        <View style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <View style={{
            width: 56,
            height: 56,
            backgroundColor: '#EEF2F6',
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
            borderWidth: 1,
            borderColor: C.accent2,
          }}>
            <Text style={{ color: C.accent2, fontSize: 20, fontFamily: 'Inter_700Bold' }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
              {user?.email}
            </Text>
            <Text style={{ color: C.accent2, fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {es ? 'Administrador' : 'Administrator'}
            </Text>
          </View>
        </View>

        {/* Language toggle */}
        <View style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 16,
          padding: 16,
          marginBottom: 28,
        }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
            {es ? 'Idioma de la App' : 'App Language'}
          </Text>
          <LanguageToggle />
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={async () => {
            if (Platform.OS === 'web') {
              const ok = typeof window !== 'undefined' && window.confirm(es ? '¿Cerrar sesión?' : 'Sign out?');
              if (!ok) return;
              await signOut();
              router.replace('/(auth)/welcome' as any);
            } else {
              Alert.alert(
                es ? '¿Cerrar sesión?' : 'Sign out?',
                es ? '¿Estás seguro de que deseas cerrar sesión?' : 'Are you sure you want to sign out?',
                [
                  { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
                  { text: es ? 'Cerrar Sesión' : 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/welcome' as any); } },
                ],
              );
            }
          }}
          style={{
            backgroundColor: `${C.danger}15`,
            borderWidth: 1,
            borderColor: `${C.danger}40`,
            borderRadius: 16,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
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
