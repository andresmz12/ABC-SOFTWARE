/**
 * Client — ProVendor Support Chat (dedicated tab screen)
 * Full-screen conversation with the admin support team.
 * Replaces the old "Contact Support" push-screen approach.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLang } from '@/context/LanguageContext';
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

function formatDate(iso: string, es: boolean): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return es ? 'Hoy' : 'Today';
  if (d.toDateString() === yesterday.toDateString()) return es ? 'Ayer' : 'Yesterday';
  return d.toLocaleDateString(es ? 'es-CO' : 'en-US', { month: 'short', day: 'numeric' });
}

export default function ClientSupport() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const insets = useSafeAreaInsets();

  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  // ── Get or create chat ──────────────────────────────────────────────────────
  const getOrCreateChat = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('chats').select('id').eq('user_id', user.id).maybeSingle();

      let id: string;
      if (existing?.id) {
        id = existing.id;
      } else {
        // Create chat — admin_id left null; admin claims it when they first reply
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({ user_id: user.id, admin_id: null, user_type: 'client' })
          .select('id').single();
        if (error) throw error;
        id = newChat.id;
      }
      setChatId(id);
      await loadMessages(id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMessages = async (id: string) => {
    const { data } = await supabase
      .from('messages').select('*').eq('chat_id', id).order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    // Mark all admin messages as read
    if (user?.id) {
      supabase.from('messages').update({ read: true })
        .eq('chat_id', id).neq('sender_id', user.id).then(() => {});
    }
  };

  // Refresh when screen comes into focus
  useFocusEffect(useCallback(() => {
    if (chatId) loadMessages(chatId);
    else getOrCreateChat();
  }, [chatId, getOrCreateChat])); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { getOrCreateChat(); }, [getOrCreateChat]);

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`client-support:${chatId}`)
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

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || !chatId || !user?.id) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const { error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        content,
      });
      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setText(content);
    } finally {
      setSending(false);
    }
  };

  // ── Group messages by date ──────────────────────────────────────────────────
  type ListItem = { type: 'date'; label: string } | { type: 'message'; item: Message };
  const listData = (): ListItem[] => {
    const result: ListItem[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const d = new Date(msg.created_at).toDateString();
      if (d !== lastDate) {
        result.push({ type: 'date', label: formatDate(msg.created_at, es) });
        lastDate = d;
      }
      result.push({ type: 'message', item: msg });
    }
    return result;
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return (
        <View style={{ alignItems: 'center', marginVertical: 12 }}>
          <View style={{ backgroundColor: `${C.textMuted}20`, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_500Medium' }}>{item.label}</Text>
          </View>
        </View>
      );
    }

    const msg = item.item;
    const isMe = msg.sender_id === user?.id;
    return (
      <View style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 8, paddingHorizontal: 16 }}>
        {!isMe && (
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 2 }}>
            <Feather name="shield" size={14} color="#FFF" />
          </View>
        )}
        <View style={{
          maxWidth: '72%',
          backgroundColor: isMe ? C.accent : C.surface,
          borderRadius: 16,
          borderBottomRightRadius: isMe ? 4 : 16,
          borderBottomLeftRadius: isMe ? 16 : 4,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderWidth: isMe ? 0 : 1,
          borderColor: C.line,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        }}>
          <Text style={{ color: isMe ? '#FFF' : C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 }}>
            {msg.content}
          </Text>
          <Text style={{ color: isMe ? 'rgba(255,255,255,0.65)' : C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4, textAlign: 'right' }}>
            {formatTime(msg.created_at)}
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
        paddingBottom: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginRight: 14,
        }}>
          <Feather name="shield" size={20} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 17, fontFamily: 'Inter_700Bold' }}>
            {es ? 'Soporte ProVendor' : 'ProVendor Support'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.success, marginRight: 6 }} />
            <Text style={{ color: C.success, fontSize: 12, fontFamily: 'Inter_500Medium' }}>
              {es ? 'En línea' : 'Online'}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={listRef}
            data={listData()}
            keyExtractor={(item, idx) => item.type === 'date' ? `date-${idx}` : item.item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 16 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${C.accent}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Feather name="message-circle" size={32} color={C.accent} />
                </View>
                <Text style={{ color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 10 }}>
                  {es ? '¿Tienes alguna pregunta?' : 'Have a question?'}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 }}>
                  {es
                    ? 'Escribe tu mensaje y el equipo de soporte te responderá pronto.'
                    : 'Write your message and our support team will reply shortly.'}
                </Text>
              </View>
            )}
          />

          {/* Input bar */}
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
              placeholder={es ? 'Escribe un mensaje...' : 'Type a message...'}
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
              returnKeyType="default"
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 46, height: 46, borderRadius: 23,
                backgroundColor: text.trim() ? C.accent : C.line,
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
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
