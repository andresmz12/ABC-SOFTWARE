import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import SelectDropdown from '@/components/ui/SelectDropdown';
import PhoneInput from '@/components/ui/PhoneInput';
import USAddressBlock, { USAddressValue } from '@/components/forms/USAddressBlock';
import COAddressBlock, { COAddressValue } from '@/components/forms/COAddressBlock';
import { useRegistrationStore } from '@/store/registrationStore';
import { US_FREQUENCY_OPTIONS, CO_FREQUENCY_OPTIONS } from '@/lib/countryData';

const SERVICE_TYPES = ['residential', 'commercial', 'both'] as const;

const EMPTY_US_ADDR: USAddressValue = { street: '', city: '', state: '', zip: '', county: '' };
const EMPTY_CO_ADDR: COAddressValue = { viaType: '', numeroPrincipal: '', numeroSecundario: '', complemento: '', barrio: '', ciudad: '', departamento: '' };

export default function ClientRegister() {
  const router = useRouter();
  const { t } = useTranslation();
  const { country, reset } = useRegistrationStore();
  const isUSA = country !== 'colombia';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState<string>('residential');
  const [frequency, setFrequency] = useState('');
  const [usAddr, setUsAddr] = useState<USAddressValue>(EMPTY_US_ADDR);
  const [coAddr, setCoAddr] = useState<COAddressValue>(EMPTY_CO_ADDR);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const freqOptions = isUSA ? US_FREQUENCY_OPTIONS : CO_FREQUENCY_OPTIONS;

  const serviceTypeLabels: Record<string, string> = {
    residential: isUSA ? 'Residential' : 'Residencial',
    commercial: isUSA ? 'Commercial' : 'Comercial',
    both: isUSA ? 'Both' : 'Ambos',
  };

  const validateStep1 = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = t('errors.required');
    if (!email.trim()) e.email = t('errors.required');
    if (!password || password.length < 8) e.password = t('auth.passwordTooShort');
    if (!phone.trim()) e.phone = t('errors.required');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Record<string, string> = {};
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

  const goNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const onSubmit = async () => {
    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError || !authData.user) {
      Alert.alert('Error', authError?.message ?? 'Registration failed');
      setLoading(false);
      return;
    }

    const addrCity = isUSA ? usAddr.city : coAddr.ciudad;
    const addrZip = isUSA ? usAddr.zip : '';
    const addrStreet = isUSA
      ? `${usAddr.street}, ${usAddr.city}, ${usAddr.state} ${usAddr.zip}`
      : `${coAddr.viaType} ${coAddr.numeroPrincipal} # ${coAddr.numeroSecundario}${coAddr.complemento ? ', ' + coAddr.complemento : ''}, ${coAddr.barrio}`;

    await supabase.from('users').insert({
      id: authData.user.id,
      email,
      role: 'client',
      status: 'approved',
      country: country ?? 'usa',
      preferred_language: isUSA ? 'en' : 'es',
    });
    await supabase.from('clients').insert({
      user_id: authData.user.id,
      full_name: fullName,
      phone,
      address: addrStreet,
      city: addrCity,
      zip: addrZip,
      country: country ?? 'usa',
    });

    reset();
    setLoading(false);
    router.replace('/(client)/home');
  };

  const stepTitle = [
    isUSA ? 'Personal Information' : 'Información Personal',
    isUSA ? 'Your Address' : 'Tu Dirección',
    isUSA ? 'Review & Create Account' : 'Revisar y Crear Cuenta',
  ];

  return (
    <ScreenWrapper scroll className="px-6">
      <TouchableOpacity
        onPress={() => step > 1 ? setStep(step - 1) : router.back()}
        className="pt-6 pb-4"
      >
        <Text className="text-primary font-body">← {t('common.back')}</Text>
      </TouchableOpacity>
      <StepProgressBar current={step} total={3} />
      <Text className="text-primary text-2xl font-heading mb-6">{stepTitle[step - 1]}</Text>

      {step === 1 && (
        <>
          <Input
            label={isUSA ? 'Full Name' : 'Nombre Completo'}
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName}
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

          <Text className="text-text-main font-body-medium mb-3">
            {isUSA ? 'Service Preference' : 'Preferencia de Servicio'}
          </Text>
          <View className="flex-row gap-2 mb-5">
            {SERVICE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setServiceType(type)}
                className={`flex-1 border rounded-xl py-3 items-center ${serviceType === type ? 'bg-primary border-primary' : 'border-gray-200'}`}
              >
                <Text className={`text-xs font-body-medium ${serviceType === type ? 'text-white' : 'text-text-main'}`}>
                  {serviceTypeLabels[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <SelectDropdown
            label={isUSA ? 'Frequency' : 'Frecuencia'}
            options={freqOptions}
            value={frequency}
            onChange={setFrequency}
            placeholder={isUSA ? 'How often?' : '¿Con qué frecuencia?'}
          />

          <Button label={t('common.next')} onPress={goNext} />
        </>
      )}

      {step === 2 && (
        <>
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
          <Button label={t('common.next')} onPress={goNext} />
        </>
      )}

      {step === 3 && (
        <View>
          <View className="bg-accent rounded-2xl p-5 mb-6">
            <Text className="text-primary font-body-bold text-base mb-2">✅ {isUSA ? 'Account Summary' : 'Resumen de Cuenta'}</Text>
            {[
              [isUSA ? 'Name' : 'Nombre', fullName],
              ['Email', email],
              [isUSA ? 'Country' : 'País', isUSA ? '🇺🇸 United States' : '🇨🇴 Colombia'],
              [isUSA ? 'Service Preference' : 'Preferencia', serviceTypeLabels[serviceType]],
            ].map(([label, value]) => (
              <View key={label} className="flex-row justify-between py-1.5 border-b border-primary/10">
                <Text className="text-text-muted font-body text-sm">{label}</Text>
                <Text className="text-text-main font-body-medium text-sm">{value}</Text>
              </View>
            ))}
          </View>
          <Button
            label={isUSA ? 'Create Account' : 'Crear Cuenta'}
            onPress={onSubmit}
            loading={loading}
            className="mb-8"
          />
        </View>
      )}
    </ScreenWrapper>
  );
}
