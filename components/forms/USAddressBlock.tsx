import { View, Text } from 'react-native';
import Input from '@/components/ui/Input';
import SelectDropdown from '@/components/ui/SelectDropdown';
import { US_STATES } from '@/lib/countryData';

export interface USAddressValue {
  street: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
}

interface Props {
  values: USAddressValue;
  onChange: (v: USAddressValue) => void;
  errors?: Partial<Record<keyof USAddressValue, string>>;
}

const stateOptions = US_STATES.map((s) => ({ label: s.name, value: s.code }));

export default function USAddressBlock({ values, onChange, errors }: Props) {
  const set = (field: keyof USAddressValue) => (val: string) =>
    onChange({ ...values, [field]: val });

  return (
    <View>
      <Input
        label="Street Address"
        placeholder="123 Main St, Apt 4B"
        value={values.street}
        onChangeText={set('street')}
        error={errors?.street}
      />
      <Input
        label="City"
        value={values.city}
        onChangeText={set('city')}
        error={errors?.city}
      />
      <SelectDropdown
        label="State"
        options={stateOptions}
        value={values.state}
        onChange={set('state')}
        placeholder="Select state..."
        searchable
        error={errors?.state}
      />
      <Input
        label="ZIP Code"
        placeholder="12345"
        value={values.zip}
        onChangeText={set('zip')}
        keyboardType="number-pad"
        error={errors?.zip}
      />
      <Input
        label="County (optional)"
        placeholder="e.g. Orange County"
        value={values.county ?? ''}
        onChangeText={set('county')}
        error={errors?.county}
      />
    </View>
  );
}
