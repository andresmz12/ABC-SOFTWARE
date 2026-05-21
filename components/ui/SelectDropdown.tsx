import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  TextInput, SafeAreaView, TouchableWithoutFeedback,
} from 'react-native';

export interface DropdownOption {
  label: string;
  value: string;
}

interface Props {
  label?: string;
  placeholder?: string;
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  searchable?: boolean;
  disabled?: boolean;
}

export default function SelectDropdown({
  label, placeholder = 'Select...', options, value, onChange, error, searchable = false, disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!searchable || !query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const handleSelect = (opt: DropdownOption) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  return (
    <View className="mb-4">
      {label && <Text className="text-text-main font-body-medium text-sm mb-1">{label}</Text>}
      <TouchableOpacity
        onPress={() => !disabled && setOpen(true)}
        className={`flex-row items-center justify-between bg-white border rounded-xl px-4 h-12 ${error ? 'border-danger' : 'border-gray-200'} ${disabled ? 'opacity-50' : ''}`}
      >
        <Text className={`font-body text-base flex-1 ${selected ? 'text-text-main' : 'text-gray-400'}`} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text className="text-gray-400 text-xs ml-2">▼</Text>
      </TouchableOpacity>
      {error && <Text className="text-danger text-xs mt-1">{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => { setOpen(false); setQuery(''); }}>
          <View className="flex-1 bg-black/40 justify-end">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl max-h-[70%]">
                <View className="px-4 pt-4 pb-2 border-b border-gray-100">
                  <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-3" />
                  {label && <Text className="text-text-main font-body-bold text-base mb-2">{label}</Text>}
                  {searchable && (
                    <View className="flex-row items-center bg-gray-100 rounded-xl px-3 h-10 mb-1">
                      <Text className="text-gray-400 mr-2">🔍</Text>
                      <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search..."
                        placeholderTextColor="#9CA3AF"
                        className="flex-1 font-body text-sm text-text-main"
                        autoFocus
                      />
                    </View>
                  )}
                </View>
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => item.value}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleSelect(item)}
                      className={`px-4 py-3.5 border-b border-gray-50 flex-row items-center justify-between ${item.value === value ? 'bg-accent' : ''}`}
                    >
                      <Text className={`font-body text-base ${item.value === value ? 'text-primary font-body-bold' : 'text-text-main'}`}>
                        {item.label}
                      </Text>
                      {item.value === value && <Text className="text-primary">✓</Text>}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View className="py-8 items-center">
                      <Text className="text-text-muted font-body">No results found</Text>
                    </View>
                  }
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
