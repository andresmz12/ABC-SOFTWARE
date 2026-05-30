import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import { adminAssignJob } from '@/lib/jobService';

interface ClientOption {
  id: string;
  name: string;
  email: string;
}

interface ProviderOption {
  id: string;
  name: string;
  type: 'company' | 'independent';
  state: string;
  country: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function inputStyle(extra?: object) {
  return {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular' as const,
    ...extra,
  };
}

function ToggleGroup<T extends string>({
  options, value, onChange,
}: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
              backgroundColor: active ? C.accent2 : C.surface,
              borderWidth: 1, borderColor: active ? C.accent2 : C.line,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: active ? '#FFF' : C.textMuted, fontSize: 13, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AdminNewJobScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const es = lang === 'es';

  // Form state
  const [client, setClient] = useState<ClientOption | null>(null);
  const [serviceType, setServiceType] = useState<'commercial' | 'residential'>('commercial');
  const [country, setCountry] = useState<'usa' | 'colombia'>('usa');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [hours, setHours] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [description, setDescription] = useState('');

  // After-create optional assignment
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Client picker
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [allClients, setAllClients] = useState<ClientOption[]>([]);
  const [clientLoading, setClientLoading] = useState(false);

  // Provider picker (after job creation)
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const [allProviders, setAllProviders] = useState<ProviderOption[]>([]);
  const [providerLoading, setProviderLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  const openClientPicker = useCallback(async () => {
    setShowClientPicker(true);
    setClientSearch('');
    setClientLoading(true);
    try {
      const { data } = await supabase
        .from('clients')
        .select('user_id, full_name, email')
        .order('full_name', { ascending: true });
      setAllClients((data ?? []).map((c: any) => ({ id: c.user_id, name: c.full_name ?? '', email: c.email ?? '' })));
    } finally {
      setClientLoading(false);
    }
  }, []);

  const openProviderPicker = useCallback(async () => {
    setShowProviderPicker(true);
    setProviderSearch('');
    setSelectedProvider(null);
    setAssignError('');
    setProviderLoading(true);
    try {
      const [cRes, iRes] = await Promise.all([
        supabase.from('companies').select('user_id, company_name, country, state').eq('status', 'approved'),
        supabase.from('independents').select('user_id, full_name, country, state').eq('status', 'approved'),
      ]);
      const opts: ProviderOption[] = [
        ...(cRes.data ?? []).map((c: any) => ({ id: c.user_id, name: c.company_name, type: 'company' as const, country: c.country ?? 'usa', state: c.state ?? '' })),
        ...(iRes.data ?? []).map((i: any) => ({ id: i.user_id, name: i.full_name, type: 'independent' as const, country: i.country ?? 'usa', state: i.state ?? '' })),
      ];
      opts.sort((a, b) => a.name.localeCompare(b.name));
      setAllProviders(opts);
    } finally {
      setProviderLoading(false);
    }
  }, []);

  const handleCreate = async () => {
    setError('');
    if (!client) { setError(es ? 'Selecciona un cliente.' : 'Select a client.'); return; }
    if (!city.trim()) { setError(es ? 'Ciudad requerida.' : 'City is required.'); return; }
    if (!state.trim()) { setError(es ? 'Estado/Depto requerido.' : 'State is required.'); return; }
    if (!zip.trim()) { setError(es ? 'ZIP requerido.' : 'ZIP is required.'); return; }
    if (!date.trim()) { setError(es ? 'Fecha requerida (YYYY-MM-DD).' : 'Date required (YYYY-MM-DD).'); return; }
    if (!time.trim()) { setError(es ? 'Hora requerida (HH:MM).' : 'Time required (HH:MM).'); return; }
    if (!hours.trim() || isNaN(Number(hours))) { setError(es ? 'Horas estimadas requeridas.' : 'Estimated hours required.'); return; }

    setSaving(true);
    try {
      const isCop = country === 'colombia';
      const { data, error: insErr } = await supabase
        .from('job_requests')
        .insert({
          client_id:       client.id,
          service_type:    serviceType,
          country,
          city:            city.trim(),
          state:           state.trim(),
          zip:             zip.trim(),
          scheduled_date:  date.trim(),
          scheduled_time:  time.trim().length === 5 ? time.trim() + ':00' : time.trim(),
          estimated_hours: Number(hours),
          budget_usd:      !isCop && budgetMin ? Number(budgetMin) : null,
          budget_max_usd:  !isCop && budgetMax ? Number(budgetMax) : null,
          budget_cop:       isCop && budgetMin ? Number(budgetMin) : null,
          budget_max_cop:   isCop && budgetMax ? Number(budgetMax) : null,
          description:     description.trim() || null,
          status:          'open',
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      setCreatedJobId(data.id);
      setCreatedClientId(client.id);
    } catch (e: any) {
      console.error('[AdminNewJob] create error', e);
      setError(e.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedProvider || !createdJobId || !createdClientId) return;
    setAssignError('');
    setAssigning(true);
    try {
      await adminAssignJob(createdJobId, selectedProvider.id, selectedProvider.type, createdClientId, country);
      setShowProviderPicker(false);
      router.replace({ pathname: '/(admin)/job-detail', params: { jobId: createdJobId } } as any);
    } catch (e: any) {
      console.error('[AdminNewJob] assign error', e);
      setAssignError(e.message ?? 'Unknown error');
    } finally {
      setAssigning(false);
    }
  };

  const filteredClients = clientSearch.trim()
    ? allClients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.email.toLowerCase().includes(clientSearch.toLowerCase()))
    : allClients;

  const filteredProviders = providerSearch.trim()
    ? allProviders.filter((p) => p.name.toLowerCase().includes(providerSearch.toLowerCase()) || p.state.toLowerCase().includes(providerSearch.toLowerCase()))
    : allProviders;

  // ── Post-create screen ───────────────────────────────────────────────────────
  if (createdJobId) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 18, paddingBottom: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
            {es ? '¡Trabajo Creado!' : 'Job Created!'}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
            #{createdJobId.slice(0, 8).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${C.success}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Feather name="check-circle" size={36} color={C.success} />
          </View>
          <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 8 }}>
            {es ? 'Trabajo publicado como ABIERTO' : 'Job published as OPEN'}
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
            {es ? '¿Deseas asignar un proveedor ahora?' : 'Do you want to assign a provider now?'}
          </Text>
          <TouchableOpacity
            onPress={openProviderPicker}
            style={{ width: '100%', height: 52, borderRadius: 12, backgroundColor: C.accent2, alignItems: 'center', justifyContent: 'center', marginBottom: 12, flexDirection: 'row', gap: 8 }}
            activeOpacity={0.85}
          >
            <Feather name="user-plus" size={17} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'Asignar Proveedor' : 'Assign Provider'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace({ pathname: '/(admin)/job-detail', params: { jobId: createdJobId } } as any)}
            style={{ width: '100%', height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.85}
          >
            <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_500Medium' }}>
              {es ? 'Ver Detalle del Trabajo' : 'View Job Detail'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Provider picker modal */}
        <Modal visible={showProviderPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowProviderPicker(false)}>
          <View style={{ flex: 1, backgroundColor: C.background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 32, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <TouchableOpacity onPress={() => setShowProviderPicker(false)} style={{ marginRight: 12, width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={18} color={C.textPrimary} />
              </TouchableOpacity>
              <Text style={{ flex: 1, color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold' }}>
                {es ? 'Asignar Proveedor' : 'Assign Provider'}
              </Text>
            </View>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, height: 44 }}>
                <Feather name="search" size={15} color={C.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  value={providerSearch}
                  onChangeText={setProviderSearch}
                  placeholder={es ? 'Buscar por nombre o estado...' : 'Search by name or state...'}
                  placeholderTextColor={C.textMuted}
                  style={{ flex: 1, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular' }}
                />
              </View>
            </View>
            {providerLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={C.accent2} />
              </View>
            ) : (
              <FlatList
                data={filteredProviders}
                keyExtractor={(p) => p.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 160 }}
                renderItem={({ item }) => {
                  const isSelected = selectedProvider?.id === item.id;
                  return (
                    <TouchableOpacity
                      onPress={() => setSelectedProvider(isSelected ? null : item)}
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: isSelected ? `${C.accent2}10` : 'transparent' }}
                      activeOpacity={0.8}
                    >
                      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: isSelected ? `${C.accent2}20` : C.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Feather name={item.type === 'company' ? 'briefcase' : 'user'} size={17} color={isSelected ? C.accent2 : C.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>{item.name}</Text>
                        <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                          {item.type === 'company' ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}
                          {' · '}{item.country === 'colombia' ? '🇨🇴' : '🇺🇸'}{item.state ? ` ${item.state}` : ''}
                        </Text>
                      </View>
                      {isSelected
                        ? <Feather name="check-circle" size={20} color={C.accent2} />
                        : <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.line }} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            {selectedProvider && (
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line }}>
                {assignError ? (
                  <View style={{ backgroundColor: `${C.danger}15`, borderRadius: 10, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="alert-circle" size={14} color={C.danger} />
                    <Text style={{ color: C.danger, fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 }}>{assignError}</Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${C.accent2}10`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <Feather name={selectedProvider.type === 'company' ? 'briefcase' : 'user'} size={14} color={C.accent2} style={{ marginRight: 8 }} />
                  <Text style={{ color: C.accent2, fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 }} numberOfLines={1}>{selectedProvider.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedProvider(null)}>
                    <Feather name="x" size={14} color={C.accent2} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={handleAssign}
                  disabled={assigning}
                  style={{ height: 52, borderRadius: 12, backgroundColor: C.accent2, alignItems: 'center', justifyContent: 'center', opacity: assigning ? 0.7 : 1 }}
                  activeOpacity={0.85}
                >
                  {assigning ? <ActivityIndicator color="#FFF" /> : (
                    <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                      {es ? 'Confirmar Asignación' : 'Confirm Assignment'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      </View>
    );
  }

  // ── Creation form ────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 18, paddingBottom: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
          {es ? 'Nuevo Trabajo' : 'New Job'}
        </Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* Client */}
        <Field label={es ? 'Cliente *' : 'Client *'}>
          <TouchableOpacity
            onPress={openClientPicker}
            style={{ ...inputStyle(), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            activeOpacity={0.8}
          >
            <Text style={{ color: client ? C.textPrimary : C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 }} numberOfLines={1}>
              {client ? `${client.name}  ·  ${client.email}` : (es ? 'Seleccionar cliente...' : 'Select client...')}
            </Text>
            <Feather name="chevron-down" size={16} color={C.textMuted} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </Field>

        {/* Service type */}
        <Field label={es ? 'Tipo de Servicio *' : 'Service Type *'}>
          <ToggleGroup
            options={[
              { key: 'commercial',  label: es ? 'Comercial'   : 'Commercial' },
              { key: 'residential', label: es ? 'Residencial' : 'Residential' },
            ]}
            value={serviceType}
            onChange={setServiceType}
          />
        </Field>

        {/* Country */}
        <Field label={es ? 'País *' : 'Country *'}>
          <ToggleGroup
            options={[
              { key: 'usa',      label: '🇺🇸 USA' },
              { key: 'colombia', label: '🇨🇴 Colombia' },
            ]}
            value={country}
            onChange={setCountry}
          />
        </Field>

        {/* Location */}
        <Field label={es ? 'Ciudad *' : 'City *'}>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder={es ? 'Ej: Chicago' : 'E.g. Chicago'}
            placeholderTextColor={C.textMuted}
            style={inputStyle()}
          />
        </Field>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 2 }}>
            <Field label={country === 'colombia' ? (es ? 'Departamento *' : 'Department *') : (es ? 'Estado *' : 'State *')}>
              <TextInput
                value={state}
                onChangeText={setState}
                placeholder={country === 'colombia' ? 'Antioquia' : 'Illinois'}
                placeholderTextColor={C.textMuted}
                style={inputStyle()}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="ZIP *">
              <TextInput
                value={zip}
                onChangeText={setZip}
                placeholder="60601"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                style={inputStyle()}
              />
            </Field>
          </View>
        </View>

        {/* Date & Time */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 3 }}>
            <Field label={es ? 'Fecha * (YYYY-MM-DD)' : 'Date * (YYYY-MM-DD)'}>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="2026-08-15"
                placeholderTextColor={C.textMuted}
                style={inputStyle()}
              />
            </Field>
          </View>
          <View style={{ flex: 2 }}>
            <Field label={es ? 'Hora * (HH:MM)' : 'Time * (HH:MM)'}>
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="09:00"
                placeholderTextColor={C.textMuted}
                style={inputStyle()}
              />
            </Field>
          </View>
        </View>

        {/* Hours */}
        <Field label={es ? 'Horas Estimadas *' : 'Estimated Hours *'}>
          <TextInput
            value={hours}
            onChangeText={setHours}
            placeholder="4"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
            style={inputStyle()}
          />
        </Field>

        {/* Budget */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label={country === 'colombia' ? (es ? 'Presupuesto COP (min)' : 'Budget COP (min)') : (es ? 'Presupuesto USD (min)' : 'Budget USD (min)')}>
              <TextInput
                value={budgetMin}
                onChangeText={setBudgetMin}
                placeholder={country === 'colombia' ? '500000' : '120'}
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                style={inputStyle()}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label={es ? 'Máximo (opcional)' : 'Max (optional)'}>
              <TextInput
                value={budgetMax}
                onChangeText={setBudgetMax}
                placeholder={country === 'colombia' ? '800000' : '200'}
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                style={inputStyle()}
              />
            </Field>
          </View>
        </View>

        {/* Description */}
        <Field label={es ? 'Descripción (opcional)' : 'Description (optional)'}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={es ? 'Detalles adicionales del trabajo...' : 'Additional job details...'}
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={4}
            style={{ ...inputStyle(), minHeight: 90, textAlignVertical: 'top' }}
          />
        </Field>

        {/* Error */}
        {error ? (
          <View style={{ backgroundColor: `${C.danger}15`, borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="alert-circle" size={14} color={C.danger} />
            <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={saving}
          style={{ height: 54, borderRadius: 12, backgroundColor: C.accent2, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.7 : 1, flexDirection: 'row', gap: 8 }}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Feather name="plus-circle" size={18} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold' }}>
                {es ? 'Crear Trabajo' : 'Create Job'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Client picker modal */}
      <Modal visible={showClientPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowClientPicker(false)}>
        <View style={{ flex: 1, backgroundColor: C.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 32, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <TouchableOpacity onPress={() => setShowClientPicker(false)} style={{ marginRight: 12, width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={{ flex: 1, color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold' }}>
              {es ? 'Seleccionar Cliente' : 'Select Client'}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, height: 44 }}>
              <Feather name="search" size={15} color={C.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                value={clientSearch}
                onChangeText={setClientSearch}
                placeholder={es ? 'Buscar por nombre o email...' : 'Search by name or email...'}
                placeholderTextColor={C.textMuted}
                style={{ flex: 1, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular' }}
                autoFocus
              />
            </View>
          </View>
          {clientLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={C.accent2} />
            </View>
          ) : (
            <FlatList
              data={filteredClients}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setClient(item); setShowClientPicker(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.line }}
                  activeOpacity={0.8}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${C.accent2}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ color: C.accent2, fontSize: 16, fontFamily: 'Inter_700Bold' }}>
                      {(item.name || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>{item.name || '—'}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>{item.email}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={C.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <Feather name="users" size={32} color={C.textMuted} />
                  <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 12 }}>
                    {es ? 'Sin clientes registrados' : 'No clients found'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
