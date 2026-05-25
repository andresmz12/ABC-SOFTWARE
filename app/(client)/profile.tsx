import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import LanguageToggle from '@/components/ui/LanguageToggle';
import LocationSelector from '@/components/ui/LocationSelector';
import Input from '@/components/ui/Input';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

interface ClientData {
  full_name: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  service_preference?: 'commercial' | 'residential' | 'both' | null;
  frequency?: 'one_time' | 'weekly' | 'biweekly' | 'monthly' | null;
}

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
  const insets = useSafeAreaInsets();
  const es = lang === 'es';
  const country = (user?.country ?? 'usa') as 'usa' | 'colombia';

  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editVisible, setEditVisible] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editState, setEditState] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editZip, setEditZip] = useState('');
  const [editServicePref, setEditServicePref] = useState<'commercial' | 'residential' | 'both' | null>(null);
  const [editFrequency, setEditFrequency] = useState<'one_time' | 'weekly' | 'biweekly' | 'monthly' | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    if (!user?.id) return;
    setLoadingProfile(true);
    try {
      const { data } = await supabase
        .from('clients')
        .select('full_name, phone, city, state, zip, service_preference, frequency')
        .eq('user_id', user.id)
        .single();
      setClientData(data ?? null);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => { loadProfile(); }, [user?.id]);

  const openEdit = () => {
    setEditName(clientData?.full_name ?? '');
    setEditPhone(clientData?.phone ?? '');
    setEditState(clientData?.state ?? '');
    setEditCity(clientData?.city ?? '');
    setEditZip(clientData?.zip ?? '');
    setEditServicePref(clientData?.service_preference ?? null);
    setEditFrequency(clientData?.frequency ?? null);
    setEditVisible(true);
  };

  const handleSave = async () => {
    if (!editName.trim() || !editPhone.trim() || !editZip.trim()) {
      Alert.alert(
        es ? 'Campos requeridos' : 'Required fields',
        es ? 'Por favor completa todos los campos.' : 'Please fill in all fields.',
      );
      return;
    }
    if (!editState) {
      Alert.alert(
        es ? 'Campo requerido' : 'Required field',
        es ? 'Por favor selecciona un estado/departamento.' : 'Please select a state/department.',
      );
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          full_name: editName.trim(),
          phone: editPhone.trim(),
          city: editCity,
          state: editState,
          zip: editZip.trim(),
          service_preference: editServicePref ?? null,
          frequency: editFrequency ?? null,
        })
        .eq('user_id', user!.id);
      if (error) throw error;
      setEditVisible(false);
      await loadProfile();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? (es ? 'No se pudo guardar.' : 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  const displayName = clientData?.full_name || user?.email || '';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      >

        {/* Header */}
        <View style={{ paddingTop: 8, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
            {es ? 'Perfil' : 'Profile'}
          </Text>
          {!loadingProfile && (
            <TouchableOpacity
              onPress={openEdit}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
              activeOpacity={0.75}
            >
              <Feather name="edit-2" size={14} color={C.textSecondary} style={{ marginRight: 6 }} />
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                {es ? 'Editar' : 'Edit'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar card */}
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 24, marginBottom: 16, alignItems: 'center' }}>
          {loadingProfile ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
          ) : (
            <>
              <View style={{ width: 72, height: 72, backgroundColor: C.accent, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 26, fontFamily: 'Inter_700Bold' }}>{initials}</Text>
              </View>
              <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold' }}>
                {clientData?.full_name || user?.email || '—'}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
                {es ? 'Cliente' : 'Client'}
              </Text>
            </>
          )}
        </View>

        {/* Info rows */}
        {!loadingProfile && (
          <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingHorizontal: 20, marginBottom: 16 }}>
            <Row icon="user"     label={es ? 'Nombre' : 'Full Name'}
                                 value={clientData?.full_name ?? '—'} />
            <Row icon="mail"     label={es ? 'Correo' : 'Email'}
                                 value={user?.email ?? '—'} />
            <Row icon="phone"    label={es ? 'Teléfono' : 'Phone'}
                                 value={clientData?.phone ?? '—'} />
            <Row icon="map-pin"  label={es ? 'Ciudad / Depto.' : 'City / State'}
                                 value={clientData?.city ? `${clientData.city}${clientData.state ? ', ' + clientData.state : ''}` : '—'} />
            <Row icon="hash"     label={country === 'colombia' ? (es ? 'Código Postal' : 'Postal Code') : 'ZIP'}
                                 value={clientData?.zip ?? '—'} />
            <Row icon="briefcase" label={es ? 'Tipo de servicio' : 'Service preference'}
                                 value={
                                   clientData?.service_preference === 'commercial' ? (es ? 'Comercial' : 'Commercial')
                                   : clientData?.service_preference === 'residential' ? (es ? 'Residencial' : 'Residential')
                                   : clientData?.service_preference === 'both' ? (es ? 'Ambos' : 'Both')
                                   : '—'
                                 } />
            <Row icon="repeat"  label={es ? 'Frecuencia' : 'Frequency'}
                                 value={
                                   clientData?.frequency === 'one_time' ? (es ? 'Una vez' : 'One time')
                                   : clientData?.frequency === 'weekly' ? (es ? 'Semanal' : 'Weekly')
                                   : clientData?.frequency === 'biweekly' ? (es ? 'Quincenal' : 'Biweekly')
                                   : clientData?.frequency === 'monthly' ? (es ? 'Mensual' : 'Monthly')
                                   : '—'
                                 } />
            <Row icon="globe"    label={es ? 'País' : 'Country'}
                                 value={country === 'usa' ? '🇺🇸 United States' : '🇨🇴 Colombia'} />
            <View style={{ borderBottomWidth: 0 }}>
              <Row icon="calendar" label={es ? 'Miembro desde' : 'Member since'}
                                   value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'} />
            </View>
          </View>
        )}

        {/* Language */}
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
            {es ? 'Idioma de la App' : 'App Language'}
          </Text>
          <LanguageToggle />
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              es ? '¿Cerrar sesión?' : 'Sign out?',
              es ? '¿Estás seguro de que deseas cerrar sesión?' : 'Are you sure you want to sign out?',
              [
                { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
                { text: es ? 'Cerrar Sesión' : 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); setTimeout(() => router.replace('/(auth)/welcome' as any), 100); } },
              ],
            );
          }}
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

      {/* ── Edit Modal — conditionally mounted so the overlay never blocks touches when hidden */}
      {editVisible && (
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.7)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: C.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 20,
            paddingBottom: 40,
            maxHeight: '92%',
            borderTopWidth: 1,
            borderTopColor: C.line,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 20 }}>
              <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
                {es ? 'Editar Perfil' : 'Edit Profile'}
              </Text>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="x" size={18} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              <Input
                label={es ? 'Nombre Completo' : 'Full Name'}
                value={editName}
                onChangeText={setEditName}
                iconName="user"
                placeholder={es ? 'Tu nombre' : 'Your name'}
              />
              <Input
                label={es ? 'Teléfono' : 'Phone'}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                iconName="phone"
                placeholder="(305) 555-0000"
              />
              <LocationSelector
                country={country}
                state={editState}
                city={editCity}
                onStateChange={(s) => { setEditState(s); setEditCity(''); }}
                onCityChange={(c) => setEditCity(c)}
                es={es}
              />
              <Input
                label={country === 'colombia' ? (es ? 'Código Postal' : 'Postal Code') : 'ZIP'}
                value={editZip}
                onChangeText={setEditZip}
                keyboardType={country === 'colombia' ? 'default' : 'number-pad'}
                iconName="hash"
                placeholder={country === 'colombia' ? '110111' : '33101'}
              />

              {/* Service preference chips */}
              <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 }}>
                {es ? 'Tipo de servicio' : 'Service preference'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['commercial', 'residential', 'both'] as const).map((opt) => {
                  const label = opt === 'commercial' ? (es ? 'Comercial' : 'Commercial') : opt === 'residential' ? (es ? 'Residencial' : 'Residential') : (es ? 'Ambos' : 'Both');
                  const active = editServicePref === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setEditServicePref(active ? null : opt)}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: active ? C.accent : C.line, backgroundColor: active ? `${C.accent}15` : C.surface2 }}
                      activeOpacity={0.75}
                    >
                      <Text style={{ color: active ? C.accent : C.textSecondary, fontSize: 12, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Frequency chips */}
              <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                {es ? 'Frecuencia' : 'Frequency'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {([
                  { val: 'one_time', en: 'One time', es: 'Una vez' },
                  { val: 'weekly',   en: 'Weekly',   es: 'Semanal' },
                  { val: 'biweekly', en: 'Biweekly', es: 'Quincenal' },
                  { val: 'monthly',  en: 'Monthly',  es: 'Mensual' },
                ] as { val: 'one_time' | 'weekly' | 'biweekly' | 'monthly'; en: string; es: string }[]).map(({ val, en, es: esLabel }) => {
                  const active = editFrequency === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setEditFrequency(active ? null : val)}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: active ? C.accent : C.line, backgroundColor: active ? `${C.accent}15` : C.surface2 }}
                      activeOpacity={0.75}
                    >
                      <Text style={{ color: active ? C.accent : C.textSecondary, fontSize: 12, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>{es ? esLabel : en}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => setEditVisible(false)}
                  style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_500Medium' }}>
                    {es ? 'Cancelar' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{ flex: 2, height: 52, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.6 : 1 }}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                      {es ? 'Guardar Cambios' : 'Save Changes'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      )}
    </View>
  );
}
