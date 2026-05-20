import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import SelectDropdown from '@/components/ui/SelectDropdown';
import PhoneInput from '@/components/ui/PhoneInput';
import USAddressBlock, { USAddressValue } from '@/components/forms/USAddressBlock';
import COAddressBlock, { COAddressValue } from '@/components/forms/COAddressBlock';
import { useRegistrationStore } from '@/store/registrationStore';
import {
  US_BUSINESS_TYPES, CO_BUSINESS_TYPES,
  formatEIN, formatNIT,
} from '@/lib/countryData';

const US_BIZ_OPTIONS = US_BUSINESS_TYPES.map((b) => ({ label: b, value: b }));
const CO_BIZ_OPTIONS = CO_BUSINESS_TYPES.map((b) => ({ label: b, value: b }));

const EMPTY_US_ADDR: USAddressValue = { street: '', city: '', state: '', zip: '', county: '' };
const EMPTY_CO_ADDR: COAddressValue = { viaType: '', numeroPrincipal: '', numeroSecundario: '', complemento: '', barrio: '', ciudad: '', departamento: '' };

export default function CompanyStep1() {
  const router = useRouter();
  const { t } = useTranslation();
  const { country, mergeFormData } = useRegistrationStore();
  const isUSA = country !== 'colombia';

  const [companyName, setCompanyName] = useState('');
  const [dba, setDba] = useState('');
  const [taxId, setTaxId] = useState('');
  const [bizType, setBizType] = useState('');
  const [yearEstablished, setYearEstablished] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [usAddr, setUsAddr] = useState<USAddressValue>(EMPTY_US_ADDR);
  const [coAddr, setCoAddr] = useState<COAddressValue>(EMPTY_CO_ADDR);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTaxIdChange = (raw: string) => {
    setTaxId(isUSA ? formatEIN(raw) : formatNIT(raw));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!companyName.trim()) e.companyName = t('errors.required');
    if (!taxId.trim()) e.taxId = t('errors.required');
    if (!bizType) e.bizType = t('errors.required');
    if (!email.trim()) e.email = t('errors.required');
    if (!password || password.length < 8) e.password = t('auth.passwordTooShort');
    if (!phone.trim()) e.phone = t('errors.required');
    if (isUSA) {
      if (!usAddr.street.trim()) e.street = t('errors.required');
      if (!usAddr.city.trim()) e.city = t('errors.required');
      if (!usAddr.state) e.state = t('errors.required');
      if (!usAddr.zip.trim() || !/^\d{5}$/.test(usAddr.zip)) e.zip = t('errors.invalidZip');
    } else {
      if (!coAddr.viaType) e.viaType = t('errors.required');
      if (!coAddr.numeroPrincipal.trim()) e.numeroPrincipal = t('errors.required');
      if (!coAddr.barrio.trim()) e.barrio = t('errors.required');
      if (!coAddr.departamento) e.departamento = t('errors.required');
      if (!coAddr.ciudad) e.ciudad = t('errors.required');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onNext = () => {
    if (!validate()) return;
    mergeFormData({
      companyName, dba, taxId, bizType, yearEstablished,
      email, password, phone, website,
      address: isUSA ? usAddr : coAddr,
      country,
    });
    router.push('/(auth)/register/company/step2' as any);
  };

  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>
      <StepProgressBar current={1} total={4} />
      <Text className="text-primary text-2xl font-heading mb-6">
        {isUSA ? 'Business Information' : 'Información Empresarial'}
      </Text>

      <Input
        label={isUSA ? 'Company Legal Name' : 'Nombre o Razón Social'}
        value={companyName}
        onChangeText={setCompanyName}
        error={errors.companyName}
      />
      <Input
        label={isUSA ? 'DBA / Trade Name (optional)' : 'Nombre Comercial (opcional)'}
        value={dba}
        onChangeText={setDba}
      />
      <Input
        label={isUSA ? 'EIN (Employer Identification Number)' : 'NIT (Número de Identificación Tributaria)'}
        placeholder={isUSA ? 'XX-XXXXXXX' : 'XXX.XXX.XXX-X'}
        value={taxId}
        onChangeText={handleTaxIdChange}
        keyboardType="number-pad"
        error={errors.taxId}
      />
      {isUSA && (
        <Text className="text-text-muted text-xs -mt-3 mb-4">Format: XX-XXXXXXX</Text>
      )}
      {!isUSA && (
        <Text className="text-text-muted text-xs -mt-3 mb-4">Formato: XXX.XXX.XXX-X (con dígito de verificación)</Text>
      )}

      <SelectDropdown
        label={isUSA ? 'Business Type' : 'Tipo de Sociedad'}
        options={isUSA ? US_BIZ_OPTIONS : CO_BIZ_OPTIONS}
        value={bizType}
        onChange={setBizType}
        placeholder={isUSA ? 'Select business type...' : 'Seleccionar tipo...'}
        error={errors.bizType}
      />

      <Input
        label={isUSA ? 'Year Established' : 'Año de Constitución'}
        placeholder={isUSA ? 'e.g. 2018' : 'Ej: 2018'}
        value={yearEstablished}
        onChangeText={setYearEstablished}
        keyboardType="number-pad"
      />

      <Input
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />
      <Input
        label={isUSA ? t('auth.password') : 'Contraseña'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={errors.password}
      />

      <PhoneInput
        label={isUSA ? 'Phone Number' : 'Teléfono'}
        country={country ?? 'usa'}
        value={phone}
        onChange={setPhone}
        error={errors.phone}
      />

      <Input
        label={isUSA ? 'Website (optional)' : 'Sitio web (opcional)'}
        placeholder={isUSA ? 'https://example.com' : 'https://ejemplo.com'}
        value={website}
        onChangeText={setWebsite}
        keyboardType="url"
        autoCapitalize="none"
      />

      <Text className="text-text-main font-body-bold text-base mb-3 mt-2">
        {isUSA ? 'Business Address' : 'Dirección de la Empresa'}
      </Text>

      {isUSA ? (
        <USAddressBlock
          values={usAddr}
          onChange={setUsAddr}
          errors={{
            street: errors.street, city: errors.city,
            state: errors.state, zip: errors.zip,
          }}
        />
      ) : (
        <COAddressBlock
          values={coAddr}
          onChange={setCoAddr}
          errors={{
            viaType: errors.viaType, numeroPrincipal: errors.numeroPrincipal,
            barrio: errors.barrio, departamento: errors.departamento, ciudad: errors.ciudad,
          }}
        />
      )}

      <Button label={t('common.next')} onPress={onNext} className="mb-8" />
    </ScreenWrapper>
  );
}
