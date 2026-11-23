import { useState } from 'react';
import { Platform, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { deleteMyAccount } from '@/lib/userUtils';
import { confirmAction, notify } from '@/lib/dialog';

/** "Delete my account" — required by App Store 5.1.1(v) and Google Play. */
export default function DeleteAccountButton() {
  const { signOut } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await deleteMyAccount();
      await signOut();
      if (Platform.OS === 'web') (window as any).location.href = '/';
      else router.replace('/(auth)/welcome' as any);
    } catch (e: any) {
      notify(
        es ? 'No se pudo eliminar la cuenta' : 'Could not delete account',
        e.code === 'active_jobs'
          ? (es ? 'Tienes trabajos activos. Termínalos o cancélalos antes de eliminar tu cuenta.'
                : 'You have active jobs. Finish or cancel them before deleting your account.')
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  };

  const onPress = () =>
    confirmAction(
      es ? 'Eliminar cuenta' : 'Delete account',
      es ? 'Se eliminará tu cuenta y tus datos personales de forma permanente. Esta acción no se puede deshacer.'
         : 'Your account and personal data will be permanently deleted. This cannot be undone.',
      es ? 'Eliminar' : 'Delete',
      es ? 'Cancelar' : 'Cancel',
      run,
    );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.8}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginBottom: 12, opacity: busy ? 0.5 : 1 }}
    >
      {busy ? <ActivityIndicator color={C.danger} /> : <Feather name="trash-2" size={15} color={C.danger} style={{ marginRight: 8 }} />}
      <Text style={{ color: C.danger, fontSize: 14, fontFamily: 'Inter_500Medium' }}>
        {es ? 'Eliminar mi cuenta' : 'Delete my account'}
      </Text>
    </TouchableOpacity>
  );
}
