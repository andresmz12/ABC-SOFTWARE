import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';

interface ProviderProfile {
  id: string;
  email: string;
  role: 'company' | 'independent';
  country: string;
  available: boolean;
  name: string;
  phone: string;
  city: string;
  state: string;
  serviceType: string;
  serviceAreas: string[];
}

const serviceTypeLabel = (type: string, es: boolean) => {
  const map: Record<string, { en: string; es: string }> = {
    commercial:  { en: 'Commercial',  es: 'Comercial' },
    residential: { en: 'Residential', es: 'Residencial' },
    both:        { en: 'Both',        es: 'Ambos' },
  };
  return es ? (map[type]?.es ?? type) : (map[type]?.en ?? type);
};

export default function ProviderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const es = lang === 'es';

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        // Query both profile tables simultaneously — no users table needed
        const [coRes, indRes, areasRes] = await Promise.all([
          supabase.from('companies').select('company_name, phone, city, state, service_type, country, available').eq('user_id', id).maybeSingle(),
          supabase.from('independents').select('full_name, phone, city, state, service_type, country, available').eq('user_id', id).maybeSingle(),
          supabase.from('service_areas').select('state').eq('provider_id', id),
        ]);

        const isCompany = !!coRes.data;
        const profile = coRes.data ?? indRes.data;
        if (!profile) { setLoading(false); return; }

        const name = isCompany ? (coRes.data!.company_name ?? '') : (indRes.data!.full_name ?? '');
        const phone = profile.phone ?? '';
        const city = profile.city ?? '';
        const state = profile.state ?? '';
        const serviceType = profile.service_type ?? 'both';
        setProvider({
          id,
          email: '',
          role: isCompany ? 'company' : 'independent',
          country: profile.country ?? 'usa',
          available: profile.available ?? false,
          name,
          phone,
          city,
          state,
          serviceType,
          serviceAreas: (areasRes.data ?? []).map((a: any) => a.state as string),
        });
      } catch {
        // provider not found — handled below
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 20, flexDirection: 'row', alignItems: 'center' }}>
          <Feather name="arrow-left" size={20} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>
            {es ? 'Atrás' : 'Back'}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="user-x" size={40} color={C.textMuted} />
          <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_400Regular', marginTop: 12 }}>
            {es ? 'Proveedor no encontrado' : 'Provider not found'}
          </Text>
        </View>
      </View>
    );
  }

  const isCompany = provider.role === 'company';
  const roleLabel = isCompany
    ? (es ? 'Empresa de Limpieza' : 'Cleaning Company')
    : (es ? 'Limpiador Independiente' : 'Independent Cleaner');

  const initials = provider.name
    .split(' ')
    .map((w: string) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'P';

  return (
    <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <Feather name="arrow-left" size={20} color={C.textSecondary} />
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginLeft: 8 }}>
            {es ? 'Atrás' : 'Back'}
          </Text>
        </TouchableOpacity>

        {/* Header card */}
        <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: C.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 64, height: 64,
              backgroundColor: `${C.accent}20`,
              borderRadius: 32,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}>
              <Text style={{ color: C.accent, fontSize: 22, fontFamily: 'Inter_700Bold' }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>
                {provider.name}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                {roleLabel}
              </Text>
            </View>
          </View>

          {/* Availability + verified badges */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ backgroundColor: `${C.success}15`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="check-circle" size={12} color={C.success} style={{ marginRight: 4 }} />
              <Text style={{ color: C.success, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'VERIFICADO' : 'VERIFIED'}
              </Text>
            </View>
            {provider.available && (
              <View style={{ backgroundColor: `${C.accent}15`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="zap" size={12} color={C.accent} style={{ marginRight: 4 }} />
                <Text style={{ color: C.accent, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'DISPONIBLE' : 'AVAILABLE'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Details */}
        <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line }}>
          <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
            {es ? 'Información' : 'Details'}
          </Text>
          {([
            [es ? 'Tipo de Servicio' : 'Service Type', serviceTypeLabel(provider.serviceType, es)],
            [es ? 'Ciudad / Estado' : 'City / State',  provider.city ? `${provider.city}${provider.state ? ', ' + provider.state : ''}` : '—'],
            ['Email',                                   provider.email],
            [es ? 'Teléfono' : 'Phone',                provider.phone || '—'],
            [es ? 'País' : 'Country',                  provider.country === 'colombia' ? '🇨🇴 Colombia' : '🇺🇸 United States'],
          ] as [string, string][]).map(([label, value], idx, arr) => (
            <View key={label} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', width: 120 }}>{label}</Text>
              <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Service areas */}
        {provider.serviceAreas.length > 0 && (
          <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line }}>
            <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
              {es ? `Áreas de Cobertura (${provider.serviceAreas.length})` : `Coverage Areas (${provider.serviceAreas.length})`}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {provider.serviceAreas.map((area) => (
                <View key={area} style={{ backgroundColor: C.surface2, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="map-pin" size={10} color={C.textMuted} style={{ marginRight: 4 }} />
                  <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* CTA */}
        <View style={{ backgroundColor: C.surface2, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Feather name="info" size={14} color={C.textMuted} style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 18 }}>
            {es
              ? 'Para contratar a este proveedor, publica un trabajo y los proveedores disponibles podrán hacer una oferta.'
              : 'To hire this provider, post a job and available providers in your area will be able to bid.'}
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}
