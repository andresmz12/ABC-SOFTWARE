import { View, Text, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { supabase } from '@/lib/supabase';

export default function ProviderProfile() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const isDemo = user?.id === 'demo';
  const isColombia = user?.country === 'colombia';

  const [available, setAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  useEffect(() => {
    if (!isDemo && user?.id) {
      supabase.from('users').select('available').eq('id', user.id).single()
        .then(({ data }) => {
          if (data && typeof data.available === 'boolean') {
            setAvailable(data.available);
          }
        });
    }
  }, [user?.id, isDemo]);

  const handleAvailabilityToggle = async (value: boolean) => {
    setAvailable(value);
    if (isDemo) return;
    setTogglingAvailability(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ available: value })
        .eq('id', user!.id);
      if (error) throw error;
    } catch (e: any) {
      setAvailable(!value);
      Alert.alert(
        isColombia ? 'Error' : 'Error',
        e.message ?? 'Failed to update availability.',
      );
    } finally {
      setTogglingAvailability(false);
    }
  };

  const SERVICE_AREAS = isColombia
    ? ['El Poblado, Medellín', 'Chapinero, Bogotá', 'El Peñón, Cali']
    : ['Miami, FL', 'Miami Beach, FL', 'Coral Gables, FL', 'Brickell, FL'];

  const SERVICES = isColombia
    ? ['Limpieza Profunda', 'Aseo Residencial', 'Post-Obra', 'Desinfección']
    : ['Office Deep Clean', 'Residential Cleaning', 'Post-Construction', 'Move-In/Move-Out'];

  return (
    <ScreenWrapper scroll className="px-5">
      <View className="pt-8 pb-4">
        <Text className="text-primary text-3xl font-heading">
          {isColombia ? 'Mi Perfil' : 'My Profile'}
        </Text>
      </View>

      {/* Avatar + name card */}
      <View className="bg-white rounded-2xl p-5 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 }}>
        <View className="flex-row items-center mb-4">
          <View className="w-16 h-16 bg-primary rounded-full items-center justify-center mr-4">
            <Text className="text-white text-2xl font-heading">
              {isColombia ? 'LT' : 'CP'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-text-main font-body-bold text-lg">
              {isColombia ? 'Limpieza Total SAS' : 'CleanPro Services LLC'}
            </Text>
            <Text className="text-text-muted font-body text-sm">
              {isColombia ? 'Empresa · Medellín, Colombia' : 'Company · Miami, FL'}
            </Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-secondary font-body-bold text-sm">4.8 ★</Text>
              <Text className="text-text-muted font-body text-xs ml-1">(87 {isColombia ? 'reseñas' : 'reviews'})</Text>
            </View>
          </View>
        </View>

        {/* Badges */}
        <View className="flex-row flex-wrap gap-1.5">
          {[
            { icon: '✅', label: isColombia ? 'Verificado' : 'Verified',   bg: 'bg-green-50',  text: 'text-green-700' },
            { icon: '🛡️', label: isColombia ? 'Asegurado' : 'Insured',    bg: 'bg-blue-50',   text: 'text-blue-700' },
            { icon: '⭐', label: isColombia ? 'Top' : 'Top Rated',         bg: 'bg-amber-50',  text: 'text-amber-700' },
          ].map((b) => (
            <View key={b.label} className={`${b.bg} px-2.5 py-1 rounded-full flex-row items-center`}>
              <Text className="text-xs mr-1">{b.icon}</Text>
              <Text className={`${b.text} text-xs font-body-medium`}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Availability toggle */}
      <View className="bg-white rounded-2xl p-4 mb-4 flex-row items-center justify-between" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
        <View className="flex-1 mr-3">
          <Text className="text-text-main font-body-bold text-sm">
            {isColombia ? 'Disponible para trabajos' : 'Available for jobs'}
          </Text>
          <Text className="text-text-muted font-body text-xs mt-0.5">
            {available
              ? (isColombia ? 'Apareces en los resultados' : 'You appear in search results')
              : (isColombia ? 'Oculto para nuevas solicitudes' : 'Hidden from new requests')}
          </Text>
        </View>
        {togglingAvailability ? (
          <ActivityIndicator />
        ) : (
          <Switch
            value={available}
            onValueChange={handleAvailabilityToggle}
            trackColor={{ false: '#D1D5DB', true: '#1B3A6B' }}
            thumbColor="#FFFFFF"
          />
        )}
      </View>

      {/* Stats */}
      <View className="flex-row gap-3 mb-4">
        {[
          { label: isColombia ? 'Trabajos' : 'Jobs done', value: '47' },
          { label: isColombia ? 'Respuesta' : 'Response rate', value: '98%' },
          { label: isColombia ? 'Recurrentes' : 'Repeat clients', value: '12' },
        ].map((s) => (
          <View key={s.label} className="flex-1 bg-white rounded-2xl p-3 items-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text className="text-primary font-heading text-xl">{s.value}</Text>
            <Text className="text-text-muted font-body text-xs text-center mt-0.5">{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Service areas */}
      <View className="bg-white rounded-2xl p-4 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
        <Text className="text-text-main font-body-bold text-sm mb-3">
          {isColombia ? 'Áreas de Servicio' : 'Service Areas'}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SERVICE_AREAS.map((area) => (
            <View key={area} className="bg-accent border border-primary/20 px-3 py-1.5 rounded-full">
              <Text className="text-primary font-body-medium text-xs">📍 {area}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Services offered */}
      <View className="bg-white rounded-2xl p-4 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
        <Text className="text-text-main font-body-bold text-sm mb-3">
          {isColombia ? 'Servicios Ofrecidos' : 'Services Offered'}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SERVICES.map((s) => (
            <View key={s} className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
              <Text className="text-text-main font-body-medium text-xs">{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Language */}
      <View className="bg-white rounded-2xl p-4 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
        <Text className="text-text-main font-body-bold text-sm mb-3">
          {isColombia ? 'Idioma de la App' : 'App Language'}
        </Text>
        <LanguageToggle />
      </View>

      {/* Sign out */}
      <TouchableOpacity
        onPress={async () => { await signOut(); router.replace('/(auth)/welcome'); }}
        className="bg-red-50 border border-red-200 rounded-2xl p-4 items-center mb-8"
      >
        <Text className="text-red-600 font-body-bold">
          {isColombia ? 'Cerrar Sesión' : 'Sign Out'}
        </Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}
