import { View, Text, TouchableOpacity, Switch, Alert, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

export default function ProviderProfile() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const isColombia = user?.country === 'colombia';

  const [available, setAvailable] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [providerName, setProviderName] = useState<string>('');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const [availRes, areasRes, profileRes] = await Promise.all([
        supabase.from('users').select('available').eq('id', user!.id).single(),
        supabase.from('service_areas').select('state, city').eq('provider_id', user!.id),
        user?.role === 'company'
          ? supabase.from('companies').select('company_name').eq('user_id', user!.id).single()
          : supabase.from('independents').select('full_name').eq('user_id', user!.id).single(),
      ]);

      if (availRes.data && typeof availRes.data.available === 'boolean') {
        setAvailable(availRes.data.available);
      }
      if (areasRes.data) {
        setServiceAreas(areasRes.data.map((a: any) => a.city ? `${a.city}, ${a.state}` : a.state));
      }
      if (profileRes.data) {
        const name = (profileRes.data as any).company_name ?? (profileRes.data as any).full_name ?? '';
        setProviderName(name);
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleAvailabilityToggle = async (value: boolean) => {
    setAvailable(value);
    setTogglingAvailability(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ available: value })
        .eq('id', user!.id);
      if (error) throw error;
    } catch (e: any) {
      setAvailable(!value);
      Alert.alert('Error', e.message ?? 'Failed to update availability.');
    } finally {
      setTogglingAvailability(false);
    }
  };

  const displayName = providerName || user?.email || '';
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 24, marginTop: 12 }}>
          {isColombia ? 'Mi Perfil' : 'My Profile'}
        </Text>

        {/* Avatar card */}
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: C.line,
        }}>
          {loadingProfile ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 60,
                height: 60,
                backgroundColor: C.surface2,
                borderRadius: 30,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
                borderWidth: 1,
                borderColor: C.accent,
              }}>
                <Text style={{ color: C.accent, fontSize: 20, fontFamily: 'Inter_700Bold' }}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 17, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
                  {displayName || (isColombia ? 'Sin nombre' : 'No name')}
                </Text>
                <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2, textTransform: 'capitalize' }}>
                  {user?.role} · {user?.country}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                  {user?.email}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Availability toggle */}
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: C.line,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
              {isColombia ? 'Disponible para trabajos' : 'Available for jobs'}
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3 }}>
              {available
                ? (isColombia ? 'Apareces en los resultados' : 'You appear in search results')
                : (isColombia ? 'Oculto para nuevas solicitudes' : 'Hidden from new requests')}
            </Text>
          </View>
          {togglingAvailability ? (
            <ActivityIndicator color={C.accent} size="small" />
          ) : (
            <Switch
              value={available}
              onValueChange={handleAvailabilityToggle}
              trackColor={{ false: C.surface2, true: C.accent }}
              thumbColor={C.textPrimary}
            />
          )}
        </View>

        {/* Service areas */}
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: C.line,
        }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
            {isColombia ? 'Áreas de Servicio' : 'Service Areas'}
          </Text>
          {serviceAreas.length === 0 ? (
            <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
              {isColombia ? 'Sin áreas configuradas' : 'No service areas configured'}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {serviceAreas.map((area) => (
                <View key={area} style={{
                  backgroundColor: C.surface2,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: C.line,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Feather name="map-pin" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
                  <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{area}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Language */}
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: C.line,
        }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
            {isColombia ? 'Idioma de la App' : 'App Language'}
          </Text>
          <LanguageToggle />
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/welcome' as any);
          }}
          style={{
            backgroundColor: '#2d0d0d',
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: C.danger,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={16} color={C.danger} style={{ marginRight: 8 }} />
          <Text style={{ color: C.danger, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
            {isColombia ? 'Cerrar Sesión' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
