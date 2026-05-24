/**
 * Admin — Individual chat conversation with a user
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

export default function AdminChatDetail() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { chatId, userEmail } = useLocalSearchParams<{ chatId: string; userEmail?: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoading(false);

    // Mark user messages as read
    if (user?.id) {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id);
    }
  }, [chatId, user?.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime
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

  const handleSend = async () => {
    if (!text.trim() || !chatId || !user?.id) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      // Assign this admin to the chat if not already assigned
      await supabase
        .from('chats')
        .update({ admin_id: user.id })
        .eq('id', chatId)
        .is('admin_id', null);

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

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        marginBottom: 8,
        paddingHorizontal: 16,
      }}>
        {!isMe && (
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: `${C.accent}18`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
            marginTop: 2,
          }}>
            <Feather name="user" size={14} color={C.accent} />
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
            {isMe && ' · '}
            {isMe && (item.read ? (es ? 'Leído' : 'Read') : (es ? 'Enviado' : 'Sent'))}
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
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: `${C.accent}18`, alignItems: 'center', justifyContent: 'center', marginRight: 12,
        }}>
          <Feather name="user" size={18} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
            {userEmail ?? (es ? 'Usuario' : 'User')}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
            {es ? 'Chat de soporte' : 'Support chat'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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

          {/* Input bar */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 12,
            paddingVertical: 10,
            paddingBottom: insets.bottom + 10,
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
                backgroundColor: C.surface2,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
                fontFamily: 'Inter_400Regular',
                color: C.textPrimary,
                maxHeight: 120,
              }}
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 44, height: 44, borderRadius: 22,
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
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
