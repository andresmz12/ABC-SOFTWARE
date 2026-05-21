import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { C } from '@/constants/theme';

const US_DOCS = [
  { key: 'w9',               label: 'W-9 Tax Form',              desc: 'Required for US tax reporting' },
  { key: 'insurance',        label: 'Certificate of Insurance',  desc: 'Liability coverage documentation' },
  { key: 'business_license', label: 'Business License',          desc: 'State or local business registration' },
  { key: 'ein_letter',       label: 'EIN Confirmation Letter',   desc: 'IRS employer identification number' },
  { key: 'service_agreement',label: 'Signed Service Agreement',  desc: 'Platform terms and conditions' },
];

const CO_DOCS = [
  { key: 'rut',              label: 'RUT',                         desc: 'Registro Único Tributario' },
  { key: 'insurance',        label: 'Póliza de Responsabilidad',   desc: 'Cobertura de responsabilidad civil' },
  { key: 'camara',           label: 'Cámara de Comercio',          desc: 'Registro mercantil de la empresa' },
  { key: 'nit_cert',         label: 'Certificado NIT',             desc: 'Número de identificación tributaria' },
  { key: 'service_agreement',label: 'Acuerdo de Servicio',         desc: 'Términos y condiciones de la plataforma' },
];

export default function CompanyStep3() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const country = params.country ?? 'usa';
  const isColombia = country === 'colombia';
  const DOCS = isColombia ? CO_DOCS : US_DOCS;
  const [uploaded, setUploaded] = useState<Record<string, string>>({});

  const handleUpload = (key: string) => {
    // Real implementation would open document picker
    setUploaded((p) => ({ ...p, [key]: `${key}_document.pdf` }));
  };

  const uploadedCount = Object.keys(uploaded).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 8 }}>
          <Feather name="chevron-left" size={20} color={C.textPrimary} />
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>Back</Text>
        </TouchableOpacity>

        <View style={{ paddingTop: 8, paddingBottom: 8 }}>
          <StepProgressBar current={3} total={4} />
          <Text style={{ color: C.textPrimary, fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
            {isColombia ? 'Documentos' : 'Documents'}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6, marginBottom: 20 }}>
            {isColombia ? 'Sube los documentos requeridos para verificación' : 'Upload required documents for platform verification'}
          </Text>

          {/* Progress */}
          <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>Upload progress</Text>
              <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>{uploadedCount}/{DOCS.length}</Text>
            </View>
            <View style={{ height: 4, backgroundColor: C.line, borderRadius: 9999 }}>
              <View style={{ height: '100%', backgroundColor: C.accent, borderRadius: 9999, width: `${(uploadedCount / DOCS.length) * 100}%` }} />
            </View>
          </View>
        </View>

        {DOCS.map((doc) => {
          const isUploaded = !!uploaded[doc.key];
          return (
            <View
              key={doc.key}
              style={{
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: isUploaded ? `${C.success}40` : C.line,
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
                  <Feather name={isUploaded ? 'check-circle' : 'file-text'} size={18} color={isUploaded ? C.success : C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }}>{doc.label}</Text>
                  <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{doc.desc}</Text>
                  {isUploaded && (
                    <Text style={{ color: C.success, fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 6 }}>
                      {uploaded[doc.key]}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleUpload(doc.key)}
                style={{
                  marginTop: 14,
                  height: 40,
                  borderWidth: 1,
                  borderColor: isUploaded ? `${C.success}50` : `${C.accent}50`,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
                activeOpacity={0.85}
              >
                <Feather name={isUploaded ? 'refresh-cw' : 'upload'} size={14} color={isUploaded ? C.success : C.accent} style={{ marginRight: 6 }} />
                <Text style={{ color: isUploaded ? C.success : C.accent, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                  {isUploaded ? (isColombia ? 'Reemplazar' : 'Replace') : (isColombia ? 'Subir' : 'Upload')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ marginTop: 8, marginBottom: 40 }}>
          <Button
            label={isColombia ? 'Continuar' : 'Continue'}
            onPress={() => router.push({ pathname: '/(auth)/register/company/step4', params: { country } } as any)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
