import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { C } from '@/constants/theme';
import { useRegistrationStore } from '@/store/registrationStore';
import { getStateList } from '@/lib/locations';

const SERVICE_TYPES = [
  { key: 'commercial',  label: 'Commercial',  labelEs: 'Comercial',    icon: 'briefcase' as const },
  { key: 'residential', label: 'Residential', labelEs: 'Residencial',  icon: 'home' as const },
  { key: 'both',        label: 'Both',        labelEs: 'Ambos',        icon: 'layers' as const },
];

export default function CompanyStep2() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Record<string, string>>();
  const country = params.country ?? 'usa';
  const isColombia = country === 'colombia';
  const { mergeFormData } = useRegistrationStore();
  const [serviceType, setServiceType] = useState('both');
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const allStates = useMemo(() => getStateList(country as 'usa' | 'colombia'), [country]);

  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return allStates;
    const q = searchQuery.toLowerCase();
    return allStates.filter((s) => s.toLowerCase().includes(q));
  }, [allStates, searchQuery]);

  const toggle = (s: string) => setSelected((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: insets.top + 8, paddingBottom: 8 }}>
          <Feather name="chevron-left" size={20} color={C.textPrimary} />
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>
            {isColombia ? 'Atrás' : 'Back'}
          </Text>
        </TouchableOpacity>

        <View style={{ paddingTop: 8, paddingBottom: 24 }}>
          <StepProgressBar current={2} total={4} />
          <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
            {isColombia ? 'Cobertura de Servicios' : 'Service Coverage'}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6 }}>
            {isColombia ? '¿Qué servicios ofreces y dónde?' : 'What services do you offer and where?'}
          </Text>
        </View>

        <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          {isColombia ? 'Tipo de Servicio' : 'Service Type'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
          {SERVICE_TYPES.map((t) => {
            const active = serviceType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setServiceType(t.key)}
                style={{
                  flex: 1, padding: 14, borderRadius: 14, alignItems: 'center',
                  backgroundColor: active ? `${C.accent}15` : C.surface,
                  borderWidth: 1.5,
                  borderColor: active ? C.accent : C.line,
                }}
                activeOpacity={0.85}
              >
                <Feather name={t.icon} size={20} color={active ? C.accent : C.textMuted} />
                <Text style={{ color: active ? C.textPrimary : C.textMuted, fontSize: 12, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular', marginTop: 8 }}>
                  {isColombia ? t.labelEs : t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          {isColombia ? 'Áreas de Cobertura' : 'Coverage Areas'}
        </Text>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: C.surface, borderWidth: 1.5,
          borderColor: searchQuery.length > 0 ? C.accent : C.line,
          borderRadius: 12, paddingHorizontal: 14, height: 44, marginBottom: 14,
        }}>
          <Feather name="search" size={15} color={C.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={isColombia ? 'Buscar departamento...' : 'Search state...'}
            placeholderTextColor={C.textMuted}
            style={{ flex: 1, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular' }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={15} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          {filteredStates.map((s) => {
            const active = selected.includes(s);
            return (
              <TouchableOpacity
                key={s}
                onPress={() => toggle(s)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
                  backgroundColor: active ? C.accent : C.surface,
                  borderWidth: 1,
                  borderColor: active ? C.accent : C.line,
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: active ? '#000' : C.textMuted, fontSize: 13, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
          {filteredStates.length === 0 && (
            <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
              {isColombia ? 'Sin resultados' : 'No results'}
            </Text>
          )}
        </View>

        {selected.length > 0 && (
          <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 16, marginBottom: 24 }}>
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 8 }}>
              {selected.length} {isColombia ? (selected.length === 1 ? 'departamento seleccionado' : 'departamentos seleccionados') : (selected.length === 1 ? 'state selected' : 'states selected')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {selected.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggle(s)}
                  style={{ backgroundColor: `${C.accent}20`, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={{ color: C.accent, fontSize: 12, fontFamily: 'Inter_500Medium', marginRight: 4 }}>{s}</Text>
                  <Feather name="x" size={10} color={C.accent} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Button
          label={isColombia ? 'Continuar' : 'Continue'}
          onPress={() => {
            mergeFormData({ serviceType, serviceAreas: selected });
            router.push({ pathname: '/(auth)/register/company/step3', params: { country } } as any);
          }}
          disabled={selected.length === 0}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
