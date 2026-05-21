import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import StepProgressBar from '@/components/ui/StepProgressBar';
import { C } from '@/constants/theme';

const US_DOCS = [
  { key: 'w9',                   label: 'W-9 Tax Form',              desc: 'Required for US tax reporting' },
  { key: 'gov_id_front',         label: 'Government ID — Front',     desc: "Driver's license or passport front" },
  { key: 'gov_id_back',          label: 'Government ID — Back',      desc: "Driver's license or passport back" },
  { key: 'background_check',     label: 'Background Check Consent',  desc: 'Authorization for background screening' },
  { key: 'contractor_agreement', label: 'Contractor Agreement',      desc: 'Independent contractor terms' },
];

const CO_DOCS = [
  { key: 'cedula_front',         label: 'Cédula — Frente',           desc: 'Documento de identidad (parte frontal)' },
  { key: 'cedula_back',          label: 'Cédula — Reverso',          desc: 'Documento de identidad (parte trasera)' },
  { key: 'rut',                  label: 'RUT',                       desc: 'Registro Único Tributario' },
  { key: 'background_check',     label: 'Consentimiento Verificación',desc: 'Autorización para verificación de antecedentes' },
  { key: 'contractor_agreement', label: 'Contrato de Servicios',     desc: 'Contrato de prestación de servicios' },
];

export default function IndependentStep3() {
  const router = useRouter();
  const { country = 'usa' } = useLocalSearchParams<{ country?: string }>();
  const isColombia = country === 'colombia';
  const DOCS = isColombia ? CO_DOCS : US_DOCS;
  const [uploaded, setUploaded] = useState<Record<string, string>>({});

  const handleUpload = (key: string) => {
    setUploaded((p) => ({ ...p, [key]: `${key}_document.pdf` }));
  };

  const uploadedCount = Object.keys(uploaded).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingBottom: 8 }}>
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
          <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6, marginBottom: 16 }}>
            {isColombia ? 'Sube los documentos para verificación de identidad' : 'Upload documents for identity verification'}
          </Text>

          <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                {isColombia ? 'Progreso de carga' : 'Upload progress'}
              </Text>
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
            <View key={doc.key} style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: isUploaded ? `${C.success}40` : C.line, borderRadius: 16, padding: 18, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ width: 40, height: 40, backgroundColor: isUploaded ? `${C.success}15` : C.surface2, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Feather name={isUploaded ? 'check-circle' : 'file-text'} size={18} color={isUploaded ? C.success : C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }}>{doc.label}</Text>
                  <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{doc.desc}</Text>
                  {isUploaded && <Text style={{ color: C.success, fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 6 }}>{uploaded[doc.key]}</Text>}
                </View>
              </View>
              <TouchableOpacity onPress={() => handleUpload(doc.key)} activeOpacity={0.85}
                style={{ marginTop: 14, height: 40, borderWidth: 1, borderColor: isUploaded ? `${C.success}50` : `${C.accent}50`, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
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
            onPress={() => router.push({ pathname: '/(auth)/register/independent/step4', params: { country } } as any)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
