import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { C } from '@/constants/theme';
import { useRegistrationStore } from '@/store/registrationStore';

const US_DOCS = [
  { key: 'identity_selfie',      label: '🤳 Selfie with Government ID',  desc: 'Photo of you holding your ID next to your face — required for identity verification', required: true },
  { key: 'w9',                   label: 'W-9 Tax Form',              desc: 'Required for US tax reporting' },
  { key: 'gov_id_front',         label: 'Government ID — Front',     desc: "Driver's license or passport front" },
  { key: 'gov_id_back',          label: 'Government ID — Back',      desc: "Driver's license or passport back" },
  { key: 'background_check',     label: 'Background Check Consent',  desc: 'Authorization for background screening' },
  { key: 'contractor_agreement', label: 'Contractor Agreement',      desc: 'Independent contractor terms' },
];

const CO_DOCS = [
  { key: 'identity_selfie',             label: '🤳 Selfie con Documento de Identidad',          desc: 'Foto sosteniendo tu cédula o ID junto a tu rostro — requerida para verificación de identidad', required: true },
  { key: 'cedula_front',                label: 'Cédula — Frente',                             desc: 'Documento de identidad (parte frontal)' },
  { key: 'cedula_back',                 label: 'Cédula — Reverso',                            desc: 'Documento de identidad (parte trasera)' },
  { key: 'rut_personal',                label: 'RUT personal',                                desc: 'Expedido por la DIAN' },
  { key: 'antecedentes_judiciales',     label: 'Antecedentes Judiciales',                     desc: 'Expedido por la Policía Nacional (policia.gov.co)' },
  { key: 'antecedentes_disciplinarios', label: 'Antecedentes Disciplinarios',                 desc: 'Expedido por la Procuraduría General' },
  { key: 'antecedentes_fiscales',       label: 'Antecedentes Fiscales',                       desc: 'Expedido por la Contraloría General' },
  { key: 'contrato_prestacion',         label: 'Contrato de Prestación de Servicios firmado', desc: 'Descarga la plantilla, firma y sube' },
];

type DocDef = { key: string; label: string; desc: string; required?: boolean };
type DocFile = { name: string; uri: string; mimeType: string; size?: number };

export default function IndependentStep3() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { country = 'usa' } = useLocalSearchParams<{ country?: string }>();
  const isColombia = country === 'colombia';
  const DOCS = isColombia ? CO_DOCS : US_DOCS;
  const { mergeFormData } = useRegistrationStore();

  const [uploaded, setUploaded] = useState<Record<string, DocFile>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const handleUpload = async (key: string) => {
    try {
      setUploading(key);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setUploaded((prev) => ({
        ...prev,
        [key]: {
          name: asset.name,
          uri: asset.uri,
          mimeType: asset.mimeType ?? 'application/octet-stream',
          size: asset.size,
        },
      }));
    } catch (e: any) {
      Alert.alert(
        isColombia ? 'Error' : 'Error',
        e.message ?? (isColombia ? 'No se pudo seleccionar el archivo.' : 'Could not select file.'),
      );
    } finally {
      setUploading(null);
    }
  };

  const uploadedCount = Object.keys(uploaded).length;

  const handleContinue = () => {
    // Save file refs — actual upload to Supabase Storage happens in step4
    // after the auth account and userId are created
    mergeFormData({ docFiles: uploaded });
    router.push({ pathname: '/(auth)/register/independent/step4', params: { country } } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: insets.top + 8, paddingBottom: 8 }}>
          <Feather name="chevron-left" size={20} color={C.textPrimary} />
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>
            {isColombia ? 'Atrás' : 'Back'}
          </Text>
        </TouchableOpacity>

        <View style={{ paddingTop: 8, paddingBottom: 8 }}>
          <StepProgressBar current={3} total={4} />
          <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
            {isColombia ? 'Documentos' : 'Documents'}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6, marginBottom: 20 }}>
            {isColombia
              ? 'Sube los documentos para verificación de identidad'
              : 'Upload documents for identity verification'}
          </Text>

          {/* Progress bar */}
          <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                {isColombia ? 'Progreso de carga' : 'Upload progress'}
              </Text>
              <Text style={{ color: uploadedCount === DOCS.length ? C.success : C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {uploadedCount}/{DOCS.length}
              </Text>
            </View>
            <View style={{ height: 4, backgroundColor: C.line, borderRadius: 9999 }}>
              <View style={{
                height: '100%',
                backgroundColor: uploadedCount === DOCS.length ? C.success : C.accent,
                borderRadius: 9999,
                width: `${(uploadedCount / DOCS.length) * 100}%`,
              }} />
            </View>
          </View>
        </View>

        {(DOCS as DocDef[]).map((doc) => {
          const docFile = uploaded[doc.key];
          const isUploaded = !!docFile;
          const isThisUploading = uploading === doc.key;
          const isRequired = doc.required;

          return (
            <View
              key={doc.key}
              style={{
                backgroundColor: C.surface,
                borderWidth: isRequired ? 2 : 1,
                borderColor: isUploaded ? `${C.success}50` : isRequired ? '#F97316' : C.line,
                borderRadius: 16,
                padding: 18,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{
                  width: 40, height: 40,
                  backgroundColor: isUploaded ? `${C.success}15` : C.surface2,
                  borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 14,
                }}>
                  <Feather
                    name={isUploaded ? 'check-circle' : 'file-text'}
                    size={18}
                    color={isUploaded ? C.success : C.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
                    <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                      {doc.label}
                    </Text>
                    {isRequired && (
                      <View style={{ backgroundColor: '#FFF7ED', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#F97316' }}>
                        <Text style={{ color: '#C2410C', fontSize: 10, fontFamily: 'Inter_700Bold' }}>
                          {isColombia ? 'REQUERIDO' : 'REQUIRED'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                    {doc.desc}
                  </Text>
                  {isUploaded && (
                    <Text style={{ color: C.success, fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 6 }} numberOfLines={1}>
                      ✓ {docFile.name}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleUpload(doc.key)}
                disabled={isThisUploading}
                style={{
                  marginTop: 14,
                  height: 40,
                  borderWidth: 1,
                  borderColor: isUploaded ? `${C.success}50` : `${C.accent}50`,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  opacity: isThisUploading ? 0.6 : 1,
                }}
                activeOpacity={0.85}
              >
                {isThisUploading ? (
                  <ActivityIndicator size="small" color={C.accent} />
                ) : (
                  <>
                    <Feather
                      name={isUploaded ? 'refresh-cw' : 'upload'}
                      size={14}
                      color={isUploaded ? C.success : C.accent}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{ color: isUploaded ? C.success : C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                      {isUploaded
                        ? (isColombia ? 'Reemplazar' : 'Replace')
                        : (isColombia ? 'Seleccionar Archivo' : 'Select File')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Info note */}
        <View style={{ backgroundColor: C.surface2, borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row' }}>
          <Feather name="info" size={14} color={C.textMuted} style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 18 }}>
            {isColombia
              ? 'Los documentos se subirán de forma segura al crear tu cuenta. Formatos aceptados: PDF e imágenes.'
              : 'Documents are uploaded securely when your account is created. Accepted formats: PDF and images.'}
          </Text>
        </View>

        <View style={{ marginTop: 4, marginBottom: 40 }}>
          <Button
            label={isColombia ? 'Continuar' : 'Continue'}
            onPress={handleContinue}
            disabled={!uploaded['identity_selfie']}
          />
          {!uploaded['identity_selfie'] && (
            <Text style={{ color: '#C2410C', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8 }}>
              {isColombia
                ? '📸 La selfie con tu documento de identidad es obligatoria para continuar'
                : '📸 The selfie with your ID is required to continue'}
            </Text>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
