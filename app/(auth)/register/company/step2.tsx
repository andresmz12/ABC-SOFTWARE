import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import SelectDropdown from '@/components/ui/SelectDropdown';
import { useRegistrationStore } from '@/store/registrationStore';
import { US_STATES, CO_DEPARTMENTS, US_CITIES_BY_STATE, CO_MUNICIPALITIES } from '@/lib/countryData';

const SERVICE_TYPES = ['commercial', 'residential', 'both'] as const;

export default function CompanyStep2() {
  const router = useRouter();
  const { t } = useTranslation();
  const { country, mergeFormData } = useRegistrationStore();
  const isUSA = country !== 'colombia';

  const [serviceType, setServiceType] = useState<string>('both');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  const regionOptions = useMemo(() =>
    isUSA
      ? US_STATES.map((s) => ({ label: s.name, value: s.code }))
      : CO_DEPARTMENTS.map((d) => ({ label: d.name, value: d.code })),
    [isUSA],
  );

  const subOptions = useMemo(() => {
    if (!selectedRegion) return [];
    if (isUSA) {
      const cities = US_CITIES_BY_STATE[selectedRegion] ?? [];
      return cities.map((c) => ({ label: c, value: c }));
    }
    const munis = CO_MUNICIPALITIES[selectedRegion] ?? [];
    return munis.map((m) => ({ label: m, value: m }));
  }, [selectedRegion, isUSA]);

  const toggleArea = (area: string) =>
    setSelectedAreas((p) => p.includes(area) ? p.filter((x) => x !== area) : [...p, area]);

  const toggleCity = (city: string) =>
    setSelectedCities((p) => p.includes(city) ? p.filter((x) => x !== city) : [...p, city]);

  const addRegion = () => {
    if (!selectedRegion || selectedAreas.includes(selectedRegion)) return;
    setSelectedAreas((p) => [...p, selectedRegion]);
    setSelectedCities([]);
    setSelectedRegion('');
  };

  const serviceTypeLabels: Record<string, string> = {
    commercial: isUSA ? 'Commercial' : 'Comercial',
    residential: isUSA ? 'Residential' : 'Residencial',
    both: isUSA ? 'Both' : 'Ambos',
  };

  const onNext = () => {
    if (selectedAreas.length === 0) return;
    mergeFormData({ serviceType, serviceAreas: selectedAreas });
    router.push('/(auth)/register/company/step3' as any);
  };

  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>
      <StepProgressBar current={2} total={4} />
      <Text className="text-primary text-2xl font-heading mb-6">
        {isUSA ? 'Service Details' : 'Detalles del Servicio'}
      </Text>

      <Text className="text-text-main font-body-medium mb-3">
        {isUSA ? 'Service Type' : 'Tipo de Servicio'}
      </Text>
      <View className="flex-row gap-2 mb-6">
        {SERVICE_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setServiceType(type)}
            className={`flex-1 border rounded-xl py-3 items-center ${serviceType === type ? 'bg-primary border-primary' : 'border-gray-200'}`}
          >
            <Text className={`text-sm font-body-medium ${serviceType === type ? 'text-white' : 'text-text-main'}`}>
              {serviceTypeLabels[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-text-main font-body-medium mb-3">
        {isUSA ? 'Service Areas' : 'Áreas de Servicio'}
      </Text>
      <Text className="text-text-muted text-xs mb-3 font-body">
        {isUSA
          ? 'Select the states where you offer services.'
          : 'Selecciona los departamentos donde ofreces servicios.'}
      </Text>

      <SelectDropdown
        label={isUSA ? 'Add State' : 'Agregar Departamento'}
        options={regionOptions}
        value={selectedRegion}
        onChange={setSelectedRegion}
        placeholder={isUSA ? 'Select state...' : 'Seleccionar departamento...'}
        searchable
      />

      {subOptions.length > 0 && (
        <>
          <Text className="text-text-main font-body-medium mb-2 text-sm">
            {isUSA ? 'Select cities (optional)' : 'Seleccionar municipios (opcional)'}
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {subOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => toggleCity(opt.value)}
                className={`border rounded-lg px-3 py-2 ${selectedCities.includes(opt.value) ? 'bg-primary border-primary' : 'border-gray-300'}`}
              >
                <Text className={`text-xs ${selectedCities.includes(opt.value) ? 'text-white font-body-medium' : 'text-text-muted'}`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {selectedRegion ? (
        <TouchableOpacity
          onPress={addRegion}
          className="border border-dashed border-primary rounded-xl py-2.5 items-center mb-5"
        >
          <Text className="text-primary font-body-medium text-sm">
            {isUSA ? `+ Add ${US_STATES.find((s) => s.code === selectedRegion)?.name ?? selectedRegion}` : `+ Agregar ${CO_DEPARTMENTS.find((d) => d.code === selectedRegion)?.name ?? selectedRegion}`}
          </Text>
        </TouchableOpacity>
      ) : null}

      {selectedAreas.length > 0 && (
        <View className="bg-accent rounded-xl p-3 mb-5">
          <Text className="text-text-main font-body-medium text-sm mb-2">
            {isUSA ? 'Selected areas:' : 'Áreas seleccionadas:'}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {selectedAreas.map((area) => {
              const name = isUSA
                ? US_STATES.find((s) => s.code === area)?.name ?? area
                : CO_DEPARTMENTS.find((d) => d.code === area)?.name ?? area;
              return (
                <TouchableOpacity
                  key={area}
                  onPress={() => toggleArea(area)}
                  className="bg-primary rounded-full px-3 py-1 flex-row items-center"
                >
                  <Text className="text-white text-xs font-body-medium mr-1">{name}</Text>
                  <Text className="text-white text-xs">✕</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <Button
        label={t('common.next')}
        onPress={onNext}
        disabled={selectedAreas.length === 0}
        className="mb-8"
      />
    </ScreenWrapper>
  );
}
