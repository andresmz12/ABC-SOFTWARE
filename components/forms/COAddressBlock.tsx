import { useMemo } from 'react';
import { View, Text } from 'react-native';
import Input from '@/components/ui/Input';
import SelectDropdown from '@/components/ui/SelectDropdown';
import { CO_DEPARTMENTS, CO_MUNICIPALITIES, CO_VIA_TYPES, buildCOAddressPreview } from '@/lib/countryData';

export interface COAddressValue {
  viaType: string;
  numeroPrincipal: string;
  numeroSecundario: string;
  complemento?: string;
  barrio: string;
  ciudad: string;
  departamento: string;
}

interface Props {
  values: COAddressValue;
  onChange: (v: COAddressValue) => void;
  errors?: Partial<Record<keyof COAddressValue, string>>;
}

const deptOptions = CO_DEPARTMENTS.map((d) => ({ label: d.name, value: d.code }));
const viaOptions = CO_VIA_TYPES.map((v) => ({ label: v, value: v }));

export default function COAddressBlock({ values, onChange, errors }: Props) {
  const set = (field: keyof COAddressValue) => (val: string) =>
    onChange({ ...values, [field]: val });

  const municipioOptions = useMemo(() => {
    const list = CO_MUNICIPALITIES[values.departamento] ?? [];
    return list.map((m) => ({ label: m, value: m }));
  }, [values.departamento]);

  const preview = buildCOAddressPreview(
    values.viaType, values.numeroPrincipal, values.numeroSecundario,
    values.complemento ?? '', values.barrio, values.ciudad,
    CO_DEPARTMENTS.find((d) => d.code === values.departamento)?.name ?? values.departamento,
  );

  const handleDeptChange = (code: string) =>
    onChange({ ...values, departamento: code, ciudad: '' });

  return (
    <View>
      <SelectDropdown
        label="Tipo de vía"
        options={viaOptions}
        value={values.viaType}
        onChange={set('viaType')}
        placeholder="Ej: Calle, Carrera..."
        error={errors?.viaType}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Número principal"
            placeholder="Ej: 45"
            value={values.numeroPrincipal}
            onChangeText={set('numeroPrincipal')}
            keyboardType="default"
            error={errors?.numeroPrincipal}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Número secundario"
            placeholder="Ej: 23-10"
            value={values.numeroSecundario}
            onChangeText={set('numeroSecundario')}
            error={errors?.numeroSecundario}
          />
        </View>
      </View>
      <Input
        label="Complemento (opcional)"
        placeholder="Apto 301, Torre B, Casa 2..."
        value={values.complemento ?? ''}
        onChangeText={set('complemento')}
        error={errors?.complemento}
      />
      <Input
        label="Barrio"
        placeholder="Ej: El Poblado"
        value={values.barrio}
        onChangeText={set('barrio')}
        error={errors?.barrio}
      />
      <SelectDropdown
        label="Departamento"
        options={deptOptions}
        value={values.departamento}
        onChange={handleDeptChange}
        placeholder="Seleccionar departamento..."
        searchable
        error={errors?.departamento}
      />
      <SelectDropdown
        label="Ciudad / Municipio"
        options={municipioOptions}
        value={values.ciudad}
        onChange={set('ciudad')}
        placeholder={values.departamento ? 'Seleccionar municipio...' : 'Primero selecciona departamento'}
        searchable
        disabled={!values.departamento}
        error={errors?.ciudad}
      />

      {preview.length > 0 && (
        <View className="bg-accent rounded-xl p-3 mb-4">
          <Text className="text-xs text-text-muted font-body mb-1">Vista previa de la dirección</Text>
          <Text className="text-sm text-text-main font-body-medium">{preview}</Text>
        </View>
      )}
    </View>
  );
}
