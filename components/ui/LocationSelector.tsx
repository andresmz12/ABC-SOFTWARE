import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';
import { getLocations } from '@/lib/locations';

interface PickerModalProps {
  visible: boolean;
  title: string;
  items: string[];
  onSelect: (item: string) => void;
  onClose: () => void;
  es: boolean;
}

function PickerModal({ visible, title, items, onSelect, onClose, es }: PickerModalProps) {
  const [search, setSearch] = useState('');
  const filtered = items.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase()),
  );

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 }}>
            <Text style={{ color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>{title}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.line }}>
              <Feather name="search" size={14} color={C.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={es ? 'Buscar...' : 'Search...'}
                placeholderTextColor={C.textMuted}
                style={{ flex: 1, color: C.textPrimary, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter_400Regular' }}
              />
            </View>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 48 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { onSelect(item); handleClose(); }}
                style={{ paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.line }}
                activeOpacity={0.7}
              >
                <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular' }}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' }}>
                  {es ? 'Sin resultados' : 'No results'}
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

interface LocationSelectorProps {
  country: 'usa' | 'colombia';
  state: string;
  city: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  stateError?: string;
  cityError?: string;
  es: boolean;
}

export default function LocationSelector({
  country, state, city, onStateChange, onCityChange, stateError, cityError, es,
}: LocationSelectorProps) {
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const locations = getLocations(country);
  const states = Object.keys(locations).sort();
  const cities = state ? (locations[state] ?? []) : [];

  const stateLabel = country === 'colombia'
    ? (es ? 'Departamento' : 'Department')
    : (es ? 'Estado' : 'State');
  const cityLabel = country === 'colombia'
    ? (es ? 'Ciudad/Municipio' : 'City/Municipality')
    : (es ? 'Ciudad' : 'City');

  return (
    <View>
      {/* State selector */}
      <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        {stateLabel}
      </Text>
      <TouchableOpacity
        onPress={() => setShowStatePicker(true)}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
          borderWidth: 1.5, borderColor: stateError ? C.danger : C.line, marginBottom: 4,
        }}
      >
        <Text style={{ color: state ? C.textPrimary : C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 }}>
          {state || (es ? `Selecciona ${stateLabel.toLowerCase()}` : `Select ${stateLabel.toLowerCase()}`)}
        </Text>
        <Feather name="chevron-down" size={16} color={C.textMuted} />
      </TouchableOpacity>
      {stateError ? (
        <Text style={{ color: C.danger, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 12, marginLeft: 4 }}>{stateError}</Text>
      ) : <View style={{ marginBottom: 16 }} />}

      {/* City selector */}
      <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        {cityLabel}
      </Text>
      <TouchableOpacity
        onPress={() => state && setShowCityPicker(true)}
        activeOpacity={state ? 0.85 : 1}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
          borderWidth: 1.5, borderColor: cityError ? C.danger : C.line, marginBottom: 4,
          opacity: state ? 1 : 0.5,
        }}
      >
        <Text style={{ color: city ? C.textPrimary : C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 }}>
          {city ||
            (!state
              ? (es ? `Selecciona ${stateLabel.toLowerCase()} primero` : `Select ${stateLabel.toLowerCase()} first`)
              : (es ? `Selecciona ${cityLabel.toLowerCase()}` : `Select ${cityLabel.toLowerCase()}`))}
        </Text>
        <Feather name="chevron-down" size={16} color={C.textMuted} />
      </TouchableOpacity>
      {cityError ? (
        <Text style={{ color: C.danger, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 12, marginLeft: 4 }}>{cityError}</Text>
      ) : <View style={{ marginBottom: 16 }} />}

      <PickerModal
        visible={showStatePicker}
        title={stateLabel}
        items={states}
        onSelect={(s) => { onStateChange(s); onCityChange(''); setShowStatePicker(false); }}
        onClose={() => setShowStatePicker(false)}
        es={es}
      />
      <PickerModal
        visible={showCityPicker}
        title={cityLabel}
        items={cities}
        onSelect={(c) => { onCityChange(c); setShowCityPicker(false); }}
        onClose={() => setShowCityPicker(false)}
        es={es}
      />
    </View>
  );
}
