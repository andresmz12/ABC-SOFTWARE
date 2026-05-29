import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Modal, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import ScreenWrapper from '@/components/layout/ScreenWrapper';

interface AdminMember {
  id: string;
  email: string;
  display_name: string | null;
  is_super_admin: boolean;
  invited_by: string | null;
  created_at: string;
}

function timeAgo(iso: string, es: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return es ? 'Hoy' : 'Today';
  if (days === 1) return es ? 'Ayer' : 'Yesterday';
  if (days < 30) return es ? `Hace ${days} días` : `${days} days ago`;
  const months = Math.floor(days / 30);
  return es ? `Hace ${months} mes${months > 1 ? 'es' : ''}` : `${months} month${months > 1 ? 's' : ''} ago`;
}

export default function AdminTeam() {
  const { lang } = useLang();
  const es = lang === 'es';
  const { user, session } = useAuthStore();
  const isSuperAdmin = user?.is_super_admin === true;

  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);

  // New admin form
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id, email, display_name, is_super_admin, invited_by, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setAdmins((data ?? []) as AdminMember[]);
    } catch (e: any) {
      console.warn('[AdminTeam] load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormError(null);
    setShowModal(true);
  };

  const handleCreate = async () => {
    setFormError(null);
    if (!formName.trim()) { setFormError(es ? 'El nombre es requerido.' : 'Name is required.'); return; }
    if (!formEmail.trim() || !formEmail.includes('@')) { setFormError(es ? 'Email inválido.' : 'Invalid email.'); return; }
    if (formPassword.trim().length < 8) { setFormError(es ? 'La contraseña debe tener al menos 8 caracteres.' : 'Password must be at least 8 characters.'); return; }

    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error(es ? 'Sesión no válida' : 'Invalid session');

      const res = await supabase.functions.invoke('create-admin', {
        body: { email: formEmail.trim().toLowerCase(), password: formPassword.trim(), display_name: formName.trim() },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      setShowModal(false);
      Alert.alert(
        '✓',
        es
          ? `Admin creado exitosamente.\nEmail: ${formEmail.trim().toLowerCase()}\nContraseña temporal: ${formPassword.trim()}\n\nEntrega estas credenciales al empleado de forma segura.`
          : `Admin created successfully.\nEmail: ${formEmail.trim().toLowerCase()}\nTemp password: ${formPassword.trim()}\n\nShare these credentials securely with the employee.`,
      );
      await load();
    } catch (e: any) {
      setFormError(e.message ?? (es ? 'Error desconocido' : 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = (admin: AdminMember) => {
    if (admin.id === user?.id) {
      Alert.alert(es ? 'No permitido' : 'Not allowed', es ? 'No puedes eliminarte a ti mismo.' : 'You cannot remove yourself.');
      return;
    }
    if (admin.is_super_admin) {
      Alert.alert(es ? 'No permitido' : 'Not allowed', es ? 'No puedes eliminar a otro super admin.' : 'You cannot remove another super admin.');
      return;
    }
    Alert.alert(
      es ? `¿Eliminar a ${admin.display_name ?? admin.email}?` : `Remove ${admin.display_name ?? admin.email}?`,
      es
        ? 'Su acceso al panel será revocado inmediatamente. No se elimina la cuenta de Supabase Auth.'
        : 'Their panel access is revoked immediately. The Supabase Auth account is not deleted.',
      [
        { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: es ? 'Eliminar acceso' : 'Remove access',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('admins').delete().eq('id', admin.id);
            if (error) { Alert.alert('Error', error.message); return; }
            setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
          },
        },
      ],
    );
  };

  if (!isSuperAdmin) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Feather name="lock" size={36} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 15, fontFamily: 'Inter_500Medium', marginTop: 16, textAlign: 'center' }}>
            {es ? 'Solo el super administrador puede gestionar el equipo.' : 'Only the super admin can manage the team.'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
            {es ? 'Equipo Admin' : 'Admin Team'}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
            {admins.length} {es ? `miembro${admins.length !== 1 ? 's' : ''}` : `member${admins.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={openModal}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
          activeOpacity={0.85}
        >
          <Feather name="user-plus" size={15} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
            {es ? 'Agregar' : 'Add Admin'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Super admin notice */}
      <View style={{ marginHorizontal: 24, marginVertical: 12, backgroundColor: `${C.accent2}10`, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: `${C.accent2}30` }}>
        <Feather name="info" size={14} color={C.accent2} style={{ marginTop: 1 }} />
        <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 18 }}>
          {es
            ? 'Los admins tienen acceso completo al panel. Para cambiar roles de super admin, usa el dashboard de Supabase directamente.'
            : 'Admins have full panel access. To change super admin roles, use the Supabase dashboard directly.'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={C.accent2} />
      ) : (
        <FlatList
          data={admins}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelf = item.id === user?.id;
            const canRemove = isSuperAdmin && !item.is_super_admin && !isSelf;
            return (
              <View style={{
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: item.is_super_admin ? `${C.accent2}50` : C.line,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                {/* Avatar */}
                <View style={{
                  width: 48, height: 48,
                  borderRadius: 24,
                  backgroundColor: item.is_super_admin ? `${C.accent2}20` : C.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                  <Text style={{ color: item.is_super_admin ? C.accent2 : C.textMuted, fontSize: 18, fontFamily: 'Inter_700Bold' }}>
                    {(item.display_name ?? item.email).slice(0, 1).toUpperCase()}
                  </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                      {item.display_name ?? item.email}
                    </Text>
                    {item.is_super_admin && (
                      <View style={{ backgroundColor: `${C.accent2}20`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <Text style={{ color: C.accent2, fontSize: 10, fontFamily: 'Inter_700Bold' }}>SUPER</Text>
                      </View>
                    )}
                    {isSelf && (
                      <View style={{ backgroundColor: `${C.success}20`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <Text style={{ color: C.success, fontSize: 10, fontFamily: 'Inter_700Bold' }}>{es ? 'TÚ' : 'YOU'}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }} numberOfLines={1}>
                    {item.email}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                    {timeAgo(item.created_at, es)}
                  </Text>
                </View>

                {/* Remove button */}
                {canRemove && (
                  <TouchableOpacity
                    onPress={() => handleRemove(item)}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${C.danger}15`, borderWidth: 1, borderColor: `${C.danger}30`, alignItems: 'center', justifyContent: 'center' }}
                    activeOpacity={0.8}
                  >
                    <Feather name="user-x" size={15} color={C.danger} />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Feather name="users" size={36} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 16 }}>
                {es ? 'No hay miembros del equipo todavía.' : 'No team members yet.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Create Admin Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48, borderTopWidth: 1, borderTopColor: C.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View>
                <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
                  {es ? 'Nuevo Admin' : 'New Admin'}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                  {es ? 'Acceso completo al panel de administrador' : 'Full access to the admin panel'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="x" size={18} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {formError && (
              <View style={{ backgroundColor: `${C.danger}15`, borderRadius: 10, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: `${C.danger}30` }}>
                <Feather name="alert-circle" size={14} color={C.danger} />
                <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>{formError}</Text>
              </View>
            )}

            {/* Name */}
            <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 }}>
              {es ? 'Nombre completo *' : 'Full name *'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 10, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, marginBottom: 14, height: 48 }}>
              <Feather name="user" size={15} color={C.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder={es ? 'Ej: María García' : 'E.g. John Smith'}
                placeholderTextColor={C.textMuted}
                style={{ flex: 1, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular' }}
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 }}>
              {es ? 'Correo electrónico *' : 'Email *'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 10, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, marginBottom: 14, height: 48 }}>
              <Feather name="mail" size={15} color={C.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                value={formEmail}
                onChangeText={setFormEmail}
                placeholder="empleado@empresa.com"
                placeholderTextColor={C.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ flex: 1, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular' }}
              />
            </View>

            {/* Password */}
            <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 }}>
              {es ? 'Contraseña temporal *' : 'Temporary password *'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 10, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, marginBottom: 6, height: 48 }}>
              <Feather name="lock" size={15} color={C.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                value={formPassword}
                onChangeText={setFormPassword}
                placeholder={es ? 'Mínimo 8 caracteres' : 'Min 8 characters'}
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPassword}
                style={{ flex: 1, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular' }}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={15} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 24 }}>
              {es
                ? 'Entrega esta contraseña al empleado de forma segura. Puede cambiarla desde el app.'
                : 'Share this password securely. The employee can change it from the app.'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_500Medium' }}>
                  {es ? 'Cancelar' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={creating}
                style={{ flex: 2, height: 52, borderRadius: 12, backgroundColor: C.accent2, alignItems: 'center', justifyContent: 'center', opacity: creating ? 0.7 : 1 }}
                activeOpacity={0.85}
              >
                {creating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="user-plus" size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                      {es ? 'Crear Admin' : 'Create Admin'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
