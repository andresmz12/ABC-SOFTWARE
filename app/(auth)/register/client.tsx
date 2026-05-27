import { useState } from 'react';
import { emailService } from '@/lib/emailService';
import { View, Text, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import LocationSelector from '@/components/ui/LocationSelector';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { C } from '@/constants/theme';

type DocType = 'Passport' | 'Driver License' | 'Government ID';

const DOC_TYPES: { key: DocType; icon: keyof typeof Feather.glyphMap; labelEn: string; labelEs: string }[] = [
  { key: 'Passport',     icon: 'book',       labelEn: 'Passport',       labelEs: 'Pasaporte' },
  { key: 'Driver License', icon: 'credit-card', labelEn: "Driver's License", labelEs: 'Licencia de Conducir' },
  { key: 'Government ID',  icon: 'shield',    labelEn: 'Government ID',  labelEs: 'Cédula / ID' },
];

const schema = z.object({
  fullName: z.string().min(2, 'Required'),
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters'),
  phone:    z.string().min(7, 'Required'),
  country:  z.enum(['usa', 'colombia']),
  address:  z.string().min(5, 'Required'),
  city:     z.string().min(2, 'Required'),
  zip:      z.string().min(3, 'Required'),
});

type FormData = z.infer<typeof schema>;

export default function ClientRegister() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const es = lang === 'es';
  const { initialize } = useAuthStore();
  const { country: initialCountry = 'usa' } = useLocalSearchParams<{ country?: string }>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clientState, setClientState] = useState('');

  // Step 3 — document upload state
  const [docType, setDocType] = useState<DocType>('Government ID');
  const [docLocalUri, setDocLocalUri] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const STEP_TITLES = es
    ? ['Información Personal', 'Ubicación', 'Documento', 'Revisar']
    : ['Personal Info', 'Location', 'Document', 'Review'];

  const { control, handleSubmit, watch, trigger, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: initialCountry as 'usa' | 'colombia' },
  });

  const country = watch('country');

  const pickDocument = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        es ? 'Permiso requerido' : 'Permission required',
        es ? 'Se necesita acceso a la galería.' : 'Gallery access is required.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]) return;
    setDocLocalUri(result.assets[0].uri);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: 'https://abc-software-nine.vercel.app',
        data: {
          role: 'client',
          country: data.country,
          preferred_language: data.country === 'colombia' ? 'es' : 'en',
        },
      },
    });
    if (authError || !authData.user) {
      Alert.alert('Error', authError?.message ?? (es ? 'Registro falló' : 'Registration failed'));
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    const clientResult = await supabase.from('clients').insert({
      user_id: userId, full_name: data.fullName, phone: data.phone,
      address: data.address, city: data.city, state: clientState, zip: data.zip,
      country: data.country, preferred_language: data.country === 'colombia' ? 'es' : 'en',
    });
    if (clientResult.error) {
      await supabase.auth.signOut();
      Alert.alert('Error', clientResult.error.message ?? (es ? 'Error al guardar perfil.' : 'Failed to save profile.'));
      setLoading(false);
      return;
    }

    // Upload identity document to client-documents bucket and save metadata
    if (docLocalUri) {
      try {
        setUploadingDoc(true);
        const ext = docLocalUri.split('.').pop()?.split('?')[0] ?? 'jpg';
        const storagePath = `${userId}/${Date.now()}.${ext}`;
        const response = await fetch(docLocalUri);
        const blob = await response.blob();
        const { error: uploadErr } = await supabase.storage
          .from('client-documents')
          .upload(storagePath, blob, { contentType: `image/${ext}` });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('client-documents').getPublicUrl(storagePath);
          await supabase.from('documents').insert({
            user_id: userId,
            doc_type: docType,
            file_url: urlData.publicUrl,
            file_name: `${docType} — ${userId.slice(0, 8)}`,
            status: 'pending',
          });
        } else {
          console.warn('[ClientRegister] doc upload failed:', uploadErr.message);
        }
      } catch (e: any) {
        console.warn('[ClientRegister] doc upload error:', e?.message ?? e);
      } finally {
        setUploadingDoc(false);
      }
    }

    emailService.sendWelcome({
      email: data.email,
      role: 'client',
      preferred_language: data.country === 'colombia' ? 'es' : 'en',
      name: data.fullName,
    });
    setLoading(false);
    await initialize();
    router.replace('/(client)/home' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 24 }}>
          <TouchableOpacity
            onPress={() => step > 1 ? setStep(step - 1) : router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 8 }}
          >
            <Feather name="chevron-left" size={20} color={C.textPrimary} />
            <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>
              {es ? 'Atrás' : 'Back'}
            </Text>
          </TouchableOpacity>

          <View style={{ paddingTop: 8, paddingBottom: 24 }}>
            <StepProgressBar current={step} total={4} />
            <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>{STEP_TITLES[step - 1]}</Text>
            <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6 }}>
              {es ? 'Crea tu cuenta de cliente ProVendor' : 'Create your ProVendor client account'}
            </Text>
          </View>

          {/* Step 1 — Personal Info */}
          {step === 1 && (
            <>
              <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
                <Input label={es ? 'Nombre Completo' : 'Full Name'} value={value} onChangeText={onChange} iconName="user" placeholder={es ? 'Maria García' : 'Maria Garcia'} error={errors.fullName?.message} />
              )} />
              <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
                <Input label={es ? 'Correo' : 'Email'} value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" iconName="mail" placeholder="you@example.com" error={errors.email?.message} />
              )} />
              <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
                <Input label={es ? 'Contraseña' : 'Password'} value={value} onChangeText={onChange} secureTextEntry iconName="lock" placeholder={es ? 'Mínimo 8 caracteres' : 'Min 8 characters'} error={errors.password?.message} />
              )} />
              <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
                <Input label={es ? 'Teléfono' : 'Phone'} value={value} onChangeText={onChange} keyboardType="phone-pad" iconName="phone" placeholder="(305) 555-0000" error={errors.phone?.message} />
              )} />
              <View style={{ marginTop: 8, marginBottom: 16 }}>
                <Button label={es ? 'Continuar' : 'Continue'} onPress={async () => {
                  const ok = await trigger(['fullName', 'email', 'password', 'phone']);
                  if (ok) setStep(2);
                }} />
              </View>
            </>
          )}

          {/* Step 2 — Location */}
          {step === 2 && (
            <>
              <Controller control={control} name="address" render={({ field: { onChange, value } }) => (
                <Input label={es ? 'Dirección' : 'Street Address'} value={value} onChangeText={onChange} iconName="map-pin"
                  placeholder={es ? 'Calle 50 #45-30' : '123 Main St'} error={errors.address?.message} />
              )} />
              {/* Read-only country badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${C.accent}15`, borderWidth: 1, borderColor: `${C.accent}40`, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20 }}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>{country === 'colombia' ? '🇨🇴' : '🇺🇸'}</Text>
                <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                  {country === 'colombia' ? 'Colombia' : (es ? 'Estados Unidos' : 'United States')}
                </Text>
              </View>
              <LocationSelector
                country={country as 'usa' | 'colombia'}
                state={clientState}
                city={watch('city') ?? ''}
                onStateChange={(s) => { setClientState(s); setValue('city', '', { shouldValidate: false }); }}
                onCityChange={(c) => setValue('city', c, { shouldValidate: true })}
                cityError={errors.city?.message}
                es={es}
              />
              <Controller control={control} name="zip" render={({ field: { onChange, value } }) => (
                <Input label={country === 'colombia' ? (es ? 'Código Postal' : 'Postal Code') : (es ? 'Código ZIP' : 'ZIP Code')} value={value} onChangeText={onChange} keyboardType="number-pad" iconName="hash" placeholder={country === 'colombia' ? '110111' : '33101'} error={errors.zip?.message} />
              )} />
              <View style={{ marginTop: 8, marginBottom: 16 }}>
                <Button label={es ? 'Continuar' : 'Continue'} onPress={async () => {
                  if (!clientState) {
                    Alert.alert(
                      es ? 'Campo requerido' : 'Required field',
                      es ? 'Por favor selecciona un estado/departamento.' : 'Please select a state/department.',
                    );
                    return;
                  }
                  const ok = await trigger(['address', 'country', 'city', 'zip']);
                  if (ok) setStep(3);
                }} />
              </View>
            </>
          )}

          {/* Step 3 — Identity Document */}
          {step === 3 && (
            <>
              <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Feather name="shield" size={16} color={C.accent} style={{ marginRight: 8 }} />
                  <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                    {es ? 'Verificación de Identidad' : 'Identity Verification'}
                  </Text>
                </View>
                <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
                  {es
                    ? 'Para garantizar la seguridad de nuestra plataforma, necesitamos verificar tu identidad. Tu cuenta quedará pendiente hasta que aprobemos el documento.'
                    : 'To ensure the security of our platform, we need to verify your identity. Your account will be pending until we review your document.'}
                </Text>
              </View>

              {/* Document type selector */}
              <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                {es ? 'Tipo de documento' : 'Document type'}
              </Text>
              <View style={{ gap: 10, marginBottom: 20 }}>
                {DOC_TYPES.map((dt) => {
                  const active = docType === dt.key;
                  return (
                    <TouchableOpacity
                      key={dt.key}
                      onPress={() => setDocType(dt.key)}
                      activeOpacity={0.85}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: active ? `${C.accent}15` : C.surface,
                        borderWidth: 1.5,
                        borderColor: active ? C.accent : C.line,
                        borderRadius: 12,
                        padding: 14,
                      }}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: active ? `${C.accent}25` : C.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Feather name={dt.icon} size={18} color={active ? C.accent : C.textMuted} />
                      </View>
                      <Text style={{ color: active ? C.textPrimary : C.textSecondary, fontSize: 14, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular', flex: 1 }}>
                        {es ? dt.labelEs : dt.labelEn}
                      </Text>
                      {active && <Feather name="check-circle" size={16} color={C.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Photo picker */}
              <Text style={{ color: C.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                {es ? 'Foto del documento' : 'Document photo'}
              </Text>
              {docLocalUri ? (
                <View style={{ marginBottom: 20 }}>
                  <Image source={{ uri: docLocalUri }} style={{ width: '100%', height: 180, borderRadius: 14, backgroundColor: C.surface2, marginBottom: 10 }} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={pickDocument}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface }}
                    activeOpacity={0.75}
                  >
                    <Feather name="refresh-cw" size={14} color={C.textSecondary} />
                    <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                      {es ? 'Cambiar foto' : 'Change photo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickDocument}
                  style={{
                    height: 140,
                    borderWidth: 1.5,
                    borderColor: C.line,
                    borderStyle: 'dashed',
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: C.surface,
                    marginBottom: 20,
                  }}
                  activeOpacity={0.75}
                >
                  <Feather name="camera" size={28} color={C.textMuted} style={{ marginBottom: 8 }} />
                  <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_500Medium' }}>
                    {es ? 'Seleccionar foto' : 'Select photo'}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
                    {es ? 'Toca para abrir la galería' : 'Tap to open gallery'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ marginTop: 4, marginBottom: 16 }}>
                <Button
                  label={es ? 'Continuar' : 'Continue'}
                  onPress={() => {
                    if (!docLocalUri) {
                      Alert.alert(
                        es ? 'Foto requerida' : 'Photo required',
                        es ? 'Por favor sube una foto de tu documento de identidad.' : 'Please upload a photo of your identity document.',
                      );
                      return;
                    }
                    setStep(4);
                  }}
                />
              </View>
            </>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <>
              <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Feather name="clock" size={16} color={C.warning} style={{ marginRight: 8 }} />
                  <Text style={{ color: C.warning, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                    {es ? 'Cuenta pendiente de verificación' : 'Account pending verification'}
                  </Text>
                </View>
                <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
                  {es
                    ? 'Tu cuenta se creará y podrás explorar la app. Para publicar trabajos, necesitaremos revisar tu documento. Te notificaremos cuando sea aprobada.'
                    : 'Your account will be created and you can explore the app. To post jobs, we will need to review your document. We will notify you when approved.'}
                </Text>
              </View>
              {uploadingDoc && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <ActivityIndicator color={C.accent} size="small" style={{ marginRight: 8 }} />
                  <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                    {es ? 'Subiendo documento...' : 'Uploading document...'}
                  </Text>
                </View>
              )}
              <View style={{ marginBottom: 40 }}>
                <Button label={es ? 'Crear Cuenta' : 'Create Account'} onPress={handleSubmit(onSubmit)} loading={loading} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
