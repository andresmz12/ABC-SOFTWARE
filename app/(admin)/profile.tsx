import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import LanguageToggle from '@/components/ui/LanguageToggle';
import Input from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/theme';

type TestRole = 'company' | 'independent' | 'client';
interface TestAccount { email: string; password: string; }
interface EditingState { role: TestRole; email: string; password: string; }

const storageKey = (role: TestRole) => `test_account_${role}`;

const ROLE_META = [
  { role: 'company'     as TestRole, icon: 'briefcase' as const, label: 'Company',     labelEs: 'Empresa',       route: '/(provider)/home' },
  { role: 'independent' as TestRole, icon: 'user'      as const, label: 'Independent', labelEs: 'Independiente', route: '/(provider)/home' },
  { role: 'client'      as TestRole, icon: 'home'      as const, label: 'Client',      labelEs: 'Cliente',       route: '/(client)/home' },
];

const ROLE_MAP = Object.fromEntries(ROLE_META.map(m => [m.role, m])) as Record<TestRole, typeof ROLE_META[0]>;

export default function AdminProfile() {
  const { user, signOut, initialize } = useAuthStore();
  const router = useRouter();
  const { lang } = useLang();
  const es = lang === 'es';

  const [testAccounts, setTestAccounts] = useState<Partial<Record<TestRole, TestAccount>>>({});
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [loggingInAs, setLoggingInAs] = useState<TestRole | null>(null);

  const loadTestAccounts = async () => {
    const entries = await Promise.all(
      ROLE_META.map(async ({ role }) => {
        const raw = await SecureStore.getItemAsync(storageKey(role));
        return [role, raw ? (JSON.parse(raw) as TestAccount) : null] as [TestRole, TestAccount | null];
      })
    );
    const accounts: Partial<Record<TestRole, TestAccount>> = {};
    entries.forEach(([role, acct]) => { if (acct) accounts[role] = acct; });
    setTestAccounts(accounts);
  };

  useEffect(() => { loadTestAccounts(); }, []);

  const saveTestAccount = async () => {
    if (!editing || !editing.email.trim() || !editing.password.trim()) return;
    const { role, email, password } = editing;
    const acct: TestAccount = { email: email.trim(), password: password.trim() };
    await SecureStore.setItemAsync(storageKey(role), JSON.stringify(acct));
    setTestAccounts((prev) => ({ ...prev, [role]: acct }));
    setEditing(null);
  };

  const removeTestAccount = async (role: TestRole) => {
    await SecureStore.deleteItemAsync(storageKey(role));
    setTestAccounts(({ [role]: _, ...rest }) => rest);
  };

  const quickLogin = async (role: TestRole) => {
    const acct = testAccounts[role];
    if (!acct) return;
    setLoggingInAs(role);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: acct.email, password: acct.password });
      if (error) throw error;
      await initialize();
      router.replace(ROLE_MAP[role].route as any);
    } catch (e: any) {
      // Re-sync auth state to ensure admin is never left in a signed-out / broken state
      // if the test-account login failed or the session was somehow disturbed.
      await initialize().catch(() => {});
      Alert.alert(es ? 'Error de Login' : 'Login Failed', e.message ?? 'Check credentials and try again.');
    } finally {
      setLoggingInAs(null);
    }
  };

  const initials = (user?.email ?? 'A').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 64 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 24, marginTop: 12 }}>
          {es ? 'Perfil Admin' : 'Admin Profile'}
        </Text>

        <View style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <View style={{
            width: 56,
            height: 56,
            backgroundColor: '#EEF2F6',
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
            borderWidth: 1,
            borderColor: C.accent2,
          }}>
            <Text style={{ color: C.accent2, fontSize: 20, fontFamily: 'Inter_700Bold' }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
              {user?.email}
            </Text>
            <Text style={{ color: C.accent2, fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {es ? 'Administrador' : 'Administrator'}
            </Text>
          </View>
        </View>

        <View style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 16,
          padding: 16,
          marginBottom: 28,
        }}>
          <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 12 }}>
            {es ? 'Idioma de la App' : 'App Language'}
          </Text>
          <LanguageToggle />
        </View>

        <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          {es ? 'Cuentas de Prueba' : 'Test Accounts'}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 12, lineHeight: 18 }}>
          {es
            ? 'Las credenciales deben coincidir con una cuenta real registrada en Supabase.'
            : 'Email and password must match a real account registered in Supabase.'}
        </Text>

        <View style={{ gap: 12, marginBottom: 28 }}>
          {ROLE_META.map(({ role, icon, label, labelEs }) => {
            const saved = testAccounts[role];
            const isExpanded = editing?.role === role;
            const isLoggingIn = loggingInAs === role;
            const displayLabel = es ? labelEs : label;

            return (
              <View key={role} style={{
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: isExpanded ? C.accent : C.line,
                borderRadius: 16,
                padding: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: (saved || isExpanded) ? 12 : 0 }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    backgroundColor: C.surface2,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    <Feather name={icon} size={18} color={C.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>{displayLabel}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 }} numberOfLines={1}>
                      {saved ? saved.email : (es ? 'Sin cuenta guardada' : 'No account saved')}
                    </Text>
                  </View>
                  {!isExpanded && (
                    <TouchableOpacity
                      onPress={() => setEditing({ role, email: saved?.email ?? '', password: saved?.password ?? '' })}
                      style={{
                        backgroundColor: C.surface2,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: C.line,
                      }}
                    >
                      <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>
                        {saved ? (es ? 'Editar' : 'Edit') : (es ? 'Configurar' : 'Set')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isExpanded && (
                  <View>
                    <Input
                      value={editing!.email}
                      onChangeText={(v) => setEditing(prev => prev ? { ...prev, email: v } : null)}
                      placeholder={es ? 'Correo' : 'Email'}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      iconName="mail"
                    />
                    <Input
                      value={editing!.password}
                      onChangeText={(v) => setEditing(prev => prev ? { ...prev, password: v } : null)}
                      placeholder={es ? 'Contraseña' : 'Password'}
                      secureTextEntry
                      iconName="lock"
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setEditing(null)}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.line, alignItems: 'center' }}
                      >
                        <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                          {es ? 'Cancelar' : 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={saveTestAccount}
                        style={{ flex: 2, paddingVertical: 10, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                          {es ? 'Guardar' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {saved && !isExpanded && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => removeTestAccount(role)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: `${C.danger}40`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="trash-2" size={15} color={C.danger} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => quickLogin(role)}
                      disabled={isLoggingIn}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: '#D1FAE5',
                        borderWidth: 1,
                        borderColor: `${C.success}50`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        opacity: isLoggingIn ? 0.7 : 1,
                      }}
                    >
                      {isLoggingIn ? (
                        <ActivityIndicator size="small" color={C.success} />
                      ) : (
                        <>
                          <Feather name="log-in" size={14} color={C.success} style={{ marginRight: 6 }} />
                          <Text style={{ color: C.success, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                            {es ? `Entrar como ${displayLabel}` : `Login as ${label}`}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              es ? '¿Cerrar sesión?' : 'Sign out?',
              es ? '¿Estás seguro de que deseas cerrar sesión?' : 'Are you sure you want to sign out?',
              [
                { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
                { text: es ? 'Cerrar Sesión' : 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); setTimeout(() => router.replace('/(auth)/welcome' as any), 100); } },
              ],
            );
          }}
          style={{
            backgroundColor: `${C.danger}15`,
            borderWidth: 1,
            borderColor: `${C.danger}40`,
            borderRadius: 16,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
          }}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={16} color={C.danger} style={{ marginRight: 8 }} />
          <Text style={{ color: C.danger, fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
            {es ? 'Cerrar Sesión' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
