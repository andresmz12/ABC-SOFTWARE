import { View, Text, TouchableOpacity, Switch, Alert, ActivityIndicator, ScrollView, Modal, FlatList, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import LanguageToggle from '@/components/ui/LanguageToggle';
import LocationSelector from '@/components/ui/LocationSelector';
import Input from '@/components/ui/Input';
import { getStateList } from '@/lib/locations';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

interface ProviderData {
  name: string;       // company_name or full_name
  phone: string;
  city: string;
  state: string;
  zip: string;
  service_type?: string;
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ width: 32, height: 32, backgroundColor: C.surface2, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Feather name={icon} size={14} color={C.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProviderProfile() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const es = lang === 'es';
  const isPending = user?.status === 'pending';
  const country = (user?.country ?? 'usa') as 'usa' | 'colombia';

  const [available, setAvailable] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [providerData, setProviderData] = useState<ProviderData | null>(null);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [savingArea, setSavingArea] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editState, setEditState] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editZip, setEditZip] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    if (!user?.id) return;
    setLoadingProfile(true);
    try {
      const table = user.role === 'company' ? 'companies' : 'independents';
      const nameField = user.role === 'company' ? 'company_name' : 'full_name';

      const [availRes, areasRes, profileRes] = await Promise.all([
        supabase.from('users').select('available').eq('id', user.id).single(),
        supabase.from('service_areas').select('state, city').eq('provider_id', user.id),
        supabase.from(table).select(`${nameField}, phone, city, state, zip, service_type`).eq('user_id', user.id).single(),
      ]);

      if (availRes.data && typeof availRes.data.available === 'boolean') {
        setAvailable(availRes.data.available);
      }
      if (areasRes.data) {
        setServiceAreas(areasRes.data.map((a: any) => a.state as string).filter(Boolean));
      }
      if (profileRes.data) {
        const d = profileRes.data as any;
        setProviderData({
          name: d.company_name ?? d.full_name ?? '',
          phone: d.phone ?? '',
          city: d.city ?? '',
          state: d.state ?? '',
          zip: d.zip ?? '',
          service_type: d.service_type ?? '',
        });
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadProfile();
  }, [user?.id]);

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
      const isColumnMissing =
        typeof e?.message === 'string' &&
        (e.message.includes('available') || e.message.includes('column'));
      Alert.alert(
        'Error',
        isColumnMissing
          ? (es
              ? 'Columna faltante en la base de datos. Ejecuta la migración SQL 004 en Supabase primero.'
              : 'Missing database column. Run SQL migration 004 in Supabase first.')
          : (e.message ?? (es ? 'Error al actualizar disponibilidad.' : 'Failed to update availability.')),
      );
    } finally {
      setTogglingAvailability(false);
    }
  };

  const removeArea = async (stateCode: string) => {
    setServiceAreas((prev) => prev.filter((s) => s !== stateCode));
    const { error } = await supabase
      .from('service_areas')
      .delete()
      .eq('provider_id', user!.id)
      .eq('state', stateCode);
    if (error) {
      Alert.alert('Error', error.message);
      loadProfile();
    }
  };

  const addArea = async (stateCode: string) => {
    setShowAreaPicker(false);
    setAreaSearch('');
    if (serviceAreas.includes(stateCode)) return;
    setSavingArea(true);
    setServiceAreas((prev) => [...prev, stateCode]);
    const { error } = await supabase
      .from('service_areas')
      .insert({
        provider_id: user!.id,
        provider_type: user!.role,
        state: stateCode,
      });
    setSavingArea(false);
    if (error) {
      Alert.alert('Error', error.message);
      loadProfile();
    }
  };

  const openEdit = () => {
    setEditName(providerData?.name ?? '');
    setEditPhone(providerData?.phone ?? '');
    setEditState(providerData?.state ?? '');
    setEditCity(providerData?.city ?? '');
    setEditZip(providerData?.zip ?? '');
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
    if (!editCity) {
      Alert.alert(
        es ? 'Campo requerido' : 'Required field',
        es ? 'Por favor selecciona una ciudad.' : 'Please select a city.',
      );
      return;
    }
    setSaving(true);
    try {
      const table = user!.role === 'company' ? 'companies' : 'independents';
      const nameField = user!.role === 'company' ? 'company_name' : 'full_name';
      const { error } = await supabase
        .from(table)
        .update({
          [nameField]: editName.trim(),
          phone: editPhone.trim(),
          city: editCity,
          state: editState,
          zip: editZip.trim(),
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

  const displayName = providerData?.name || user?.email || '';
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
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 12 }}>
          <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold' }}>
            {es ? 'Mi Perfil' : 'My Profile'}
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
                  {displayName || (es ? 'Sin nombre' : 'No name')}
                </Text>
                <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                  {user?.role === 'company'
                    ? (es ? 'Empresa' : 'Company')
                    : (es ? 'Independiente' : 'Independent')}
                  {' · '}
                  {country === 'colombia' ? 'Colombia' : 'USA'}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                  {user?.email}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Pending banner */}
        {isPending && (
          <View style={{
            marginBottom: 16,
            backgroundColor: '#2a1e0a',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: C.warning,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Feather name="clock" size={14} color={C.warning} style={{ marginRight: 6 }} />
              <Text style={{ color: C.warning, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Pendiente de Aprobación' : 'Pending Approval'}
              </Text>
            </View>
            <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
              {es
                ? 'Tu cuenta está siendo revisada. Recibirás una notificación cuando sea aprobada.'
                : "Your account is under review. You'll be notified when approved."}
            </Text>
          </View>
        )}

        {/* Contact info */}
        {!loadingProfile && providerData && (
          <View style={{
            backgroundColor: C.surface,
            borderRadius: 16,
            paddingHorizontal: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: C.line,
          }}>
            <InfoRow icon="phone"   label={es ? 'Teléfono' : 'Phone'}
                                    value={providerData.phone || '—'} />
            <InfoRow icon="map-pin" label={es ? 'Ciudad / Depto.' : 'City / State'}
                                    value={providerData.city ? `${providerData.city}${providerData.state ? ', ' + providerData.state : ''}` : '—'} />
            <InfoRow icon="hash"    label={country === 'colombia' ? (es ? 'Código Postal' : 'Postal Code') : 'ZIP'}
                                    value={providerData.zip || '—'} />
            <View style={{ borderBottomWidth: 0 }}>
              <InfoRow
                icon="briefcase"
                label={es ? 'Tipo de servicio' : 'Service type'}
                value={
                  providerData.service_type === 'commercial'
                    ? (es ? 'Comercial' : 'Commercial')
                    : providerData.service_type === 'residential'
                    ? (es ? 'Residencial' : 'Residential')
                    : providerData.service_type === 'both'
                    ? (es ? 'Ambos' : 'Both')
                    : '—'
                }
              />
            </View>
          </View>
        )}

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
          opacity: isPending ? 0.5 : 1,
        }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'Disponible para trabajos' : 'Available for jobs'}
            </Text>
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3 }}>
              {available
                ? (es ? 'Apareces en los resultados' : 'You appear in search results')
                : (es ? 'Oculto para nuevas solicitudes' : 'Hidden from new requests')}
            </Text>
          </View>
          {togglingAvailability ? (
            <ActivityIndicator color={C.accent} size="small" />
          ) : (
            <Switch
              value={available}
              onValueChange={handleAvailabilityToggle}
              disabled={isPending}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'Áreas de Servicio' : 'Service Areas'}
            </Text>
            {!isPending && (
              <TouchableOpacity
                onPress={() => setShowAreaPicker(true)}
                disabled={savingArea}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${C.accent}15`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.accent }}
                activeOpacity={0.75}
              >
                {savingArea ? (
                  <ActivityIndicator size="small" color={C.accent} />
                ) : (
                  <>
                    <Feather name="plus" size={13} color={C.accent} style={{ marginRight: 4 }} />
                    <Text style={{ color: C.accent, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                      {es ? 'Agregar' : 'Add'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          {loadingProfile ? (
            <ActivityIndicator color={C.accent} size="small" />
          ) : serviceAreas.length === 0 ? (
            <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
              {es ? 'Sin áreas configuradas' : 'No service areas configured'}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {serviceAreas.map((area) => (
                <View key={area} style={{
                  backgroundColor: C.surface2,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: C.line,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Feather name="map-pin" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
                  <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', marginRight: 6 }}>{area}</Text>
                  {!isPending && (
                    <TouchableOpacity onPress={() => removeArea(area)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Feather name="x" size={12} color={C.textMuted} />
                    </TouchableOpacity>
                  )}
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
                { text: es ? 'Cerrar Sesión' : 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/welcome' as any); } },
              ],
            );
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
            {es ? 'Cerrar Sesión' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Area Picker Modal */}
      {showAreaPicker && (
        <Modal visible={true} animationType="slide" transparent onRequestClose={() => { setShowAreaPicker(false); setAreaSearch(''); }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: C.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 }}>
                <Text style={{ color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Agregar Área de Servicio' : 'Add Service Area'}
                </Text>
                <TouchableOpacity onPress={() => { setShowAreaPicker(false); setAreaSearch(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={20} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.line }}>
                  <Feather name="search" size={14} color={C.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    value={areaSearch}
                    onChangeText={setAreaSearch}
                    placeholder={es ? 'Buscar estado/departamento...' : 'Search state/department...'}
                    placeholderTextColor={C.textMuted}
                    style={{ flex: 1, color: C.textPrimary, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter_400Regular' }}
                  />
                </View>
              </View>
              <FlatList
                data={getStateList(country).filter((s) =>
                  s.toLowerCase().includes(areaSearch.toLowerCase()) && !serviceAreas.includes(s)
                )}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 48 }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' }}>
                      {es ? 'Sin resultados' : 'No results'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => addArea(item)}
                    style={{ paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.line }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* ── Edit Modal — conditionally mounted so the overlay never blocks touches when hidden */}
      {editVisible && (
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
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
                label={user?.role === 'company' ? (es ? 'Nombre de la Empresa' : 'Company Name') : (es ? 'Nombre Completo' : 'Full Name')}
                value={editName}
                onChangeText={setEditName}
                iconName={user?.role === 'company' ? 'briefcase' : 'user'}
                placeholder={user?.role === 'company' ? (es ? 'Tu empresa' : 'Your company') : (es ? 'Tu nombre' : 'Your name')}
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
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={{ color: '#000', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
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
