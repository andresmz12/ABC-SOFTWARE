/**
 * Admin — Individual chat conversation with a user
 * Sends push notification to user when admin replies.
 * Shows user info and allows marking conversation as resolved.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
import { sendPushNotification } from '@/lib/notifications';
import { getUserProfile } from '@/lib/userUtils';
import { C } from '@/constants/theme';

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${period}`;
}

const ROLE_META: Record<string, { icon: keyof typeof Feather.glyphMap; labelEn: string; labelEs: string; color: string }> = {
  client:      { icon: 'user',      labelEn: 'Client',      labelEs: 'Cliente',       color: C.accent },
  company:     { icon: 'briefcase', labelEn: 'Company',     labelEs: 'Empresa',       color: C.accent2 },
  independent: { icon: 'tool',      labelEn: 'Independent', labelEs: 'Independiente', color: '#8B5CF6' },
};

export default function AdminChatDetail() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { chatId, userName: userNameParam, userId } = useLocalSearchParams<{ chatId: string; userName?: string; userId?: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  // Pre-populate from route param so header never shows 'Usuario' while loading
  const [userName, setUserName] = useState<string>(userNameParam ?? '');
  const [userPushToken, setUserPushToken] = useState<string | null>(null);
  const [userLang, setUserLang] = useState<string>('en');
  const listRef = useRef<FlatList>(null);

  // ── Load user info ───────────────────────────────────────────────────────────
  const loadUserInfo = useCallback(async () => {
    const uid = userId ?? null;
    if (!uid && !chatId) return;

    // Get user info either by userId param or via chat
    let targetUserId = uid;
    if (!targetUserId && chatId) {
      const { data: chat } = await supabase.from('chats').select('user_id, resolved').eq('id', chatId).single();
      targetUserId = chat?.user_id ?? null;
      if (chat?.resolved) setResolved(true);
    }
    if (!targetUserId) return;

    // Look up user across profile tables (no users table required)
    const profile = await getUserProfile(targetUserId);
    if (profile) {
      setUserRole(profile.role);
      setUserPushToken(profile.push_token ?? null);
      setUserLang(profile.preferred_language ?? (profile.country === 'colombia' ? 'es' : 'en'));
      if (profile.name?.trim()) setUserName(profile.name.trim());
    }
  }, [chatId, userId]);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    const { data } = await supabase
      .from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoading(false);

    // Mark user messages as read
    if (user?.id) {
      supabase.from('messages').update({ read: true })
        .eq('chat_id', chatId).neq('sender_id', user.id).then(() => {});
    }
  }, [chatId, user?.id]);

  useEffect(() => {
    loadUserInfo();
    loadMessages();
  }, [loadUserInfo, loadMessages]);

  // ── Realtime ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`admin-chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          if (payload.new.sender_id !== user?.id) {
            supabase.from('messages').update({ read: true }).eq('id', payload.new.id).then(() => {});
          }
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId, user?.id]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || !chatId || !user?.id) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      // Assign admin to chat if not assigned
      const { error: assignErr } = await supabase.from('chats').update({ admin_id: user.id }).eq('id', chatId).is('admin_id', null);
      if (assignErr) console.warn('[chat-detail] assign admin failed:', assignErr.message);

      const { error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        content,
      });
      if (error) throw error;

      // Push notification to user
      if (userPushToken) {
        const isEs = userLang === 'es';
        sendPushNotification(
          userPushToken,
          isEs ? 'Soporte ProVendor' : 'ProVendor Support',
          isEs ? `Nuevo mensaje: ${content.substring(0, 60)}` : `New message: ${content.substring(0, 60)}`,
          { type: 'support_message', chatId },
        ).catch(() => {});
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setText(content);
    } finally {
      setSending(false);
    }
  };

  // ── Resolve chat ──────────────────────────────────────────────────────────────
  const handleResolve = () => {
    Alert.alert(
      es ? '¿Marcar como resuelto?' : 'Mark as resolved?',
      es ? 'Esto cerrará la conversación.' : 'This will close the conversation.',
      [
        { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: es ? 'Resolver' : 'Resolve',
          onPress: async () => {
            await supabase.from('chats').update({ resolved: true }).eq('id', chatId);
            setResolved(true);
            router.back();
          },
        },
      ],
    );
  };

  const meta = ROLE_META[userRole] ?? { icon: 'user' as const, labelEn: userRole, labelEs: userRole, color: C.textMuted };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 8, paddingHorizontal: 16 }}>
        {!isMe && (
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${meta.color}18`, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 2 }}>
            <Feather name={meta.icon} size={14} color={meta.color} />
          </View>
        )}
        <View style={{
          maxWidth: '72%',
          backgroundColor: isMe ? C.accent2 : C.surface,
          borderRadius: 16,
          borderBottomRightRadius: isMe ? 4 : 16,
          borderBottomLeftRadius: isMe ? 16 : 4,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderWidth: isMe ? 0 : 1,
          borderColor: C.line,
        }}>
          <Text style={{ color: isMe ? '#FFF' : C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
            {item.content}
          </Text>
          <Text style={{ color: isMe ? 'rgba(255,255,255,0.65)' : C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4, textAlign: 'right' }}>
            {formatTime(item.created_at)}
            {isMe && ` · ${item.read ? (es ? 'Leído' : 'Read') : (es ? 'Enviado' : 'Sent')}`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: C.surface,
        borderBottomWidth: 1,
        borderBottomColor: C.line,
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Feather name="arrow-left" size={22} color={C.textPrimary} />
        </TouchableOpacity>

        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${meta.color}18`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Feather name={meta.icon} size={19} color={meta.color} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
            {userName || userId?.slice(0, 8) || (es ? 'Usuario' : 'User')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {userRole ? (
              <View style={{ backgroundColor: `${meta.color}18`, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ color: meta.color, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? meta.labelEs : meta.labelEn}
                </Text>
              </View>
            ) : null}
            {resolved && (
              <View style={{ backgroundColor: `${C.success}18`, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ color: C.success, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Resuelto' : 'Resolved'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Resolve button */}
        {!resolved && (
          <TouchableOpacity
            onPress={handleResolve}
            style={{ padding: 8, borderRadius: 10, backgroundColor: `${C.success}15` }}
          >
            <Feather name="check-circle" size={20} color={C.success} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent2} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingVertical: 16 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
                <Feather name="message-circle" size={40} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 16, textAlign: 'center' }}>
                  {es ? 'Sin mensajes aún. Inicia la conversación.' : 'No messages yet. Start the conversation.'}
                </Text>
              </View>
            )}
          />

          {/* Input bar — hidden if resolved */}
          {resolved ? (
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: insets.bottom + 16, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, alignItems: 'center' }}>
              <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                {es ? 'Conversación cerrada' : 'Conversation closed'}
              </Text>
            </View>
          ) : (
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              paddingHorizontal: 12,
              paddingVertical: 10,
              paddingBottom: Math.max(insets.bottom, 10) + 8,
              backgroundColor: C.surface,
              borderTopWidth: 1,
              borderTopColor: C.line,
              gap: 8,
            }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={es ? 'Responder...' : 'Reply...'}
                placeholderTextColor={C.textMuted}
                style={{
                  flex: 1,
                  backgroundColor: C.surface2 ?? '#F5F7FA',
                  borderRadius: 22,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  fontSize: 14,
                  fontFamily: 'Inter_400Regular',
                  color: C.textPrimary,
                  maxHeight: 120,
                  borderWidth: 1,
                  borderColor: C.line,
                }}
                multiline
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!text.trim() || sending}
                style={{
                  width: 46, height: 46, borderRadius: 23,
                  backgroundColor: text.trim() ? C.accent2 : C.line,
                  alignItems: 'center', justifyContent: 'center',
                }}
                activeOpacity={0.8}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Feather name="send" size={18} color="#FFF" />
                }
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
