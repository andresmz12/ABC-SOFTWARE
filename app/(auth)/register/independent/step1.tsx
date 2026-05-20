import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import PhoneInput from '@/components/ui/PhoneInput';
import USAddressBlock, { USAddressValue } from '@/components/forms/USAddressBlock';
import COAddressBlock, { COAddressValue } from '@/components/forms/COAddressBlock';
import { useRegistrationStore } from '@/store/registrationStore';

const EMPTY_US_ADDR: USAddressValue = { street: '', city: '', state: '', zip: '', county: '' };
const EMPTY_CO_ADDR: COAddressValue = { viaType: '', numeroPrincipal: '', numeroSecundario: '', complemento: '', barrio: '', ciudad: '', departamento: '' };

export default function IndependentStep1() {
  const router = useRouter();
  const { t } = useTranslation();
  const { country, mergeFormData } = useRegistrationStore();
  const isUSA = country !== 'colombia';

  const [fullName, setFullName] = useState('');
  const [cedula, setCedula] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [usAddr, setUsAddr] = useState<USAddressValue>(EMPTY_US_ADDR);
  const [coAddr, setCoAddr] = useState<COAddressValue>(EMPTY_CO_ADDR);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCedulaChange = (raw: string) => {
    setCedula(raw.replace(/\D/g, '').slice(0, 10));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = t('errors.required');
    if (!isUSA && !cedula.trim()) e.cedula = t('errors.required');
    if (!dateOfBirth.trim()) e.dateOfBirth = t('errors.required');
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
      fullName, cedula, dateOfBirth, email, password, phone,
      emergencyName, emergencyPhone,
      address: isUSA ? usAddr : coAddr,
      country,
    });
    router.push('/(auth)/register/independent/step2' as any);
  };

  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity onPress={() => router.back()} className="pt-6 pb-4">
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>
      <StepProgressBar current={1} total={4} />
      <Text className="text-primary text-2xl font-heading mb-6">
        {isUSA ? 'Personal Information' : 'Información Personal'}
      </Text>

      <Input
        label={isUSA ? 'Full Legal Name' : 'Nombre Completo'}
        value={fullName}
        onChangeText={setFullName}
        error={errors.fullName}
      />

      {!isUSA && (
        <Input
          label="Número de Cédula"
          placeholder="Ej: 1234567890"
          value={cedula}
          onChangeText={handleCedulaChange}
          keyboardType="number-pad"
          error={errors.cedula}
        />
      )}

      <Input
        label={isUSA ? 'Date of Birth' : 'Fecha de Nacimiento'}
        placeholder={isUSA ? 'MM/DD/YYYY' : 'DD/MM/AAAA'}
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        keyboardType="number-pad"
        error={errors.dateOfBirth}
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

      <Text className="text-text-main font-body-bold text-base mb-3 mt-2">
        {isUSA ? 'Home Address' : 'Dirección de Residencia'}
      </Text>

      {isUSA ? (
        <USAddressBlock
          values={usAddr}
          onChange={setUsAddr}
          errors={{ street: errors.street, city: errors.city, state: errors.state, zip: errors.zip }}
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

      <Text className="text-text-main font-body-bold text-base mb-3 mt-2">
        {isUSA ? 'Emergency Contact (optional)' : 'Contacto de Emergencia (opcional)'}
      </Text>
      <Input
        label={isUSA ? 'Contact Name' : 'Nombre del Contacto'}
        value={emergencyName}
        onChangeText={setEmergencyName}
      />
      <PhoneInput
        label={isUSA ? 'Contact Phone' : 'Teléfono del Contacto'}
        country={country ?? 'usa'}
        value={emergencyPhone}
        onChange={setEmergencyPhone}
      />

      <Button label={t('common.next')} onPress={onNext} className="mb-8" />
    </ScreenWrapper>
  );
}
